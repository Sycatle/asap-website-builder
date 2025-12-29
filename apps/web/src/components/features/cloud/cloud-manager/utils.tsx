"use client"

/**
 * Cloud Manager utilities
 * Re-exports shared file utilities for backward compatibility
 */

// Re-export all shared file utilities
export {
  isImage,
  isVideo,
  isAudio,
  isPdf,
  canPreview,
  getFileIcon,
  getFileTypeLabel,
  getFileUrl,
  copyFileUrl,
} from "@/components/shared/file-utils";
