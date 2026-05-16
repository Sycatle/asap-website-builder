/**
 * Hero Section Component
 *
 * Dispatches to the right variant based on `section.variant_key`, with the
 * legacy single-layout (`centered-minimal`) as the default. Each variant is
 * a standalone implementation in `./hero-variants/`.
 */

import React from 'react';
import { cn, getData, withVariantFields } from '../../utils';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { SectionWrapper } from '../ui/section-wrapper';
import { Container } from '../ui/container';
import { AvatarGroup } from '../ui/avatar';
import { Icons, getIcon } from '../icons';
import { HERO_SCHEMA } from '@asap/shared';
import type { Section } from '../../types';
import { HeroSplitAsymmetric } from './hero-variants/split-asymmetric';
import { HeroFullBleed } from './hero-variants/full-bleed';

export interface SectionProps {
  section: Section;
  className?: string;
}

interface DashboardStat {
  icon: string;
  value: string;
  label: string;
}

export function HeroSection({ section: rawSection, className }: SectionProps) {
  const section = withVariantFields(rawSection);
  const variant = section.variant_key;

  if (variant === 'hero/split-asymmetric') {
    return <HeroSplitAsymmetric section={section} className={className} />;
  }
  if (variant === 'hero/full-bleed') {
    return <HeroFullBleed section={section} className={className} />;
  }
  // Default: centered-minimal (legacy layout, also matches "hero/centered-minimal").
  return <HeroCenteredMinimal section={section} className={className} />;
}

function HeroCenteredMinimal({ section, className }: SectionProps) {
  const defaults = HERO_SCHEMA.defaultSettings;

  // Extract data from section
  const showBadge = getData(section, 'show_badge', defaults.show_badge as boolean);
  const badgeIcon = getData(section, 'badge_icon', defaults.badge_icon as string);
  const badgeText = getData(section, 'badge_text', defaults.badge_text as string);
  const headlineLine1 = getData(section, 'headline_line1', defaults.headline_line1 as string);
  const headlineLine2 = getData(section, 'headline_line2', defaults.headline_line2 as string);
  const subheadline = getData(section, 'subheadline', defaults.subheadline as string);
  const subheadlineBold = getData(section, 'subheadline_bold', defaults.subheadline_bold as string);
  const ctaPrimaryText = getData(section, 'cta_primary_text', defaults.cta_primary_text as string);
  const ctaPrimaryHref = getData(section, 'cta_primary_href', defaults.cta_primary_href as string);
  const ctaPrimaryIcon = getData(section, 'cta_primary_icon', defaults.cta_primary_icon as string);
  const ctaSecondaryText = getData(section, 'cta_secondary_text', defaults.cta_secondary_text as string);
  const ctaSecondaryHref = getData(section, 'cta_secondary_href', defaults.cta_secondary_href as string);
  const ctaSecondaryIcon = getData(section, 'cta_secondary_icon', defaults.cta_secondary_icon as string);
  const showSocialProof = getData(section, 'show_social_proof', defaults.show_social_proof as boolean);
  const socialProofAvatarsCount = getData(section, 'social_proof_avatars_count', defaults.social_proof_avatars_count as number);
  const socialProofText = getData(section, 'social_proof_text', defaults.social_proof_text as string);
  const socialProofRating = getData(section, 'social_proof_rating', defaults.social_proof_rating as string);
  const backgroundDecorations = getData(section, 'background_decorations', defaults.background_decorations as boolean);
  const showDashboardPreview = getData(section, 'show_dashboard_preview', defaults.show_dashboard_preview as boolean);
  const dashboardUrl = getData(section, 'dashboard_url', defaults.dashboard_url as string);
  const dashboardStats = getData(section, 'dashboard_stats', defaults.dashboard_stats as DashboardStat[]);

  const BadgeIcon = badgeIcon ? getIcon(badgeIcon) : null;
  const PrimaryIcon = ctaPrimaryIcon ? getIcon(ctaPrimaryIcon) : null;
  const SecondaryIcon = ctaSecondaryIcon ? getIcon(ctaSecondaryIcon) : null;

  return (
    <SectionWrapper variant="gradient" padding="lg" className={className}>
      {/* Background decorations */}
      {backgroundDecorations && (
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
        </div>
      )}

      <Container>
        <div className="mx-auto max-w-3xl text-center">
          {/* Badge */}
          {showBadge && badgeText && (
            <Badge variant="secondary" size="lg" className="mb-6">
              {BadgeIcon && <BadgeIcon className="mr-2 h-3.5 w-3.5" />}
              {badgeText}
            </Badge>
          )}

          {/* Headline */}
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl mb-6">
            {headlineLine1}
            {headlineLine2 && (
              <span className="block text-primary mt-2">{headlineLine2}</span>
            )}
          </h1>

          {/* Subheadline */}
          <p className="mx-auto max-w-2xl text-lg md:text-xl text-muted-foreground mb-8">
            {subheadline}
            {subheadlineBold && (
              <span className="font-semibold text-foreground"> {subheadlineBold}</span>
            )}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Button size="lg" className="w-full sm:w-auto text-base px-8" href={ctaPrimaryHref}>
              {ctaPrimaryText}
              {PrimaryIcon && <PrimaryIcon className="ml-2 h-4 w-4" />}
            </Button>
            {ctaSecondaryText && (
              <Button 
                size="lg" 
                variant="outline" 
                className="w-full sm:w-auto text-base px-8" 
                href={ctaSecondaryHref}
              >
                {SecondaryIcon && <SecondaryIcon className="mr-2 h-4 w-4" />}
                {ctaSecondaryText}
              </Button>
            )}
          </div>

          {/* Social Proof */}
          {showSocialProof && (
            <SocialProof
              avatarsCount={socialProofAvatarsCount}
              text={socialProofText}
              rating={socialProofRating}
            />
          )}

          {/* Dashboard Preview */}
          {showDashboardPreview && (
            <DashboardPreview url={dashboardUrl} stats={dashboardStats} />
          )}
        </div>
      </Container>
    </SectionWrapper>
  );
}

