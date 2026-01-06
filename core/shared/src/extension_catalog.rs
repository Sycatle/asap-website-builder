//! Extension Catalog - Centralized extension definitions
//!
//! This module provides the catalog of all available extensions with their
//! configuration schemas. The schemas are defined in code, not in the database,
//! ensuring type safety and co-location with extension logic.
//!
//! Used by:
//! - API: To return extension schemas to the frontend
//! - Worker: To validate extension configurations

use asap_core_domain::{
    ConfigSchema, ConfigField, ConfigAction, ConfigSection,
    DataDisplay, DataDisplayField, FieldValidation,
    // Collections & Variables
    CollectionDefinition, CollectionSchema, CollectionFieldDef, CollectionFieldType,
    SyncMode, VariableDefinition, VariableType, VariableComputation,
};
use serde::{Deserialize, Serialize};

/// Extension definition with full metadata and schema
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExtensionDefinition {
    pub slug: String,
    pub name: String,
    pub version: String,
    pub description: String,
    pub category: String,
    pub icon: Option<String>,
    pub default_settings: serde_json::Value,
    pub config_schema: Option<ConfigSchema>,
    /// Whether this extension appears in account configuration (false = system extension)
    pub user_configurable: bool,
    /// Order in sidebar when activated
    pub sidebar_order: i32,
    /// Label shown in sidebar
    pub sidebar_label: Option<String>,
    /// Collections this extension provides
    #[serde(default)]
    pub collections: Vec<CollectionDefinition>,
    /// Variables this extension provides
    #[serde(default)]
    pub variables: Vec<VariableDefinition>,
}

/// Get all available extension definitions
/// 
/// This is the single source of truth for extension metadata and schemas.
pub fn get_extension_catalog() -> Vec<ExtensionDefinition> {
    vec![
        github_sync_extension(),
        blog_engine_extension(),
        contact_form_extension(),
    ]
}

/// Get an extension definition by slug
pub fn get_extension_by_slug(slug: &str) -> Option<ExtensionDefinition> {
    get_extension_catalog().into_iter().find(|m| m.slug == slug)
}

/// Get only account-configurable extensions (for catalog display)
pub fn get_user_extensions() -> Vec<ExtensionDefinition> {
    get_extension_catalog()
        .into_iter()
        .filter(|m| m.user_configurable)
        .collect()
}

// ============================================================================
// Extension Definitions
// ============================================================================

