// Query Client & Configuration
export { queryClient } from './queryClient';
export { queryKeys, staleTimes } from './queryKeys';

// Sync Helpers (for WebSocket → cache updates)
export {
  syncWebsiteCreated,
  syncWebsiteUpdated,
  syncWebsiteDeleted,
  syncWebsitePublished,
  syncWebsiteDataUpdated,
  syncPageCreated,
  syncPageUpdated,
  syncPageDeleted,
  syncPagesReordered,
  syncElementCreated,
  syncElementUpdated,
  syncElementDeleted,
  syncElementsReordered,
  syncExtensionActivated,
  syncExtensionDeactivated,
  syncExtensionConfigured,
  syncFileUploaded,
  syncFileDeleted,
} from './syncHelpers';

// Website Queries & Mutations
export {
  useWebsitesQuery,
  useWebsiteQuery,
  useWebsiteDataQuery,
  useUpdateWebsiteMutation,
  useCreateWebsiteMutation,
  useDeleteWebsiteMutation,
  usePublishWebsiteMutation,
  useUpdateWebsiteDataMutation,
} from './websites';

// Page Queries & Mutations
export {
  usePagesQuery,
  usePageQuery,
  useCreatePageMutation,
  useUpdatePageMutation,
  useDeletePageMutation,
  useReorderPagesMutation,
  useHomepage,
  usePageBySlug,
} from './pages';

// Element Queries & Mutations
export {
  useElementsQuery,
  useElementQuery,
  useCreateElementMutation,
  useUpdateElementMutation,
  useDeleteElementMutation,
  useReorderElementsMutation,
  useElementsByType,
  useVisibleElements,
} from './elements';

// Extension Queries & Mutations
export {
  useExtensionCatalogQuery,
  useWebsiteExtensionsQuery,
  useExtensionDataQuery,
  useActivateExtensionMutation,
  useDeactivateExtensionMutation,
  useUpdateExtensionSettingsMutation,
  useTriggerExtensionActionMutation,
} from './extensions';

// Files Queries & Mutations
export {
  useFilesQuery,
  useWebsiteFilesQuery,
  useQuotaQuery,
  useFoldersQuery,
  useUploadFileMutation,
  useUpdateFileMutation,
  useDeleteFileMutation,
  useDeleteFilesMutation,
  useCreateFolderMutation,
  useUpdateFolderMutation,
  useDeleteFolderMutation,
} from './files';

// Administrator Queries
export {
  useAdministratorsQuery,
  type Administrator,
} from './administrators';

// User Queries
export { useUserQuery } from './user';

// Composite Hooks (combine multiple queries)
export {
  useWebsiteData,
  useWebsitesList,
  useWebsiteEditor,
  useWebsitePreview,
} from './composites';
