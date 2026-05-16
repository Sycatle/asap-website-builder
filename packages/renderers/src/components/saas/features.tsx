/**
 * Features Section Component
 * 
 * Grid of feature cards with icons, titles, and descriptions.
 * Handles its own data extraction from section.
 */

import React from 'react';
import { cn, getData, withVariantFields } from '../../utils';
import { SectionWrapper } from '../ui/section-wrapper';
import { SectionHeader } from '../ui/section-header';
import { Container } from '../ui/container';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import { IconBox } from '../ui/icon-box';
import { getIcon } from '../icons';
import { FEATURES_SCHEMA } from '@asap/shared';
import type { Section } from '../../types';
import { FeaturesCompactList } from './features-variants/compact-list';

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

export function FeaturesSection({ section: rawSection, className }: SectionProps) {
  const section = withVariantFields(rawSection);
  const variant = section.variant_key;
  if (variant === 'features/compact-list') {
    return <FeaturesCompactList section={section} className={className} />;
  }
  return <FeaturesCardsGrid section={section} className={className} />;
}

function FeaturesCardsGrid({ section, className }: SectionProps) {
  const defaults = FEATURES_SCHEMA.defaultSettings;

  // Extract data from section
  const badgeText = getData(section, 'badge_text', defaults.badge_text as string);
  const headlineLine1 = getData(section, 'headline_line1', defaults.headline_line1 as string);
  const headlineLine2 = getData(section, 'headline_line2', defaults.headline_line2 as string);
  const subheadline = getData(section, 'subheadline', defaults.subheadline as string);
  const features = getData(section, 'features', defaults.features as Feature[]);
  const columns = getData<'2' | '3' | '4'>(section, 'columns', defaults.columns as '2' | '3' | '4');
  const showBadges = getData(section, 'show_badges', defaults.show_badges as boolean);
  const showIcons = getData(section, 'show_icons', defaults.show_icons as boolean);
  const hoverEffect = getData(section, 'hover_effect', defaults.hover_effect as boolean);

  const columnClasses = {
    '2': 'md:grid-cols-2',
    '3': 'md:grid-cols-2 lg:grid-cols-3',
    '4': 'md:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <SectionWrapper id="features" variant="muted" padding="lg" className={className}>
      <Container>
        <SectionHeader
          badge={badgeText}
          headlineLine1={headlineLine1}
          headlineLine2={headlineLine2}
          subheadline={subheadline}
        />

        <div className={cn('grid gap-6', columnClasses[columns])}>
          {features.map((feature, i) => (
            <FeatureCard
              key={i}
              feature={feature}
              showBadge={showBadges}
              showIcon={showIcons}
              hover={hoverEffect}
            />
          ))}
        </div>
      </Container>
    </SectionWrapper>
  );
}

// ============================================
// Sub-components
// ============================================

interface FeatureCardProps {
  feature: Feature;
  showBadge?: boolean;
  showIcon?: boolean;
  hover?: boolean;
}

function FeatureCard({ feature, showBadge, showIcon, hover }: FeatureCardProps) {
  const FeatureIcon = feature.icon ? getIcon(feature.icon) : null;

  return (
    <div className="relative pt-3 group">
      {showBadge && feature.badge && (
        <Badge className="absolute -top-0 right-4 z-10" variant="default">
          {feature.badge}
        </Badge>
      )}
      <Card hover={hover} className="h-full">
        <CardHeader>
          {showIcon && FeatureIcon && (
            <IconBox className="mb-4">
              <FeatureIcon className="w-6 h-6 text-primary" />
            </IconBox>
          )}
          <CardTitle className="text-xl">{feature.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription className="text-base">{feature.description}</CardDescription>
        </CardContent>
      </Card>
    </div>
  );
}
