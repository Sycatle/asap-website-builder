"use client"

// Re-export shared components
export { ChangeIndicator, getPercentageChange } from "@/components/shared";
export { formatTimeAgo } from "@/lib/utils";

/**
 * Calculate change between current and previous values
 */
export function getChange(current: number, previous: number): number {
  if (previous === 0) return 0;
  return current - previous;
}

/**
 * Generate seeded random value for consistent demo data
 */
export function getSeededValue(websiteId: string | undefined, min: number, max: number, offset: number): number {
  const websiteSeed = websiteId 
    ? websiteId.split('').reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) | 0, 0)
    : 42;
  const seed = Math.abs((websiteSeed + offset) * 2654435761 % 2147483647);
  return Math.floor((seed / 2147483647) * (max - min)) + min;
}

/**
 * Get authenticated file URL
 */
export function getAuthenticatedFileUrl(fileId: string): string {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  const baseUrl = typeof window !== 'undefined'
    ? (import.meta.env.PUBLIC_API_URL || 'http://localhost:3000/api')
    : 'http://localhost:3000/api';
  return token ? `${baseUrl}/files/${fileId}?token=${token}` : '';
}

/**
 * Get avatar URL with authentication
 */
export function getAvatarUrl(url?: string): string | undefined {
  if (!url) return undefined;
  const fileIdMatch = url.match(/\/files\/([a-f0-9-]+)/);
  if (fileIdMatch) {
    return getAuthenticatedFileUrl(fileIdMatch[1]);
  }
  return url;
}

/**
 * Get user initials from name or email
 */
export function getInitials(name?: string, email?: string): string {
  if (name) {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }
  if (email) {
    return email.charAt(0).toUpperCase();
  }
  return '?';
}
