/**
 * FAQ Section Component
 * 
 * Frequently asked questions section with multiple variants.
 * - accordion: Collapsible FAQ items
 * - grid: FAQ items in a grid layout
 * - two-columns: Two column layout
 */

import React, { useState } from 'react';
import { cn, getData } from '../../utils';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { SectionWrapper } from '../ui/section-wrapper';
import { Container } from '../ui/container';
import { Icons } from '../icons';
import { FAQ_SCHEMA } from '@asap/shared';
import type { Section } from '../../types';

export interface SectionProps {
  section: Section;
  className?: string;
}

interface Question {
  question: string;
  answer: string;
  category?: string;
}

export function FAQSection({ section, className }: SectionProps) {
  const defaults = FAQ_SCHEMA.defaultSettings;

  // Extract data from section
  const variant = getData(section, 'variant', defaults.variant as string);
  const badgeText = getData(section, 'badge_text', defaults.badge_text as string);
  const headline = getData(section, 'headline', defaults.headline as string);
  const subheadline = getData(section, 'subheadline', defaults.subheadline as string);
  const questions = getData(section, 'questions', defaults.questions as Question[]);
  const showCta = getData(section, 'show_cta', defaults.show_cta as boolean);
  const ctaText = getData(section, 'cta_text', defaults.cta_text as string);
  const ctaButtonText = getData(section, 'cta_button_text', defaults.cta_button_text as string);
  const ctaHref = getData(section, 'cta_href', defaults.cta_href as string);
  const firstOpen = getData(section, 'first_open', defaults.first_open as boolean);

  // State for accordion
  const [openIndex, setOpenIndex] = useState<number | null>(firstOpen ? 0 : null);

  // Accordion variant
  if (variant === 'accordion') {
    return (
      <SectionWrapper variant="default" padding="lg" className={className}>
        <Container size="default">
          {/* Header */}
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

          {/* Accordion */}
          <div className="space-y-4">
            {questions.map((item, index) => (
              <div
                key={index}
                className="border rounded-lg overflow-hidden"
              >
                <button
                  onClick={() => setOpenIndex(openIndex === index ? null : index)}
                  className="w-full flex items-center justify-between p-4 text-left font-medium hover:bg-muted/50 transition-colors"
                >
                  <span>{item.question}</span>
                  <Icons.chevronDown
                    className={cn(
                      "h-5 w-5 transition-transform duration-200",
                      openIndex === index && "rotate-180"
                    )}
                  />
                </button>
                <div
                  className={cn(
                    "overflow-hidden transition-all duration-200",
                    openIndex === index ? "max-h-96" : "max-h-0"
                  )}
                >
                  <div className="p-4 pt-0 text-muted-foreground">
                    {item.answer}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* CTA */}
          {showCta && (
            <div className="mt-12 text-center">
              <p className="text-muted-foreground mb-4">{ctaText}</p>
              <Button href={ctaHref}>{ctaButtonText}</Button>
            </div>
          )}
        </Container>
      </SectionWrapper>
    );
  }

  // Grid variant
  if (variant === 'grid') {
    return (
      <SectionWrapper variant="default" padding="lg" className={className}>
        <Container>
          {/* Header */}
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

          {/* Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {questions.map((item, index) => (
              <div
                key={index}
                className="p-6 border rounded-lg hover:shadow-md transition-shadow"
              >
                <h3 className="font-semibold mb-2">{item.question}</h3>
                <p className="text-sm text-muted-foreground">{item.answer}</p>
              </div>
            ))}
          </div>

          {/* CTA */}
          {showCta && (
            <div className="mt-12 text-center">
              <p className="text-muted-foreground mb-4">{ctaText}</p>
              <Button href={ctaHref}>{ctaButtonText}</Button>
            </div>
          )}
        </Container>
      </SectionWrapper>
    );
  }

  // Two columns variant
  return (
    <SectionWrapper variant="default" padding="lg" className={className}>
      <Container>
        <div className="grid lg:grid-cols-3 gap-12">
          {/* Header (sidebar) */}
          <div className="lg:sticky lg:top-8 lg:self-start">
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
              <p className="text-muted-foreground mb-6">
                {subheadline}
              </p>
            )}
            {showCta && (
              <div>
                <p className="text-sm text-muted-foreground mb-3">{ctaText}</p>
                <Button href={ctaHref} size="sm">{ctaButtonText}</Button>
              </div>
            )}
          </div>

          {/* Questions */}
          <div className="lg:col-span-2 space-y-8">
            {questions.map((item, index) => (
              <div key={index} className="pb-8 border-b last:border-0">
                <h3 className="font-semibold text-lg mb-2">{item.question}</h3>
                <p className="text-muted-foreground">{item.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </SectionWrapper>
  );
}
