// Github Sync Extension
// Fetches GitHub repositories and generates website content

pub mod client;
pub mod collections;
pub mod processor;

pub use client::GitHubClient;
pub use collections::{
    compute_contributions_from_events, compute_github_variables, compute_profile_variables,
    create_github_gists_collection, create_github_languages_collection,
    create_github_orgs_collection, create_github_repos_collection,
    create_github_starred_collection, gists_to_collection_items, orgs_to_collection_items,
    repos_to_collection_items, starred_to_collection_items, LanguageStats,
};
pub use processor::generate_website_content;
