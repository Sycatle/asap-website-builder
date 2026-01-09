/**
 * Screenshot Service
 * 
 * Simple service that captures screenshots of websites using Playwright.
 * Used by the AI visual analysis feature to "see" the website.
 */

import express from 'express';
import { chromium } from 'playwright';

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3001;
const SITES_BASE_URL = process.env.SITES_BASE_URL || 'http://asap-sites:4322';

// Browser instance (reused for performance)
let browser = null;

async function getBrowser() {
  if (!browser) {
    console.log('[Screenshot] Launching browser...');
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    });
    console.log('[Screenshot] Browser launched');
  }
  return browser;
}

// Viewport configurations
const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 820, height: 1180 },
  mobile: { width: 390, height: 844 },
};

/**
 * POST /capture
 * 
 * Body:
 * - websiteSlug: string (required) - The website slug (subdomain)
 * - pageSlug: string (optional) - The page slug (default: homepage)
 * - viewport: 'desktop' | 'tablet' | 'mobile' (default: 'desktop')
 * - fullPage: boolean (default: false)
 * - waitFor: number (default: 1000) - Wait time in ms after load
 * 
 * Returns:
 * - image: base64-encoded PNG
 * - width: number
 * - height: number
 */
app.post('/capture', async (req, res) => {
  const {
    websiteSlug,
    pageSlug = '',
    viewport = 'desktop',
    fullPage = false,
    waitFor = 1000,
  } = req.body;

  if (!websiteSlug) {
    return res.status(400).json({ error: 'websiteSlug is required' });
  }

  const viewportConfig = VIEWPORTS[viewport] || VIEWPORTS.desktop;
  
  // Build URL - the sites app routes by subdomain or path
  // In Docker, we can access via the internal network
  const url = `${SITES_BASE_URL}/${websiteSlug}${pageSlug ? `/${pageSlug}` : ''}`;
  
  console.log(`[Screenshot] Capturing ${url} at ${viewport} (${viewportConfig.width}x${viewportConfig.height})`);

  let page = null;
  try {
    const browserInstance = await getBrowser();
    page = await browserInstance.newPage();
    
    await page.setViewportSize(viewportConfig);
    
    // Navigate and wait for network to be idle
    await page.goto(url, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });
    
    // Additional wait for any animations/transitions
    await page.waitForTimeout(waitFor);
    
    // Capture screenshot
    const screenshot = await page.screenshot({
      type: 'png',
      fullPage,
    });
    
    const base64 = screenshot.toString('base64');
    
    console.log(`[Screenshot] Captured ${websiteSlug} - ${screenshot.length} bytes`);
    
    res.json({
      image: base64,
      width: viewportConfig.width,
      height: viewportConfig.height,
      contentType: 'image/png',
    });
    
  } catch (error) {
    console.error(`[Screenshot] Error capturing ${websiteSlug}:`, error.message);
    res.status(500).json({ 
      error: 'Failed to capture screenshot',
      details: error.message,
    });
  } finally {
    if (page) {
      await page.close().catch(() => {});
    }
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', browser: browser !== null });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Screenshot] Shutting down...');
  if (browser) {
    await browser.close();
  }
  process.exit(0);
});

app.listen(PORT, () => {
  console.log(`[Screenshot] Service running on port ${PORT}`);
  console.log(`[Screenshot] Sites URL: ${SITES_BASE_URL}`);
});
