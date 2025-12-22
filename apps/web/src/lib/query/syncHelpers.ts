/**
 * Sync Helpers for WebSocket → React Query cache updates
 * 
 * These helpers ensure that WebSocket events don't create duplicates
 * when the React Query cache has already been updated by a mutation.
 */

import { QueryClient } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';
import type { 
  Website, 
  Page, 
  WebsiteElement, 
  FileMetadata,
  WebsiteExtension 
} from '../types';

// ============================================
// GENERIC HELPERS
// ============================================

/**
 * Normalize element data (ensure order_index is set from order)
 */
function normalizeElement(element: WebsiteElement): WebsiteElement {
  return {
    ...element,
    order_index: element.order_index ?? element.order ?? 0,
  };
}

/**
 * Upsert an item in a list (add if not exists, update if exists)
 */
function upsertInList<T extends { id: string }>(
  list: T[] | undefined,
  newItem: T,
  sortFn?: (a: T, b: T) => number
): T[] {
  if (!list) return [newItem];
  
  const index = list.findIndex(item => item.id === newItem.id);
  if (index >= 0) {
    // Update existing item
    const updated = [...list];
    updated[index] = newItem;
    return sortFn ? updated.sort(sortFn) : updated;
  }
  
  // Add new item
  const result = [...list, newItem];
  return sortFn ? result.sort(sortFn) : result;
}

/**
 * Remove an item from a list by ID
 */
function removeFromList<T extends { id: string }>(
  list: T[] | undefined,
  itemId: string
): T[] {
  if (!list) return [];
  return list.filter(item => item.id !== itemId);
}

// ============================================
// WEBSITE SYNC HELPERS
// ============================================

export function syncWebsiteCreated(queryClient: QueryClient, website: Website) {
  queryClient.setQueryData<Website[]>(queryKeys.websites.lists(), (old) =>
    upsertInList(old, website)
  );
  queryClient.setQueryData(queryKeys.websites.detail(website.id), website);
}

export function syncWebsiteUpdated(queryClient: QueryClient, website: Website) {
  queryClient.setQueryData<Website[]>(queryKeys.websites.lists(), (old) =>
    upsertInList(old, website)
  );
  queryClient.setQueryData(queryKeys.websites.detail(website.id), website);
}

export function syncWebsiteDeleted(queryClient: QueryClient, websiteId: string) {
  queryClient.setQueryData<Website[]>(queryKeys.websites.lists(), (old) =>
    removeFromList(old, websiteId)
  );
  queryClient.removeQueries({ queryKey: queryKeys.websites.detail(websiteId) });
  queryClient.removeQueries({ queryKey: queryKeys.pages.list(websiteId) });
  queryClient.removeQueries({ queryKey: queryKeys.elements.list(websiteId) });
  queryClient.removeQueries({ queryKey: queryKeys.extensions.list(websiteId) });
}

export function syncWebsitePublished(queryClient: QueryClient, websiteId: string) {
  queryClient.setQueryData<Website[]>(queryKeys.websites.lists(), (old) => {
    if (!old) return [];
    return old.map(w => w.id === websiteId ? { ...w, status: 'published' as const } : w);
  });
  queryClient.setQueryData<Website>(queryKeys.websites.detail(websiteId), (old) => {
    if (!old) return old;
    return { ...old, status: 'published' as const };
  });
}

export function syncWebsiteDataUpdated(
  queryClient: QueryClient, 
  websiteId: string, 
  data: Record<string, unknown>
) {
  queryClient.setQueryData(queryKeys.websites.data(websiteId), data);
}

// ============================================
// PAGE SYNC HELPERS
// ============================================

const pageSortFn = (a: Page, b: Page) => a.order - b.order;

export function syncPageCreated(queryClient: QueryClient, websiteId: string, page: Page) {
  queryClient.setQueryData<Page[]>(queryKeys.pages.list(websiteId), (old) =>
    upsertInList(old, page, pageSortFn)
  );
  queryClient.setQueryData(queryKeys.pages.detail(websiteId, page.id), page);
}

export function syncPageUpdated(queryClient: QueryClient, websiteId: string, page: Page) {
  queryClient.setQueryData<Page[]>(queryKeys.pages.list(websiteId), (old) =>
    upsertInList(old, page, pageSortFn)
  );
  queryClient.setQueryData(queryKeys.pages.detail(websiteId, page.id), page);
}

export function syncPageDeleted(queryClient: QueryClient, websiteId: string, pageId: string) {
  queryClient.setQueryData<Page[]>(queryKeys.pages.list(websiteId), (old) =>
    removeFromList(old, pageId)
  );
  queryClient.removeQueries({ queryKey: queryKeys.pages.detail(websiteId, pageId) });
}

export function syncPagesReordered(queryClient: QueryClient, websiteId: string, pageIds: string[]) {
  queryClient.setQueryData<Page[]>(queryKeys.pages.list(websiteId), (old) => {
    if (!old) return [];
    return pageIds.map((id, index) => {
      const page = old.find(p => p.id === id);
      return page ? { ...page, order: index } : null;
    }).filter((p): p is Page => p !== null);
  });
}

