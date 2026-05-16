/**
 * About Variant — Quote Statement
 *
 * Editorial layout: a single oversized quote-styled paragraph anchored by
 * the author's name and role underneath. No avatar. Good for personal
 * brands where the words do the lifting.
 */

import React from 'react';
import { cn, getData } from '../../../utils';
import { SectionWrapper } from '../../ui/section-wrapper';
import { Container } from '../../ui/container';
import { ABOUT_SCHEMA } from '@asap/shared';
import type { Section } from '../../../types';

export interface SectionProps {
  section: Section;
  className?: string;
}

interface VariantParams {
  density?: 'compact' | 'default' | 'airy';
  align?: 'left' | 'center';
  show_quote_mark?: boolean;
}

export function AboutQuoteStatement({ section, className }: SectionProps) {
  const defaults = ABOUT_SCHEMA.defaultSettings;
  const params = (section.variant_params ?? {}) as VariantParams;

  const headline = getData(section, 'headline', defaults.headline as string);
  const bio = getData(section, 'bio', defaults.bio as string);
  const name = getData(section, 'name', defaults.name as string);
  const role = getData(section, 'role', defaults.role as string);

  const align = params.align ?? 'left';
  const showQuoteMark = params.show_quote_mark ?? true;
  const padding = params.density === 'compact' ? 'default' : params.density === 'airy' ? 'xl' : 'lg';

  const alignClasses = align === 'center' ? 'text-center mx-auto' : 'text-left';

  return (
    <SectionWrapper padding={padding} className={className}>
      <Container>
        <div className={cn('max-w-3xl', alignClasses)}>
          {showQuoteMark && (
            <span
              aria-hidden
              className="block text-[8rem] leading-none text-primary/30 -mb-8 font-serif"
            >
              &ldquo;
            </span>
          )}
          {headline && (
            <p className="text-sm uppercase tracking-widest text-muted-foreground mb-4">
              {headline}
            </p>
          )}
          <blockquote className="text-2xl md:text-3xl lg:text-4xl font-medium leading-snug">
            {bio}
          </blockquote>
          {(name || role) && (
            <footer className="mt-8 text-base text-muted-foreground">
              <span className="font-semibold text-foreground">{name}</span>
              {name && role && <span className="mx-2">·</span>}
              <span>{role}</span>
            </footer>
          )}
        </div>
      </Container>
    </SectionWrapper>
  );
}
