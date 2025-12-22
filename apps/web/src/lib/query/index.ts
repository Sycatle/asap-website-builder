// Query Client & Configuration
export { queryClient } from './queryClient';
export { queryKeys, staleTimes } from './queryKeys';

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
  useQuotaQuery,
  useUploadFileMutation,
  useDeleteFileMutation,
  useDeleteFilesMutation,
} from './files';

// User Queries
export { useUserQuery } from './user';

// Composite Hooks (combine multiple queries)
export {
  useWebsiteData,
  useWebsitesList,
  useWebsiteEditor,
  useWebsitePreview,
} from './composites';
