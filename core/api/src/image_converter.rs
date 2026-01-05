//! Image Converter Module
//!
//! Automatically converts uploaded images to web-friendly formats (WebP) for:
//! - Reduced file size
//! - Better loading performance
//! - Browser compatibility
//!
//! ## Conversion Rules
//!
//! | Source Format | Target | Conditions |
//! |---------------|--------|------------|
//! | HEIC/HEIF | WebP | Always (not supported by `image` crate, skip) |
//! | PNG | WebP | If size > 100KB |
//! | BMP | WebP | Always |
//! | TIFF | WebP | Always |
//! | JPEG | WebP | If size > 500KB |
//! | GIF | Keep | Preserve animation support |
//! | WebP | Keep | Already optimal |
//! | SVG | Keep | Vector format |

use anyhow::{Result, anyhow};
use image::{DynamicImage, ImageFormat, ImageReader};
use std::io::Cursor;

/// Configuration for the image converter
#[derive(Debug, Clone)]
pub struct ImageConverterConfig {
    /// Enable/disable automatic conversion
    pub enabled: bool,
    
    /// Threshold for PNG conversion (bytes) - convert if larger
    pub png_threshold: usize,
    
    /// Threshold for JPEG conversion (bytes) - convert if larger
    pub jpeg_threshold: usize,
    
    /// WebP quality (1-100, higher = better quality, larger file)
    pub webp_quality: u8,
    
    /// Maximum width (resize if larger)
    pub max_width: u32,
    
    /// Maximum height (resize if larger)
    pub max_height: u32,
    
    /// Whether to preserve original alongside converted
    pub keep_original: bool,
}

impl Default for ImageConverterConfig {
    fn default() -> Self {
        Self {
            enabled: true,
            png_threshold: 100 * 1024,      // 100KB
            jpeg_threshold: 500 * 1024,     // 500KB
            webp_quality: 85,               // Good balance quality/size
            max_width: 2048,                // Reasonable max for web
            max_height: 2048,
            keep_original: false,
        }
    }
}

/// Result of image conversion
#[derive(Debug)]
pub struct ConversionResult {
    /// Converted image data
    pub data: Vec<u8>,
    /// New MIME type after conversion
    pub mime_type: String,
    /// Original filename with new extension
    pub filename: String,
    /// Whether conversion was performed
    pub was_converted: bool,
    /// Original size before conversion
    pub original_size: usize,
    /// Size after conversion
    pub converted_size: usize,
}

impl ConversionResult {
    /// Calculate compression ratio (original / converted)
    pub fn compression_ratio(&self) -> f64 {
        if self.converted_size > 0 {
            self.original_size as f64 / self.converted_size as f64
        } else {
            1.0
        }
    }
    
    /// Calculate size reduction percentage
    pub fn size_reduction_percent(&self) -> f64 {
        if self.original_size > 0 {
            ((self.original_size - self.converted_size) as f64 / self.original_size as f64) * 100.0
        } else {
            0.0
        }
    }
}

/// Image converter service
pub struct ImageConverter {
    config: ImageConverterConfig,
}

impl ImageConverter {
    /// Create a new image converter with default config
    pub fn new() -> Self {
        Self {
            config: ImageConverterConfig::default(),
        }
    }
    
    /// Create a new image converter with custom config
    pub fn with_config(config: ImageConverterConfig) -> Self {
        Self { config }
    }
    
    /// Check if a MIME type is a supported image format
    pub fn is_supported_image(&self, mime_type: &str) -> bool {
        matches!(
            mime_type,
            "image/jpeg" | "image/jpg" |
            "image/png" |
            "image/gif" |
            "image/webp" |
            "image/bmp" |
            "image/tiff" |
            "image/svg+xml" |
            "image/heic" | "image/heif"
        )
    }
    
    /// Check if conversion should be performed for this image
    pub fn should_convert(&self, mime_type: &str, size: usize) -> bool {
        if !self.config.enabled {
            return false;
        }
        
        match mime_type {
            // Always convert these formats
            "image/bmp" | "image/tiff" => true,
            
            // Convert PNG if above threshold
            "image/png" => size > self.config.png_threshold,
            
            // Convert JPEG if above threshold
            "image/jpeg" | "image/jpg" => size > self.config.jpeg_threshold,
            
            // HEIC/HEIF - would convert but not supported by `image` crate without additional deps
            // Users should convert HEIC on client-side or we add libheif-rs later
            "image/heic" | "image/heif" => false, // TODO: Add HEIC support with libheif-rs
            
            // Don't convert these
            "image/gif" => false,      // Preserve animation
            "image/webp" => false,     // Already optimal
            "image/svg+xml" => false,  // Vector format
            
            _ => false,
        }
    }
    
