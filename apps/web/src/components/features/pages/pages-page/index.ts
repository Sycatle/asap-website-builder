// Barrel export for pages-page module
export { PagesPage, PagesPage as default } from "./pages-page";

// Export types for external use
export type {
  PageStats,
  PageFormData,
  DragState,
  DialogState,
  StatsCardsProps,
  PageListItemProps,
  PageListProps,
  CreatePageDialogProps,
  EditPageDialogProps,
  DeletePageDialogProps,
} from "./types";
export { PUBLIC_DOMAIN } from "./types";

// Export hooks for potential reuse
export {
  usePagesPageData,
  usePageForm,
  usePageDialogs,
  usePageMutations,
  useDragAndDrop,
  useSearchFilter,
} from "./hooks";

// Export components for potential reuse
export { StatsCards } from "./components/stats-cards";
export { PageListItem } from "./components/page-list-item";
export { PageList } from "./components/page-list";
export { CreatePageDialog, EditPageDialog, DeletePageDialog } from "./components/page-dialogs";
export { PagesPageSkeleton } from "./components/pages-page-skeleton";
