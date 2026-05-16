/**
 * Hero Variant — Split Asymmetric
 *
 * Two-column layout: text on the left, oversized visual on the right.
 * Off-center, with the visual breaking out of the column grid for tension.
 */

import React from 'react';
import { cn, getData } from '../../../utils';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { SectionWrapper } from '../../ui/section-wrapper';
import { Container } from '../../ui/container';
import { getIcon } from '../../icons';
import { HERO_SCHEMA } from '@asap/shared';
import type { Section } from '../../../types';

export interface SectionProps {
  section: Section;
  className?: string;
}

interface VariantParams {
  density?: 'compact' | 'default' | 'airy';
  image_ratio?: number; // 0..1, width of the visual column
  motion?: 'none' | 'subtle' | 'expressive';
  visual_url?: string;
  visual_alt?: string;
}

export function HeroSplitAsymmetric({ section, className }: SectionProps) {
  const defaults = HERO_SCHEMA.defaultSettings;
  const params = (section.variant_params ?? {}) as VariantParams;

  const showBadge = getData(section, 'show_badge', defaults.show_badge as boolean);
  const badgeIcon = getData(section, 'badge_icon', defaults.badge_icon as string);
  const badgeText = getData(section, 'badge_text', defaults.badge_text as string);
  const headlineLine1 = getData(section, 'headline_line1', defaults.headline_line1 as string);
  const headlineLine2 = getData(section, 'headline_line2', defaults.headline_line2 as string);
  const subheadline = getData(section, 'subheadline', defaults.subheadline as string);
  const ctaPrimaryText = getData(section, 'cta_primary_text', defaults.cta_primary_text as string);
  const ctaPrimaryHref = getData(section, 'cta_primary_href', defaults.cta_primary_href as string);
  const ctaSecondaryText = getData(section, 'cta_secondary_text', defaults.cta_secondary_text as string);
  const ctaSecondaryHref = getData(section, 'cta_secondary_href', defaults.cta_secondary_href as string);
  const visualUrl =
    params.visual_url ?? getData(section, 'visual_url', defaults.dashboard_url as string);
  const visualAlt = params.visual_alt ?? '';

  const BadgeIcon = badgeIcon ? getIcon(badgeIcon) : null;

  const ratio = clamp(params.image_ratio ?? 0.55, 0.35, 0.7);
  const textColSpan = `calc(${(1 - ratio) * 100}% - 2rem)`;
  const visualColSpan = `calc(${ratio * 100}% + 2rem)`;

  const density = params.density ?? 'default';
  const padding = density === 'compact' ? 'default' : density === 'airy' ? 'xl' : 'lg';

  return (
    <SectionWrapper variant="gradient" padding={padding} className={cn('overflow-hidden', className)}>
      <Container>
        <div
          className="grid items-center gap-8 lg:gap-12"
          style={{ gridTemplateColumns: `${textColSpan} ${visualColSpan}` }}
        >
          <div>
            {showBadge && badgeText && (
              <Badge variant="secondary" size="lg" className="mb-6">
                {BadgeIcon && <BadgeIcon className="mr-2 h-3.5 w-3.5" />}
                {badgeText}
              </Badge>
            )}
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl mb-6">
              {headlineLine1}
              {headlineLine2 && (
                <span className="block text-primary mt-2">{headlineLine2}</span>
              )}
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-xl">{subheadline}</p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button size="lg" className="text-base px-8" href={ctaPrimaryHref}>
                {ctaPrimaryText}
              </Button>
              {ctaSecondaryText && (
                <Button size="lg" variant="outline" className="text-base px-8" href={ctaSecondaryHref}>
                  {ctaSecondaryText}
                </Button>
              )}
            </div>
          </div>
          <div className="relative">
            <div className="aspect-[4/3] rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-purple-500/10 shadow-2xl overflow-hidden lg:scale-110 lg:translate-x-4">
              {visualUrl ? (
                <img src={visualUrl} alt={visualAlt} className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-muted-foreground text-sm">
                  Visual placeholder
                </div>
              )}
            </div>
          </div>
        </div>
      </Container>
    </SectionWrapper>
  );
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
