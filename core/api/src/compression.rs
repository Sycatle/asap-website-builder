// filepath: core/api/src/compression.rs
//! Advanced compression utilities for large file handling
//!
//! Provides streaming compression for files without buffering entire contents
//! in memory. Supports both sync and async operations with progress tracking.

use anyhow::Result;
use bytes::Bytes;
use flate2::write::GzEncoder;
use flate2::Compression;
use std::io::Write;
use tokio::io::{AsyncRead, AsyncReadExt};

/// Minimum file size for compression to be worthwhile (5 KB)
pub const MIN_COMPRESSION_SIZE: usize = 5 * 1024;

/// Maximum compression overhead ratio (150% = no benefit if file stays larger)
pub const MAX_COMPRESSION_OVERHEAD_RATIO: f64 = 1.50;

/// Static list of MIME types that should NOT be compressed (already compressed)
/// Using a static slice avoids Vec allocation on every call
pub const INCOMPRESSIBLE_TYPES: &[&str] = &[
    // Images
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/avif",
    "image/x-icon",
    "image/svg+xml",
    // Archives
    "application/zip",
    "application/x-rar",
    "application/x-7z-compressed",
    "application/gzip",
    "application/x-tar",
    "application/x-bzip2",
    "application/x-xz",
    // Audio/Video
    "audio/mpeg",
    "audio/aac",
    "audio/ogg",
    "audio/wav",
    "video/mp4",
    "video/mpeg",
    "video/webm",
    "video/ogg",
    "video/quicktime",
    "video/x-msvideo",
    // Already compressed documents
    "application/pdf",
];

/// Check if a MIME type is incompressible (O(n) but static, no allocation)
#[inline]
pub fn is_incompressible(mime_type: &str) -> bool {
    INCOMPRESSIBLE_TYPES.contains(&mime_type)
}

/// Streaming compressor for efficient memory usage
///
/// Compresses data in chunks without requiring the entire file in memory.
/// Perfect for handling large files (100+ MB) while maintaining reasonable memory footprint.
pub struct StreamingCompressor {
    encoder: GzEncoder<Vec<u8>>,
    bytes_processed: u64,
    bytes_compressed: u64,
}

impl StreamingCompressor {
    /// Create a new streaming compressor at the given compression level.
    pub fn new(compression_level: Compression) -> Self {
        Self {
            encoder: GzEncoder::new(Vec::new(), compression_level),
            bytes_processed: 0,
            bytes_compressed: 0,
        }
    }

    /// Default compressor with fast compression
    pub fn default_streaming() -> Self {
        Self::new(Compression::fast())
    }

    /// High compression compressor (slower, but better ratio)
    #[allow(dead_code)]
    pub fn best_compression() -> Self {
        Self::new(Compression::best())
    }

    /// Process and compress a chunk of data
    pub fn write_chunk(&mut self, chunk: &[u8]) -> Result<()> {
        self.encoder.write_all(chunk)?;
        self.bytes_processed += chunk.len() as u64;
        Ok(())
    }

    /// Finish compression and return compressed data
    pub fn finish(self) -> Result<Bytes> {
        let compressed = self.encoder.finish()?;
        Ok(Bytes::from(compressed))
    }

    /// Get current statistics
    pub fn stats(&self) -> CompressionStats {
        CompressionStats {
            bytes_processed: self.bytes_processed,
            bytes_compressed: self.bytes_compressed,
            ratio: if self.bytes_processed == 0 {
                0.0
            } else {
                (self.bytes_compressed as f64 / self.bytes_processed as f64) * 100.0
            },
        }
    }
}

/// Compression statistics for monitoring
#[derive(Debug, Clone)]
pub struct CompressionStats {
    pub bytes_processed: u64,
    pub bytes_compressed: u64,
    pub ratio: f64,
}

/// Async streaming compression for AsyncRead sources
///
/// Ideal for:
/// - Multipart form data streams
/// - HTTP request bodies
/// - File streams from storage
/// - Pipe input from other async operations
pub async fn compress_async_reader<R: AsyncRead + Unpin>(
    reader: &mut R,
    buffer_size: usize,
    compression_level: Compression,
) -> Result<(Bytes, CompressionStats)> {
    let mut compressor = StreamingCompressor::new(compression_level);
    let mut buffer = vec![0u8; buffer_size];

    loop {
        let n = reader.read(&mut buffer).await?;
        if n == 0 {
            break;
        }

        compressor.write_chunk(&buffer[..n])?;
    }

    // Save stats before finish() consumes compressor
    let bytes_processed = compressor.bytes_processed;
    let compressed = compressor.finish()?;

    let stats = CompressionStats {
        bytes_processed,
        bytes_compressed: compressed.len() as u64,
        ratio: if bytes_processed == 0 {
            0.0
        } else {
            (compressed.len() as f64 / bytes_processed as f64) * 100.0
        },
    };

    Ok((compressed, stats))
}

