/**
 * Gallery Section Component
 * 
 * Image gallery section with multiple variants.
 * - grid: Simple grid layout
 * - masonry: Masonry-style layout
 * - carousel: Horizontal carousel
 */

import React, { useState } from 'react';
import { cn, getData } from '../../utils';
import { Badge } from '../ui/badge';
import { SectionWrapper } from '../ui/section-wrapper';
import { Container } from '../ui/container';
import { Icons } from '../icons';
import { GALLERY_SCHEMA } from '@asap/shared';
import type { Section } from '../../types';

export interface SectionProps {
  section: Section;
  className?: string;
}

interface GalleryImage {
  url: string;
  alt: string;
  caption?: string;
}

export function GallerySection({ section, className }: SectionProps) {
  const defaults = GALLERY_SCHEMA.defaultSettings;

  // Extract data from section
  const variant = getData(section, 'variant', defaults.variant as string);
  const badgeText = getData(section, 'badge_text', defaults.badge_text as string);
  const headline = getData(section, 'headline', defaults.headline as string);
  const subheadline = getData(section, 'subheadline', defaults.subheadline as string);
  const columns = getData(section, 'columns', defaults.columns as string);
  const gap = getData(section, 'gap', defaults.gap as string);
  const images = getData(section, 'images', defaults.images as GalleryImage[]);
  const lightbox = getData(section, 'lightbox', defaults.lightbox as boolean);
  const rounded = getData(section, 'rounded', defaults.rounded as boolean);
  const hoverEffect = getData(section, 'hover_effect', defaults.hover_effect as boolean);

  // Lightbox state
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentImage, setCurrentImage] = useState(0);

  const openLightbox = (index: number) => {
    if (lightbox) {
      setCurrentImage(index);
      setLightboxOpen(true);
    }
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
  };

  const nextImage = () => {
    setCurrentImage((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentImage((prev) => (prev - 1 + images.length) % images.length);
  };

  const gapClasses = {
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
  };

  const columnClasses = {
    '2': 'sm:grid-cols-2',
    '3': 'sm:grid-cols-2 lg:grid-cols-3',
    '4': 'sm:grid-cols-2 lg:grid-cols-4',
  };

  // Image component
  const ImageCard = ({ image, index }: { image: GalleryImage; index: number }) => (
    <div
      className={cn(
        "relative overflow-hidden group",
        rounded && "rounded-lg",
        lightbox && "cursor-pointer"
      )}
      onClick={() => openLightbox(index)}
    >
      {image.url ? (
        <img
          src={image.url}
          alt={image.alt}
          className={cn(
            "w-full h-full object-cover aspect-square",
            hoverEffect && "transition-transform duration-300 group-hover:scale-105"
          )}
        />
      ) : (
        <div className="w-full aspect-square bg-muted flex items-center justify-center">
          <Icons.image className="h-12 w-12 text-muted-foreground/30" />
        </div>
      )}
      
      {/* Hover overlay */}
      {hoverEffect && (
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
      )}
      
      {/* Caption */}
      {image.caption && (
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/70 to-transparent">
          <p className="text-white text-sm">{image.caption}</p>
        </div>
      )}
      
      {/* Lightbox icon */}
      {lightbox && (
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="p-2 bg-white/90 rounded-full">
            <Icons.maximize className="h-5 w-5" />
          </div>
        </div>
      )}
    </div>
  );

  // Grid variant
  if (variant === 'grid') {
    return (
      <SectionWrapper variant="default" padding="lg" className={className}>
        <Container>
          {/* Header */}
          {(badgeText || headline || subheadline) && (
            <div className="text-center mb-12">
              {badgeText && (
                <Badge variant="secondary" size="lg" className="mb-4">
                  {badgeText}
                </Badge>
              )}
              {headline && (
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                  {headline}
                </h2>
              )}
              {subheadline && (
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  {subheadline}
                </p>
              )}
            </div>
          )}

          {/* Grid */}
          <div className={cn(
            "grid",
            columnClasses[columns as keyof typeof columnClasses],
            gapClasses[gap as keyof typeof gapClasses]
          )}>
            {images.map((image, index) => (
              <ImageCard key={index} image={image} index={index} />
            ))}
          </div>
        </Container>

        {/* Lightbox */}
        {lightbox && lightboxOpen && (
          <Lightbox
            images={images}
            currentIndex={currentImage}
            onClose={closeLightbox}
            onNext={nextImage}
            onPrev={prevImage}
          />
        )}
      </SectionWrapper>
    );
  }

  // Masonry variant
  if (variant === 'masonry') {
    return (
      <SectionWrapper variant="default" padding="lg" className={className}>
        <Container>
          {/* Header */}
          {(badgeText || headline || subheadline) && (
            <div className="text-center mb-12">
              {badgeText && (
                <Badge variant="secondary" size="lg" className="mb-4">
                  {badgeText}
                </Badge>
              )}
              {headline && (
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                  {headline}
                </h2>
              )}
              {subheadline && (
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  {subheadline}
                </p>
              )}
            </div>
          )}

          {/* Masonry grid (CSS columns) */}
          <div className={cn(
            "columns-1 sm:columns-2 lg:columns-3",
            gapClasses[gap as keyof typeof gapClasses]
          )}>
            {images.map((image, index) => (
              <div key={index} className="mb-4 break-inside-avoid">
                <ImageCard image={image} index={index} />
              </div>
            ))}
          </div>
        </Container>

        {/* Lightbox */}
        {lightbox && lightboxOpen && (
          <Lightbox
            images={images}
            currentIndex={currentImage}
            onClose={closeLightbox}
            onNext={nextImage}
            onPrev={prevImage}
          />
        )}
      </SectionWrapper>
    );
  }

  // Carousel variant
  return (
    <SectionWrapper variant="default" padding="lg" className={className}>
      <Container>
        {/* Header */}
        {(badgeText || headline || subheadline) && (
          <div className="text-center mb-12">
            {badgeText && (
              <Badge variant="secondary" size="lg" className="mb-4">
                {badgeText}
              </Badge>
            )}
            {headline && (
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                {headline}
              </h2>
            )}
            {subheadline && (
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                {subheadline}
              </p>
            )}
          </div>
        )}

        {/* Carousel */}
        <div className="relative">
          <div className={cn(
            "flex overflow-x-auto snap-x snap-mandatory scrollbar-hide",
            gapClasses[gap as keyof typeof gapClasses]
          )}>
            {images.map((image, index) => (
              <div
                key={index}
                className="flex-none w-72 md:w-96 snap-center"
              >
                <ImageCard image={image} index={index} />
              </div>
            ))}
          </div>
          
          {/* Navigation hints */}
          <div className="flex justify-center mt-4 gap-2">
            {images.map((_, index) => (
              <button
                key={index}
                className={cn(
                  "w-2 h-2 rounded-full transition-colors",
                  index === currentImage ? "bg-primary" : "bg-muted-foreground/30"
                )}
                onClick={() => setCurrentImage(index)}
              />
            ))}
          </div>
        </div>
      </Container>

      {/* Lightbox */}
      {lightbox && lightboxOpen && (
        <Lightbox
          images={images}
          currentIndex={currentImage}
          onClose={closeLightbox}
          onNext={nextImage}
          onPrev={prevImage}
        />
      )}
    </SectionWrapper>
  );
}

// Lightbox component
function Lightbox({
  images,
  currentIndex,
  onClose,
  onNext,
  onPrev,
}: {
  images: GalleryImage[];
  currentIndex: number;
  onClose: () => void;
  onNext: () => void;
  onPrev: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 text-white/80 hover:text-white transition-colors"
      >
        <Icons.x className="h-8 w-8" />
      </button>

      {/* Navigation */}
      <button
        onClick={onPrev}
        className="absolute left-4 p-2 text-white/80 hover:text-white transition-colors"
      >
        <Icons.chevronLeft className="h-8 w-8" />
      </button>
      <button
        onClick={onNext}
        className="absolute right-4 p-2 text-white/80 hover:text-white transition-colors"
      >
        <Icons.chevronRight className="h-8 w-8" />
      </button>

      {/* Image */}
      <div className="max-w-4xl max-h-[80vh] mx-4">
        <img
          src={images[currentIndex].url}
          alt={images[currentIndex].alt}
          className="max-w-full max-h-[80vh] object-contain"
        />
        {images[currentIndex].caption && (
          <p className="text-white text-center mt-4">{images[currentIndex].caption}</p>
        )}
      </div>

      {/* Counter */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/80">
        {currentIndex + 1} / {images.length}
      </div>
    </div>
  );
}
