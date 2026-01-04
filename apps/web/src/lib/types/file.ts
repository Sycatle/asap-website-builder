/**
 * File and storage-related types
 */

// ============================================
// VISIBILITY TYPES
// ============================================

export type FileVisibility = 'private' | 'public' | 'website';

// ============================================
// FOLDER TYPES
// ============================================

export interface FileFolder {
  id: string;
  name: string;
  path: string;
  parent_folder_id: string | null;
  website_id: string | null;
  icon: string | null;
  color: string | null;
  file_count: number;
  subfolder_count: number;
  created_at: string;
}

export interface CreateFolderRequest {
  name: string;
  parent_folder_id?: string;
  website_id?: string;
  icon?: string;
  color?: string;
}

export interface UpdateFolderRequest {
  name?: string;
  parent_folder_id?: string;
  icon?: string;
  color?: string;
}

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
  /** Folder ID if file is in a folder */
  folder_id?: string | null;
  /** Website ID if file belongs to a website */
  website_id?: string | null;
  /** File visibility */
  visibility?: FileVisibility;
  /** Description/alt text */
  description?: string | null;
  /** Tags for organization */
  tags?: string[];
}

export interface UpdateFileRequest {
  filename?: string;
  folder_id?: string | null;
  visibility?: FileVisibility;
  website_id?: string | null;
  description?: string;
  tags?: string[];
}

export interface FileUploadOptions {
  folder_id?: string;
  website_id?: string;
  visibility?: FileVisibility;
  description?: string;
  tags?: string[];
}

// ============================================
// QUOTA TYPES  
// ============================================

export interface QuotaUsage {
  total_size_used: number;
  quota_limit: number;
  remaining: number;
  usage_percentage: number;
}

// ============================================
// FILE LIST QUERY PARAMS
// ============================================

export interface FileListParams {
  folder_id?: string;
  website_id?: string;
  visibility?: FileVisibility;
  mime_type?: string;
  search?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
}
