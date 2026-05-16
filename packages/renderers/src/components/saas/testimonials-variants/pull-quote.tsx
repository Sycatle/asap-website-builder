/**
 * Testimonials Variant — Pull Quote
 *
 * Single oversized featured testimonial, with a thin row of secondary
 * testimonials underneath. Editorial, calm. Strong for high-trust sectors.
 */

import React from 'react';
import { cn, getData } from '../../../utils';
import { SectionWrapper } from '../../ui/section-wrapper';
import { SectionHeader } from '../../ui/section-header';
import { Container } from '../../ui/container';
import { Avatar } from '../../ui/avatar';
import { TESTIMONIALS_SCHEMA } from '@asap/shared';
import type { Section } from '../../../types';

export interface SectionProps {
  section: Section;
  className?: string;
}

interface Testimonial {
  quote: string;
  author: string;
  role: string;
  avatar_initials?: string;
  avatar_src?: string;
}

interface VariantParams {
  density?: 'compact' | 'default' | 'airy';
  featured_index?: number;
}

export function TestimonialsPullQuote({ section, className }: SectionProps) {
  const defaults = TESTIMONIALS_SCHEMA.defaultSettings;
  const params = (section.variant_params ?? {}) as VariantParams;

  const badgeText = getData(section, 'badge_text', defaults.badge_text as string);
  const headlineLine1 = getData(section, 'headline_line1', defaults.headline_line1 as string);
  const headlineLine2 = getData(section, 'headline_line2', defaults.headline_line2 as string);
  const subheadline = getData(section, 'subheadline', defaults.subheadline as string);
  const testimonials = getData(section, 'testimonials', defaults.testimonials as Testimonial[]);

  if (!testimonials.length) return null;
  const featuredIndex = clamp(params.featured_index ?? 0, 0, testimonials.length - 1);
  const featured = testimonials[featuredIndex];
  const rest = testimonials.filter((_, i) => i !== featuredIndex).slice(0, 3);
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
        <figure className="mt-12 max-w-3xl mx-auto text-center">
          <blockquote className="text-2xl md:text-3xl lg:text-4xl font-medium leading-snug">
            &ldquo;{featured.quote}&rdquo;
          </blockquote>
          <figcaption className="mt-6 flex items-center justify-center gap-3 text-sm">
            <Avatar
              initials={featured.avatar_initials ?? featured.author.charAt(0)}
              src={featured.avatar_src}
              size="default"
            />
            <div className="text-left">
              <div className="font-semibold">{featured.author}</div>
              <div className="text-muted-foreground">{featured.role}</div>
            </div>
          </figcaption>
        </figure>
        {rest.length > 0 && (
          <div
            className={cn(
              'mt-16 grid gap-6',
              rest.length === 1 ? 'md:grid-cols-1' : rest.length === 2 ? 'md:grid-cols-2' : 'md:grid-cols-3',
            )}
          >
            {rest.map((t, i) => (
              <div key={i} className="border-l-2 border-border pl-4">
                <p className="text-sm leading-relaxed mb-3">&ldquo;{t.quote}&rdquo;</p>
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{t.author}</span>
                  {t.role && <> · {t.role}</>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Container>
    </SectionWrapper>
  );
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
