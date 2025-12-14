//! Module Catalog - Centralized module definitions
//!
//! This module provides the catalog of all available modules with their
//! configuration schemas. The schemas are defined in code, not in the database,
//! ensuring type safety and co-location with module logic.
//!
//! Used by:
//! - API: To return module schemas to the frontend
//! - Worker: To validate module configurations

use asap_core_domain::{
    ConfigSchema, ConfigField, ConfigAction, ConfigSection,
    DataDisplay, DataDisplayField, FieldValidation,
};
use serde::{Deserialize, Serialize};

/// Module definition with full metadata and schema
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ModuleDefinition {
    pub slug: String,
    pub name: String,
    pub version: String,
    pub description: String,
    pub category: String,
    pub icon: Option<String>,
    pub default_settings: serde_json::Value,
    pub config_schema: Option<ConfigSchema>,
    /// Whether this module appears in account configuration (false = system module)
    pub user_configurable: bool,
    /// Order in sidebar when activated
    pub sidebar_order: i32,
    /// Label shown in sidebar
    pub sidebar_label: Option<String>,
}

/// Get all available module definitions
/// 
/// This is the single source of truth for module metadata and schemas.
pub fn get_module_catalog() -> Vec<ModuleDefinition> {
    vec![
        github_sync_module(),
        blog_engine_module(),
        contact_form_module(),
        analytics_tracker_module(),
        theme_engine_module(),
    ]
}

/// Get a module definition by slug
pub fn get_module_by_slug(slug: &str) -> Option<ModuleDefinition> {
    get_module_catalog().into_iter().find(|m| m.slug == slug)
}

/// Get only account-configurable modules (for catalog display)
pub fn get_user_modules() -> Vec<ModuleDefinition> {
    get_module_catalog()
        .into_iter()
        .filter(|m| m.user_configurable)
        .collect()
}

// ============================================================================
// Module Definitions
// ============================================================================

fn github_sync_module() -> ModuleDefinition {
    ModuleDefinition {
        slug: "github-sync".to_string(),
        name: "GitHub Integration".to_string(),
        version: "1.0.0".to_string(),
        description: "Synchronise vos projets GitHub pour les afficher sur votre site".to_string(),
        category: "integration".to_string(),
        icon: Some("github".to_string()),
        sidebar_order: 10,
        sidebar_label: Some("GitHub".to_string()),
        user_configurable: true,
        default_settings: serde_json::json!({
            "github_username": "",
            "auto_sync": false,
            "include_forks": false,
            "max_repos": 10
        }),
        config_schema: Some(ConfigSchema::new()
            .with_fields(vec![
                ConfigField::text("github_username", "Nom d'utilisateur GitHub")
                    .with_description("Votre nom d'utilisateur GitHub pour synchroniser vos projets")
                    .with_placeholder("ex: octocat")
                    .required(),
                ConfigField::boolean("auto_sync", "Synchronisation automatique")
                    .with_description("Synchroniser automatiquement vos projets toutes les 24h")
                    .with_default(false),
                ConfigField::boolean("include_forks", "Inclure les forks")
                    .with_description("Inclure les repositories forkés dans la liste")
                    .with_default(false),
                ConfigField::number("max_repos", "Nombre maximum de repos")
                    .with_description("Limite du nombre de projets à afficher")
                    .with_default(10)
                    .with_validation(FieldValidation {
                        min: Some(1),
                        max: Some(50),
                        ..Default::default()
                    }),
            ])
            .with_actions(vec![
                ConfigAction::post("sync", "Synchroniser maintenant", "/sync")
                    .with_description("Récupérer les dernières données depuis GitHub")
                    .primary()
                    .refresh_after(),
            ])
            .with_data_display(vec![
                DataDisplay::list("projects")
                    .with_title("Projets synchronisés")
                    .with_empty_message("Aucun projet synchronisé. Configurez votre nom d'utilisateur GitHub et lancez une synchronisation.")
                    .with_fields(vec![
                        DataDisplayField::link("name", "Nom", "url"),
                        DataDisplayField::text("description", "Description"),
                        DataDisplayField::badge("language", "Langage"),
                        DataDisplayField::number("stars", "Stars"),
                        DataDisplayField::number("forks", "Forks"),
                    ]),
            ])
            .with_sections(vec![
                ConfigSection::new(
                    "github_config",
                    "Configuration GitHub",
                    vec!["github_username", "auto_sync", "include_forks", "max_repos"]
                ).with_description("Connectez votre compte GitHub pour synchroniser vos projets"),
            ])),
    }
}

