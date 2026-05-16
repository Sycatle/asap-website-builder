/**
 * Hero Variant — Full Bleed
 *
 * Full-viewport background image (or gradient) with text overlay.
 * Centered headline with optional subheadline and CTAs.
 */

import React from 'react';
import { cn, getData } from '../../../utils';
import { Button } from '../../ui/button';
import { SectionWrapper } from '../../ui/section-wrapper';
import { Container } from '../../ui/container';
import { HERO_SCHEMA } from '@asap/shared';
import type { Section } from '../../../types';

export interface SectionProps {
  section: Section;
  className?: string;
}

interface VariantParams {
  density?: 'compact' | 'default' | 'airy';
  background_url?: string;
  overlay_opacity?: number; // 0..1
  align?: 'left' | 'center' | 'right';
}

export function HeroFullBleed({ section, className }: SectionProps) {
  const defaults = HERO_SCHEMA.defaultSettings;
  const params = (section.variant_params ?? {}) as VariantParams;

  const headlineLine1 = getData(section, 'headline_line1', defaults.headline_line1 as string);
  const headlineLine2 = getData(section, 'headline_line2', defaults.headline_line2 as string);
  const subheadline = getData(section, 'subheadline', defaults.subheadline as string);
  const ctaPrimaryText = getData(section, 'cta_primary_text', defaults.cta_primary_text as string);
  const ctaPrimaryHref = getData(section, 'cta_primary_href', defaults.cta_primary_href as string);
  const ctaSecondaryText = getData(section, 'cta_secondary_text', defaults.cta_secondary_text as string);
  const ctaSecondaryHref = getData(section, 'cta_secondary_href', defaults.cta_secondary_href as string);

  const bg = params.background_url ?? '';
  const overlay = clamp(params.overlay_opacity ?? 0.55, 0, 1);
  const align = params.align ?? 'center';
  const density = params.density ?? 'default';
  const minHeight = density === 'compact' ? '60vh' : density === 'airy' ? '90vh' : '75vh';

  const alignClass =
    align === 'left' ? 'text-left items-start' :
    align === 'right' ? 'text-right items-end' :
    'text-center items-center';

  return (
    <SectionWrapper
      variant="default"
      padding="none"
      className={cn('relative isolate overflow-hidden', className)}
    >
      <div
        className="absolute inset-0 -z-20 bg-cover bg-center"
        style={{
          backgroundImage: bg
            ? `url(${bg})`
            : 'linear-gradient(135deg, rgb(var(--color-primary) / 0.4), rgb(var(--color-accent, var(--color-primary)) / 0.3))',
        }}
        aria-hidden
      />
      <div
        className="absolute inset-0 -z-10 bg-black"
        style={{ opacity: overlay }}
        aria-hidden
      />
      <div className="relative flex flex-col justify-center" style={{ minHeight }}>
        <Container>
          <div className={cn('flex flex-col gap-6 max-w-3xl mx-auto', alignClass)}>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl text-white">
              {headlineLine1}
              {headlineLine2 && <span className="block mt-2 opacity-90">{headlineLine2}</span>}
            </h1>
            <p className="text-lg md:text-xl text-white/80 max-w-2xl">{subheadline}</p>
            <div className={cn(
              'flex flex-col sm:flex-row gap-3',
              align === 'center' && 'justify-center',
              align === 'right' && 'justify-end',
            )}>
              <Button size="lg" className="text-base px-8" href={ctaPrimaryHref}>
                {ctaPrimaryText}
              </Button>
              {ctaSecondaryText && (
                <Button
                  size="lg"
                  variant="outline"
                  className="text-base px-8 bg-white/10 border-white/30 text-white hover:bg-white/20"
                  href={ctaSecondaryHref}
                >
                  {ctaSecondaryText}
                </Button>
              )}
            </div>
          </div>
        </Container>
      </div>
    </SectionWrapper>
  );
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
