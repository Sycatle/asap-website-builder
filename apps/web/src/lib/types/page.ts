/**
 * Page-related types
 */

// ============================================
// PAGE TYPES
// ============================================

export interface Page {
  id: string;
  website_id: string;
  slug: string;  // '', 'contact', 'about', etc.
  title: string;
  description: string;
  is_homepage: boolean;
  order: number;
  visible: boolean;
  metadata: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
}

export interface CreatePageRequest {
  slug: string;
  title: string;
  description?: string;
  is_homepage?: boolean;
  order?: number;
  visible?: boolean;
  metadata?: Record<string, unknown>;
}

export interface UpdatePageRequest {
  slug?: string;
  title?: string;
  description?: string;
  is_homepage?: boolean;
  order?: number;
  visible?: boolean;
  metadata?: Record<string, unknown>;
}

export interface ReorderPagesRequest {
  page_ids: string[];
}
