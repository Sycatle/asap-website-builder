// GitHub Generator Module
// Fetches GitHub repositories and generates portfolio content

pub mod client;
pub mod processor;

pub use client::GitHubClient;
pub use processor::generate_portfolio_content;