    /// Process an image - convert if needed, resize if too large
    pub fn process_image(
        &self,
        data: &[u8],
        mime_type: &str,
        filename: &str,
    ) -> Result<ConversionResult> {
        let original_size = data.len();
        
        // Check if we should convert
        if !self.should_convert(mime_type, original_size) {
            return Ok(ConversionResult {
                data: data.to_vec(),
                mime_type: mime_type.to_string(),
                filename: filename.to_string(),
                was_converted: false,
                original_size,
                converted_size: original_size,
            });
        }
        
        // Load the image
        let img = self.load_image(data, mime_type)?;
        
        // Resize if needed
        let img = self.resize_if_needed(img);
        
        // Convert to WebP
        let webp_data = self.encode_webp(&img)?;
        
        // Generate new filename with .webp extension
        let new_filename = Self::change_extension(filename, "webp");
        
        let converted_size = webp_data.len();
        
        // Only use converted version if it's actually smaller
        // (some images may get larger when converted to WebP)
        if converted_size < original_size {
            tracing::info!(
                "Image converted: {} -> {} ({:.1}% reduction)",
                original_size,
                converted_size,
                ((original_size - converted_size) as f64 / original_size as f64) * 100.0
            );
            
            Ok(ConversionResult {
                data: webp_data,
                mime_type: "image/webp".to_string(),
                filename: new_filename,
                was_converted: true,
                original_size,
                converted_size,
            })
        } else {
            // Keep original if WebP is larger
            tracing::debug!(
                "Skipping WebP conversion (would be larger: {} -> {})",
                original_size,
                converted_size
            );
            
            Ok(ConversionResult {
                data: data.to_vec(),
                mime_type: mime_type.to_string(),
                filename: filename.to_string(),
                was_converted: false,
                original_size,
                converted_size: original_size,
            })
        }
    }
    
    /// Load image from bytes
    fn load_image(&self, data: &[u8], mime_type: &str) -> Result<DynamicImage> {
        let format = Self::mime_to_format(mime_type)?;
        
        let reader = ImageReader::with_format(Cursor::new(data), format);
        let img = reader.decode()
            .map_err(|e| anyhow!("Failed to decode image: {}", e))?;
        
        Ok(img)
    }
    
    /// Resize image if it exceeds max dimensions
    fn resize_if_needed(&self, img: DynamicImage) -> DynamicImage {
        let (width, height) = (img.width(), img.height());
        
        if width <= self.config.max_width && height <= self.config.max_height {
            return img;
        }
        
        // Calculate new dimensions preserving aspect ratio
        let ratio_w = self.config.max_width as f64 / width as f64;
        let ratio_h = self.config.max_height as f64 / height as f64;
        let ratio = ratio_w.min(ratio_h);
        
        let new_width = (width as f64 * ratio) as u32;
        let new_height = (height as f64 * ratio) as u32;
        
        tracing::debug!(
            "Resizing image: {}x{} -> {}x{}",
            width, height, new_width, new_height
        );
        
        img.resize(new_width, new_height, image::imageops::FilterType::Lanczos3)
    }
    
    /// Encode image as WebP
    fn encode_webp(&self, img: &DynamicImage) -> Result<Vec<u8>> {
        let mut buffer = Vec::new();
        let mut cursor = Cursor::new(&mut buffer);
        
        img.write_to(&mut cursor, ImageFormat::WebP)
            .map_err(|e| anyhow!("Failed to encode WebP: {}", e))?;
        
        Ok(buffer)
    }
    
    /// Convert MIME type to ImageFormat
    fn mime_to_format(mime_type: &str) -> Result<ImageFormat> {
        match mime_type {
            "image/jpeg" | "image/jpg" => Ok(ImageFormat::Jpeg),
            "image/png" => Ok(ImageFormat::Png),
            "image/gif" => Ok(ImageFormat::Gif),
            "image/webp" => Ok(ImageFormat::WebP),
            "image/bmp" => Ok(ImageFormat::Bmp),
            "image/tiff" => Ok(ImageFormat::Tiff),
            _ => Err(anyhow!("Unsupported image format: {}", mime_type)),
        }
    }
    
