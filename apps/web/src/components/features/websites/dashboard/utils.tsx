"use client"

import { ArrowUpRight, ArrowDownRight } from "lucide-react";

/**
 * Displays an indicator showing change direction (positive/negative)
 */
export function ChangeIndicator({ value, suffix = '' }: { value: number; suffix?: string }) {
  if (value === 0) return null;
  const isPositive = value > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium transition-all duration-300 ${
      isPositive ? 'text-green-600' : 'text-red-500'
    }`}>
      {isPositive ? (
        <ArrowUpRight className="h-3 w-3" />
      ) : (
        <ArrowDownRight className="h-3 w-3" />
      )}
      {isPositive ? '+' : ''}{value}{suffix}
    </span>
  );
}

/**
 * Calculate change between current and previous values
 */
export function getChange(current: number, previous: number): number {
  if (previous === 0) return 0;
  return current - previous;
}

/**
 * Format time ago in French
 */
export function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'À l\'instant';
  if (seconds < 3600) return `Il y a ${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `Il y a ${Math.floor(seconds / 3600)}h`;
  return `Il y a ${Math.floor(seconds / 86400)}j`;
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
