/**
 * Optimized Image Component
 * 
 * Provides automatic lazy loading, blur placeholder, srcset generation,
 * and proper aspect ratio to prevent CLS (Cumulative Layout Shift).
 */

import React, { useState, useRef, useEffect } from 'react';
import { cn } from '../../utils';

export interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  /** Priority loading for LCP images (above-the-fold) */
  priority?: boolean;
  /** Aspect ratio for container (e.g., "16/9", "4/3", "1/1") */
  aspectRatio?: string;
  /** Object fit mode */
  objectFit?: 'cover' | 'contain' | 'fill' | 'none';
  /** Placeholder while loading */
  placeholder?: 'blur' | 'empty';
  /** Blur data URL for placeholder */
  blurDataUrl?: string;
  /** Sizes attribute for responsive images */
  sizes?: string;
  /** onLoad callback */
  onLoad?: () => void;
}

// Generate srcset for responsive images
function generateSrcset(src: string): string {
  // If it's an external URL (not our CDN), return empty
  if (!src.startsWith('/') && !src.includes('asap.cool')) {
    return '';
  }
  
  // Generate widths for responsive images
  const widths = [320, 640, 768, 1024, 1280, 1536, 1920];
  
  // If the URL supports image transformation (future CDN support)
  // For now, return just the original
  return '';
}

// Generate blur placeholder SVG
function generateBlurPlaceholder(width: number = 10, height: number = 10): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect fill="rgb(var(--muted))" width="100%" height="100%"/></svg>`;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className,
  priority = false,
  aspectRatio,
  objectFit = 'cover',
  placeholder = 'blur',
  blurDataUrl,
  sizes = '100vw',
  onLoad,
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const imgRef = useRef<HTMLImageElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || isInView) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '200px', // Load 200px before entering viewport
        threshold: 0,
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [priority, isInView]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const placeholderUrl = blurDataUrl || generateBlurPlaceholder(width, height);
  const srcset = generateSrcset(src);

  // Calculate aspect ratio style
  const aspectRatioStyle = aspectRatio 
    ? { aspectRatio } 
    : width && height 
      ? { aspectRatio: `${width}/${height}` }
      : undefined;

  const objectFitClass = {
    cover: 'object-cover',
    contain: 'object-contain',
    fill: 'object-fill',
    none: 'object-none',
  }[objectFit];

  return (
    <div
      ref={imgRef}
      className={cn(
        'relative overflow-hidden',
        className
      )}
      style={aspectRatioStyle}
    >
      {/* Placeholder */}
      {placeholder === 'blur' && !isLoaded && (
        <div 
          className="absolute inset-0 bg-muted animate-pulse"
          style={{
            backgroundImage: `url(${placeholderUrl})`,
            backgroundSize: 'cover',
            filter: 'blur(20px)',
            transform: 'scale(1.1)',
          }}
        />
      )}

      {/* Actual image */}
      {(isInView || priority) && (
        <img
          src={src}
          alt={alt}
          width={width}
          height={height}
          loading={priority ? 'eager' : 'lazy'}
          decoding={priority ? 'sync' : 'async'}
          fetchPriority={priority ? 'high' : 'auto'}
          sizes={sizes}
          srcSet={srcset || undefined}
          onLoad={handleLoad}
          className={cn(
            'w-full h-full transition-opacity duration-300',
            objectFitClass,
            isLoaded ? 'opacity-100' : 'opacity-0'
          )}
        />
      )}
    </div>
  );
}

/**
 * Background Image Component
 * 
 * Optimized for hero backgrounds with lazy loading and blur placeholder.
 */
export interface BackgroundImageProps {
  src: string;
  alt?: string;
  className?: string;
  priority?: boolean;
  overlay?: boolean;
  overlayOpacity?: number;
  children?: React.ReactNode;
}

export function BackgroundImage({
  src,
  alt = '',
  className,
  priority = false,
  overlay = true,
  overlayOpacity = 0.5,
  children,
}: BackgroundImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (priority || isInView) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px' }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [priority, isInView]);

  useEffect(() => {
    if (!isInView) return;

    const img = new Image();
    img.onload = () => setIsLoaded(true);
    img.src = src;
  }, [isInView, src]);

  return (
    <div ref={containerRef} className={cn('relative overflow-hidden', className)}>
      {/* Background placeholder */}
      <div 
        className={cn(
          'absolute inset-0 bg-muted transition-opacity duration-500',
          isLoaded ? 'opacity-0' : 'opacity-100'
        )}
      />

      {/* Background image */}
      {isInView && (
        <div
          className={cn(
            'absolute inset-0 bg-cover bg-center bg-no-repeat transition-opacity duration-500',
            isLoaded ? 'opacity-100' : 'opacity-0'
          )}
          style={{ backgroundImage: `url(${src})` }}
          role="img"
          aria-label={alt}
        />
      )}

      {/* Overlay */}
      {overlay && (
        <div 
          className="absolute inset-0 bg-background"
          style={{ opacity: overlayOpacity }}
        />
      )}

      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
}
