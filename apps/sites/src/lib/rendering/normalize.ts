import type { Element } from '@asap/shared';

export function normalizeSection(section: Element): Element {
  const normalizedType = section.element_type?.toLowerCase?.() ?? section.element_type;
  const data = (section.data ?? (section as Element & { settings?: Record<string, unknown> }).settings ?? section.content ?? {}) as Record<string, unknown>;

  return {
    ...section,
    element_type: normalizedType,
    data,
    visible: section.visible ?? true,
    order_index: section.order_index ?? section.order ?? 0,
  };
}

export function sortSections(sections: Element[]): Element[] {
  return [...sections]
    .map(normalizeSection)
    .filter((section) => section.visible !== false)
    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
}