// ============================================
// Sub-components
// ============================================

interface SocialProofProps {
  avatarsCount: number;
  text: string;
  rating?: string;
}

function SocialProof({ avatarsCount, text, rating }: SocialProofProps) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-muted-foreground">
      <div className="flex items-center gap-2">
        <AvatarGroup count={avatarsCount} />
        <span>{text}</span>
      </div>
      {rating && (
        <div className="flex items-center gap-1">
          <div className="flex">
            {[...Array(5)].map((_, i) => (
              <Icons.star key={i} className="w-4 h-4 text-yellow-400" />
            ))}
          </div>
          <span>{rating}</span>
        </div>
      )}
    </div>
  );
}

interface DashboardPreviewProps {
  url: string;
  stats: DashboardStat[];
}

function DashboardPreview({ url, stats }: DashboardPreviewProps) {
  return (
    <div className="mt-16 mx-auto max-w-5xl">
      <div className="relative rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
        {/* Browser chrome */}
        <div className="border-b border-border bg-muted/50 px-4 py-3 flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <div className="w-3 h-3 rounded-full bg-green-500" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="flex items-center gap-2 rounded-md bg-background px-3 py-1 text-xs text-muted-foreground">
              <Icons.shield className="h-3 w-3" />
              {url}
            </div>
          </div>
        </div>
        {/* Dashboard content */}
        <div className="aspect-[16/9] bg-gradient-to-br from-primary/5 via-background to-purple-500/5 flex items-center justify-center">
          <div className="text-center p-8">
            {stats.length > 0 && (
              <div className="grid grid-cols-3 gap-4 mb-6">
                {stats.map((stat, i) => {
                  const StatIcon = getIcon(stat.icon);
                  return (
                    <div key={i} className="p-4 rounded-lg border bg-background/80 backdrop-blur">
                      <StatIcon className="h-6 w-6 text-primary mx-auto mb-2" />
                      <div className="text-2xl font-bold">{stat.value}</div>
                      <div className="text-xs text-muted-foreground">{stat.label}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
