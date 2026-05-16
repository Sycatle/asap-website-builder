pub mod administrators;
pub mod collections;
pub mod design_tokens;
pub mod design_tokens_derive;
pub mod variant_catalog;
pub mod errors;
pub mod events;
pub mod extension_schema;
pub mod extensions;
pub mod integrations;
pub mod storage;
pub mod templates;
pub mod users;
pub mod websites;

pub use administrators::{
    AdministratorAuditLog, AdministratorPermissions, AdministratorRole, AdministratorStatus,
    InviteAdministratorRequest, UpdateAdministratorRequest, WebsiteAdministrator,
};
pub use collections::{
    // Helper
    field,
    CollectionBinding,
    // Schema definitions (for extensions)
    CollectionDefinition,
    CollectionFieldDef,
    CollectionFieldType,
    CollectionItem,
    CollectionQuery,
    CollectionResponse,
    CollectionSchema,
    ComputeOperation,
    // Binding types (for Studio)
    DataBinding,
    FilterClause,
    FilterOperator,
    PaginationInfo,
    SetVariableRequest,
    SortClause,
    SortOrder,
    SyncFrequency,
    SyncMode,
    SyncStatus,
    // Request/Response types
    UpsertCollectionRequest,
    VariableComputation,
    VariableDefinition,
    VariableSource,
    VariableSourceDef,
    VariableType,
    VariablesResponse,
    // Instance types (stored per website)
    WebsiteCollection,
    WebsiteVariable,
};
pub use design_tokens::{
    ColorMode, DensityScale, DesignTokens, Formality, MotionIntensity, MotionTokens, PaletteTokens,
    RadiusPhilosophy, RadiusTokens, ShadowPhilosophy, ShadowTokens, SpacingTokens,
    TypographyTokens, VoiceTokens,
};
pub use design_tokens_derive::{derive_tokens, hex_to_hsl, hsl_to_hex, BrandBrief, HarmonyScheme};
pub use variant_catalog::{
    default_variant_key_for, find_variant, validate_variant, variant_catalog,
    VariantParamSpec, VariantParamType, VariantSpec, VariantValidation,
};
pub use errors::{DomainError, Result};
pub use events::{Event, EventType};
pub use extension_schema::{
    ActionStyle, ConfigAction, ConfigField, ConfigSchema, ConfigSection, DataDisplay,
    DataDisplayField, DataDisplayType, DisplayFieldType, FieldType, FieldValidation, HttpMethod,
    SelectOption, StatItem,
};
pub use extensions::{
    // Parser
    parse_manifest,
    parse_manifest_file,
    ExtensionAuthor,
    ExtensionCategory,
    // Manifest types
    ExtensionManifest,
    ExtensionMetadata,
    ManifestAction,
    ManifestAssets,
    // Data Display
    ManifestDataDisplay,
    ManifestDataField,
    ManifestDataFieldType,
    ManifestDisplayType,
    // Fields
    ManifestField,
    ManifestFieldConditions,
    ManifestFieldType,
    ManifestFieldValidation,
    ManifestHttpMethod,
    ManifestLifecycle,
    ManifestParseError,
    ManifestPricing,
    ManifestScreenshot,
    // Sections & Actions
    ManifestSection,
    ManifestSelectOption,
    // Validation
    ManifestValidationError,
    // Other
    ManifestWebhook,
    PermissionScope,
    // Permissions
    Permissions,
    PlanTier,
    PricingInterval,
    PricingModel,
};
pub use integrations::{GitHubIntegration, Integration};
pub use storage::{
    AccountStorageQuota, File, FileFolder, FileUploadRequest, FileUploadResponse, FileVisibility,
    StorageQuotaResponse,
};
pub use templates::{
    CreateElementTemplateRequest, ElementTemplate, ElementTemplateSummary,
    ListElementTemplatesQuery, UpdateElementTemplateRequest,
};
pub use users::{Account, AccountData};
pub use websites::{
    CreationMode, ElementLayout, ElementType, Extension, Preset, PresetConfig, PresetElementConfig,
    Website, WebsiteData, WebsiteElement, WebsiteExtension, WebsiteStatus,
};
