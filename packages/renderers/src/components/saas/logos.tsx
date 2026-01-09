/**
 * Logos Section Component
 * 
 * Logo cloud / Partners section with multiple variants.
 * - simple: Simple row of logos
 * - marquee: Scrolling logos
 * - grid: Grid of logos
 */

import React from 'react';
import { cn, getData } from '../../utils';
import { SectionWrapper } from '../ui/section-wrapper';
import { Container } from '../ui/container';
import { LOGOS_SCHEMA } from '@asap/shared';
import type { Section } from '../../types';

export interface SectionProps {
  section: Section;
  className?: string;
}

interface Logo {
  name: string;
  url: string;
  href?: string;
}

export function LogosSection({ section, className }: SectionProps) {
  const defaults = LOGOS_SCHEMA.defaultSettings;

  // Extract data from section
  const variant = getData(section, 'variant', defaults.variant as string);
  const showHeader = getData(section, 'show_header', defaults.show_header as boolean);
  const headline = getData(section, 'headline', defaults.headline as string);
  const logos = getData(section, 'logos', defaults.logos as Logo[]);
  const grayscale = getData(section, 'grayscale', defaults.grayscale as boolean);
  const hoverColor = getData(section, 'hover_color', defaults.hover_color as boolean);
  const size = getData(section, 'size', defaults.size as string);

  const sizeClasses = {
    sm: 'h-6 md:h-8',
    md: 'h-8 md:h-10',
    lg: 'h-10 md:h-12',
  };

  // Logo component
  const LogoImage = ({ logo }: { logo: Logo }) => {
    const imageClasses = cn(
      sizeClasses[size as keyof typeof sizeClasses],
      "w-auto object-contain transition-all duration-300",
      grayscale && "grayscale opacity-60",
      grayscale && hoverColor && "hover:grayscale-0 hover:opacity-100"
    );

    const Wrapper = logo.href ? 'a' : 'div';
    const wrapperProps = logo.href ? {
      href: logo.href,
      target: '_blank',
      rel: 'noopener noreferrer',
    } : {};

    return (
      <Wrapper
        {...wrapperProps}
        className={cn(
          "flex items-center justify-center",
          logo.href && "cursor-pointer"
        )}
        title={logo.name}
      >
        {logo.url ? (
          <img
            src={logo.url}
            alt={logo.name}
            className={imageClasses}
          />
        ) : (
          <div className={cn(
            "bg-muted rounded px-4 py-2",
            sizeClasses[size as keyof typeof sizeClasses]
          )}>
            <span className="text-muted-foreground text-sm">{logo.name}</span>
          </div>
        )}
      </Wrapper>
    );
  };

  // Simple variant
  if (variant === 'simple') {
    return (
      <SectionWrapper variant="muted" padding="default" className={className}>
        <Container>
          {showHeader && headline && (
            <p className="text-center text-sm text-muted-foreground mb-8">
              {headline}
            </p>
          )}
          
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12">
            {logos.map((logo, index) => (
              <LogoImage key={index} logo={logo} />
            ))}
          </div>
        </Container>
      </SectionWrapper>
    );
  }

  // Marquee variant (infinite scroll)
  if (variant === 'marquee') {
    return (
      <SectionWrapper variant="muted" padding="default" className={className}>
        <Container>
          {showHeader && headline && (
            <p className="text-center text-sm text-muted-foreground mb-8">
              {headline}
            </p>
          )}
        </Container>
        
        {/* Marquee container */}
        <div className="relative overflow-hidden">
          {/* Fade edges */}
          <div className="absolute left-0 top-0 bottom-0 w-20 bg-gradient-to-r from-background to-transparent z-10" />
          <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-background to-transparent z-10" />
          
          {/* Scrolling content */}
          <div className="flex animate-marquee">
            {/* First set */}
            <div className="flex items-center gap-12 px-6">
              {logos.map((logo, index) => (
                <LogoImage key={`a-${index}`} logo={logo} />
              ))}
            </div>
            {/* Duplicate for seamless loop */}
            <div className="flex items-center gap-12 px-6">
              {logos.map((logo, index) => (
                <LogoImage key={`b-${index}`} logo={logo} />
              ))}
            </div>
          </div>
        </div>
        
        {/* Add marquee animation via style tag */}
        <style>{`
          @keyframes marquee {
            0% { transform: translateX(0); }
            100% { transform: translateX(-50%); }
          }
          .animate-marquee {
            animation: marquee 30s linear infinite;
          }
          .animate-marquee:hover {
            animation-play-state: paused;
          }
        `}</style>
      </SectionWrapper>
    );
  }

  // Grid variant
  return (
    <SectionWrapper variant="muted" padding="lg" className={className}>
      <Container>
        {showHeader && headline && (
          <p className="text-center text-sm text-muted-foreground mb-8">
            {headline}
          </p>
        )}
        
        <div className={cn(
          "grid gap-8",
          logos.length <= 4 && "grid-cols-2 md:grid-cols-4",
          logos.length > 4 && logos.length <= 6 && "grid-cols-3 md:grid-cols-6",
          logos.length > 6 && "grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
        )}>
          {logos.map((logo, index) => (
            <div
              key={index}
              className="flex items-center justify-center p-4 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <LogoImage logo={logo} />
            </div>
          ))}
        </div>
      </Container>
    </SectionWrapper>
  );
}