fn blog_engine_module() -> ModuleDefinition {
    ModuleDefinition {
        slug: "blog-engine".to_string(),
        name: "Blog".to_string(),
        version: "1.0.0".to_string(),
        description: "Créez et gérez un blog sur votre site".to_string(),
        category: "content".to_string(),
        icon: Some("blog".to_string()),
        sidebar_order: 20,
        sidebar_label: Some("Blog".to_string()),
        user_configurable: true,
        default_settings: serde_json::json!({
            "posts_per_page": 10,
            "enable_comments": false,
            "show_author": true,
            "show_date": true,
            "excerpt_length": 200
        }),
        config_schema: Some(ConfigSchema::new()
            .with_fields(vec![
                ConfigField::number("posts_per_page", "Articles par page")
                    .with_description("Nombre d'articles affichés par page")
                    .with_default(10)
                    .with_validation(FieldValidation {
                        min: Some(1),
                        max: Some(50),
                        ..Default::default()
                    }),
                ConfigField::boolean("enable_comments", "Activer les commentaires")
                    .with_description("Permettre aux visiteurs de commenter vos articles")
                    .with_default(false),
                ConfigField::boolean("show_author", "Afficher l'auteur")
                    .with_description("Afficher le nom de l'auteur sur les articles")
                    .with_default(true),
                ConfigField::boolean("show_date", "Afficher la date")
                    .with_description("Afficher la date de publication")
                    .with_default(true),
                ConfigField::number("excerpt_length", "Longueur de l'extrait")
                    .with_description("Nombre de caractères pour l'aperçu des articles")
                    .with_default(200)
                    .with_validation(FieldValidation {
                        min: Some(50),
                        max: Some(500),
                        ..Default::default()
                    }),
            ])
            .with_sections(vec![
                ConfigSection::new(
                    "display",
                    "Affichage",
                    vec!["posts_per_page", "excerpt_length", "show_author", "show_date"]
                ).with_description("Options d'affichage des articles"),
                ConfigSection::new(
                    "interaction",
                    "Interaction",
                    vec!["enable_comments"]
                ).with_description("Options d'interaction avec les visiteurs"),
            ])),
    }
}

fn contact_form_module() -> ModuleDefinition {
    ModuleDefinition {
        slug: "contact-form".to_string(),
        name: "Formulaire de contact".to_string(),
        version: "1.0.0".to_string(),
        description: "Ajoutez un formulaire de contact à votre site".to_string(),
        category: "engagement".to_string(),
        icon: Some("contact".to_string()),
        sidebar_order: 30,
        sidebar_label: Some("Contact".to_string()),
        user_configurable: true,
        default_settings: serde_json::json!({
            "notify_email": "",
            "require_captcha": true,
            "success_message": "Merci pour votre message ! Nous vous répondrons dans les plus brefs délais.",
            "fields_name": true,
            "fields_phone": false,
            "fields_subject": true
        }),
        config_schema: Some(ConfigSchema::new()
            .with_fields(vec![
                ConfigField::text("notify_email", "Email de notification")
                    .with_description("Adresse email où recevoir les messages du formulaire")
                    .with_placeholder("votre@email.com")
                    .required(),
                ConfigField::boolean("require_captcha", "Protection anti-spam")
                    .with_description("Activer la vérification CAPTCHA pour éviter le spam")
                    .with_default(true),
                ConfigField::text("success_message", "Message de confirmation")
                    .with_description("Message affiché après l'envoi du formulaire")
                    .with_default("Merci pour votre message !"),
                ConfigField::boolean("fields_name", "Champ Nom")
                    .with_description("Afficher le champ nom dans le formulaire")
                    .with_default(true),
                ConfigField::boolean("fields_phone", "Champ Téléphone")
                    .with_description("Afficher le champ téléphone dans le formulaire")
                    .with_default(false),
                ConfigField::boolean("fields_subject", "Champ Sujet")
                    .with_description("Afficher le champ sujet dans le formulaire")
                    .with_default(true),
            ])
            .with_sections(vec![
                ConfigSection::new(
                    "notifications",
                    "Notifications",
                    vec!["notify_email", "success_message"]
                ).with_description("Configurez comment recevoir les messages"),
                ConfigSection::new(
                    "form_fields",
                    "Champs du formulaire",
                    vec!["fields_name", "fields_phone", "fields_subject"]
                ).with_description("Personnalisez les champs affichés"),
                ConfigSection::new(
                    "security",
                    "Sécurité",
                    vec!["require_captcha"]
                ).with_description("Options de protection contre le spam"),
            ])),
    }
}

