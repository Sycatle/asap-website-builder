/**
 * Element-related types
 */

import type { Element as BaseElement } from '@asap/shared';

// Re-export ElementType from @asap/shared
export type { ElementType } from '@asap/shared';

// ============================================
// ELEMENT TYPES
// ============================================

/**
 * Website Element - extends shared Element with API-specific fields
 * Named WebsiteElement to avoid conflict with DOM Element
 */
export interface WebsiteElement extends BaseElement {
  slug: string;
  order: number;
}

export interface CreateElementRequest {
  element_type: string;
  slug: string;
  title: string;
  order: number;
  layout: string;
  settings?: Record<string, unknown>;
  visible?: boolean;
}

export interface UpdateElementRequest {
  title?: string;
  layout?: string;
  settings?: Record<string, unknown>;
  data?: Record<string, unknown>;
  visible?: boolean;
}

export interface ReorderElementsRequest {
  element_ids: string[];
}