    /// Change file extension
    fn change_extension(filename: &str, new_ext: &str) -> String {
        match filename.rsplit_once('.') {
            Some((base, _)) => format!("{}.{}", base, new_ext),
            None => format!("{}.{}", filename, new_ext),
        }
    }
}

impl Default for ImageConverter {
    fn default() -> Self {
        Self::new()
    }
}

/// Convenience function to process an image with default config
pub fn maybe_convert_image(
    data: &[u8],
    mime_type: &str,
    filename: &str,
) -> Result<ConversionResult> {
    let converter = ImageConverter::new();
    converter.process_image(data, mime_type, filename)
}

/// Convenience function to process an image with custom config
pub fn convert_image_with_config(
    data: &[u8],
    mime_type: &str,
    filename: &str,
    config: ImageConverterConfig,
) -> Result<ConversionResult> {
    let converter = ImageConverter::with_config(config);
    converter.process_image(data, mime_type, filename)
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_should_convert_png_above_threshold() {
        let converter = ImageConverter::new();
        
        // Above threshold - should convert
        assert!(converter.should_convert("image/png", 150 * 1024));
        
        // Below threshold - should not convert
        assert!(!converter.should_convert("image/png", 50 * 1024));
    }
    
    #[test]
    fn test_should_convert_jpeg_above_threshold() {
        let converter = ImageConverter::new();
        
        // Above threshold - should convert
        assert!(converter.should_convert("image/jpeg", 600 * 1024));
        
        // Below threshold - should not convert
        assert!(!converter.should_convert("image/jpeg", 400 * 1024));
    }
    
    #[test]
    fn test_should_always_convert_bmp() {
        let converter = ImageConverter::new();
        
        // BMP should always convert regardless of size
        assert!(converter.should_convert("image/bmp", 1024));
        assert!(converter.should_convert("image/bmp", 1));
    }
    
    #[test]
    fn test_should_not_convert_webp() {
        let converter = ImageConverter::new();
        
        // WebP should never be converted (already optimal)
        assert!(!converter.should_convert("image/webp", 1024 * 1024));
    }
    
    #[test]
    fn test_should_not_convert_gif() {
        let converter = ImageConverter::new();
        
        // GIF should not be converted to preserve animations
        assert!(!converter.should_convert("image/gif", 1024 * 1024));
    }
    
    #[test]
    fn test_should_not_convert_svg() {
        let converter = ImageConverter::new();
        
        // SVG is vector format, should not be converted
        assert!(!converter.should_convert("image/svg+xml", 1024 * 1024));
    }
    
    #[test]
    fn test_change_extension() {
        assert_eq!(
            ImageConverter::change_extension("photo.png", "webp"),
            "photo.webp"
        );
        assert_eq!(
            ImageConverter::change_extension("my.photo.jpeg", "webp"),
            "my.photo.webp"
        );
        assert_eq!(
            ImageConverter::change_extension("noextension", "webp"),
            "noextension.webp"
        );
    }
    
    #[test]
    fn test_is_supported_image() {
        let converter = ImageConverter::new();
        
        assert!(converter.is_supported_image("image/jpeg"));
        assert!(converter.is_supported_image("image/png"));
        assert!(converter.is_supported_image("image/webp"));
        assert!(converter.is_supported_image("image/gif"));
        assert!(converter.is_supported_image("image/svg+xml"));
        
        assert!(!converter.is_supported_image("application/pdf"));
        assert!(!converter.is_supported_image("text/plain"));
    }
    
    #[test]
    fn test_disabled_converter() {
        let config = ImageConverterConfig {
            enabled: false,
            ..Default::default()
        };
        let converter = ImageConverter::with_config(config);
        
        // Even BMP should not convert when disabled
        assert!(!converter.should_convert("image/bmp", 1024 * 1024));
    }
    
    #[test]
    fn test_conversion_result_metrics() {
        let result = ConversionResult {
            data: vec![0; 50_000],
            mime_type: "image/webp".to_string(),
            filename: "test.webp".to_string(),
            was_converted: true,
            original_size: 100_000,
            converted_size: 50_000,
        };
        
        assert_eq!(result.compression_ratio(), 2.0);
        assert_eq!(result.size_reduction_percent(), 50.0);
    }
}
