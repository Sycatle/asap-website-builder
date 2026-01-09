/**
 * Stats Section Component
 * 
 * Key statistics/numbers section with multiple variants.
 * - simple: Simple stats grid
 * - cards: Stats in card layout
 * - inline: Inline/horizontal stats
 */

import React from 'react';
import { cn, getData } from '../../utils';
import { Badge } from '../ui/badge';
import { SectionWrapper } from '../ui/section-wrapper';
import { Container } from '../ui/container';
import { getIcon } from '../icons';
import { STATS_SCHEMA } from '@asap/shared';
import type { Section } from '../../types';

export interface SectionProps {
  section: Section;
  className?: string;
}

interface Stat {
  value: string;
  label: string;
  icon?: string;
  description?: string;
}

export function StatsSection({ section, className }: SectionProps) {
  const defaults = STATS_SCHEMA.defaultSettings;

  // Extract data from section
  const variant = getData(section, 'variant', defaults.variant as string);
  const badgeText = getData(section, 'badge_text', defaults.badge_text as string);
  const headline = getData(section, 'headline', defaults.headline as string);
  const subheadline = getData(section, 'subheadline', defaults.subheadline as string);
  const stats = getData(section, 'stats', defaults.stats as Stat[]);
  const background = getData(section, 'background', defaults.background as string);

  const wrapperVariant = background === 'primary' ? 'primary' : background === 'muted' ? 'muted' : 'default';

  // Simple variant
  if (variant === 'simple') {
    return (
      <SectionWrapper variant={wrapperVariant} padding="lg" className={className}>
        <Container>
          {/* Header */}
          {(badgeText || headline || subheadline) && (
            <div className="text-center mb-12">
              {badgeText && (
                <Badge 
                  variant={background === 'primary' ? 'secondary' : 'secondary'} 
                  size="lg" 
                  className="mb-4"
                >
                  {badgeText}
                </Badge>
              )}
              {headline && (
                <h2 className={cn(
                  "text-3xl md:text-4xl font-bold tracking-tight mb-4",
                  background === 'primary' && "text-primary-foreground"
                )}>
                  {headline}
                </h2>
              )}
              {subheadline && (
                <p className={cn(
                  "text-lg max-w-2xl mx-auto",
                  background === 'primary' ? "text-primary-foreground/80" : "text-muted-foreground"
                )}>
                  {subheadline}
                </p>
              )}
            </div>
          )}

          {/* Stats grid */}
          <div className={cn(
            "grid gap-8 text-center",
            stats.length === 2 && "grid-cols-2",
            stats.length === 3 && "grid-cols-3",
            stats.length >= 4 && "grid-cols-2 md:grid-cols-4"
          )}>
            {stats.map((stat, index) => {
              const Icon = stat.icon ? getIcon(stat.icon) : null;
              return (
                <div key={index}>
                  {Icon && (
                    <Icon className={cn(
                      "h-8 w-8 mx-auto mb-4",
                      background === 'primary' ? "text-primary-foreground" : "text-primary"
                    )} />
                  )}
                  <div className={cn(
                    "text-4xl md:text-5xl font-bold mb-2",
                    background === 'primary' ? "text-primary-foreground" : "text-foreground"
                  )}>
                    {stat.value}
                  </div>
                  <div className={cn(
                    "text-sm font-medium uppercase tracking-wider",
                    background === 'primary' ? "text-primary-foreground/80" : "text-muted-foreground"
                  )}>
                    {stat.label}
                  </div>
                  {stat.description && (
                    <p className={cn(
                      "text-sm mt-1",
                      background === 'primary' ? "text-primary-foreground/60" : "text-muted-foreground"
                    )}>
                      {stat.description}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </Container>
      </SectionWrapper>
    );
  }

  // Cards variant
  if (variant === 'cards') {
    return (
      <SectionWrapper variant={wrapperVariant} padding="lg" className={className}>
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

          {/* Stats cards */}
          <div className={cn(
            "grid gap-6",
            stats.length === 2 && "grid-cols-2",
            stats.length === 3 && "grid-cols-3",
            stats.length >= 4 && "grid-cols-2 md:grid-cols-4"
          )}>
            {stats.map((stat, index) => {
              const Icon = stat.icon ? getIcon(stat.icon) : null;
              return (
                <div
                  key={index}
                  className="p-6 bg-card border rounded-lg text-center hover:shadow-md transition-shadow"
                >
                  {Icon && (
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                  )}
                  <div className="text-3xl md:text-4xl font-bold mb-2">
                    {stat.value}
                  </div>
                  <div className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                    {stat.label}
                  </div>
                  {stat.description && (
                    <p className="text-xs text-muted-foreground mt-2">
                      {stat.description}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </Container>
      </SectionWrapper>
    );
  }

  // Inline variant
  return (
    <SectionWrapper variant={wrapperVariant} padding="default" className={className}>
      <Container>
        <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
          {stats.map((stat, index) => {
            const Icon = stat.icon ? getIcon(stat.icon) : null;
            return (
              <div key={index} className="flex items-center gap-4">
                {Icon && (
                  <div className={cn(
                    "p-3 rounded-lg",
                    background === 'primary' ? "bg-primary-foreground/10" : "bg-primary/10"
                  )}>
                    <Icon className={cn(
                      "h-6 w-6",
                      background === 'primary' ? "text-primary-foreground" : "text-primary"
                    )} />
                  </div>
                )}
                <div>
                  <div className={cn(
                    "text-2xl md:text-3xl font-bold",
                    background === 'primary' ? "text-primary-foreground" : "text-foreground"
                  )}>
                    {stat.value}
                  </div>
                  <div className={cn(
                    "text-sm",
                    background === 'primary' ? "text-primary-foreground/80" : "text-muted-foreground"
                  )}>
                    {stat.label}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Container>
    </SectionWrapper>
  );
}
