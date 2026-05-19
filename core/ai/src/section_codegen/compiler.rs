//! Parse + compile JSX/TSX → JS via swc.

use swc_core::common::comments::SingleThreadedComments;
use swc_core::common::sync::Lrc;
use swc_core::common::{FileName, Globals, Mark, SourceMap, GLOBALS};
use swc_core::ecma::ast::{EsVersion, Module, Pass, Program};
use swc_core::ecma::codegen::{text_writer::JsWriter, Config as CodegenConfig, Emitter};
use swc_core::ecma::parser::{lexer::Lexer, Parser, StringInput, Syntax, TsSyntax};
use swc_core::ecma::transforms::base::fixer::fixer;
use swc_core::ecma::transforms::base::hygiene::hygiene;
use swc_core::ecma::transforms::base::resolver;
use swc_core::ecma::transforms::react::{react, Options as ReactOptions, Runtime};
use swc_core::ecma::transforms::typescript::strip;

/// Rewrites swc's emitted `import { x as y } from "name"` and bare
/// `import "name"` statements into runtime lookups against a host-supplied
/// `globalThis.__asapDeps(name)` registry.
///
/// Why: a section module loaded via `import()` from the API origin can't
/// resolve bare specifiers like `react/jsx-runtime` or `@asap/site-runtime`
/// — only the page that hosts the section knows where those modules live
/// (Vite bundled them into chunks at build time). By exposing them on a
/// global registry, the host stays in control of versioning + identity,
/// and generated sections stay portable across builds.
///
/// Only handles the import shapes swc actually emits for our pipeline:
///   - `import { a, b as c } from "name";`  → `const { a, b: c } = globalThis.__asapDeps("name");`
///   - `import * as ns from "name";`         → `const ns = globalThis.__asapDeps("name");`
///   - `import x from "name";`               → `const { default: x } = globalThis.__asapDeps("name");`
///   - `import "name";`                      → `globalThis.__asapDeps("name");`
fn rewrite_imports_to_global_deps(src: &str) -> String {
    let mut out = String::with_capacity(src.len() + 128);
    for line in src.lines() {
        let trimmed = line.trim_start();
        if let Some(rewritten) = rewrite_import_line(trimmed) {
            // Preserve leading whitespace so error stacks match input layout.
            let indent = &line[..line.len() - trimmed.len()];
            out.push_str(indent);
            out.push_str(&rewritten);
        } else {
            out.push_str(line);
        }
        out.push('\n');
    }
    out
}

fn rewrite_import_line(line: &str) -> Option<String> {
    if !line.starts_with("import") {
        return None;
    }
    let rest = line.strip_prefix("import")?.trim_start();
    // `import "name";`
    if let Some(name) = extract_single_quoted(rest) {
        let trailing = rest[rest.find(['"', '\'']).unwrap_or(0)..]
            .strip_prefix('"')
            .or_else(|| rest[rest.find(['"', '\'']).unwrap_or(0)..].strip_prefix('\''));
        // We already validated the name parsed out — just emit the side-effect call.
        let _ = trailing;
        return Some(format!("globalThis.__asapDeps(\"{name}\");"));
    }
    // From-clause split: everything before " from " is the binding clause.
    let (binding, from_part) = rest.rsplit_once(" from ")?;
    let module = extract_single_quoted(from_part.trim())?;
    let binding = binding.trim().trim_end_matches(';');

    // `import * as ns`
    if let Some(ns) = binding.strip_prefix('*').map(|s| s.trim()) {
        if let Some(name) = ns.strip_prefix("as ").map(|s| s.trim()) {
            return Some(format!(
                "const {name} = globalThis.__asapDeps(\"{module}\");"
            ));
        }
    }

    // `import { a, b as c }` (possibly mixed with a default before the brace)
    if let Some((default_part, named_part)) = split_default_and_named(binding) {
        let mut const_parts = Vec::new();
        if let Some(def) = default_part {
            const_parts.push(format!("default: {def}"));
        }
        for spec in named_part.split(',') {
            let spec = spec.trim();
            if spec.is_empty() {
                continue;
            }
            const_parts.push(rewrite_named_specifier(spec));
        }
        return Some(format!(
            "const {{ {} }} = globalThis.__asapDeps(\"{module}\");",
            const_parts.join(", ")
        ));
    }

    // `import x from "name"` (default only, no braces)
    let default_only = binding.trim();
    if !default_only.is_empty() && !default_only.contains('{') {
        return Some(format!(
            "const {{ default: {default_only} }} = globalThis.__asapDeps(\"{module}\");"
        ));
    }

    None
}

