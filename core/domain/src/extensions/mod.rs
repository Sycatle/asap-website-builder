//! Extensions Module
//!
//! This module contains types and utilities for the Extension Store system.
//! The manifest types are the single source of truth for all extension definitions.

pub mod manifest;
pub mod parser;

pub use manifest::*;
pub use parser::{
    parse_manifest, parse_manifest_file, parse_manifest_unchecked, serialize_manifest,
    ManifestParseError,
};
