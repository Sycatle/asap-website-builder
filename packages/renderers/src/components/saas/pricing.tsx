/**
 * Pricing Section Component
 * 
 * Pricing plans comparison with features and CTAs.
 * Handles its own data extraction from section.
 */

import React from 'react';
import { cn, getData } from '../../utils';
import { SectionWrapper } from '../ui/section-wrapper';
import { SectionHeader } from '../ui/section-header';
import { Container } from '../ui/container';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Icons } from '../icons';
import { PRICING_SCHEMA } from '@asap/shared';
import type { Section } from '../../types';

export interface SectionProps {
  section: Section;
  className?: string;
}

interface PricingPlan {
  name: string;
  description?: string;
  price: string;
  period?: string;
  popular?: boolean;
  features?: string[];
  cta_text?: string;
  cta_href?: string;
  cta_variant?: 'default' | 'outline';
}

export function PricingSection({ section, className }: SectionProps) {
  const defaults = PRICING_SCHEMA.defaultSettings;

  // Extract data from section
  const badgeText = getData(section, 'badge_text', defaults.badge_text as string);
  const headlineLine1 = getData(section, 'headline_line1', defaults.headline_line1 as string);
  const headlineLine2 = getData(section, 'headline_line2', defaults.headline_line2 as string);
  const subheadline = getData(section, 'subheadline', defaults.subheadline as string);
  const plans = getData(section, 'plans', defaults.plans as PricingPlan[]);
  const popularBadgeText = getData(section, 'popular_badge_text', defaults.popular_badge_text as string);
  const currency = getData(section, 'currency', defaults.currency as string);

  return (
    <SectionWrapper id="pricing" variant="muted" padding="lg" className={className}>
      <Container>
        <SectionHeader
          badge={badgeText}
          headlineLine1={headlineLine1}
          headlineLine2={headlineLine2}
          subheadline={subheadline}
        />

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {plans.map((plan, i) => (
            <PricingCard
              key={i}
              plan={plan}
              currency={currency}
              popularBadgeText={popularBadgeText}
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

interface PricingCardProps {
  plan: PricingPlan;
  currency: string;
  popularBadgeText: string;
}

function PricingCard({ plan, currency, popularBadgeText }: PricingCardProps) {
  return (
    <Card
      className={cn(
        'relative flex flex-col',
        plan.popular && 'border-primary shadow-lg scale-105'
      )}
    >
      {plan.popular && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
          {popularBadgeText}
        </Badge>
      )}
      
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-xl">{plan.name}</CardTitle>
        {plan.description && (
          <CardDescription>{plan.description}</CardDescription>
        )}
      </CardHeader>
      
      <CardContent className="flex-1">
        <PriceDisplay price={plan.price} currency={currency} period={plan.period} />
        
        {plan.features && plan.features.length > 0 && (
          <FeatureList features={plan.features} />
        )}
      </CardContent>
      
      <div className="p-6 pt-0">
        <Button 
          fullWidth
          variant={plan.popular ? 'default' : 'outline'}
          href={plan.cta_href}
        >
          {plan.cta_text || 'Commencer'}
        </Button>
      </div>
    </Card>
  );
}

interface PriceDisplayProps {
  price: string;
  currency: string;
  period?: string;
}

function PriceDisplay({ price, currency, period }: PriceDisplayProps) {
  return (
    <div className="text-center mb-6">
      <span className="text-4xl font-bold">{price}{currency}</span>
      {period && <span className="text-muted-foreground"> {period}</span>}
    </div>
  );
}

interface FeatureListProps {
  features: string[];
}

function FeatureList({ features }: FeatureListProps) {
  return (
    <ul className="space-y-3">
      {features.map((feature, i) => (
        <li key={i} className="flex items-start gap-2">
          <Icons.check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
          <span className="text-sm">{feature}</span>
        </li>
      ))}
    </ul>
  );
}
