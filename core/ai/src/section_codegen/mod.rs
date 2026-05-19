//! Section codegen pipeline.
//!
//! Takes JSX/TSX produced by the AI for a single section, validates it
//! against the closed contract (only `react` + `@asap/site-runtime` imports,
//! no `dangerouslySetInnerHTML`, no literal colors in `style`, etc.), then
//! transforms it to plain JS that the browser can dynamic-import.
//!
//! Two side effects are extracted while we walk the AST:
//!  - `data_bindings`: which `useCollection` / `useVariable` calls the section
//!    makes, so the runtime can pre-fetch and so the studio can flag broken
//!    references when a collection is removed.
//!  - `knobs_schema`: literal-default props the AI exposed — the studio
//!    surfaces these as direct edit controls (no LLM round-trip for tweaks).

mod compiler;
mod knobs;
mod validator;

use serde::{Deserialize, Serialize};

pub use compiler::compile;
pub use knobs::{extract_data_bindings, extract_knobs, DataBindings, Knob, KnobType, KnobsSchema};
pub use validator::{validate, ValidationError};

/// Result of running a section through the full pipeline.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeneratedSection {
    /// Compiled JS, ready for browser dynamic import.
    pub compiled_js: String,
    /// Collections + variables the section reads.
    pub data_bindings: DataBindings,
    /// Editable knobs surfaced to the studio.
    pub knobs_schema: KnobsSchema,
}

/// Errors from the codegen pipeline.
#[derive(Debug, thiserror::Error)]
pub enum CodegenError {
    #[error("parse failed: {0}")]
    Parse(String),
    #[error("validation failed")]
    Validation { errors: Vec<ValidationError> },
    #[error("compile failed: {0}")]
    Compile(String),
}

/// Run the full pipeline: parse → validate → compile → extract metadata.
pub fn generate(source: &str) -> Result<GeneratedSection, CodegenError> {
    let module = compiler::parse(source).map_err(CodegenError::Parse)?;
    let errors = validator::validate(&module);
    if !errors.is_empty() {
        return Err(CodegenError::Validation { errors });
    }
    let data_bindings = knobs::extract_data_bindings(&module);
    let knobs_schema = knobs::extract_knobs(&module);
    let compiled_js = compiler::compile(&module).map_err(CodegenError::Compile)?;
    Ok(GeneratedSection {
        compiled_js,
        data_bindings,
        knobs_schema,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    const VALID_HERO: &str = r#"
import { useCollection, useVariable } from '@asap/site-runtime';

export default function Hero({ size = 'lg' }: { size?: 'sm' | 'lg' }) {
  const headline = useVariable<string>('hero_headline', 'Hello');
  const logos = useCollection('trusted_logos');
  return (
    <section className="bg-background text-foreground py-24">
      <h1 className={size === 'lg' ? 'text-5xl font-display' : 'text-3xl font-display'}>
        {headline}
      </h1>
      <div className="flex gap-4 mt-8">
        {logos.map((logo) => (
          <img key={logo.id} src={String(logo.url)} alt={String(logo.name)} className="h-8" />
        ))}
      </div>
    </section>
  );
}
"#;

    #[test]
    fn valid_section_compiles() {
        let out = generate(VALID_HERO).expect("should compile");
        assert!(out.compiled_js.contains("export default"));
        assert!(
            out.compiled_js.contains("React.createElement")
                || out.compiled_js.contains("jsx(")
                || out.compiled_js.contains("_jsx")
        );
        // Bare-specifier imports must be rewritten to the global registry
        // lookup so the browser can load the module from the API origin.
        assert!(
            !out.compiled_js.contains("from \"react/jsx-runtime\"")
                && !out.compiled_js.contains("from 'react/jsx-runtime'"),
            "bare import must be rewritten:\n{}",
            out.compiled_js
        );
        assert!(out.compiled_js.contains("globalThis.__asapDeps"));
        assert_eq!(
            out.data_bindings.collections,
            vec!["trusted_logos".to_string()]
        );
        assert_eq!(
            out.data_bindings.variables,
            vec!["hero_headline".to_string()]
        );
    }

    #[test]
    fn rejects_forbidden_import() {
        let src = "import fs from 'fs';\nexport default function S() { return null; }";
        let err = generate(src).unwrap_err();
        match err {
            CodegenError::Validation { errors } => {
                assert!(errors.iter().any(|e| e.code == "forbidden_import"));
            }
            _ => panic!("expected validation error, got {err:?}"),
        }
    }

    #[test]
    fn rejects_dangerously_set_inner_html() {
        let src = r#"
export default function S() {
  return <div dangerouslySetInnerHTML={{ __html: 'hi' }} />;
}
"#;
        let err = generate(src).unwrap_err();
        match err {
            CodegenError::Validation { errors } => {
                assert!(errors
                    .iter()
                    .any(|e| e.code == "dangerously_set_inner_html"));
            }
            _ => panic!("expected validation error, got {err:?}"),
        }
    }

    #[test]
    fn rejects_literal_color_in_style() {
        let src = r#"
export default function S() {
  return <div style={{ color: '#ff0000' }} />;
}
"#;
        let err = generate(src).unwrap_err();
        match err {
            CodegenError::Validation { errors } => {
                assert!(errors.iter().any(|e| e.code == "literal_color_in_style"));
            }
            _ => panic!("expected validation error, got {err:?}"),
        }
    }

    #[test]
    fn accepts_token_var_in_style() {
        let src = r#"
export default function S() {
  return <div style={{ color: 'var(--color-primary)' }} />;
}
"#;
        generate(src).expect("token var should be accepted");
    }
}