/// `{ a, b as c }` or `Default, { a, b as c }` → (Some("Default"), "a, b as c") or (None, "a, b as c").
fn split_default_and_named(binding: &str) -> Option<(Option<&str>, &str)> {
    let lbrace = binding.find('{')?;
    let rbrace = binding.rfind('}')?;
    if rbrace <= lbrace {
        return None;
    }
    let named = &binding[lbrace + 1..rbrace];
    let prefix = binding[..lbrace].trim().trim_end_matches(',').trim();
    let default = if prefix.is_empty() {
        None
    } else {
        Some(prefix)
    };
    Some((default, named))
}

fn rewrite_named_specifier(spec: &str) -> String {
    // `a` → `a`; `a as b` → `a: b`.
    if let Some((src, dst)) = spec.split_once(" as ") {
        format!("{}: {}", src.trim(), dst.trim())
    } else {
        spec.trim().to_string()
    }
}

fn extract_single_quoted(s: &str) -> Option<&str> {
    let s = s.trim().trim_end_matches(';').trim_end();
    let first = s.chars().next()?;
    if first != '"' && first != '\'' {
        return None;
    }
    let end = s[1..].find(first)?;
    Some(&s[1..1 + end])
}

/// Parse JSX/TSX into a swc `Module`. Errors return a single-line message
/// suitable for surfacing to the AI codegen client.
pub fn parse(source: &str) -> Result<Module, String> {
    let cm: Lrc<SourceMap> = Default::default();
    let fm = cm.new_source_file(
        Lrc::new(FileName::Custom("section.tsx".into())),
        source.to_string(),
    );

    let lexer = Lexer::new(
        Syntax::Typescript(TsSyntax {
            tsx: true,
            decorators: false,
            dts: false,
            no_early_errors: false,
            disallow_ambiguous_jsx_like: false,
        }),
        EsVersion::Es2020,
        StringInput::from(&*fm),
        None,
    );

    let mut parser = Parser::new_from(lexer);
    parser.parse_module().map_err(|err| format!("{err:?}"))
}

/// Transform a parsed module: strip TypeScript, lower JSX with the automatic
/// runtime (React 17+), then emit JS source.
pub fn compile(module: &Module) -> Result<String, String> {
    let cm: Lrc<SourceMap> = Default::default();
    let comments = SingleThreadedComments::default();
    let globals = Globals::new();

    let raw = GLOBALS.set(&globals, || {
        let unresolved_mark = Mark::new();
        let top_level_mark = Mark::new();

        // The new swc API is Program-oriented. We wrap our module, apply each
        // Pass in turn, then pull the module back out for emission.
        let mut program = Program::Module(module.clone());

        let mut pipeline = (
            resolver(unresolved_mark, top_level_mark, true),
            strip(unresolved_mark, top_level_mark),
            react::<&SingleThreadedComments>(
                cm.clone(),
                Some(&comments),
                ReactOptions {
                    runtime: Some(Runtime::Automatic),
                    development: Some(false),
                    ..Default::default()
                },
                top_level_mark,
                unresolved_mark,
            ),
            hygiene(),
            fixer(Some(&comments)),
        );
        pipeline.process(&mut program);

        let module = match program {
            Program::Module(m) => m,
            Program::Script(_) => return Err("expected module, got script".to_string()),
        };

        let mut buf = Vec::new();
        {
            let writer = JsWriter::new(cm.clone(), "\n", &mut buf, None);
            let mut emitter = Emitter {
                cfg: CodegenConfig::default(),
                cm: cm.clone(),
                comments: Some(&comments),
                wr: writer,
            };
            emitter
                .emit_module(&module)
                .map_err(|e| format!("emit: {e}"))?;
        }
        String::from_utf8(buf).map_err(|e| format!("utf8: {e}"))
    })?;

    Ok(rewrite_imports_to_global_deps(&raw))
}
