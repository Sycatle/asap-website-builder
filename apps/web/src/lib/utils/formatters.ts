import { format, formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

// Re-export shared constants and utilities from @asap/shared
export {
  ASAP_DOMAIN,
  SLUG_MIN_LENGTH,
  SLUG_REGEX,
  slugify,
  validateSlug,
  getWebsiteUrl,
  getWebsiteDisplayUrl,
} from '@asap/shared';

// ============================================
// Formatting utilities (web app specific)
// ============================================

export function formatBytes(bytes: number | undefined | null, decimals: number = 2): string {
  // Handle invalid values
  if (bytes === undefined || bytes === null || isNaN(bytes)) return '0 Bytes';
  if (bytes === 0) return '0 Bytes';
  if (bytes < 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));
  // Ensure index is within bounds
  const safeIndex = Math.min(i, sizes.length - 1);

  return parseFloat((bytes / Math.pow(k, safeIndex)).toFixed(dm)) + ' ' + sizes[safeIndex];
}

export function formatDate(date: string | Date | undefined | null): string {
  if (!date) return '-';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    return format(d, 'PPP', { locale: fr });
  } catch {
    return '-';
  }
}

export function formatRelativeTime(date: string | Date | undefined | null): string {
  if (!date) return '-';
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '-';
    return formatDistanceToNow(d, { addSuffix: true, locale: fr });
  } catch {
    return '-';
  }
}

/**
 * Format relative time in French with custom intervals
 * Used for notifications and sessions
 */
export function formatRelativeTimeFr(dateString: string | Date | undefined | null): string {
  if (!dateString) return '-';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '-';
    
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours}h`;
    if (diffDays < 7) return `Il y a ${diffDays}j`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  } catch {
    return '-';
  }
}

/**
 * Format percentage with bounds checking
 */
export function formatPercentage(value: number | undefined | null, decimals: number = 1): string {
  if (value === undefined || value === null || isNaN(value)) return '0%';
  const bounded = Math.max(0, Math.min(100, value));
  return `${bounded.toFixed(decimals)}%`;
}
