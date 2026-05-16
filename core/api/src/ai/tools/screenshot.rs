//! Server-side screenshot capture for AI visual analysis.

use serde::{Deserialize, Serialize};
use std::time::Duration;

/// Screenshot capture result
#[derive(Debug)]
pub struct ScreenshotData {
    pub image_base64: String,
    pub width: u32,
    pub height: u32,
}

pub async fn capture_screenshot_server_side(
    screenshot_url: &str,
    website_slug: &str,
    viewport: &str,
) -> Result<ScreenshotData, String> {
    let client = reqwest::Client::new();

    #[derive(Serialize)]
    struct CaptureRequest<'a> {
        #[serde(rename = "websiteSlug")]
        website_slug: &'a str,
        viewport: &'a str,
        #[serde(rename = "waitFor")]
        wait_for: u32,
    }

    #[derive(Deserialize)]
    struct CaptureResponse {
        image: String,
        width: u32,
        height: u32,
    }

    let response = client
        .post(format!("{}/capture", screenshot_url))
        .json(&CaptureRequest {
            website_slug,
            viewport,
            wait_for: 1500,
        })
        .timeout(Duration::from_secs(30))
        .send()
        .await
        .map_err(|e| format!("Failed to connect to screenshot service: {}", e))?;

    if !response.status().is_success() {
        let error_text = response.text().await.unwrap_or_default();
        return Err(format!("Screenshot service error: {}", error_text));
    }

    let capture: CaptureResponse = response
        .json()
        .await
        .map_err(|e| format!("Failed to parse screenshot response: {}", e))?;

    Ok(ScreenshotData {
        image_base64: capture.image,
        width: capture.width,
        height: capture.height,
    })
}
