/**
 * Content Section Component
 * 
 * Rich content section with multiple variants.
 * - centered: Centered text content
 * - split: Image + text side by side
 * - full-width: Full width content
 */

import React from 'react';
import { cn, getData } from '../../utils';
import { Button } from '../ui/button';
import { SectionWrapper } from '../ui/section-wrapper';
import { Container } from '../ui/container';
import { CONTENT_SCHEMA } from '@asap/shared';
import type { Section } from '../../types';

export interface SectionProps {
  section: Section;
  className?: string;
}

export function ContentSection({ section, className }: SectionProps) {
  const defaults = CONTENT_SCHEMA.defaultSettings;

  // Extract data from section
  const variant = getData(section, 'variant', defaults.variant as string);
  const headline = getData(section, 'headline', defaults.headline as string);
  const subheadline = getData(section, 'subheadline', defaults.subheadline as string);
  const content = getData(section, 'content', defaults.content as string);
  const imageUrl = getData(section, 'image_url', defaults.image_url as string);
  const imagePosition = getData(section, 'image_position', defaults.image_position as string);
  const imageAlt = getData(section, 'image_alt', defaults.image_alt as string);
  const ctaPrimaryText = getData(section, 'cta_primary_text', defaults.cta_primary_text as string);
  const ctaPrimaryHref = getData(section, 'cta_primary_href', defaults.cta_primary_href as string);
  const background = getData(section, 'background', defaults.background as string);

  const wrapperVariant = background === 'gradient' ? 'gradient' : background === 'muted' ? 'muted' : 'default';

  // Centered variant
  if (variant === 'centered') {
    return (
      <SectionWrapper variant={wrapperVariant} padding="lg" className={className}>
        <Container size="default">
          <div className="text-center">
            {headline && (
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                {headline}
              </h2>
            )}
            {subheadline && (
              <p className="text-lg text-muted-foreground mb-6 max-w-2xl mx-auto">
                {subheadline}
              </p>
            )}
            {content && (
              <div className="prose prose-lg mx-auto text-muted-foreground mb-8">
                <p>{content}</p>
              </div>
            )}
            {ctaPrimaryText && (
              <Button size="lg" href={ctaPrimaryHref}>
                {ctaPrimaryText}
              </Button>
            )}
          </div>
        </Container>
      </SectionWrapper>
    );
  }

  // Split variant (image + text)
  if (variant === 'split') {
    const isImageLeft = imagePosition === 'left';
    
    return (
      <SectionWrapper variant={wrapperVariant} padding="lg" className={className}>
        <Container>
          <div className={cn(
            "grid md:grid-cols-2 gap-12 items-center",
            isImageLeft && "md:flex-row-reverse"
          )}>
            {/* Image */}
            <div className={cn(isImageLeft ? "md:order-1" : "md:order-2")}>
              {imageUrl ? (
                <img
                  src={imageUrl}
                  alt={imageAlt || headline}
                  className="w-full h-auto rounded-lg shadow-lg"
                />
              ) : (
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                  <span className="text-muted-foreground">Image</span>
                </div>
              )}
            </div>
            
            {/* Content */}
            <div className={cn(isImageLeft ? "md:order-2" : "md:order-1")}>
              {headline && (
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                  {headline}
                </h2>
              )}
              {subheadline && (
                <p className="text-lg text-muted-foreground mb-4">
                  {subheadline}
                </p>
              )}
              {content && (
                <div className="prose text-muted-foreground mb-6">
                  <p>{content}</p>
                </div>
              )}
              {ctaPrimaryText && (
                <Button size="lg" href={ctaPrimaryHref}>
                  {ctaPrimaryText}
                </Button>
              )}
            </div>
          </div>
        </Container>
      </SectionWrapper>
    );
  }

  // Full-width variant
  return (
    <SectionWrapper variant={wrapperVariant} padding="lg" className={className}>
      <Container size="lg">
        {headline && (
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
            {headline}
          </h2>
        )}
        {subheadline && (
          <p className="text-xl text-muted-foreground mb-6">
            {subheadline}
          </p>
        )}
        {content && (
          <div className="prose prose-lg max-w-none text-muted-foreground mb-8">
            <p>{content}</p>
          </div>
        )}
        {ctaPrimaryText && (
          <Button size="lg" href={ctaPrimaryHref}>
            {ctaPrimaryText}
          </Button>
        )}
      </Container>
    </SectionWrapper>
  );
}