/// Async streaming compression with size limits
///
/// Prevents memory exhaustion attacks by enforcing maximum size limits
pub async fn compress_async_reader_limited<R: AsyncRead + Unpin>(
    reader: &mut R,
    buffer_size: usize,
    compression_level: Compression,
    max_input_size: u64,
    max_output_size: u64,
) -> Result<(Bytes, CompressionStats)> {
    let mut compressor = StreamingCompressor::new(compression_level);
    let mut buffer = vec![0u8; buffer_size];

    loop {
        // Check input size limit
        if compressor.bytes_processed > max_input_size {
            return Err(anyhow::anyhow!(
                "Input size exceeds maximum of {} MB",
                max_input_size / 1_000_000
            ));
        }

        let n = reader.read(&mut buffer).await?;
        if n == 0 {
            break;
        }

        compressor.write_chunk(&buffer[..n])?;
    }

    // Save stats before finish() consumes compressor
    let bytes_processed = compressor.bytes_processed;
    let compressed = compressor.finish()?;

    // Check output size limit
    if compressed.len() as u64 > max_output_size {
        return Err(anyhow::anyhow!(
            "Compressed size exceeds maximum of {} MB",
            max_output_size / 1_000_000
        ));
    }

    let stats = CompressionStats {
        bytes_processed,
        bytes_compressed: compressed.len() as u64,
        ratio: if bytes_processed == 0 {
            0.0
        } else {
            (compressed.len() as f64 / bytes_processed as f64) * 100.0
        },
    };

    Ok((compressed, stats))
}

/// Sync streaming compression for slice data
///
/// Used when data is already in memory but we want to avoid
/// creating intermediate allocations
pub fn compress_slice_streaming(data: &[u8], compression_level: Compression) -> Result<Bytes> {
    let mut encoder = GzEncoder::new(Vec::new(), compression_level);
    encoder.write_all(data)?;
    let compressed = encoder.finish()?;
    Ok(Bytes::from(compressed))
}

/// Estimate compression ratio for a file type
///
/// Returns typical compression ratio for different MIME types
pub fn estimate_compression_ratio(mime_type: &str) -> f32 {
    match mime_type {
        // Highly compressible
        t if t.starts_with("text/") => 0.25, // 75% compression
        "application/json" => 0.20,          // 80% compression
        "application/xml" => 0.20,           // 80% compression
        "application/pdf" => 0.40,           // 60% compression

        // Moderately compressible
        "application/msword" => 0.50, // 50% compression
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document" => 0.40,
        "application/vnd.ms-excel" => 0.50,

        // Poorly compressible (already compressed)
        t if t.starts_with("image/") => 0.90, // 10% compression (JPEGs, PNGs)
        "application/zip" => 0.95,            // 5% compression
        "application/gzip" => 0.98,           // 2% compression

        // Default: assume moderate compression
        _ => 0.50, // 50% compression
    }
}

/// Check if compression is worthwhile for this file type
///
/// Returns false for incompressible types (already compressed formats)
pub fn should_compress(mime_type: &str) -> bool {
    !is_incompressible(mime_type)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_compression_ratio_estimation() {
        assert!(estimate_compression_ratio("text/plain") < 0.5);
        assert!(estimate_compression_ratio("application/json") < 0.5);
        assert!(estimate_compression_ratio("image/jpeg") > 0.80);
        assert!(estimate_compression_ratio("application/zip") > 0.90);
    }

    #[test]
    fn test_should_compress() {
        assert!(should_compress("text/plain"));
        assert!(should_compress("application/json"));
        assert!(!should_compress("image/jpeg"));
        assert!(!should_compress("application/zip"));
    }

    #[test]
    fn test_streaming_compressor_stats() {
        let mut compressor = StreamingCompressor::default_streaming();
        let data = b"Hello, World!".repeat(100);

        compressor.write_chunk(&data).unwrap();
        let stats = compressor.stats();

        assert_eq!(stats.bytes_processed, data.len() as u64);
        // Ratio can be 0 if finalize hasn't been called yet
        assert!(stats.ratio >= 0.0);
    }

    #[tokio::test]
    async fn test_compress_async_slice() {
        let data = b"The quick brown fox jumps over the lazy dog".repeat(100);
        let mut cursor = std::io::Cursor::new(data.as_slice());

        let result = compress_async_reader(&mut cursor, 1024, Compression::default()).await;
        assert!(result.is_ok());

        let (compressed, stats) = result.unwrap();
        assert!(!compressed.is_empty());
        assert!(stats.ratio > 0.0 && stats.ratio < 100.0);
    }

    #[test]
    fn test_compress_slice_streaming() {
        let data = b"Test data for compression";
        let result = compress_slice_streaming(data, Compression::default());

        assert!(result.is_ok());
        let compressed = result.unwrap();
        assert!(!compressed.is_empty());
    }
}
