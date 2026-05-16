/**
 * CTA Variant — Banner
 *
 * Compact horizontal banner: headline on the left, CTAs on the right.
 * Good for inline conversion blocks between content sections.
 */

import React from 'react';
import { cn, getData } from '../../../utils';
import { SectionWrapper } from '../../ui/section-wrapper';
import { Container } from '../../ui/container';
import { Button } from '../../ui/button';
import { CTA_SCHEMA } from '@asap/shared';
import type { Section } from '../../../types';

export interface SectionProps {
  section: Section;
  className?: string;
}

interface VariantParams {
  density?: 'compact' | 'default' | 'airy';
  tone?: 'primary' | 'muted' | 'surface';
}

export function CTABanner({ section, className }: SectionProps) {
  const defaults = CTA_SCHEMA.defaultSettings;
  const params = (section.variant_params ?? {}) as VariantParams;

  const headline = getData(section, 'headline', defaults.headline as string);
  const subheadlineLine1 = getData(section, 'subheadline_line1', defaults.subheadline_line1 as string);
  const ctaPrimaryText = getData(section, 'cta_primary_text', defaults.cta_primary_text as string);
  const ctaPrimaryHref = getData(section, 'cta_primary_href', defaults.cta_primary_href as string);
  const ctaSecondaryText = getData(section, 'cta_secondary_text', defaults.cta_secondary_text as string);
  const ctaSecondaryHref = getData(section, 'cta_secondary_href', defaults.cta_secondary_href as string);

  const padding = params.density === 'compact' ? 'default' : params.density === 'airy' ? 'xl' : 'lg';
  const tone = params.tone ?? 'primary';
  const wrapperVariant =
    tone === 'muted' ? 'muted' : tone === 'surface' ? 'default' : 'primary';
  const textTone = tone === 'primary' ? 'text-primary-foreground' : 'text-foreground';

  return (
    <SectionWrapper variant={wrapperVariant} padding={padding} className={className}>
      <Container>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className={cn('max-w-2xl', textTone)}>
            <h2 className="text-2xl md:text-3xl font-bold leading-tight">{headline}</h2>
            {subheadlineLine1 && <p className="mt-2 opacity-90">{subheadlineLine1}</p>}
          </div>
          <div className="flex flex-col sm:flex-row gap-3 shrink-0">
            <Button size="lg" variant={tone === 'primary' ? 'secondary' : 'default'} href={ctaPrimaryHref}>
              {ctaPrimaryText}
            </Button>
            {ctaSecondaryText && (
              <Button size="lg" variant="ghost" className={textTone} href={ctaSecondaryHref}>
                {ctaSecondaryText}
              </Button>
            )}
          </div>
        </div>
      </Container>
    </SectionWrapper>
  );
}
