//! Extension Store API Tests
//!
//! Unit tests for the store module responses and types.
//! Integration tests requiring DB are run separately.

use super::*;

#[test]
fn test_extension_summary_serialization() {
    let summary = ExtensionSummary {
        slug: "github-sync".to_string(),
        name: "GitHub Sync".to_string(),
        description: "Sync your repositories".to_string(),
        icon: Some("github".to_string()),
        category: "integration".to_string(),
        tags: vec!["github".to_string(), "sync".to_string()],
        min_plan: "free".to_string(),
        author_name: Some("ASAP".to_string()),
        author_verified: true,
        version: "1.0.0".to_string(),
        featured: true,
        beta: false,
        deprecated: false,
        install_count: 100,
        rating: Some(4.5),
        rating_count: 10,
        installed: Some(true),
    };

    let json = serde_json::to_value(&summary).unwrap();

    assert_eq!(json["slug"], "github-sync");
    assert_eq!(json["name"], "GitHub Sync");
    assert_eq!(json["featured"], true);
    assert_eq!(json["rating"], 4.5);
    assert_eq!(json["installed"], true);
}

#[test]
fn test_extension_summary_serialization_installed_none() {
    let summary = ExtensionSummary {
        slug: "test".to_string(),
        name: "Test".to_string(),
        description: "Test extension".to_string(),
        icon: None,
        category: "utility".to_string(),
        tags: vec![],
        min_plan: "free".to_string(),
        author_name: None,
        author_verified: false,
        version: "1.0.0".to_string(),
        featured: false,
        beta: false,
        deprecated: false,
        install_count: 0,
        rating: None,
        rating_count: 0,
        installed: None,
    };

    let json = serde_json::to_value(&summary).unwrap();

    // installed should be omitted when None
    assert!(json.get("installed").is_none());
    assert!(json.get("icon").unwrap().is_null());
}

#[test]
fn test_extension_list_response() {
    let response = ExtensionListResponse {
        extensions: vec![],
        total: 100,
        page: 2,
        per_page: 20,
        has_more: true,
    };

    let json = serde_json::to_value(&response).unwrap();

    assert_eq!(json["total"], 100);
    assert_eq!(json["page"], 2);
    assert_eq!(json["per_page"], 20);
    assert_eq!(json["has_more"], true);
    assert!(json["extensions"].as_array().unwrap().is_empty());
}

#[test]
fn test_extension_detail_response() {
    let detail = ExtensionDetailResponse {
        slug: "analytics".to_string(),
        name: "Analytics".to_string(),
        version: "2.0.0".to_string(),
        description: "Track your visitors".to_string(),
        long_description: Some("Full description here...".to_string()),
        icon: None,
        banner: Some("banner.png".to_string()),
        category: "analytics".to_string(),
        tags: vec!["metrics".to_string()],
        min_plan: "pro".to_string(),
        author: Some(AuthorInfo {
            name: "ASAP Team".to_string(),
            verified: true,
        }),
        featured: false,
        beta: true,
        deprecated: false,
        install_count: 500,
        rating: Some(4.8),
        rating_count: 25,
        manifest: serde_json::json!({"version": "2.0.0"}),
        created_at: "2024-01-01T00:00:00Z".to_string(),
        updated_at: "2024-06-01T00:00:00Z".to_string(),
        installed: None,
    };

    let json = serde_json::to_value(&detail).unwrap();

    assert_eq!(json["slug"], "analytics");
    assert_eq!(json["min_plan"], "pro");
    assert_eq!(json["beta"], true);
    assert!(json["author"]["verified"].as_bool().unwrap());
}

#[test]
fn test_categories_response() {
    let response = CategoriesResponse {
        categories: vec![
            CategoryInfo {
                slug: "integration".to_string(),
                name: "Integrations".to_string(),
                count: 5,
            },
            CategoryInfo {
                slug: "analytics".to_string(),
                name: "Analytics".to_string(),
                count: 3,
            },
        ],
    };

    let json = serde_json::to_value(&response).unwrap();
    let categories = json["categories"].as_array().unwrap();

    assert_eq!(categories.len(), 2);
    assert_eq!(categories[0]["slug"], "integration");
    assert_eq!(categories[0]["name"], "Integrations");
    assert_eq!(categories[0]["count"], 5);
}

#[test]
fn test_category_display_names() {
    assert_eq!(category_display_name("utility"), "Utilities");
    assert_eq!(category_display_name("integration"), "Integrations");
    assert_eq!(category_display_name("analytics"), "Analytics");
    assert_eq!(category_display_name("marketing"), "Marketing");
    assert_eq!(category_display_name("design"), "Design");
    assert_eq!(category_display_name("seo"), "SEO");
    assert_eq!(category_display_name("security"), "Security");
    assert_eq!(category_display_name("performance"), "Performance");
    assert_eq!(category_display_name("social"), "Social");
    assert_eq!(category_display_name("ai"), "AI");
    // Unknown returns as-is
    assert_eq!(category_display_name("custom"), "custom");
}

#[test]
fn test_query_default_values() {
    assert_eq!(default_sort(), "popular");
    assert_eq!(default_page(), 1);
    assert_eq!(default_per_page(), 20);
}

#[test]
fn test_list_extensions_query_defaults() {
    // Test default values via functions
    assert_eq!(default_sort(), "popular");
    assert_eq!(default_page(), 1);
    assert_eq!(default_per_page(), 20);
}
