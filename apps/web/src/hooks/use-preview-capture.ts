/**
 * usePreviewCapture Hook
 * 
 * Captures the content of the Studio preview iframe for AI visual analysis.
 * Uses html2canvas to render the iframe content to a canvas, then converts
 * it to a blob for upload.
 * 
 * This enables the AI to "see" the website design and provide visual feedback
 * without requiring external screenshot services.
 */

import { useCallback, useRef, useState } from 'react';
import html2canvas from 'html2canvas';

export type Viewport = 'desktop' | 'tablet' | 'mobile';

export interface CaptureOptions {
  /** Viewport to capture */
  viewport?: Viewport;
  /** Image quality (0-1), default 0.9 */
  quality?: number;
  /** Scale factor for retina displays, default 2 */
  scale?: number;
  /** Whether to capture full page or just viewport */
  fullPage?: boolean;
}

export interface CaptureResult {
  /** The captured image as a Blob */
  blob: Blob;
  /** Width of the captured image */
  width: number;
  /** Height of the captured image */
  height: number;
  /** Data URL for preview (optional, for debugging) */
  dataUrl?: string;
}

export interface UsePreviewCaptureReturn {
  /** Capture the current preview */
  capturePreview: (options?: CaptureOptions) => Promise<CaptureResult | null>;
  /** Whether a capture is in progress */
  isCapturing: boolean;
  /** Last capture error if any */
  error: Error | null;
  /** Clear the error state */
  clearError: () => void;
}

/**
 * Hook to capture the preview iframe content
 * 
 * @param iframeRef - Ref to the preview iframe element
 * @returns Capture functions and state
 * 
 * @example
 * ```tsx
 * const iframeRef = useRef<HTMLIFrameElement>(null);
 * const { capturePreview, isCapturing } = usePreviewCapture(iframeRef);
 * 
 * const handleCapture = async () => {
 *   const result = await capturePreview({ viewport: 'desktop' });
 *   if (result) {
 *     // Upload result.blob to server
 *   }
 * };
 * ```
 */
export function usePreviewCapture(
  iframeRef: React.RefObject<HTMLIFrameElement>
): UsePreviewCaptureReturn {
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const capturePreview = useCallback(async (options?: CaptureOptions): Promise<CaptureResult | null> => {
    const iframe = iframeRef.current;
    
    if (!iframe) {
      setError(new Error('Preview iframe not available'));
      return null;
    }

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) {
      setError(new Error('Cannot access iframe document'));
      return null;
    }

    const root = iframeDoc.getElementById('preview-root');
    if (!root) {
      setError(new Error('Preview root element not found'));
      return null;
    }

    setIsCapturing(true);
    setError(null);

    try {
      const scale = options?.scale ?? 2;
      const quality = options?.quality ?? 0.9;

      // Configure html2canvas for iframe capture
      const canvas = await html2canvas(root, {
        scale,
        useCORS: true,
        allowTaint: false,
        backgroundColor: null,
        logging: false,
        // Use the iframe's window for proper style computation
        windowWidth: iframe.clientWidth,
        windowHeight: iframe.clientHeight,
        // Capture with proper scrolling
        scrollX: 0,
        scrollY: options?.fullPage ? 0 : -window.scrollY,
        // Handle cross-origin images gracefully
        onclone: (clonedDoc) => {
          // Ensure all images are loaded
          const images = clonedDoc.querySelectorAll('img');
          images.forEach((img) => {
            if (!img.complete) {
              img.style.visibility = 'hidden';
            }
          });
        },
      });

      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => {
            if (b) {
              resolve(b);
            } else {
              reject(new Error('Failed to create blob from canvas'));
            }
          },
          'image/png',
          quality
        );
      });

      const result: CaptureResult = {
        blob,
        width: canvas.width,
        height: canvas.height,
      };

      // Optionally include data URL for debugging
      if (process.env.NODE_ENV === 'development') {
        result.dataUrl = canvas.toDataURL('image/png', quality);
      }

      return result;
    } catch (err) {
      const captureError = err instanceof Error ? err : new Error('Capture failed');
      setError(captureError);
      console.error('[usePreviewCapture] Capture failed:', err);
      return null;
    } finally {
      setIsCapturing(false);
    }
  }, [iframeRef]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    capturePreview,
    isCapturing,
    error,
    clearError,
  };
}

/**
 * Upload a captured preview to the server for AI analysis
 * 
 * @param blob - The captured image blob
 * @param websiteId - The website ID for context
 * @param viewport - The viewport that was captured
 * @returns The URL of the uploaded image
 */
export async function uploadPreviewCapture(
  blob: Blob,
  websiteId: string,
  viewport: Viewport = 'desktop'
): Promise<{ url: string; imageId: string }> {
  const formData = new FormData();
  formData.append('image', blob, `preview-${viewport}-${Date.now()}.png`);
  formData.append('website_id', websiteId);
  formData.append('viewport', viewport);

  // Use the API base URL from environment
  const apiBase = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000/api';
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  
  // Get CSRF token from apiClient
  const { apiClient } = await import('@/lib/api/client');
  let csrfToken = apiClient.getCsrfToken();
  if (!csrfToken) {
    csrfToken = await apiClient.fetchCsrfToken();
  }

  const response = await fetch(`${apiBase}/ai/vision/upload`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
    headers: {
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...(csrfToken && { 'X-CSRF-Token': csrfToken }),
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(error.error || 'Failed to upload preview capture');
  }

  return response.json();
}

/**
 * Parameters for visual analysis
 */
export interface VisualAnalysisParams {
  websiteId: string;
  imageId: string;
  originalMessage: string;
  viewport: Viewport;
  focus: 'layout' | 'colors' | 'typography' | 'spacing' | 'overall' | 'specific_section';
  section?: string;
  question?: string;
  conversationId?: string;
}

/**
 * Response from visual analysis
 */
export interface VisualAnalysisResponse {
  analysis: string;
  conversation_id: string;
}

/**
 * Call the AI visual analysis endpoint with the captured screenshot
 * 
 * @param params - Analysis parameters including image and focus
 * @returns The AI analysis of the screenshot
 */
export async function analyzePreviewCapture(
  params: VisualAnalysisParams
): Promise<VisualAnalysisResponse> {
  // Use the API base URL from environment
  const apiBase = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000/api';
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  
  // Get CSRF token from apiClient
  const { apiClient } = await import('@/lib/api/client');
  let csrfToken = apiClient.getCsrfToken();
  if (!csrfToken) {
    csrfToken = await apiClient.fetchCsrfToken();
  }

  const response = await fetch(`${apiBase}/ai/vision/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
      ...(csrfToken && { 'X-CSRF-Token': csrfToken }),
    },
    body: JSON.stringify({
      website_id: params.websiteId,
      image_id: params.imageId,
      original_message: params.originalMessage,
      viewport: params.viewport,
      focus: params.focus,
      section: params.section,
      question: params.question,
      conversation_id: params.conversationId,
    }),
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Analysis failed' }));
    throw new Error(error.error || 'Failed to analyze preview');
  }

  return response.json();
}

export default usePreviewCapture;