fn github_sync_extension() -> ExtensionDefinition {
    ExtensionDefinition {
        slug: "github-sync".to_string(),
        name: "Github Sync".to_string(),
        version: "1.0.0".to_string(),
        description: "Synchronise vos projets GitHub pour les afficher sur votre site".to_string(),
        category: "integration".to_string(),
        icon: Some("github".to_string()),
        sidebar_order: 10,
        sidebar_label: Some("Github Sync".to_string()),
        user_configurable: true,
        default_settings: serde_json::json!({
            "github_username": "",
            "auto_sync": false,
            "include_forks": false,
            "max_repos": 10
        }),
        // Collections this extension provides
        collections: vec![
            CollectionDefinition {
                slug: "github_repos".to_string(),
                name: "GitHub Repositories".to_string(),
                description: "Your public GitHub repositories".to_string(),
                sync_mode: SyncMode::Manual,
                sync_frequency: None,
                schema: CollectionSchema {
                    primary_key: "id".to_string(),
                    display_field: "name".to_string(),
                    preview_fields: vec!["description".to_string(), "language".to_string(), "stars".to_string()],
                    fields: vec![
                        CollectionFieldDef::new("id", CollectionFieldType::String, "ID").required(),
                        CollectionFieldDef::new("name", CollectionFieldType::String, "Name").required().sortable().searchable(),
                        CollectionFieldDef::new("full_name", CollectionFieldType::String, "Full Name"),
                        CollectionFieldDef::new("description", CollectionFieldType::String, "Description").searchable(),
                        CollectionFieldDef::new("url", CollectionFieldType::Url, "URL").required(),
                        CollectionFieldDef::new("homepage", CollectionFieldType::Url, "Homepage"),
                        CollectionFieldDef::new("language", CollectionFieldType::String, "Language").filterable(),
                        CollectionFieldDef::new("stars", CollectionFieldType::Number, "Stars").sortable().with_icon("star"),
                        CollectionFieldDef::new("forks", CollectionFieldType::Number, "Forks").sortable().with_icon("git-fork"),
                        CollectionFieldDef::new("open_issues", CollectionFieldType::Number, "Open Issues"),
                        CollectionFieldDef::new("topics", CollectionFieldType::Array, "Topics").filterable(),
                        CollectionFieldDef::new("is_fork", CollectionFieldType::Boolean, "Is Fork").filterable(),
                        CollectionFieldDef::new("is_archived", CollectionFieldType::Boolean, "Is Archived").filterable(),
                        CollectionFieldDef::new("created_at", CollectionFieldType::DateTime, "Created").sortable(),
                        CollectionFieldDef::new("updated_at", CollectionFieldType::DateTime, "Updated").sortable(),
                        CollectionFieldDef::new("pushed_at", CollectionFieldType::DateTime, "Last Push").sortable(),
                    ],
                },
            },
        ],
        // Variables this extension provides
        variables: vec![
            VariableDefinition::synced(
                "github_username",
                "GitHub Username",
                VariableType::String,
                "github_username"
            ),
            VariableDefinition::computed(
                "github_total_repos",
                "Total Repositories",
                VariableType::Number,
                VariableComputation::count("github_repos")
            ),
            VariableDefinition::computed(
                "github_total_stars",
                "Total Stars",
                VariableType::Number,
                VariableComputation::sum("github_repos", "stars")
            ).with_description("Sum of stars across all repositories"),
            VariableDefinition::computed(
                "github_total_forks",
                "Total Forks",
                VariableType::Number,
                VariableComputation::sum("github_repos", "forks")
            ),
            VariableDefinition::computed(
                "github_top_language",
                "Top Language",
                VariableType::String,
                VariableComputation::mode("github_repos", "language")
            ).with_description("Most used programming language"),
        ],
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

fn blog_engine_extension() -> ExtensionDefinition {
    ExtensionDefinition {
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
        // Blog posts collection - managed through the blog interface
        collections: vec![
            CollectionDefinition {
                slug: "blog_posts".to_string(),
                name: "Blog Posts".to_string(),
                description: "Your blog articles".to_string(),
                sync_mode: SyncMode::Manual, // User creates posts manually
                sync_frequency: None,
                schema: CollectionSchema {
                    primary_key: "id".to_string(),
                    display_field: "title".to_string(),
                    preview_fields: vec!["excerpt".to_string(), "published_at".to_string()],
                    fields: vec![
                        CollectionFieldDef::new("id", CollectionFieldType::String, "ID").required(),
                        CollectionFieldDef::new("title", CollectionFieldType::String, "Title").required().sortable().searchable(),
                        CollectionFieldDef::new("slug", CollectionFieldType::String, "Slug").required(),
                        CollectionFieldDef::new("content", CollectionFieldType::RichText, "Content").required(),
                        CollectionFieldDef::new("excerpt", CollectionFieldType::String, "Excerpt").searchable(),
                        CollectionFieldDef::new("cover_image", CollectionFieldType::Image, "Cover Image"),
                        CollectionFieldDef::new("author", CollectionFieldType::String, "Author"),
                        CollectionFieldDef::new("tags", CollectionFieldType::Array, "Tags").filterable(),
                        CollectionFieldDef::new("category", CollectionFieldType::String, "Category").filterable(),
                        CollectionFieldDef::new("is_published", CollectionFieldType::Boolean, "Published").filterable(),
                        CollectionFieldDef::new("published_at", CollectionFieldType::DateTime, "Published Date").sortable(),
                        CollectionFieldDef::new("created_at", CollectionFieldType::DateTime, "Created").sortable(),
                        CollectionFieldDef::new("updated_at", CollectionFieldType::DateTime, "Updated").sortable(),
                    ],
                },
            },
        ],
        variables: vec![
            VariableDefinition::computed(
                "blog_total_posts",
                "Total Posts",
                VariableType::Number,
                VariableComputation::count("blog_posts")
            ),
            VariableDefinition::computed(
                "blog_published_posts",
                "Published Posts",
                VariableType::Number,
                VariableComputation::count("blog_posts") // Would need filter support
            ).with_description("Count of published blog posts"),
        ],
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

fn contact_form_extension() -> ExtensionDefinition {
    ExtensionDefinition {
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
        // Contact form submissions collection
        collections: vec![
            CollectionDefinition {
                slug: "contact_submissions".to_string(),
                name: "Contact Submissions".to_string(),
                description: "Messages received through the contact form".to_string(),
                sync_mode: SyncMode::Manual, // Populated when users submit
                sync_frequency: None,
                schema: CollectionSchema {
                    primary_key: "id".to_string(),
                    display_field: "subject".to_string(),
                    preview_fields: vec!["name".to_string(), "email".to_string(), "created_at".to_string()],
                    fields: vec![
                        CollectionFieldDef::new("id", CollectionFieldType::String, "ID").required(),
                        CollectionFieldDef::new("name", CollectionFieldType::String, "Name").searchable(),
                        CollectionFieldDef::new("email", CollectionFieldType::String, "Email").required().searchable(),
                        CollectionFieldDef::new("phone", CollectionFieldType::String, "Phone"),
                        CollectionFieldDef::new("subject", CollectionFieldType::String, "Subject").searchable(),
                        CollectionFieldDef::new("message", CollectionFieldType::String, "Message").required().searchable(),
                        CollectionFieldDef::new("is_read", CollectionFieldType::Boolean, "Read").filterable(),
                        CollectionFieldDef::new("is_archived", CollectionFieldType::Boolean, "Archived").filterable(),
                        CollectionFieldDef::new("created_at", CollectionFieldType::DateTime, "Received").sortable(),
                    ],
                },
            },
        ],
        variables: vec![
            VariableDefinition::computed(
                "contact_total_messages",
                "Total Messages",
                VariableType::Number,
                VariableComputation::count("contact_submissions")
            ),
        ],
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

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_get_extension_catalog() {
        let catalog = get_extension_catalog();
        assert!(!catalog.is_empty());
        
        // All extensions should have required fields
        for extension in &catalog {
            assert!(!extension.slug.is_empty());
            assert!(!extension.name.is_empty());
            assert!(!extension.version.is_empty());
        }
    }

    #[test]
    fn test_get_extension_by_slug() {
        let github = get_extension_by_slug("github-sync");
        assert!(github.is_some());
        assert_eq!(github.unwrap().name, "Github Sync");

        let nonexistent = get_extension_by_slug("nonexistent");
        assert!(nonexistent.is_none());
    }

    #[test]
    fn test_github_extension_schema() {
        let github = get_extension_by_slug("github-sync").unwrap();
        let schema = github.config_schema.unwrap();
        
        assert!(schema.fields.is_some());
        let fields = schema.fields.unwrap();
        assert!(fields.iter().any(|f| f.key == "github_username"));
    }

    #[test]
    fn test_schema_serialization() {
        let catalog = get_extension_catalog();
        for extension in catalog {
            let json = serde_json::to_string(&extension).unwrap();
            assert!(!json.is_empty());
            
            // Should deserialize back
            let _: ExtensionDefinition = serde_json::from_str(&json).unwrap();
        }
    }
}
