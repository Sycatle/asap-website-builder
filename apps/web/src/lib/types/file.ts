/**
 * File and storage-related types
 */

// ============================================
// FILE TYPES
// ============================================

export interface FileMetadata {
  id: string;
  filename: string;
  mime_type: string;
  /** Original file size in bytes (from API: original_size) */
  original_size: number;
  /** Compressed file size in bytes (from API: compressed_size) */
  compressed_size: number;
  /** Compression ratio (original/compressed) */
  compression_ratio: number;
  /** Upload timestamp (from API: created_at) */
  created_at: string;
}

export interface QuotaUsage {
  total_size_used: number;
  quota_limit: number;
  remaining: number;
  usage_percentage: number;
}
