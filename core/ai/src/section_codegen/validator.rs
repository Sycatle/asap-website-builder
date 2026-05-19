//! AST-level validation rules for AI-generated sections.
//!
//! The rules enforce the contract: only token-driven styling, no XSS vectors,
//! no escape hatches into untrusted JS, and a closed import allowlist.

use serde::{Deserialize, Serialize};
use swc_core::ecma::ast::{
    Expr, ImportDecl, JSXAttrName, JSXAttrOrSpread, JSXAttrValue, JSXExpr, Lit, Module, Prop,
    PropName, PropOrSpread,
};
use swc_core::ecma::visit::{Visit, VisitWith};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ValidationError {
    pub code: &'static str,
    pub message: String,
}

const ALLOWED_IMPORTS: &[&str] = &[
    "react",
    "react/jsx-runtime",
    "react/jsx-dev-runtime",
    "@asap/site-runtime",
];

/// Forbidden global identifiers — these usually indicate an escape hatch.
const FORBIDDEN_GLOBALS: &[&str] = &[
    "eval",
    "Function",
    "fetch",
    "XMLHttpRequest",
    "WebSocket",
    "document",
    "window",
    "localStorage",
    "sessionStorage",
];

/// Run all validation rules against a parsed module. Returns the full list
/// of violations so the AI can fix them in one round-trip.
pub fn validate(module: &Module) -> Vec<ValidationError> {
    let mut visitor = Validator::default();
    module.visit_with(&mut visitor);
    visitor.errors
}

#[derive(Default)]
struct Validator {
    errors: Vec<ValidationError>,
}

impl Validator {
    fn err(&mut self, code: &'static str, message: impl Into<String>) {
        self.errors.push(ValidationError {
            code,
            message: message.into(),
        });
    }
}

impl Visit for Validator {
    fn visit_import_decl(&mut self, n: &ImportDecl) {
        let src = n.src.value.as_ref();
        if !ALLOWED_IMPORTS.contains(&src) {
            self.err(
                "forbidden_import",
                format!(
                    "import from '{src}' is not allowed (allowlist: {})",
                    ALLOWED_IMPORTS.join(", ")
                ),
            );
        }
    }

    fn visit_jsx_attr_name(&mut self, name: &JSXAttrName) {
        if let JSXAttrName::Ident(ident) = name {
            let attr = ident.sym.as_ref();
            if attr == "dangerouslySetInnerHTML" {
                self.err(
                    "dangerously_set_inner_html",
                    "`dangerouslySetInnerHTML` is forbidden in generated sections",
                );
            }
        }
        name.visit_children_with(self);
    }

    fn visit_jsx_opening_element(&mut self, el: &swc_core::ecma::ast::JSXOpeningElement) {
        // Inspect `style={{ ... }}` props: every literal value must be a
        // token reference, not a hardcoded color / size.
        for attr in &el.attrs {
            if let JSXAttrOrSpread::JSXAttr(jsx_attr) = attr {
                if let JSXAttrName::Ident(name) = &jsx_attr.name {
                    if name.sym.as_ref() == "style" {
                        if let Some(JSXAttrValue::JSXExprContainer(container)) = &jsx_attr.value {
                            if let JSXExpr::Expr(expr) = &container.expr {
                                self.check_style_expr(expr);
                            }
                        }
                    }
                }
            }
        }
        el.visit_children_with(self);
    }

    fn visit_ident(&mut self, ident: &swc_core::ecma::ast::Ident) {
        // Reject references to forbidden globals. The resolver pass would let
        // us check "is this binding actually the global?" — for v0 we err on
        // the side of false positives, which the AI can fix by renaming.
        if FORBIDDEN_GLOBALS.contains(&ident.sym.as_ref()) {
            self.err(
                "forbidden_global",
                format!(
                    "reference to `{}` is not allowed in generated sections",
                    ident.sym
                ),
            );
        }
    }
}

impl Validator {
    fn check_style_expr(&mut self, expr: &Expr) {
        if let Expr::Object(obj) = expr {
            for prop in &obj.props {
                if let PropOrSpread::Prop(p) = prop {
                    if let Prop::KeyValue(kv) = p.as_ref() {
                        let key = match &kv.key {
                            PropName::Ident(i) => Some(i.sym.as_ref().to_string()),
                            PropName::Str(s) => Some(s.value.to_string()),
                            _ => None,
                        };
                        if let (Some(key), Expr::Lit(Lit::Str(s))) = (key, &*kv.value) {
                            let val = s.value.as_ref();
                            if is_color_property(&key) && !val.contains("var(--") {
                                self.err(
                                    "literal_color_in_style",
                                    format!(
                                        "style.{key} = '{val}' is a literal — use var(--color-*) tokens instead"
                                    ),
                                );
                            }
                            if is_size_property(&key) && literal_is_size_value(val) {
                                self.err(
                                    "literal_size_in_style",
                                    format!(
                                        "style.{key} = '{val}' is a literal — use var(--space-*) / var(--radius-*) / rem tokens"
                                    ),
                                );
                            }
                        }
                    }
                }
            }
        }
    }
}

fn is_color_property(name: &str) -> bool {
    matches!(
        name,
        "color"
            | "background"
            | "backgroundColor"
            | "borderColor"
            | "outlineColor"
            | "fill"
            | "stroke"
    )
}

fn is_size_property(name: &str) -> bool {
    matches!(
        name,
        "padding"
            | "paddingTop"
            | "paddingBottom"
            | "paddingLeft"
            | "paddingRight"
            | "paddingInline"
            | "paddingBlock"
            | "margin"
            | "marginTop"
            | "marginBottom"
            | "marginLeft"
            | "marginRight"
            | "marginInline"
            | "marginBlock"
            | "gap"
            | "rowGap"
            | "columnGap"
            | "borderRadius"
    )
}

/// Heuristic: a literal like "16px" / "1rem" / "20" looks like a hardcoded
/// distance. Tokens use `var(--space-*)` or `calc(var(--space-base) * N)`,
/// which always contain "var(" — so this filter is conservative.
fn literal_is_size_value(val: &str) -> bool {
    if val.contains("var(") {
        return false;
    }
    let trimmed = val.trim();
    let ends_with_unit = ["px", "rem", "em", "%", "vh", "vw"]
        .iter()
        .any(|u| trimmed.ends_with(u));
    let is_bare_number = trimmed.parse::<f64>().is_ok();
    ends_with_unit || is_bare_number
}
