/**
 * Contact Variant — Inline Strip
 *
 * Single-row contact strip: headline + 3 quick contact methods (email, phone,
 * location) inline. No form. For sites where contact friction is the goal
 * but a full form would be overkill.
 */

import React from 'react';
import { cn, getData } from '../../../utils';
import { SectionWrapper } from '../../ui/section-wrapper';
import { Container } from '../../ui/container';
import { Icons, getIcon } from '../../icons';
import { CONTACT_SCHEMA } from '@asap/shared';
import type { Section } from '../../../types';

export interface SectionProps {
  section: Section;
  className?: string;
}

interface VariantParams {
  density?: 'compact' | 'default' | 'airy';
  align?: 'left' | 'center';
}

export function ContactInlineStrip({ section, className }: SectionProps) {
  const defaults = CONTACT_SCHEMA.defaultSettings;
  const params = (section.variant_params ?? {}) as VariantParams;

  const headline = getData(section, 'headline', defaults.headline as string);
  const subheadline = getData(section, 'subheadline', defaults.subheadline as string);
  const email = getData(section, 'email', defaults.email as string);
  const phone = getData(section, 'phone', defaults.phone as string);
  const address = getData(section, 'address', defaults.address as string);

  const padding = params.density === 'compact' ? 'default' : params.density === 'airy' ? 'xl' : 'lg';
  const align = params.align ?? 'left';

  const items: { icon: React.ComponentType<{ className?: string }>; label: string; href?: string }[] = [];
  if (email) {
    items.push({ icon: Icons.mail, label: email, href: `mailto:${email}` });
  }
  if (phone) {
    items.push({ icon: Icons.phone, label: phone, href: `tel:${phone}` });
  }
  if (address) {
    items.push({ icon: Icons.mapPin, label: address });
  }

  return (
    <SectionWrapper padding={padding} className={className}>
      <Container>
        <div
          className={cn(
            'flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between',
            align === 'center' && 'lg:justify-around text-center lg:text-left',
          )}
        >
          <div className={cn('max-w-xl', align === 'center' && 'mx-auto')}>
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">{headline}</h2>
            {subheadline && (
              <p className="mt-2 text-muted-foreground">{subheadline}</p>
            )}
          </div>
          <ul
            className={cn(
              'flex flex-col sm:flex-row flex-wrap gap-x-6 gap-y-3 text-sm',
              align === 'center' && 'mx-auto justify-center',
            )}
          >
            {items.map((item, i) => {
              const inner = (
                <span className="inline-flex items-center gap-2">
                  <item.icon className="h-4 w-4 text-primary" />
                  <span>{item.label}</span>
                </span>
              );
              return (
                <li key={i}>
                  {item.href ? (
                    <a href={item.href} className="hover:text-primary transition-colors">
                      {inner}
                    </a>
                  ) : (
                    inner
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      </Container>
    </SectionWrapper>
  );
}
