"use client"

import { Image, Film, Music, FileText, File } from "lucide-react";

/**
 * Shared file utilities for file handling across the application
 * These utilities are used by CloudManager, CloudPreviewCard, FilePickerDialog, etc.
 */

// ============================================================================
// MIME Type Detection
// ============================================================================

/**
 * Check if MIME type is an image
 */
export function isImage(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

/**
 * Check if MIME type is a video
 */
export function isVideo(mimeType: string): boolean {
  return mimeType.startsWith('video/');
}

/**
 * Check if MIME type is audio
 */
export function isAudio(mimeType: string): boolean {
  return mimeType.startsWith('audio/');
}

/**
 * Check if MIME type is PDF
 */
export function isPdf(mimeType: string): boolean {
  return mimeType === 'application/pdf';
}

/**
 * Check if the file can be previewed inline
 */
export function canPreview(mimeType: string): boolean {
  return isImage(mimeType) || isVideo(mimeType) || isAudio(mimeType);
}

// ============================================================================
// File Icons & Labels
// ============================================================================

/**
 * Get file icon based on MIME type
 */
export function getFileIcon(mimeType: string, className = "h-5 w-5") {
  if (isImage(mimeType)) return <Image className={`${className} text-violet-500`} />;
  if (isVideo(mimeType)) return <Film className={`${className} text-blue-500`} />;
  if (isAudio(mimeType)) return <Music className={`${className} text-green-500`} />;
  if (isPdf(mimeType)) return <FileText className={`${className} text-red-500`} />;
  return <File className={`${className} text-muted-foreground`} />;
}

/**
 * Get file type label in French
 */
export function getFileTypeLabel(mimeType: string): string {
  if (isImage(mimeType)) return 'Image';
  if (isVideo(mimeType)) return 'Vidéo';
  if (isAudio(mimeType)) return 'Audio';
  if (isPdf(mimeType)) return 'PDF';
  return 'Fichier';
}

// ============================================================================
// File URLs
// ============================================================================

/**
 * Get authenticated file URL for API access
 */
export function getFileUrl(fileId: string): string {
  const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000/api';
  const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
  return `${API_URL}/files/${fileId}${token ? `?token=${token}` : ''}`;
}

/**
 * Copy file URL to clipboard
 */
export async function copyFileUrl(fileId: string): Promise<void> {
  const url = getFileUrl(fileId);
  await navigator.clipboard.writeText(url);
}
