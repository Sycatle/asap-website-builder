/**
 * How It Works Section Component
 * 
 * Step-by-step process visualization with numbered steps.
 * Handles its own data extraction from section.
 */

import React from 'react';
import { cn, getData } from '../../utils';
import { SectionWrapper } from '../ui/section-wrapper';
import { SectionHeader } from '../ui/section-header';
import { Container } from '../ui/container';
import { HOW_IT_WORKS_SCHEMA } from '@asap/shared';
import type { Section } from '../../types';

export interface SectionProps {
  section: Section;
  className?: string;
}

interface Step {
  number?: string;
  title: string;
  description: string;
  icon?: string;
}

export function HowItWorksSection({ section, className }: SectionProps) {
  const defaults = HOW_IT_WORKS_SCHEMA.defaultSettings;

  // Extract data from section
  const badgeText = getData(section, 'badge_text', defaults.badge_text as string);
  const headlineLine1 = getData(section, 'headline_line1', defaults.headline_line1 as string);
  const headlineLine2 = getData(section, 'headline_line2', defaults.headline_line2 as string);
  const subheadline = getData(section, 'subheadline', defaults.subheadline as string);
  const steps = getData(section, 'steps', defaults.steps as Step[]);
  const showNumbers = getData(section, 'show_numbers', defaults.show_numbers as boolean);
  const showConnectors = getData(section, 'show_connectors', defaults.show_connectors as boolean);

  return (
    <SectionWrapper id="how-it-works" padding="lg" className={className}>
      <Container>
        <SectionHeader
          badge={badgeText}
          headlineLine1={headlineLine1}
          headlineLine2={headlineLine2}
          subheadline={subheadline}
        />

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, i) => (
            <StepCard
              key={i}
              step={step}
              index={i}
              totalSteps={steps.length}
              showNumber={showNumbers}
              showConnector={showConnectors}
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

interface StepCardProps {
  step: Step;
  index: number;
  totalSteps: number;
  showNumber?: boolean;
  showConnector?: boolean;
}

function StepCard({ step, index, totalSteps, showNumber, showConnector }: StepCardProps) {
  const isLast = index === totalSteps - 1;

  return (
    <div className="relative">
      {/* Connector line */}
      {showConnector && !isLast && (
        <div className="hidden lg:block absolute top-8 left-[60%] w-full h-0.5 bg-gradient-to-r from-primary/50 to-primary/10" />
      )}
      
      <div className="relative z-10 flex flex-col items-center text-center">
        {showNumber && (
          <StepNumber number={step.number || String(index + 1)} />
        )}
        <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
        <p className="text-muted-foreground text-base">{step.description}</p>
      </div>
    </div>
  );
}

interface StepNumberProps {
  number: string;
}

function StepNumber({ number }: StepNumberProps) {
  return (
    <div className="h-16 w-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mb-4">
      {number}
    </div>
  );
}
