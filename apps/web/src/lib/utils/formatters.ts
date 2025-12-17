import { format, formatDistanceToNow } from 'date-fns';

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

export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

export function formatDate(date: string | Date): string {
  return format(new Date(date), 'PPP');
}

export function formatRelativeTime(date: string | Date): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}
