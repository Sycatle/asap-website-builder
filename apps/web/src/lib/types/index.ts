/**
 * Centralized type exports
 * 
 * All types are organized by domain in separate files.
 * Import from this index for convenience.
 */

// Common/generic types
export {
  type JsonValue,
  type JsonObject,
  type SettingsObject,
  type FormFieldValue,
  type FormValues,
  isJsonObject,
  isJsonValue,
} from './common';

// Website types
export {
  type Website,
  type CreateWebsiteRequest,
  type UpdateWebsiteRequest,
  type WebsiteProfile,
  type WebsiteProject,
  type ThemeSettings,
  type WebsiteData,
} from './website';

// Page types
export {
  type Page,
  type CreatePageRequest,
  type UpdatePageRequest,
  type ReorderPagesRequest,
} from './page';

// Element types
export {
  type ElementType,
  type WebsiteElement,
  type CreateElementRequest,
  type UpdateElementRequest,
  type ReorderElementsRequest,
} from './element';

// Extension types
export {
  type FieldType,
  type ConfigField,
  type ConfigAction,
  type DataDisplayField,
  type DataDisplay,
  type ConfigSchema,
  type Extension,
  type ExtensionData,
  type WebsiteExtension,
  type ActivateExtensionRequest,
  type UpdateExtensionSettingsRequest,
  type GitHubExtensionData,
  type BlogExtensionData,
  type ContactExtensionData,
  type ExtensionDataPayload,
} from './extension';

// Auth types
export {
  type SignupRequest,
  type SignupResponse,
  type LoginRequest,
  type LoginResponse,
  type MeResponse,
  type ChangePasswordRequest,
  type ForgotPasswordRequest,
  type ResetPasswordRequest,
  type RefreshTokenRequest,
  type TokenPairResponse,
  type UpdateGitHubIntegrationRequest,
  type UserData,
  type SessionInfo,
  type ListSessionsResponse,
  type RevokeSessionRequest,
} from './auth';

// File types
export {
  type FileMetadata,
  type QuotaUsage,
} from './file';

// Notification types
export {
  type Notification,
  type NotificationCategory,
  type NotificationPriority,
  type NotificationListResponse,
  type NotificationFilters,
  type MarkReadRequest,
} from './notification';

// WebSocket types
export {
  type PresenceUser,
  type WebSocketEventData,
  type ChangelogEntry,
} from './websocket';
