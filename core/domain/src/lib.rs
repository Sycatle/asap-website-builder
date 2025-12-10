pub mod users;
pub mod portfolios;
pub mod websites;
pub mod events;
pub mod integrations;
pub mod errors;
pub mod storage;

pub use users::{User, Tenant, UserData};
// Legacy portfolio exports (backward compatibility)
pub use portfolios::{Portfolio, PortfolioData, PortfolioStatus};
// New website exports
pub use websites::{
    Website, WebsiteData, WebsiteStatus, CreationMode,
    Module, WebsiteModule, WebsiteSection, SectionType, SectionLayout,
    Preset, PresetConfig, PresetSectionConfig,
};
pub use events::{Event, EventType};
pub use integrations::{Integration, GitHubIntegration};
pub use errors::{DomainError, Result};
pub use storage::{File, UserStorageQuota, FileUploadRequest, FileUploadResponse, StorageQuotaResponse};