fn analytics_tracker_module() -> ModuleDefinition {
    ModuleDefinition {
        slug: "analytics-tracker".to_string(),
        name: "Analytics".to_string(),
        version: "1.0.0".to_string(),
        description: "Suivez les visites et interactions sur votre site".to_string(),
        category: "analytics".to_string(),
        icon: Some("analytics".to_string()),
        sidebar_order: 40,
        sidebar_label: Some("Analytics".to_string()),
        user_configurable: true,
        default_settings: serde_json::json!({
            "track_page_views": true,
            "track_events": true,
            "anonymize_ip": true,
            "retention_days": 90
        }),
        config_schema: Some(ConfigSchema::new()
            .with_fields(vec![
                ConfigField::boolean("track_page_views", "Suivre les pages vues")
                    .with_description("Enregistrer les pages visitées")
                    .with_default(true),
                ConfigField::boolean("track_events", "Suivre les événements")
                    .with_description("Enregistrer les clics sur les boutons et liens")
                    .with_default(true),
                ConfigField::boolean("anonymize_ip", "Anonymiser les IP")
                    .with_description("Ne pas stocker les adresses IP complètes (RGPD)")
                    .with_default(true),
                ConfigField::number("retention_days", "Rétention des données")
                    .with_description("Nombre de jours de conservation des données")
                    .with_default(90)
                    .with_validation(FieldValidation {
                        min: Some(7),
                        max: Some(365),
                        ..Default::default()
                    }),
            ])
            .with_sections(vec![
                ConfigSection::new(
                    "tracking",
                    "Suivi",
                    vec!["track_page_views", "track_events"]
                ).with_description("Configurez ce qui est suivi"),
                ConfigSection::new(
                    "privacy",
                    "Confidentialité",
                    vec!["anonymize_ip", "retention_days"]
                ).with_description("Options de protection des données"),
            ])),
    }
}

fn theme_engine_module() -> ModuleDefinition {
    ModuleDefinition {
        slug: "theme-engine".to_string(),
        name: "Thème".to_string(),
        version: "1.0.0".to_string(),
        description: "Personnalisez l'apparence de votre site".to_string(),
        category: "appearance".to_string(),
        icon: Some("theme".to_string()),
        sidebar_order: 50,
        sidebar_label: Some("Thème".to_string()),
        user_configurable: true,
        default_settings: serde_json::json!({
            "primary_color": "#3b82f6",
            "secondary_color": "#8b5cf6",
            "background_color": "#ffffff",
            "text_color": "#1f2937",
            "font_heading": "Inter",
            "font_body": "Inter",
            "layout_style": "modern",
            "enable_dark_mode": true
        }),
        config_schema: Some(ConfigSchema::new()
            .with_fields(vec![
                ConfigField::text("primary_color", "Couleur principale")
                    .with_description("Couleur principale de votre site")
                    .with_default("#3b82f6"),
                ConfigField::text("secondary_color", "Couleur secondaire")
                    .with_description("Couleur d'accent")
                    .with_default("#8b5cf6"),
                ConfigField::text("background_color", "Couleur de fond")
                    .with_default("#ffffff"),
                ConfigField::text("text_color", "Couleur du texte")
                    .with_default("#1f2937"),
                ConfigField::text("font_heading", "Police des titres")
                    .with_default("Inter"),
                ConfigField::text("font_body", "Police du texte")
                    .with_default("Inter"),
                ConfigField::boolean("enable_dark_mode", "Mode sombre")
                    .with_description("Permettre aux visiteurs de basculer en mode sombre")
                    .with_default(true),
            ])
            .with_sections(vec![
                ConfigSection::new(
                    "colors",
                    "Couleurs",
                    vec!["primary_color", "secondary_color", "background_color", "text_color"]
                ).with_description("Personnalisez les couleurs de votre site"),
                ConfigSection::new(
                    "typography",
                    "Typographie",
                    vec!["font_heading", "font_body"]
                ).with_description("Choisissez vos polices"),
                ConfigSection::new(
                    "features",
                    "Fonctionnalités",
                    vec!["enable_dark_mode"]
                ).with_description("Options supplémentaires"),
            ])),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_module_catalog() {
        let catalog = get_module_catalog();
        assert!(!catalog.is_empty());
        
        // All modules should have required fields
        for module in &catalog {
            assert!(!module.slug.is_empty());
            assert!(!module.name.is_empty());
            assert!(!module.version.is_empty());
        }
    }

    #[test]
    fn test_get_module_by_slug() {
        let github = get_module_by_slug("github-sync");
        assert!(github.is_some());
        assert_eq!(github.unwrap().name, "GitHub Integration");

        let nonexistent = get_module_by_slug("nonexistent");
        assert!(nonexistent.is_none());
    }

    #[test]
    fn test_github_module_schema() {
        let github = get_module_by_slug("github-sync").unwrap();
        let schema = github.config_schema.unwrap();
        
        assert!(schema.fields.is_some());
        let fields = schema.fields.unwrap();
        assert!(fields.iter().any(|f| f.key == "github_username"));
    }

    #[test]
    fn test_schema_serialization() {
        let catalog = get_module_catalog();
        for module in catalog {
            let json = serde_json::to_string(&module).unwrap();
            assert!(!json.is_empty());
            
            // Should deserialize back
            let _: ModuleDefinition = serde_json::from_str(&json).unwrap();
        }
    }
}
