/**
 * Footer Section Component
 * 
 * Site footer with branding, links, and social icons.
 * Handles its own data extraction from section.
 */

import React from 'react';
import { cn, getData } from '../../utils';
import { Container } from '../ui/container';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Icons, getIcon } from '../icons';
import { FOOTER_SCHEMA } from '@asap/shared';
import type { Section } from '../../types';

export interface SectionProps {
  section: Section;
  className?: string;
}

interface FooterLink {
  label: string;
  href: string;
}

interface FooterColumn {
  title: string;
  links: FooterLink[];
}

interface FooterBadge {
  icon?: string;
  text: string;
}

interface SocialLink {
  platform: 'github' | 'twitter' | 'linkedin' | string;
  href: string;
}

export function FooterSection({ section, className }: SectionProps) {
  const defaults = FOOTER_SCHEMA.defaultSettings;

  // Extract data from section
  const showLogo = getData(section, 'show_logo', defaults.show_logo as boolean);
  const logoIcon = getData(section, 'logo_icon', defaults.logo_icon as string);
  const brandName = getData(section, 'brand_name', defaults.brand_name as string);
  const tagline = getData(section, 'tagline', defaults.tagline as string);
  const columns = getData(section, 'columns', defaults.columns as FooterColumn[]);
  const showBadges = getData(section, 'show_badges', defaults.show_badges as boolean);
  const badges = getData(section, 'badges', defaults.badges as FooterBadge[]);
  const copyright = getData(section, 'copyright', defaults.copyright as string);
  const showSocialLinks = getData(section, 'show_social_links', defaults.show_social_links as boolean);
  const socialLinks = getData(section, 'social_links', defaults.social_links as SocialLink[]);

  const LogoIcon = getIcon(logoIcon);

  return (
    <footer className={cn('border-t border-border bg-muted/30', className)}>
      <Container className="py-12 md:py-16">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand Column */}
          <BrandColumn
            showLogo={showLogo}
            LogoIcon={LogoIcon}
            brandName={brandName}
            tagline={tagline}
            showBadges={showBadges}
            badges={badges}
          />

          {/* Link Columns */}
          {columns.map((column, i) => (
            <LinkColumn key={i} column={column} />
          ))}
        </div>

        <Separator className="my-8" />

        <BottomBar
          copyright={copyright}
          showSocialLinks={showSocialLinks}
          socialLinks={socialLinks}
        />
      </Container>
    </footer>
  );
}

// ============================================
// Sub-components
// ============================================

interface BrandColumnProps {
  showLogo: boolean;
  LogoIcon: React.ComponentType<{ className?: string }>;
  brandName: string;
  tagline?: string;
  showBadges: boolean;
  badges: FooterBadge[];
}

function BrandColumn({ 
  showLogo, 
  LogoIcon, 
  brandName, 
  tagline, 
  showBadges, 
  badges 
}: BrandColumnProps) {
  return (
    <div className="lg:col-span-2">
      {showLogo && (
        <a href="/" className="flex items-center gap-2 mb-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <LogoIcon className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold">{brandName}</span>
        </a>
      )}
      
      {tagline && (
        <p className="text-muted-foreground mb-6 max-w-xs">
          {tagline}
        </p>
      )}
      
      {showBadges && badges.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {badges.map((badge, i) => {
            const BadgeIcon = badge.icon ? getIcon(badge.icon) : null;
            return (
              <Badge key={i} variant="outline" size="sm">
                {BadgeIcon && <BadgeIcon className="mr-1 h-3 w-3" />}
                {badge.text}
              </Badge>
            );
          })}
        </div>
      )}
    </div>
  );
}

interface LinkColumnProps {
  column: FooterColumn;
}

function LinkColumn({ column }: LinkColumnProps) {
  return (
    <div>
      <h4 className="font-semibold mb-4">{column.title}</h4>
      <ul className="space-y-2 text-sm text-muted-foreground">
        {column.links.map((link, j) => (
          <li key={j}>
            <a 
              href={link.href} 
              className="hover:text-foreground transition-colors"
            >
              {link.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface BottomBarProps {
  copyright: string;
  showSocialLinks: boolean;
  socialLinks: SocialLink[];
}

function BottomBar({ copyright, showSocialLinks, socialLinks }: BottomBarProps) {
  const socialIcons: Record<string, React.ReactNode> = {
    github: <Icons.github className="w-5 h-5" />,
    twitter: <Icons.twitter className="w-5 h-5" />,
    linkedin: <Icons.linkedin className="w-5 h-5" />,
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
      <p>{copyright}</p>
      
      {showSocialLinks && socialLinks.length > 0 && (
        <div className="flex items-center gap-4">
          {socialLinks.map((social, i) => (
            <a
              key={i}
              href={social.href}
              className="hover:text-foreground transition-colors"
              target="_blank"
              rel="noopener noreferrer"
              aria-label={social.platform}
            >
              {socialIcons[social.platform] || <Icons.link className="w-5 h-5" />}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
