// Github Sync Extension
// Fetches GitHub repositories and generates website content

pub mod client;
pub mod collections;
pub mod processor;

pub use client::GitHubClient;
pub use collections::{
    compute_github_variables, create_github_repos_collection, repos_to_collection_items,
};
pub use processor::generate_website_content;
