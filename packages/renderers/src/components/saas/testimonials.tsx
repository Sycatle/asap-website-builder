/**
 * Testimonials Section Component
 * 
 * Customer testimonials with quotes and author info.
 * Handles its own data extraction from section.
 */

import React from 'react';
import { getData, withVariantFields } from '../../utils';
import { SectionWrapper } from '../ui/section-wrapper';
import { SectionHeader } from '../ui/section-header';
import { Container } from '../ui/container';
import { Card, CardContent } from '../ui/card';
import { Avatar } from '../ui/avatar';
import { TESTIMONIALS_SCHEMA } from '@asap/shared';
import type { Section } from '../../types';
import { TestimonialsPullQuote } from './testimonials-variants/pull-quote';

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

export function TestimonialsSection({ section: rawSection, className }: SectionProps) {
  const section = withVariantFields(rawSection);
  const variant = section.variant_key;
  if (variant === 'testimonials/pull-quote') {
    return <TestimonialsPullQuote section={section} className={className} />;
  }
  return <TestimonialsGrid section={section} className={className} />;
}

function TestimonialsGrid({ section, className }: SectionProps) {
  const defaults = TESTIMONIALS_SCHEMA.defaultSettings;

  // Extract data from section
  const badgeText = getData(section, 'badge_text', defaults.badge_text as string);
  const headlineLine1 = getData(section, 'headline_line1', defaults.headline_line1 as string);
  const headlineLine2 = getData(section, 'headline_line2', defaults.headline_line2 as string);
  const subheadline = getData(section, 'subheadline', defaults.subheadline as string);
  const testimonials = getData(section, 'testimonials', defaults.testimonials as Testimonial[]);
  const columns = getData<'2' | '3' | '4'>(section, 'columns', (defaults.columns || '3') as '2' | '3' | '4');

  const columnClasses = {
    '2': 'md:grid-cols-2',
    '3': 'md:grid-cols-3',
    '4': 'md:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <SectionWrapper id="testimonials" padding="lg" className={className}>
      <Container>
        <SectionHeader
          badge={badgeText}
          headlineLine1={headlineLine1}
          headlineLine2={headlineLine2}
          subheadline={subheadline}
        />

        <div className={`grid gap-8 ${columnClasses[columns]}`}>
          {testimonials.map((testimonial, i) => (
            <TestimonialCard key={i} testimonial={testimonial} />
          ))}
        </div>
      </Container>
    </SectionWrapper>
  );
}

// ============================================
// Sub-components
// ============================================

interface TestimonialCardProps {
  testimonial: Testimonial;
}

function TestimonialCard({ testimonial }: TestimonialCardProps) {
  const initials = testimonial.avatar_initials || 
    testimonial.author.slice(0, 2).toUpperCase();

  return (
    <Card className="relative">
      <CardContent className="pt-6">
        {/* Quote marks */}
        <QuoteMark />
        
        <p className="relative z-10 text-muted-foreground italic mb-6">
          "{testimonial.quote}"
        </p>
        
        <AuthorInfo
          name={testimonial.author}
          role={testimonial.role}
          initials={initials}
          avatarSrc={testimonial.avatar_src}
        />
      </CardContent>
    </Card>
  );
}

function QuoteMark() {
  return (
    <div className="absolute top-4 left-4 text-6xl text-primary/10 font-serif leading-none">
      "
    </div>
  );
}

interface AuthorInfoProps {
  name: string;
  role: string;
  initials: string;
  avatarSrc?: string;
}

function AuthorInfo({ name, role, initials, avatarSrc }: AuthorInfoProps) {
  return (
    <div className="flex items-center gap-3">
      <Avatar initials={initials} src={avatarSrc} />
      <div>
        <p className="font-medium">{name}</p>
        <p className="text-sm text-muted-foreground">{role}</p>
      </div>
    </div>
  );
}
