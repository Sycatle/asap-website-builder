# File Upload & Storage Management

## Overview

The ASAP platform now supports secure file uploads with automatic compression, per-user storage quotas, and automated cleanup of metadata.

## Features

### 1. **Secure File Upload**
- Validates file size (max 100 MB per file)
- Whitelists MIME types (documents, images, archives, code)
- Sanitizes filenames to prevent path traversal attacks
- Detects and prevents null byte injection
- Content deduplication via SHA-256 hashing

### 2. **Automatic Compression**
- Gzip compression applied to all uploaded files
- Reduces storage space significantly
- Compression ratio tracked and reported
- Transparent to users - automatic decompression on download

### 3. **Storage Quota Management**
- Default quota: 1 GB per user
- Real-time quota tracking
- Prevents uploads when quota exceeded
- Returns remaining storage information
- Quotas automatically recalculated during cleanup

### 4. **Metadata Cleanup**
- Automatic removal of orphaned file metadata
- Audit log cleanup (90 days retention)
- Quota cleanup for deleted users
- Runs every 6 hours in background worker
- Ensures storage accuracy

### 5. **Security Audit Trail**
- Logs all file operations (upload, delete, download)
- Records IP address and user agent
- Detects suspicious activity patterns
- Available for security review

## API Endpoints

All endpoints require authentication (JWT token in `Authorization` header).

### Upload File
```
POST /api/files
Content-Type: multipart/form-data

Response:
{
  "id": "uuid",
  "filename": "document.pdf",
  "original_size": 2048000,
  "compressed_size": 512000,
  "mime_type": "application/pdf",
  "compression_ratio": 25.0,
  "created_at": "2025-12-08T10:00:00Z"
}
```

### List User Files
```
GET /api/files?limit=50&offset=0

Response:
[
  {
    "id": "uuid",
    "filename": "document.pdf",
    "original_size": 2048000,
    "compressed_size": 512000,
    "mime_type": "application/pdf",
    "compression_ratio": 25.0,
    "created_at": "2025-12-08T10:00:00Z"
  }
]
```

### Delete File
```
DELETE /api/files/:file_id

Response: 204 No Content
```

### Get Storage Quota Usage
```
GET /api/files/quota/usage

Response:
{
  "total_size_used": 536870912,    // 512 MB
  "quota_limit": 1073741824,        // 1 GB
  "remaining": 536870912,           // 512 MB
  "usage_percentage": 50.0
}
```

## Database Schema

### files table
```sql
CREATE TABLE files (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    mime_type TEXT NOT NULL,
    original_size BIGINT NOT NULL,      -- Original uncompressed size
    compressed_size BIGINT NOT NULL,    -- Size after compression
    file_hash TEXT NOT NULL UNIQUE,     -- SHA-256 hash for deduplication
    storage_key TEXT NOT NULL UNIQUE,   -- Storage location key
    created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_files_user_id ON files(user_id);
CREATE INDEX idx_files_created_at ON files(created_at);
```

### user_storage_quota table
```sql
CREATE TABLE user_storage_quota (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    total_size_used BIGINT NOT NULL DEFAULT 0,
    quota_limit BIGINT NOT NULL DEFAULT 1073741824,  -- 1 GB
    updated_at TIMESTAMPTZ NOT NULL
);
```

### file_operations_audit table
```sql
CREATE TABLE file_operations_audit (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    file_id UUID REFERENCES files(id) ON DELETE SET NULL,
    operation TEXT NOT NULL,  -- 'upload', 'delete', 'download'
    ip_address INET,          -- IP address of request
    user_agent TEXT,          -- User agent string
    created_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_file_operations_audit_user_id ON file_operations_audit(user_id);
CREATE INDEX idx_file_operations_audit_created_at ON file_operations_audit(created_at);
```

## Allowed MIME Types

### Documents
- `application/pdf`
- `text/plain`
- `application/msword`
- `application/vnd.openxmlformats-officedocument.wordprocessingml.document`
- `application/vnd.ms-excel`
- `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`

### Images
- `image/jpeg`
- `image/png`
- `image/gif`
- `image/webp`

### Archives
- `application/zip`
- `application/x-tar`
- `application/gzip`

### Code & Web
- `text/html`
- `text/css`
- `text/javascript`
- `application/json`
- `text/xml`

## Configuration

Environment variables:
```bash
# In .env or container environment
# No additional configuration needed - uses defaults
```

## Background Tasks

### File Cleanup Worker
Runs every 6 hours:
1. Removes orphaned file metadata (users deleted)
2. Cleans old audit logs (> 90 days)
3. Removes quota entries for deleted users
4. Recalculates user quotas for accuracy

## Security Considerations

1. **File Validation**
   - Maximum file size: 100 MB
   - MIME type whitelist enforcement
   - Filename sanitization (no path traversal)
   - Null byte detection

2. **Storage Security**
   - Files associated with specific users
   - Ownership verification on delete
   - Compression reduces plaintext exposure
   - Hash-based deduplication

3. **Audit & Monitoring**
   - All operations logged with IP/user-agent
   - Suspicious activity detection
   - Cleanup logs for compliance

## Performance

- **Compression**: ~25-75% ratio typical (documents compress best)
- **Database Queries**: Indexed on user_id and created_at
- **Cleanup Frequency**: 6 hours (configurable)
- **Concurrency**: Fully async using Tokio

## Error Handling

```json
// File too large
{
  "error": "File too large. Maximum size: 100 MB"
}

// Unsupported MIME type
{
  "error": "File type not allowed: application/x-msdownload"
}

// Quota exceeded
{
  "error": "Storage quota exceeded. Available: 512 MB"
}

// Invalid filename
{
  "error": "Invalid filename"
}

// Unauthorized (not file owner)
{
  "error": "Unauthorized"
}
```

## Testing

Run tests for storage module:
```bash
cargo test --package asap-core-api storage --lib
cargo test --package asap-core-domain storage --lib
```

## Migration

Apply the migration to create required tables:
```bash
# Via the setup script
./scripts/setup-db.sh

# Or manually
psql -U asap -d asap < infra/migrations/003_file_storage.sql
```

## Future Enhancements

1. **Content Delivery**
   - File download with streaming
   - Byte range requests for large files
   - CDN integration

2. **Advanced Features**
   - File versioning
   - Share links with expiration
   - Virus scanning integration
   - Video thumbnail generation

3. **Admin Features**
   - Per-user quota customization
   - Storage analytics dashboard
   - Bulk operations

## Troubleshooting

**Q: Quota updated but shows stale value?**
A: Quotas are recalculated every 6 hours. Force recalc via cleanup task.

**Q: Compression ratio worse than expected?**
A: Binary files (images, PDFs) compress poorly. Text files (code, docs) compress 50-90%.

**Q: How to customize quota per user?**
A: Update `quota_limit` in `user_storage_quota` table manually (future admin API coming).
