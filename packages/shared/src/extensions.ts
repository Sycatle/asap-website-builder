/**
 * @asap/shared - Extension Store Types
 * 
 * TypeScript mirror of Rust types from core/domain/src/extensions/manifest.rs
 * These types are the single source of truth for frontend extension handling.
 * 
 * KEEP IN SYNC WITH: core/domain/src/extensions/manifest.rs
 */

// ============================================================================
// Core Extension Metadata
// ============================================================================

/**
 * Complete extension manifest structure
 */
export interface ExtensionManifest {
  /** Core extension metadata (required) */
  extension: ExtensionMetadata;
  
  /** Permission requirements */
  permissions?: Permissions;
  
  /** Default configuration values */
  default_settings?: Record<string, unknown>;
  
  /** Configuration fields for UI generation */
  fields?: ManifestField[];
  
  /** Logical grouping of fields */
  sections?: ManifestSection[];
  
  /** User-triggerable actions */
  actions?: ManifestAction[];
  
  /** Data visualization components */
  data_display?: ManifestDataDisplay[];
  
  /** Webhook configurations */
  webhooks?: ManifestWebhook[];
  
  /** Lifecycle hooks */
  lifecycle?: ManifestLifecycle;
  
  /** Extension assets (icons, screenshots) */
  assets?: ManifestAssets;
  
  /** Pricing configuration */
  pricing?: ManifestPricing;
}

/**
 * Core extension metadata
 */
export interface ExtensionMetadata {
  /** Unique identifier (kebab-case) */
  slug: string;
  
  /** Display name */
  name: string;
  
  /** Semantic version */
  version: string;
  
  /** Short description */
  description: string;
  
  /** Detailed description with markdown support */
  long_description?: string;
  
  /** Extension category */
  category: ExtensionCategory;
  
  /** Search tags */
  tags?: string[];
  
  /** Icon name (lucide) or URL */
  icon?: string;
  
  /** Author information */
  author?: ExtensionAuthor;
  
  /** Repository URL */
  repository?: string;
  
  /** Homepage URL */
  homepage?: string;
  
  /** Documentation URL */
  documentation?: string;
  
  /** Whether users can configure this extension */
  user_configurable?: boolean;
  
  /** Order in sidebar navigation */
  sidebar_order?: number;
  
  /** Label shown in sidebar */
  sidebar_label?: string;
  
  /** Minimum plan required */
  min_plan?: PlanTier;
  
  /** Beta status */
  beta?: boolean;
  
  /** Deprecated status */
  deprecated?: boolean;
  
  /** Replacement extension slug if deprecated */
  successor?: string;
}

/**
 * Extension author information
 */
export interface ExtensionAuthor {
  name: string;
  email?: string;
  url?: string;
  verified?: boolean;
}

/**
 * Extension categories for store browsing
 */
export type ExtensionCategory =
  | 'utility'
  | 'integration'
  | 'analytics'
  | 'marketing'
  | 'design'
  | 'seo'
  | 'security'
  | 'performance'
  | 'social'
  | 'ai';

/**
 * Plan tier requirement
 */
export type PlanTier = 'free' | 'starter' | 'pro' | 'business';

// ============================================================================
// Permissions
// ============================================================================

/**
 * Extension permission requirements
 */
export interface Permissions {
  /** Permission scopes */
  scopes?: PermissionScope[];
  
  /** Specific data types accessed */
  data_access?: string[];
  
  /** External services used */
  external_services?: string[];
}

/**
 * Available permission scopes
 */
export type PermissionScope =
  | 'website:read'
  | 'website:write'
  | 'account:read'
  | 'account:write'
  | 'analytics:read'
  | 'analytics:write'
  | 'storage:read'
  | 'storage:write'
  | 'notifications:send'
  | 'webhooks:manage'
  | 'integrations:github'
  | 'integrations:stripe'
  | 'integrations:analytics';

// ============================================================================
// Configuration Fields
// ============================================================================

/**
 * A configuration field definition
 */
export interface ManifestField {
  /** Unique field identifier (snake_case) */
  id: string;
  
  /** Field input type */
  type: ManifestFieldType;
  
  /** Display label */
  label: string;
  
  /** Help text */
  description?: string;
  
  /** Placeholder text */
  placeholder?: string;
  
  /** Whether required */
  required?: boolean;
  
  /** Default value */
  default?: unknown;
  
  /** Options for select fields */
  options?: ManifestSelectOption[];
  
  /** Validation rules */
  validation?: ManifestFieldValidation;
  
  /** Conditional visibility */
  conditions?: ManifestFieldConditions;
  
  /** Group identifier */
  group?: string;
  
  /** Show in advanced settings */
  advanced?: boolean;
  
  /** Sensitive (mask/encrypt) */
  sensitive?: boolean;
}

/**
 * Supported field types
 */
export type ManifestFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'boolean'
  | 'select'
  | 'multiselect'
  | 'url'
  | 'email'
  | 'password'
  | 'color'
  | 'date'
  | 'datetime'
  | 'file'
  | 'image'
  | 'json'
  | 'code'
  | 'markdown';

/**
 * Option for select/multiselect fields
 */
