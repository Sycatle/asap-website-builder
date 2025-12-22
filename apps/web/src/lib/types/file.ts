/**
 * File and storage-related types
 */

// ============================================
// FILE TYPES
// ============================================

export interface FileMetadata {
  id: string;
  account_id: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  compressed_size_bytes: number;
  sha256_hash: string;
  uploaded_at: string;
}

export interface QuotaUsage {
  total_size_used: number;
  quota_limit: number;
  remaining: number;
  usage_percentage: number;
}
