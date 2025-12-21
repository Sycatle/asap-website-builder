import React, { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  /** Image source URL */
  src: string;
  /** Alt text for accessibility */
  alt: string;
  /** Optional fallback image URL */
  fallback?: string;
  /** Optional placeholder (blur, color, or skeleton) */
  placeholder?: 'blur' | 'skeleton' | 'none';
  /** Blur data URL for blur placeholder */
  blurDataURL?: string;
  /** Aspect ratio (e.g., "16/9", "1/1", "4/3") */
  aspectRatio?: string;
  /** Fill container while maintaining aspect ratio */
  fill?: boolean;
  /** Priority loading (disables lazy loading) */
  priority?: boolean;
  /** Object fit mode */
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  /** Object position */
  objectPosition?: string;
  /** Optional className for the wrapper */
  wrapperClassName?: string;
  /** Callback when image loads */
  onLoad?: () => void;
  /** Callback when image fails to load */
  onError?: () => void;
}

/**
 * Optimized image component with:
 * - Native lazy loading
 * - IntersectionObserver for older browsers
 * - Blur/skeleton placeholder while loading
 * - Error fallback handling
 * - Aspect ratio preservation
 */
export function OptimizedImage({
  src,
  alt,
  fallback = '/images/placeholder.svg',
  placeholder = 'skeleton',
  blurDataURL,
  aspectRatio,
  fill = false,
  priority = false,
  objectFit = 'cover',
  objectPosition = 'center',
  className,
  wrapperClassName,
  onLoad,
  onError,
  ...props
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const imgRef = useRef<HTMLImageElement>(null);

  // Use IntersectionObserver for lazy loading
  useEffect(() => {
    if (priority || !imgRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true);
            observer.disconnect();
          }
        });
      },
      {
        rootMargin: '50px', // Start loading 50px before entering viewport
        threshold: 0.01,
      }
    );

    observer.observe(imgRef.current);

    return () => observer.disconnect();
  }, [priority]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  const imageSrc = hasError ? fallback : src;
  const shouldLoad = priority || isInView;

  // Wrapper styles for aspect ratio preservation
  const wrapperStyles: React.CSSProperties = aspectRatio
    ? { aspectRatio, position: 'relative', overflow: 'hidden' }
    : fill
    ? { position: 'relative', width: '100%', height: '100%' }
    : {};

  // Image styles
  const imageStyles: React.CSSProperties = {
    objectFit,
    objectPosition,
    ...(fill && {
      position: 'absolute',
      width: '100%',
      height: '100%',
      inset: 0,
    }),
  };

  return (
    <div
      className={cn(
        'overflow-hidden',
        wrapperClassName
      )}
      style={wrapperStyles}
    >
      {/* Placeholder */}
      {!isLoaded && placeholder !== 'none' && (
        <div
          className={cn(
            'absolute inset-0 z-10',
            placeholder === 'skeleton' && 'animate-pulse bg-muted',
            placeholder === 'blur' && 'backdrop-blur-xl'
          )}
          style={
            placeholder === 'blur' && blurDataURL
              ? {
                  backgroundImage: `url(${blurDataURL})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }
              : undefined
          }
        />
      )}

      {/* Main image */}
      <img
        ref={imgRef}
        src={shouldLoad ? imageSrc : undefined}
        data-src={!shouldLoad ? imageSrc : undefined}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding={priority ? 'sync' : 'async'}
        onLoad={handleLoad}
        onError={handleError}
        className={cn(
          'transition-opacity duration-300',
          isLoaded ? 'opacity-100' : 'opacity-0',
          className
        )}
        style={imageStyles}
        {...props}
      />
    </div>
  );
}

/**
 * Avatar image component with circular shape and fallback initials
 */
interface AvatarImageProps extends Omit<OptimizedImageProps, 'aspectRatio' | 'fill'> {
  /** Size in pixels */
  size?: number;
  /** Fallback initials if image fails to load */
  initials?: string;
}

export function AvatarImage({
  src,
  alt,
  size = 40,
  initials,
  className,
  ...props
}: AvatarImageProps) {
  const [hasError, setHasError] = useState(false);

  if (hasError && initials) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full bg-muted text-muted-foreground font-medium',
          className
        )}
        style={{ width: size, height: size, fontSize: size * 0.4 }}
        role="img"
        aria-label={alt}
      >
        {initials.slice(0, 2).toUpperCase()}
      </div>
    );
  }

  return (
    <OptimizedImage
      src={src}
      alt={alt}
      aspectRatio="1/1"
      objectFit="cover"
      placeholder="skeleton"
      className={cn('rounded-full', className)}
      wrapperClassName="rounded-full"
      style={{ width: size, height: size }}
      onError={() => setHasError(true)}
      {...props}
    />
  );
}

/**
 * Background image component for hero sections
 */
interface BackgroundImageProps {
  src: string;
  alt?: string;
  className?: string;
  children?: React.ReactNode;
  overlay?: boolean;
  overlayClassName?: string;
}

export function BackgroundImage({
  src,
  alt = '',
  className,
  children,
  overlay = false,
  overlayClassName,
}: BackgroundImageProps) {
  return (
    <div className={cn('relative overflow-hidden', className)}>
      <OptimizedImage
        src={src}
        alt={alt}
        fill
        priority
        objectFit="cover"
        className="absolute inset-0 -z-10"
        placeholder="blur"
      />
      {overlay && (
        <div
          className={cn(
            'absolute inset-0 -z-10 bg-black/50',
            overlayClassName
          )}
        />
      )}
      {children}
    </div>
  );
}

export default OptimizedImage;
