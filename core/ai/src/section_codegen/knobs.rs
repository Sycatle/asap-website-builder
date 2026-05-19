//! Side-effect extraction during AST walk.
//!
//! `extract_data_bindings` collects every `useCollection(slug)` and
//! `useVariable(key)` call so the runtime can pre-fetch and the studio can
//! highlight broken references.
//!
//! `extract_knobs` finds the component's default-exported function and reads
//! its destructured props with literal defaults — these become the directly
//! editable controls in the studio (no LLM round-trip needed for tweaks).

use serde::{Deserialize, Serialize};
use std::collections::BTreeSet;
use swc_core::ecma::ast::{
    BindingIdent, CallExpr, Callee, Decl, DefaultDecl, ExportDefaultDecl, ExportDefaultExpr, Expr,
    ExprOrSpread, Lit, Module, ModuleDecl, ModuleItem, ObjectPat, ObjectPatProp, Pat, Stmt,
};
use swc_core::ecma::visit::{Visit, VisitWith};

#[derive(Debug, Clone, Default, Serialize, Deserialize, PartialEq, Eq)]
pub struct DataBindings {
    pub collections: Vec<String>,
    pub variables: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum KnobType {
    String { default: Option<String> },
    Number { default: Option<f64> },
    Boolean { default: Option<bool> },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Knob {
    pub name: String,
    #[serde(flatten)]
    pub kind: KnobType,
}

#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct KnobsSchema {
    pub knobs: Vec<Knob>,
}

pub fn extract_data_bindings(module: &Module) -> DataBindings {
    let mut visitor = BindingsVisitor::default();
    module.visit_with(&mut visitor);
    DataBindings {
        collections: visitor.collections.into_iter().collect(),
        variables: visitor.variables.into_iter().collect(),
    }
}

pub fn extract_knobs(module: &Module) -> KnobsSchema {
    let knobs = find_default_export_props(module).unwrap_or_default();
    KnobsSchema { knobs }
}

#[derive(Default)]
struct BindingsVisitor {
    // BTreeSet for stable, deduped output — small N, so cost is negligible.
    collections: BTreeSet<String>,
    variables: BTreeSet<String>,
}

impl Visit for BindingsVisitor {
    fn visit_call_expr(&mut self, call: &CallExpr) {
        if let Callee::Expr(callee) = &call.callee {
            if let Expr::Ident(ident) = &**callee {
                match ident.sym.as_ref() {
                    "useCollection" => {
                        if let Some(slug) = first_string_arg(&call.args) {
                            self.collections.insert(slug);
                        }
                    }
                    "useVariable" => {
                        if let Some(key) = first_string_arg(&call.args) {
                            self.variables.insert(key);
                        }
                    }
                    _ => {}
                }
            }
        }
        call.visit_children_with(self);
    }
}

fn first_string_arg(args: &[ExprOrSpread]) -> Option<String> {
    let first = args.first()?;
    if first.spread.is_some() {
        return None;
    }
    if let Expr::Lit(Lit::Str(s)) = &*first.expr {
        return Some(s.value.to_string());
    }
    None
}

fn find_default_export_props(module: &Module) -> Option<Vec<Knob>> {
    for item in &module.body {
        if let ModuleItem::ModuleDecl(decl) = item {
            match decl {
                ModuleDecl::ExportDefaultDecl(ExportDefaultDecl { decl, .. }) => {
                    if let DefaultDecl::Fn(fn_expr) = decl {
                        if let Some(param) = fn_expr.function.params.first() {
                            return Some(props_from_pat(&param.pat));
                        }
                    }
                }
                ModuleDecl::ExportDefaultExpr(ExportDefaultExpr { expr, .. }) => {
                    if let Expr::Fn(fn_expr) = &**expr {
                        if let Some(param) = fn_expr.function.params.first() {
                            return Some(props_from_pat(&param.pat));
                        }
                    } else if let Expr::Arrow(arrow) = &**expr {
                        if let Some(pat) = arrow.params.first() {
                            return Some(props_from_pat(pat));
                        }
                    }
                }
                _ => {}
            }
        } else if let ModuleItem::Stmt(Stmt::Decl(Decl::Fn(_fn_decl))) = item {
            // `function Foo() {}` followed by `export default Foo` is uncommon
            // in AI-generated code (we ask for `export default function`), so
            // we skip the search-by-name case for v0.
        }
    }
    None
}

fn props_from_pat(pat: &Pat) -> Vec<Knob> {
    let mut knobs = Vec::new();
    if let Pat::Object(ObjectPat { props, .. }) = pat {
        for prop in props {
            if let ObjectPatProp::Assign(assign) = prop {
                let BindingIdent { id, .. } = &assign.key;
                let name = id.sym.to_string();
                if let Some(default) = &assign.value {
                    if let Some(kind) = literal_default(default) {
                        knobs.push(Knob { name, kind });
                    }
                }
            }
        }
    }
    knobs
}

fn literal_default(expr: &Expr) -> Option<KnobType> {
    match expr {
        Expr::Lit(Lit::Str(s)) => Some(KnobType::String {
            default: Some(s.value.to_string()),
        }),
        Expr::Lit(Lit::Num(n)) => Some(KnobType::Number {
            default: Some(n.value),
        }),
        Expr::Lit(Lit::Bool(b)) => Some(KnobType::Boolean {
            default: Some(b.value),
        }),
        _ => None,
    }
}
