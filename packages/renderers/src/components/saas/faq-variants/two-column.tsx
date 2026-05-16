/**
 * FAQ Variant — Two Column
 *
 * Title block on the left, list of Q&A on the right. Editorial layout for
 * long-form answers where a vertical accordion would feel cramped.
 */

import React from 'react';
import { cn, getData } from '../../../utils';
import { SectionWrapper } from '../../ui/section-wrapper';
import { Container } from '../../ui/container';
import { FAQ_SCHEMA } from '@asap/shared';
import type { Section } from '../../../types';

export interface SectionProps {
  section: Section;
  className?: string;
}

interface Question {
  question: string;
  answer: string;
  category?: string;
}

interface VariantParams {
  density?: 'compact' | 'default' | 'airy';
}

export function FAQTwoColumn({ section, className }: SectionProps) {
  const defaults = FAQ_SCHEMA.defaultSettings;
  const params = (section.variant_params ?? {}) as VariantParams;

  const headline = getData(section, 'headline', defaults.headline as string);
  const subheadline = getData(section, 'subheadline', defaults.subheadline as string);
  const questions = getData(section, 'questions', defaults.questions as Question[]);

  const padding = params.density === 'compact' ? 'default' : params.density === 'airy' ? 'xl' : 'lg';

  return (
    <SectionWrapper padding={padding} className={className}>
      <Container>
        <div className="grid gap-10 lg:grid-cols-[1fr,2fr]">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">{headline}</h2>
            {subheadline && (
              <p className="text-muted-foreground leading-relaxed">{subheadline}</p>
            )}
          </div>
          <dl className="divide-y divide-border">
            {questions.map((q, i) => (
              <div key={i} className="py-5">
                <dt className="text-lg font-semibold mb-2">{q.question}</dt>
                <dd className="text-muted-foreground leading-relaxed">{q.answer}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Container>
    </SectionWrapper>
  );
}
