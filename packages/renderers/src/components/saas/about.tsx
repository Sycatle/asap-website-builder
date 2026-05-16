/**
 * About Section Component
 * 
 * Bio/presentation section with multiple variants.
 * - simple: Simple text-based about section
 * - with-image: About with profile image
 * - team: Team members grid
 * - timeline: Company timeline
 */

import React from 'react';
import { cn, getData, withVariantFields } from '../../utils';
import { Badge } from '../ui/badge';
import { SectionWrapper } from '../ui/section-wrapper';
import { Container } from '../ui/container';
import { getIcon } from '../icons';
import { ABOUT_SCHEMA } from '@asap/shared';
import type { Section } from '../../types';
import { AboutQuoteStatement } from './about-variants/quote-statement';

export interface SectionProps {
  section: Section;
  className?: string;
}

interface TeamMember {
  name: string;
  role: string;
  avatar_url: string;
  linkedin?: string;
}

interface Milestone {
  year: string;
  title: string;
  description?: string;
}

interface SocialLink {
  platform: string;
  href: string;
}

export function AboutSection({ section: rawSection, className }: SectionProps) {
  const section = withVariantFields(rawSection);
  const variant = section.variant_key;
  if (variant === 'about/quote-statement') {
    return <AboutQuoteStatement section={section} className={className} />;
  }
  return <AboutDefault section={section} className={className} />;
}

function AboutDefault({ section, className }: SectionProps) {
  const defaults = ABOUT_SCHEMA.defaultSettings;

  // Extract data from section
  const variant = getData(section, 'variant', defaults.variant as string);
  const badgeText = getData(section, 'badge_text', defaults.badge_text as string);
  const headline = getData(section, 'headline', defaults.headline as string);
  const subheadline = getData(section, 'subheadline', defaults.subheadline as string);
  const name = getData(section, 'name', defaults.name as string);
  const role = getData(section, 'role', defaults.role as string);
  const bio = getData(section, 'bio', defaults.bio as string);
  const avatarUrl = getData(section, 'avatar_url', defaults.avatar_url as string);
  const teamMembers = getData(section, 'team_members', defaults.team_members as TeamMember[]);
  const milestones = getData(section, 'milestones', defaults.milestones as Milestone[]);
  const showSocial = getData(section, 'show_social', defaults.show_social as boolean);
  const socialLinks = getData(section, 'social_links', defaults.social_links as SocialLink[]);

  // Simple variant
  if (variant === 'simple') {
    return (
      <SectionWrapper variant="default" padding="lg" className={className}>
        <Container size="default">
          <div className="text-center">
            {badgeText && (
              <Badge variant="secondary" size="lg" className="mb-6">
                {badgeText}
              </Badge>
            )}
            {headline && (
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                {headline}
              </h2>
            )}
            {subheadline && (
              <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
                {subheadline}
              </p>
            )}
            {bio && (
              <div className="prose prose-lg mx-auto text-muted-foreground">
                <p>{bio}</p>
              </div>
            )}
          </div>
        </Container>
      </SectionWrapper>
    );
  }

  // With image variant
  if (variant === 'with-image') {
    return (
      <SectionWrapper variant="default" padding="lg" className={className}>
        <Container>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            {/* Image */}
            <div className="flex justify-center">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={name || headline}
                  className="w-64 h-64 md:w-80 md:h-80 rounded-full object-cover shadow-lg"
                />
              ) : (
                <div className="w-64 h-64 md:w-80 md:h-80 rounded-full bg-muted flex items-center justify-center">
                  <span className="text-muted-foreground text-4xl">👤</span>
                </div>
              )}
            </div>
            
            {/* Content */}
            <div>
              {badgeText && (
                <Badge variant="secondary" size="lg" className="mb-4">
                  {badgeText}
                </Badge>
              )}
              {headline && (
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-2">
                  {headline}
                </h2>
              )}
              {name && (
                <p className="text-xl font-semibold text-primary mb-1">{name}</p>
              )}
              {role && (
                <p className="text-muted-foreground mb-4">{role}</p>
              )}
              {(subheadline || bio) && (
                <div className="prose text-muted-foreground mb-6">
                  <p>{bio || subheadline}</p>
                </div>
              )}
              
              {/* Social links */}
              {showSocial && socialLinks.length > 0 && (
                <div className="flex gap-4">
                  {socialLinks.map((link, index) => {
                    const Icon = getIcon(link.platform);
                    return (
                      <a
                        key={index}
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {Icon && <Icon className="h-5 w-5" />}
                      </a>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </Container>
      </SectionWrapper>
    );
  }

  // Team variant
  if (variant === 'team') {
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
          
          {/* Team grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {teamMembers.map((member, index) => (
              <div key={index} className="text-center">
                {member.avatar_url ? (
                  <img
                    src={member.avatar_url}
                    alt={member.name}
                    className="w-32 h-32 rounded-full mx-auto mb-4 object-cover"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-muted mx-auto mb-4 flex items-center justify-center">
                    <span className="text-2xl">👤</span>
                  </div>
                )}
                <h3 className="font-semibold mb-1">{member.name}</h3>
                <p className="text-sm text-muted-foreground mb-2">{member.role}</p>
                {member.linkedin && (
                  <a
                    href={member.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-primary transition-colors"
                  >
                    <svg className="h-4 w-4 mx-auto" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                    </svg>
                  </a>
                )}
              </div>
            ))}
          </div>
        </Container>
      </SectionWrapper>
    );
  }

  // Timeline variant
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
        
        {/* Timeline */}
        <div className="relative">
          {/* Line */}
          <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-0.5 bg-border md:-translate-x-0.5" />
          
          <div className="space-y-8">
            {milestones.map((milestone, index) => (
              <div
                key={index}
                className={cn(
                  "relative flex items-start gap-6 md:gap-0",
                  index % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
                )}
              >
                {/* Dot */}
                <div className="absolute left-4 md:left-1/2 w-3 h-3 bg-primary rounded-full -translate-x-1.5 md:-translate-x-1.5 mt-1.5" />
                
                {/* Content */}
                <div className={cn(
                  "ml-10 md:ml-0 md:w-1/2",
                  index % 2 === 0 ? "md:pr-12 md:text-right" : "md:pl-12"
                )}>
                  <span className="inline-block bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium mb-2">
                    {milestone.year}
                  </span>
                  <h3 className="font-semibold text-lg mb-1">{milestone.title}</h3>
                  {milestone.description && (
                    <p className="text-muted-foreground text-sm">{milestone.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </Container>
    </SectionWrapper>
  );
}
