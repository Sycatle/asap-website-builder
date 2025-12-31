import { renderToStaticMarkup } from 'react-dom/server';
import type { Element, Website } from '@asap/shared';
import { SectionRenderer } from '@asap/renderers';
import { normalizeSection } from '@/lib/rendering/normalize';

export interface ParitySnapshot {
  html: string;
}

export function createSectionSnapshot(section: Element, website?: Website): ParitySnapshot {
  const normalized = normalizeSection(section);
  const html = renderToStaticMarkup(<SectionRenderer section={normalized} />);
  return { html: normalizeHtml(html) };
}

export function compareSnapshots(expected: ParitySnapshot, actual: ParitySnapshot): {
  match: boolean;
  diff?: string;
} {
  if (expected.html === actual.html) {
    return { match: true };
  }

  return {
    match: false,
    diff: diffSnippet(expected.html, actual.html),
  };
}

function normalizeHtml(html: string): string {
  return html.replace(/\s+/g, ' ').trim();
}

function diffSnippet(expected: string, actual: string): string {
  const limit = 200;
  return [
    'Expected:',
    expected.slice(0, limit),
    'Actual:',
    actual.slice(0, limit),
  ].join('\n');
}
