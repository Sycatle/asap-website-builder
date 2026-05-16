/**
 * Features Variant — Compact List
 *
 * Vertical numbered list, two-column on wide screens. Editorial feel,
 * lighter than the cards grid. Good for long-form feature descriptions.
 */

import React from 'react';
import { cn, getData } from '../../../utils';
import { SectionWrapper } from '../../ui/section-wrapper';
import { SectionHeader } from '../../ui/section-header';
import { Container } from '../../ui/container';
import { getIcon } from '../../icons';
import { FEATURES_SCHEMA } from '@asap/shared';
import type { Section } from '../../../types';

export interface SectionProps {
  section: Section;
  className?: string;
}

interface Feature {
  icon?: string;
  title: string;
  description: string;
  badge?: string;
}

interface VariantParams {
  density?: 'compact' | 'default' | 'airy';
  columns?: 1 | 2;
  show_numbers?: boolean;
}

export function FeaturesCompactList({ section, className }: SectionProps) {
  const defaults = FEATURES_SCHEMA.defaultSettings;
  const params = (section.variant_params ?? {}) as VariantParams;

  const badgeText = getData(section, 'badge_text', defaults.badge_text as string);
  const headlineLine1 = getData(section, 'headline_line1', defaults.headline_line1 as string);
  const headlineLine2 = getData(section, 'headline_line2', defaults.headline_line2 as string);
  const subheadline = getData(section, 'subheadline', defaults.subheadline as string);
  const features = getData(section, 'features', defaults.features as Feature[]);

  const columns = params.columns ?? 2;
  const showNumbers = params.show_numbers ?? true;
  const padding = params.density === 'compact' ? 'default' : params.density === 'airy' ? 'xl' : 'lg';

  return (
    <SectionWrapper padding={padding} className={className}>
      <Container>
        <SectionHeader
          badge={badgeText}
          headlineLine1={headlineLine1}
          headlineLine2={headlineLine2}
          subheadline={subheadline}
        />
        <ul
          className={cn(
            'mt-12 grid gap-x-12 gap-y-10',
            columns === 2 ? 'md:grid-cols-2' : 'md:grid-cols-1',
          )}
        >
          {features.map((feature, i) => {
            const Icon = feature.icon ? getIcon(feature.icon) : null;
            return (
              <li key={i} className="flex gap-4">
                {showNumbers ? (
                  <span className="flex-shrink-0 text-3xl font-bold tabular-nums text-primary/60">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                ) : Icon ? (
                  <Icon className="flex-shrink-0 h-7 w-7 mt-1 text-primary" />
                ) : null}
                <div>
                  <h3 className="text-lg font-semibold mb-1.5 flex items-center gap-2">
                    {feature.title}
                    {feature.badge && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                        {feature.badge}
                      </span>
                    )}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
              </li>
            );
          })}
        </ul>
      </Container>
    </SectionWrapper>
  );
}