// ============================================
// ELEMENT SYNC HELPERS
// ============================================

const elementSortFn = (a: WebsiteElement, b: WebsiteElement) => a.order - b.order;

export function syncElementCreated(queryClient: QueryClient, websiteId: string, element: WebsiteElement) {
  // Validate element has required id field
  if (!element?.id) {
    console.warn('[syncElementCreated] Element missing id, skipping sync:', element);
    return;
  }
  const normalized = normalizeElement(element);
  queryClient.setQueryData<WebsiteElement[]>(queryKeys.elements.list(websiteId), (old) =>
    upsertInList(old, normalized, elementSortFn)
  );
  queryClient.setQueryData(queryKeys.elements.detail(websiteId, element.id), normalized);
}

export function syncElementUpdated(
  queryClient: QueryClient, 
  websiteId: string, 
  elementId: string,
  updates: Partial<WebsiteElement>
) {
  // Validate element_id
  if (!elementId) {
    console.warn('[syncElementUpdated] Missing element_id, skipping sync');
    return;
  }
  
  // Filter out null/undefined values from updates (only merge actual changes)
  const cleanUpdates: Partial<WebsiteElement> = {};
  for (const [key, value] of Object.entries(updates)) {
    if (value !== null && value !== undefined) {
      (cleanUpdates as Record<string, unknown>)[key] = value;
    }
  }
  
  queryClient.setQueryData<WebsiteElement[]>(queryKeys.elements.list(websiteId), (old) => {
    if (!old) return [];
    return old.map(el => {
      if (el.id === elementId) {
        // Merge only non-null updates with existing element
        const updated = { ...el, ...cleanUpdates };
        return normalizeElement(updated);
      }
      return el;
    }).sort(elementSortFn);
  });
  
  // Also update the individual element cache
  queryClient.setQueryData<WebsiteElement>(
    queryKeys.elements.detail(websiteId, elementId),
    (old) => old ? normalizeElement({ ...old, ...cleanUpdates }) : undefined
  );
}

export function syncElementDeleted(queryClient: QueryClient, websiteId: string, elementId: string) {
  queryClient.setQueryData<WebsiteElement[]>(queryKeys.elements.list(websiteId), (old) =>
    removeFromList(old, elementId)
  );
  queryClient.removeQueries({ queryKey: queryKeys.elements.detail(websiteId, elementId) });
}

export function syncElementsReordered(queryClient: QueryClient, websiteId: string, elementIds: string[]) {
  queryClient.setQueryData<WebsiteElement[]>(queryKeys.elements.list(websiteId), (old) => {
    if (!old) return [];
    return elementIds.map((id, index) => {
      const element = old.find(el => el.id === id);
      return element ? { ...element, order: index } : null;
    }).filter((el): el is WebsiteElement => el !== null);
  });
}

// ============================================
// EXTENSION SYNC HELPERS
// ============================================

export function syncExtensionActivated(
  queryClient: QueryClient, 
  websiteId: string, 
  extension: WebsiteExtension
) {
  queryClient.setQueryData<WebsiteExtension[]>(
    queryKeys.extensions.list(websiteId),
    (old) => upsertInList(old, extension)
  );
}

export function syncExtensionDeactivated(
  queryClient: QueryClient, 
  websiteId: string, 
  extensionId: string
) {
  queryClient.setQueryData<WebsiteExtension[]>(
    queryKeys.extensions.list(websiteId),
    (old) => removeFromList(old, extensionId)
  );
}

export function syncExtensionConfigured(
  queryClient: QueryClient, 
  websiteId: string, 
  extensionId: string, 
  settings: Record<string, unknown>
) {
  queryClient.setQueryData<WebsiteExtension[]>(
    queryKeys.extensions.list(websiteId),
    (old) => {
      if (!old) return [];
      return old.map(ext => ext.id === extensionId ? { ...ext, settings } : ext);
    }
  );
}

// ============================================
// FILE SYNC HELPERS
// ============================================

export function syncFileUploaded(queryClient: QueryClient, file: FileMetadata) {
  queryClient.setQueryData<FileMetadata[]>(queryKeys.files.list(), (old) => {
    if (!old) return [file];
    // Check if file already exists (deduplicate)
    const exists = old.some(f => f.id === file.id);
    if (exists) {
      return old.map(f => f.id === file.id ? file : f);
    }
    return [file, ...old];
  });
  // Invalidate quota
  queryClient.invalidateQueries({ queryKey: queryKeys.files.quota() });
}

export function syncFileDeleted(queryClient: QueryClient, fileId: string) {
  queryClient.setQueryData<FileMetadata[]>(queryKeys.files.list(), (old) =>
    removeFromList(old, fileId)
  );
  // Invalidate quota
  queryClient.invalidateQueries({ queryKey: queryKeys.files.quota() });
}