export interface ManifestSelectOption {
  value: string;
  label: string;
  description?: string;
  icon?: string;
  disabled?: boolean;
}

/**
 * Field validation rules
 */
export interface ManifestFieldValidation {
  min?: number;
  max?: number;
  pattern?: string;
  message?: string;
  allowed_extensions?: string[];
  max_size?: number;
}

/**
 * Conditional visibility rules
 */
export interface ManifestFieldConditions {
  show_when?: Record<string, unknown>;
  hide_when?: Record<string, unknown>;
  require_when?: Record<string, unknown>;
}

// ============================================================================
// Sections
// ============================================================================

/**
 * Logical grouping of fields
 */
export interface ManifestSection {
  /** Unique section identifier */
  id: string;
  
  /** Section title */
  title: string;
  
  /** Section description */
  description?: string;
  
  /** Section icon */
  icon?: string;
  
  /** Field IDs in this section */
  fields?: string[];
  
  /** Whether collapsible */
  collapsible?: boolean;
  
  /** Whether collapsed by default */
  collapsed_by_default?: boolean;
  
  /** Conditional visibility */
  conditions?: ManifestFieldConditions;
}

// ============================================================================
// Actions
// ============================================================================

/**
 * User-triggerable action
 */
export interface ManifestAction {
  /** Unique action identifier */
  id: string;
  
  /** Button label */
  label: string;
  
  /** Action description */
  description?: string;
  
  /** API endpoint to call */
  endpoint: string;
  
  /** HTTP method */
  method?: ManifestHttpMethod;
  
  /** Button icon */
  icon?: string;
  
  /** Primary action styling */
  primary?: boolean;
  
  /** Destructive action styling */
  destructive?: boolean;
  
  /** Confirmation message */
  confirm?: string;
  
  /** Refresh data after action */
  refresh_after?: boolean;
  
  /** Success toast message */
  success_message?: string;
  
  /** Error toast message */
  error_message?: string;
  
  /** Conditional visibility */
  conditions?: ManifestFieldConditions;
}

/**
 * HTTP methods for actions
 */
export type ManifestHttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';

// ============================================================================
// Data Display
// ============================================================================

/**
 * Data visualization component
 */
export interface ManifestDataDisplay {
  /** Unique identifier */
  id: string;
  
  /** Display type */
  type: ManifestDisplayType;
  
  /** Component title */
  title?: string;
  
  /** Component description */
  description?: string;
  
  /** Data source endpoint */
  data_source?: string;
  
  /** Empty state message */
  empty_message?: string;
  
  /** Fields to display */
  fields?: ManifestDataField[];
  
  /** Available actions per item */
  actions?: string[];
  
  /** Enable pagination */
  pagination?: boolean;
  
  /** Items per page */
  page_size?: number;
  
  /** Enable sorting */
  sortable?: boolean;
  
  /** Enable filtering */
  filterable?: boolean;
}

/**
 * Display component types
 */
export type ManifestDisplayType =
  | 'list'
  | 'table'
  | 'grid'
  | 'chart'
  | 'stat'
  | 'timeline'
  | 'custom';

/**
 * Data field for display components
 */
export interface ManifestDataField {
  /** Field identifier (maps to data key) */
  id: string;
  
  /** Display type */
  type: ManifestDataFieldType;
  
  /** Column/field label */
  label: string;
  
  /** Field to use as link URL */
  link_to?: string;
  
  /** Format string */
  format?: string;
  
  /** Enable sorting on this field */
  sortable?: boolean;
  
  /** Column width */
  width?: string;
}

/**
 * Data field display types
 */
export type ManifestDataFieldType =
  | 'text'
  | 'number'
  | 'date'
  | 'link'
  | 'badge'
  | 'image'
  | 'boolean'
  | 'progress'
  | 'custom';

// ============================================================================
// Webhooks
// ============================================================================

/**
 * Webhook configuration
 */
export interface ManifestWebhook {
  /** Unique identifier */
  id: string;
  
  /** Event type to listen for */
  event: string;
  
  /** Endpoint to call */
  endpoint?: string;
  
  /** Enable retry */
  retry?: boolean;
  
  /** Maximum retry attempts */
  max_retries?: number;
}

// ============================================================================
// Lifecycle
// ============================================================================

/**
 * Extension lifecycle hooks
 */
export interface ManifestLifecycle {
  /** Called when installed */
  on_install?: string;
  
  /** Called when uninstalled */
  on_uninstall?: string;
  
  /** Called when enabled */
  on_enable?: string;
  
  /** Called when disabled */
  on_disable?: string;
  
  /** Called when upgraded */
  on_upgrade?: string;
  
  /** Called when configuration changes */
  on_config_change?: string;
}

// ============================================================================
// Assets
// ============================================================================

/**
 * Extension assets
 */
export interface ManifestAssets {
  /** Icon path */
  icon?: string;
  
  /** Screenshots */
  screenshots?: ManifestScreenshot[];
  
  /** Banner image path */
  banner?: string;
  
  /** Demo video URL */
  video?: string;
}

/**
 * Screenshot metadata
 */
