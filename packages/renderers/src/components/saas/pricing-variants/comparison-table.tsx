/**
 * Pricing Variant — Comparison Table
 *
 * Side-by-side comparison table with feature rows. Good when buyers need to
 * compare plans line-by-line rather than browse cards.
 */

import React from 'react';
import { cn, getData } from '../../../utils';
import { SectionWrapper } from '../../ui/section-wrapper';
import { SectionHeader } from '../../ui/section-header';
import { Container } from '../../ui/container';
import { Button } from '../../ui/button';
import { Icons } from '../../icons';
import { PRICING_SCHEMA } from '@asap/shared';
import type { Section } from '../../../types';

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
}

interface VariantParams {
  density?: 'compact' | 'default' | 'airy';
  highlight_popular?: boolean;
}

export function PricingComparisonTable({ section, className }: SectionProps) {
  const defaults = PRICING_SCHEMA.defaultSettings;
  const params = (section.variant_params ?? {}) as VariantParams;

  const badgeText = getData(section, 'badge_text', defaults.badge_text as string);
  const headlineLine1 = getData(section, 'headline_line1', defaults.headline_line1 as string);
  const headlineLine2 = getData(section, 'headline_line2', defaults.headline_line2 as string);
  const subheadline = getData(section, 'subheadline', defaults.subheadline as string);
  const plans = getData(section, 'plans', defaults.plans as PricingPlan[]);

  if (!plans.length) return null;

  // Union of all feature lines across plans, preserving first-seen order.
  const allFeatures: string[] = [];
  for (const plan of plans) {
    for (const f of plan.features ?? []) {
      if (!allFeatures.includes(f)) allFeatures.push(f);
    }
  }

  const padding = params.density === 'compact' ? 'default' : params.density === 'airy' ? 'xl' : 'lg';
  const highlightPopular = params.highlight_popular ?? true;

  return (
    <SectionWrapper padding={padding} className={className}>
      <Container>
        <SectionHeader
          badge={badgeText}
          headlineLine1={headlineLine1}
          headlineLine2={headlineLine2}
          subheadline={subheadline}
        />
        <div className="mt-12 overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th className="text-left p-4 align-bottom" />
                {plans.map((plan) => (
                  <th
                    key={plan.name}
                    className={cn(
                      'p-4 align-bottom text-left',
                      highlightPopular && plan.popular && 'bg-primary/5 rounded-t-lg',
                    )}
                  >
                    <div className="text-sm font-medium text-muted-foreground mb-1">{plan.name}</div>
                    <div className="text-3xl font-bold">{plan.price}</div>
                    {plan.period && (
                      <div className="text-xs text-muted-foreground">{plan.period}</div>
                    )}
                    {plan.cta_text && (
                      <Button
                        size="sm"
                        variant={plan.popular ? 'default' : 'outline'}
                        className="mt-3"
                        href={plan.cta_href}
                      >
                        {plan.cta_text}
                      </Button>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {allFeatures.map((feature) => (
                <tr key={feature} className="border-t border-border">
                  <td className="p-3 text-sm text-muted-foreground">{feature}</td>
                  {plans.map((plan) => {
                    const has = (plan.features ?? []).includes(feature);
                    return (
                      <td
                        key={plan.name}
                        className={cn(
                          'p-3 text-sm',
                          highlightPopular && plan.popular && 'bg-primary/5',
                        )}
                      >
                        {has ? (
                          <Icons.check className="h-4 w-4 text-primary" />
                        ) : (
                          <span className="text-muted-foreground/40">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Container>
    </SectionWrapper>
  );
}
