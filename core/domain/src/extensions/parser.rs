//! Extension Manifest Parser
//!
//! Parses extension manifest.toml files into strongly typed Rust structures.

use crate::extensions::manifest::{ExtensionManifest, ManifestValidationError};
use std::path::Path;
use thiserror::Error;

/// Errors that can occur during manifest parsing
#[derive(Debug, Error)]
pub enum ManifestParseError {
    #[error("Failed to read manifest file: {0}")]
    IoError(#[from] std::io::Error),

    #[error("Failed to parse TOML: {0}")]
    TomlError(#[from] toml::de::Error),

    #[error("Manifest validation failed: {0}")]
    ValidationError(#[from] ManifestValidationError),
}

/// Parse a manifest from a TOML string
pub fn parse_manifest(toml_content: &str) -> Result<ExtensionManifest, ManifestParseError> {
    let manifest: ExtensionManifest = toml::from_str(toml_content)?;
    manifest.validate()?;
    Ok(manifest)
}

/// Parse a manifest from a file path
pub fn parse_manifest_file(path: &Path) -> Result<ExtensionManifest, ManifestParseError> {
    let content = std::fs::read_to_string(path)?;
    parse_manifest(&content)
}

/// Parse a manifest without validation (useful for partial manifests)
pub fn parse_manifest_unchecked(
    toml_content: &str,
) -> Result<ExtensionManifest, ManifestParseError> {
    let manifest: ExtensionManifest = toml::from_str(toml_content)?;
    Ok(manifest)
}

/// Serialize a manifest to TOML string
pub fn serialize_manifest(manifest: &ExtensionManifest) -> Result<String, toml::ser::Error> {
    toml::to_string_pretty(manifest)
}

#[cfg(test)]
mod tests {
    use super::*;

    const GITHUB_SYNC_MANIFEST: &str = r#"
[extension]
slug = "github-sync"
name = "Github Sync"
version = "1.0.0"
description = "Synchronise vos projets GitHub pour les afficher sur votre site"
category = "integration"
icon = "github"
user_configurable = true
sidebar_order = 10
sidebar_label = "Github Sync"

[default_settings]
github_username = ""
auto_sync = false
include_forks = false
max_repos = 10

[[fields]]
id = "github_username"
type = "text"
label = "Nom d'utilisateur GitHub"
description = "Votre nom d'utilisateur GitHub pour synchroniser vos projets"
placeholder = "ex: octocat"
required = true

[[fields]]
id = "auto_sync"
type = "boolean"
label = "Synchronisation automatique"
description = "Synchroniser automatiquement vos projets toutes les 24h"
default = false

[[fields]]
id = "include_forks"
type = "boolean"
label = "Inclure les forks"
description = "Inclure les repositories forkés dans la liste"
default = false

[[fields]]
id = "max_repos"
type = "number"
label = "Nombre maximum de repos"
description = "Limite du nombre de projets à afficher"
default = 10

[fields.max_repos.validation]
min = 1
max = 50

[[actions]]
id = "sync"
label = "Synchroniser maintenant"
endpoint = "/sync"
description = "Récupérer les dernières données depuis GitHub"
primary = true
refresh_after = true

[[data_display]]
id = "projects"
type = "list"
title = "Projets synchronisés"
empty_message = "Aucun projet synchronisé. Configurez votre nom d'utilisateur GitHub et lancez une synchronisation."

[[data_display.fields]]
id = "name"
type = "link"
label = "Nom"
link_to = "url"

[[data_display.fields]]
id = "description"
type = "text"
label = "Description"

[[data_display.fields]]
id = "language"
type = "badge"
label = "Langage"

[[data_display.fields]]
id = "stars"
type = "number"
label = "Stars"

[[data_display.fields]]
id = "forks"
type = "number"
label = "Forks"

[[sections]]
id = "github_config"
title = "Configuration GitHub"
description = "Connectez votre compte GitHub pour synchroniser vos projets"
fields = ["github_username", "auto_sync", "include_forks", "max_repos"]
"#;

    #[test]
    fn test_parse_github_sync_manifest() {
        let manifest = parse_manifest(GITHUB_SYNC_MANIFEST).expect("Failed to parse manifest");

        assert_eq!(manifest.extension.slug, "github-sync");
        assert_eq!(manifest.extension.name, "Github Sync");
        assert_eq!(manifest.extension.version, "1.0.0");
        assert_eq!(manifest.fields.len(), 4);
        assert_eq!(manifest.actions.len(), 1);
        assert_eq!(manifest.data_display.len(), 1);
        assert_eq!(manifest.sections.len(), 1);
    }

    #[test]
    fn test_parse_minimal_manifest() {
        let minimal = r#"
[extension]
slug = "minimal-ext"
name = "Minimal Extension"
version = "0.1.0"
description = "A minimal extension"
category = "utility"
"#;

        let manifest = parse_manifest(minimal).expect("Failed to parse minimal manifest");

        assert_eq!(manifest.extension.slug, "minimal-ext");
        assert!(manifest.fields.is_empty());
        assert!(manifest.actions.is_empty());
    }

    #[test]
    fn test_parse_manifest_with_permissions() {
        let with_perms = r#"
[extension]
slug = "with-perms"
name = "Extension with Permissions"
version = "1.0.0"
description = "An extension requiring permissions"
category = "integration"

[permissions]
scopes = ["website:read", "website:write", "storage:read"]
external_services = ["github.com", "api.github.com"]
"#;

        let manifest = parse_manifest(with_perms).expect("Failed to parse manifest");

        let perms = manifest.permissions.expect("Missing permissions");
        assert_eq!(perms.scopes.len(), 3);
        assert_eq!(perms.external_services.len(), 2);
    }

    #[test]
    fn test_parse_manifest_with_pricing() {
        let with_pricing = r#"
[extension]
slug = "premium-ext"
name = "Premium Extension"
version = "1.0.0"
description = "A premium extension"
category = "analytics"

[pricing]
model = "subscription"
price = 999
currency = "EUR"
interval = "month"
trial_days = 14
"#;

        let manifest = parse_manifest(with_pricing).expect("Failed to parse manifest");

        let pricing = manifest.pricing.expect("Missing pricing");
        assert_eq!(pricing.price, Some(999));
        assert_eq!(pricing.trial_days, 14);
    }

    #[test]
    fn test_invalid_slug() {
        let invalid = r#"
[extension]
slug = "InvalidSlug"
name = "Invalid"
version = "1.0.0"
description = "Invalid slug"
category = "utility"
"#;

        let result = parse_manifest(invalid);
        assert!(result.is_err());
    }

    #[test]
    fn test_invalid_version() {
        let invalid = r#"
[extension]
slug = "valid-slug"
name = "Invalid Version"
version = "v1.0"
description = "Invalid version"
category = "utility"
"#;

        let result = parse_manifest(invalid);
        assert!(result.is_err());
    }

    #[test]
    fn test_conditional_fields() {
        let conditional = r#"
[extension]
slug = "conditional-ext"
name = "Conditional Fields"
version = "1.0.0"
description = "Extension with conditional fields"
category = "utility"

[[fields]]
id = "enable_feature"
type = "boolean"
label = "Enable Feature"
default = false

[[fields]]
id = "feature_config"
type = "text"
label = "Feature Configuration"
conditions = { show_when = { enable_feature = true } }
"#;

        let manifest = parse_manifest(conditional).expect("Failed to parse manifest");

        let feature_config = &manifest.fields[1];
        assert!(feature_config.conditions.is_some());
        let conditions = feature_config.conditions.as_ref().unwrap();
        assert!(conditions.show_when.is_some());
    }

    #[test]
    fn test_lifecycle_hooks() {
        let with_lifecycle = r#"
[extension]
slug = "lifecycle-ext"
name = "Lifecycle Extension"
version = "1.0.0"
description = "Extension with lifecycle hooks"
category = "utility"

[lifecycle]
on_install = "/hooks/install"
on_uninstall = "/hooks/uninstall"
on_enable = "/hooks/enable"
on_config_change = "/hooks/config-changed"
"#;

        let manifest = parse_manifest(with_lifecycle).expect("Failed to parse manifest");

        let lifecycle = manifest.lifecycle.expect("Missing lifecycle");
        assert_eq!(lifecycle.on_install, Some("/hooks/install".to_string()));
        assert!(lifecycle.on_disable.is_none());
    }

    #[test]
    fn test_serialize_roundtrip() {
        let manifest = parse_manifest(GITHUB_SYNC_MANIFEST).expect("Failed to parse manifest");
        let serialized = serialize_manifest(&manifest).expect("Failed to serialize");
        let reparsed = parse_manifest(&serialized).expect("Failed to reparse");

        assert_eq!(manifest.extension.slug, reparsed.extension.slug);
        assert_eq!(manifest.fields.len(), reparsed.fields.len());
    }
}