export interface ManifestScreenshot {
  /** File path */
  path: string;
  
  /** Caption */
  caption?: string;
  
  /** Alt text */
  alt?: string;
}

// ============================================================================
// Pricing
// ============================================================================

/**
 * Extension pricing configuration
 */
export interface ManifestPricing {
  /** Pricing model */
  model?: PricingModel;
  
  /** Price in cents */
  price?: number;
  
  /** Currency code */
  currency?: string;
  
  /** Billing interval */
  interval?: PricingInterval;
  
  /** Trial period in days */
  trial_days?: number;
  
  /** Unit name for usage-based */
  usage_unit?: string;
  
  /** Price per unit in cents */
  price_per_unit?: number;
  
  /** Free units included */
  included_units?: number;
}

/**
 * Pricing models
 */
export type PricingModel = 'free' | 'one_time' | 'subscription' | 'usage_based';

/**
 * Billing intervals
 */
export type PricingInterval = 'month' | 'year';

// ============================================================================
// Extension Store Types (Frontend-specific)
// ============================================================================

/**
 * Extension listing for store display
 */
export interface ExtensionListing {
  /** Extension slug */
  slug: string;
  
  /** Display name */
  name: string;
  
  /** Short description */
  description: string;
  
  /** Category */
  category: ExtensionCategory;
  
  /** Icon */
  icon?: string;
  
  /** Author */
  author?: ExtensionAuthor;
  
  /** Version */
  version: string;
  
  /** Required plan */
  min_plan: PlanTier;
  
  /** Pricing */
  pricing?: ManifestPricing;
  
  /** Rating (1-5) */
  rating?: number;
  
  /** Number of ratings */
  rating_count?: number;
  
  /** Install count */
  install_count?: number;
  
  /** Beta flag */
  beta?: boolean;
  
  /** Deprecated flag */
  deprecated?: boolean;
  
  /** Tags for filtering */
  tags?: string[];
  
  /** Banner image */
  banner?: string;
}

/**
 * Extension detail for store page
 */
export interface ExtensionDetail extends ExtensionListing {
  /** Long description (markdown) */
  long_description?: string;
  
  /** Repository URL */
  repository?: string;
  
  /** Homepage URL */
  homepage?: string;
  
  /** Documentation URL */
  documentation?: string;
  
  /** Screenshots */
  screenshots?: ManifestScreenshot[];
  
  /** Demo video */
  video?: string;
  
  /** Permissions required */
  permissions?: Permissions;
  
  /** Changelog entries */
  changelog?: ChangelogEntry[];
  
  /** Last updated date */
  updated_at?: string;
  
  /** Created date */
  created_at?: string;
}

/**
 * Changelog entry
 */
export interface ChangelogEntry {
  version: string;
  date: string;
  changes: string[];
}

/**
 * Installed extension state
 */
export interface InstalledExtension {
  /** Extension slug */
  slug: string;
  
  /** Installed version */
  version: string;
  
  /** Whether enabled */
  enabled: boolean;
  
  /** Current configuration */
  config: Record<string, unknown>;
  
  /** Installation date */
  installed_at: string;
  
  /** Last updated */
  updated_at: string;
}

/**
 * Extension store filter options
 */
export interface ExtensionStoreFilters {
  /** Category filter */
  category?: ExtensionCategory;
  
  /** Plan filter */
  plan?: PlanTier;
  
  /** Pricing model filter */
  pricing?: PricingModel;
  
  /** Search query */
  query?: string;
  
  /** Tags filter */
  tags?: string[];
  
  /** Sort by */
  sort?: 'popular' | 'recent' | 'rating' | 'name';
  
  /** Sort direction */
  direction?: 'asc' | 'desc';
  
  /** Include beta */
  include_beta?: boolean;
  
  /** Page number */
  page?: number;
  
  /** Page size */
  limit?: number;
}

/**
 * Paginated extension list response
 */
export interface ExtensionListResponse {
  /** Extensions */
  extensions: ExtensionListing[];
  
  /** Total count */
  total: number;
  
  /** Current page */
  page: number;
  
  /** Page size */
  limit: number;
  
  /** Has more pages */
  has_more: boolean;
}

// ============================================================================
// Type Guards
// ============================================================================

/**
 * Check if a value is a valid ExtensionCategory
 */
export function isExtensionCategory(value: unknown): value is ExtensionCategory {
  return typeof value === 'string' && [
    'utility', 'integration', 'analytics', 'marketing', 'design',
    'seo', 'security', 'performance', 'social', 'ai'
  ].includes(value);
}

/**
 * Check if a value is a valid PlanTier
 */
export function isPlanTier(value: unknown): value is PlanTier {
  return typeof value === 'string' && ['free', 'starter', 'pro', 'business'].includes(value);
}

/**
 * Check if a value is a valid ManifestFieldType
 */
export function isManifestFieldType(value: unknown): value is ManifestFieldType {
  return typeof value === 'string' && [
    'text', 'textarea', 'number', 'boolean', 'select', 'multiselect',
    'url', 'email', 'password', 'color', 'date', 'datetime',
    'file', 'image', 'json', 'code', 'markdown'
  ].includes(value);
}
