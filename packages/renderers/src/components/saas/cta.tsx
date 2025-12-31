/**
 * CTA Section Component
 * 
 * Call-to-action section with prominent styling.
 * Handles its own data extraction from section.
 */

import React from 'react';
import { cn, getData } from '../../utils';
import { SectionWrapper } from '../ui/section-wrapper';
import { Container } from '../ui/container';
import { Button } from '../ui/button';
import { getIcon } from '../icons';
import { CTA_SCHEMA } from '@asap/shared';
import type { Section } from '../../types';

export interface SectionProps {
  section: Section;
  className?: string;
}

export function CTASection({ section, className }: SectionProps) {
  const defaults = CTA_SCHEMA.defaultSettings;

  // Extract data from section
  const headline = getData(section, 'headline', defaults.headline as string);
  const subheadlineLine1 = getData(section, 'subheadline_line1', defaults.subheadline_line1 as string);
  const subheadlineLine2 = getData(section, 'subheadline_line2', defaults.subheadline_line2 as string);
  const ctaPrimaryText = getData(section, 'cta_primary_text', defaults.cta_primary_text as string);
  const ctaPrimaryHref = getData(section, 'cta_primary_href', defaults.cta_primary_href as string);
  const ctaPrimaryIcon = getData(section, 'cta_primary_icon', defaults.cta_primary_icon as string);
  const ctaSecondaryText = getData(section, 'cta_secondary_text', defaults.cta_secondary_text as string);
  const ctaSecondaryHref = getData(section, 'cta_secondary_href', defaults.cta_secondary_href as string);
  const ctaSecondaryIcon = getData(section, 'cta_secondary_icon', defaults.cta_secondary_icon as string);

  const PrimaryIcon = ctaPrimaryIcon ? getIcon(ctaPrimaryIcon) : null;
  const SecondaryIcon = ctaSecondaryIcon ? getIcon(ctaSecondaryIcon) : null;

  return (
    <SectionWrapper id="cta" variant="primary" padding="lg" className={className}>
      <Container size="sm">
        <div className="text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-primary-foreground mb-6">
            {headline}
          </h2>
          
          {(subheadlineLine1 || subheadlineLine2) && (
            <p className="text-lg text-primary-foreground/90 mb-8">
              {subheadlineLine1}
              {subheadlineLine2 && <><br />{subheadlineLine2}</>}
            </p>
          )}
          
          <CTAButtons
            primaryText={ctaPrimaryText}
            primaryHref={ctaPrimaryHref}
            primaryIcon={PrimaryIcon}
            secondaryText={ctaSecondaryText}
            secondaryHref={ctaSecondaryHref}
            secondaryIcon={SecondaryIcon}
          />
        </div>
      </Container>
    </SectionWrapper>
  );
}

// ============================================
// Sub-components
// ============================================

interface CTAButtonsProps {
  primaryText: string;
  primaryHref: string;
  primaryIcon?: React.ComponentType<{ className?: string }> | null;
  secondaryText?: string;
  secondaryHref?: string;
  secondaryIcon?: React.ComponentType<{ className?: string }> | null;
}

function CTAButtons({
  primaryText,
  primaryHref,
  primaryIcon: PrimaryIcon,
  secondaryText,
  secondaryHref,
  secondaryIcon: SecondaryIcon,
}: CTAButtonsProps) {
  return (
    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
      <Button 
        size="lg" 
        variant="secondary"
        className="w-full sm:w-auto text-base px-8" 
        href={primaryHref}
      >
        {PrimaryIcon && <PrimaryIcon className="mr-2 h-4 w-4" />}
        {primaryText}
      </Button>
      
      {secondaryText && (
        <Button 
          size="lg" 
          variant="outline" 
          className={cn(
            'w-full sm:w-auto text-base px-8',
            'border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10'
          )}
          href={secondaryHref}
        >
          {secondaryText}
          {SecondaryIcon && <SecondaryIcon className="ml-2 h-4 w-4" />}
        </Button>
      )}
    </div>
  );
}
