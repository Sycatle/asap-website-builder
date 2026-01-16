import { cn } from '@/lib/utils';

// Helper to format collection names
export function formatCollectionName(slug: string): string {
  const names: Record<string, string> = {
    'github_repos': 'Repositories GitHub',
    'github_languages': 'Langages',
    'github_gists': 'Gists GitHub',
    'github_starred': 'Repos étoilés',
    'github_organizations': 'Organisations',
  };
  return names[slug] || slug.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// Helper to format variable values for display
export function formatVariableValue(value: unknown, maxLength = 50): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'boolean') return value ? 'Oui' : 'Non';
  if (typeof value === 'number') return value.toLocaleString('fr-FR');
  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      return `[${value.length} éléments]`;
    }
    const str = JSON.stringify(value);
    if (str.length > maxLength) return `{...} (${str.length} chars)`;
    return str;
  }
  const str = String(value);
  return str.length > maxLength ? str.slice(0, maxLength) + '…' : str;
}

// Helper to get a nice display for variable type
export function getVariableTypeLabel(value: unknown): { label: string; color: string } {
  if (value === null || value === undefined) return { label: 'null', color: 'text-muted-foreground' };
  if (typeof value === 'boolean') return { label: 'bool', color: 'text-amber-500' };
  if (typeof value === 'number') return { label: 'num', color: 'text-blue-500' };
  if (typeof value === 'object') {
    if (Array.isArray(value)) return { label: 'array', color: 'text-purple-500' };
    return { label: 'json', color: 'text-emerald-500' };
  }
  if (typeof value === 'string') {
    if (value.startsWith('http')) return { label: 'url', color: 'text-cyan-500' };
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return { label: 'date', color: 'text-orange-500' };
    return { label: 'str', color: 'text-rose-500' };
  }
  return { label: 'any', color: 'text-muted-foreground' };
}
