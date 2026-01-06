pub mod users;
pub mod websites;
pub mod events;
pub mod integrations;
pub mod errors;
pub mod storage;
pub mod extension_schema;
pub mod administrators;
pub mod collections;
pub mod extensions;

pub use users::{Account, AccountData};
pub use websites::{
    Website, WebsiteData, WebsiteStatus, CreationMode,
    Extension, WebsiteExtension, WebsiteElement, ElementType, ElementLayout,
    Preset, PresetConfig, PresetElementConfig,
};
pub use events::{Event, EventType};
pub use integrations::{Integration, GitHubIntegration};
pub use errors::{DomainError, Result};
pub use storage::{File, AccountStorageQuota, FileUploadRequest, FileUploadResponse, StorageQuotaResponse, FileVisibility, FileFolder};
pub use extension_schema::{
    ConfigSchema, ConfigField, ConfigAction, ConfigSection,
    DataDisplay, DataDisplayField, FieldType, FieldValidation,
    ActionStyle, HttpMethod, DataDisplayType, DisplayFieldType,
    SelectOption, StatItem,
};
pub use administrators::{
    WebsiteAdministrator, AdministratorRole, AdministratorStatus,
    AdministratorPermissions, InviteAdministratorRequest, UpdateAdministratorRequest,
    AdministratorAuditLog,
};
pub use collections::{
    // Schema definitions (for extensions)
    CollectionDefinition, CollectionSchema, CollectionFieldDef, CollectionFieldType,
    SyncMode, SyncFrequency, VariableDefinition, VariableSourceDef, VariableComputation,
    ComputeOperation,
    // Instance types (stored per website)
    WebsiteCollection, CollectionItem, SyncStatus,
    WebsiteVariable, VariableType, VariableSource,
    // Binding types (for Studio)
    DataBinding, CollectionBinding, FilterClause, FilterOperator, SortClause, SortOrder,
    // Request/Response types
    UpsertCollectionRequest, SetVariableRequest, CollectionQuery,
    CollectionResponse, VariablesResponse, PaginationInfo,
    // Helper
    field,
};
pub use extensions::{
    // Manifest types
    ExtensionManifest, ExtensionMetadata, ExtensionCategory, ExtensionAuthor, PlanTier,
    // Permissions
    Permissions, PermissionScope,
    // Fields
    ManifestField, ManifestFieldType, ManifestSelectOption, ManifestFieldValidation, ManifestFieldConditions,
    // Sections & Actions
    ManifestSection, ManifestAction, ManifestHttpMethod,
    // Data Display
    ManifestDataDisplay, ManifestDisplayType, ManifestDataField, ManifestDataFieldType,
    // Other
    ManifestWebhook, ManifestLifecycle, ManifestAssets, ManifestScreenshot, ManifestPricing, PricingModel, PricingInterval,
    // Validation
    ManifestValidationError,
    // Parser
    parse_manifest, parse_manifest_file, ManifestParseError,
};
