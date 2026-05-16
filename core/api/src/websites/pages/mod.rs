//! Website pages management
//!
//! Split into focused submodules:
//! - `list` — `GET /websites/:id/pages` (auth) and the public pages endpoint
//! - `detail` — `GET /websites/:id/pages/:page_id`
//! - `crud` — create / update / delete
//! - `reorder` — bulk reorder endpoint

use serde::{Deserialize, Serialize};
use uuid::Uuid;

mod crud;
mod detail;
mod list;
mod reorder;

pub use crud::{create_page, delete_page, update_page};
pub use detail::get_page;
pub use list::{get_public_website_pages, list_website_pages};
pub use reorder::reorder_pages;

#[derive(Debug, Serialize, sqlx::FromRow)]
pub struct WebsitePage {
    pub id: Uuid,
    pub website_id: Uuid,
    pub slug: String,
    pub title: String,
    pub description: String,
    pub is_homepage: bool,
    pub order: i32,
    pub visible: bool,
    pub metadata: serde_json::Value,
}

#[derive(Debug, Serialize)]
pub struct WebsitePageResponse {
    pub id: String,
    pub website_id: String,
    pub slug: String,
    pub title: String,
    pub description: String,
    pub is_homepage: bool,
    pub order: i32,
    pub visible: bool,
    pub metadata: serde_json::Value,
}

impl From<WebsitePage> for WebsitePageResponse {
    fn from(page: WebsitePage) -> Self {
        Self {
            id: page.id.to_string(),
            website_id: page.website_id.to_string(),
            slug: page.slug,
            title: page.title,
            description: page.description,
            is_homepage: page.is_homepage,
            order: page.order,
            visible: page.visible,
            metadata: page.metadata,
        }
    }
}

#[derive(Debug, Deserialize)]
pub struct CreatePageRequest {
    pub slug: String,
    pub title: String,
    pub description: Option<String>,
    pub is_homepage: Option<bool>,
    pub order: Option<i32>,
    pub visible: Option<bool>,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct UpdatePageRequest {
    pub slug: Option<String>,
    pub title: Option<String>,
    pub description: Option<String>,
    pub is_homepage: Option<bool>,
    pub order: Option<i32>,
    pub visible: Option<bool>,
    pub metadata: Option<serde_json::Value>,
}

#[derive(Debug, Deserialize)]
pub struct ReorderPagesRequest {
    pub page_ids: Vec<String>,
}
