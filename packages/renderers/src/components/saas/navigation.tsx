/**
 * Navigation Section Component
 * 
 * Sticky navigation bar with logo, links, and auth buttons.
 * Handles its own data extraction from section.
 */

import React, { useState } from 'react';
import { cn, getData } from '../../utils';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { Icons, getIcon } from '../icons';
import { NAVIGATION_SCHEMA } from '@asap/shared';
import type { Section } from '../../types';

export interface SectionProps {
  section: Section;
  className?: string;
}

export function NavigationSection({ section, className }: SectionProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const defaults = NAVIGATION_SCHEMA.defaultSettings;

  // Extract data from section
  const showLogo = getData(section, 'show_logo', defaults.show_logo as boolean);
  const logoIcon = getData(section, 'logo_icon', defaults.logo_icon as string);
  const brandName = getData(section, 'brand_name', defaults.brand_name as string);
  const navLinks = getData(section, 'nav_links', defaults.nav_links as Array<{ label: string; href: string }>);
  const showAuthButtons = getData(section, 'show_auth_buttons', defaults.show_auth_buttons as boolean);
  const loginText = getData(section, 'login_text', defaults.login_text as string);
  const loginHref = getData(section, 'login_href', defaults.login_href as string);
  const signupText = getData(section, 'signup_text', defaults.signup_text as string);
  const signupHref = getData(section, 'signup_href', defaults.signup_href as string);
  const mobileMenu = getData(section, 'mobile_menu', defaults.mobile_menu as boolean);

  const LogoIcon = getIcon(logoIcon);

  return (
    <header className={cn(
      'sticky top-0 z-50 w-full border-b border-border',
      'bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60',
      className
    )}>
      <nav className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        {showLogo && (
          <a href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <LogoIcon className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">{brandName}</span>
          </a>
        )}

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link, i) => (
            <a 
              key={i} 
              href={link.href} 
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Auth Buttons - Desktop */}
        {showAuthButtons && (
          <div className="hidden md:flex items-center gap-4">
            <Button variant="ghost" href={loginHref}>
              {loginText}
            </Button>
            <Button href={signupHref}>
              {signupText}
            </Button>
          </div>
        )}

        {/* Mobile Menu Button */}
        {mobileMenu && (
          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label={mobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
          >
            {mobileMenuOpen ? (
              <Icons.x className="h-6 w-6" />
            ) : (
              <Icons.menu className="h-6 w-6" />
            )}
          </button>
        )}
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-background p-4 animate-in slide-in-from-top-2">
          <div className="flex flex-col gap-4">
            {navLinks.map((link, i) => (
              <a 
                key={i} 
                href={link.href} 
                className="text-sm font-medium py-2"
                onClick={() => setMobileMenuOpen(false)}
              >
                {link.label}
              </a>
            ))}
            {showAuthButtons && (
              <>
                <Separator />
                <Button variant="outline" fullWidth href={loginHref}>
                  {loginText}
                </Button>
                <Button fullWidth href={signupHref}>
                  {signupText}
                </Button>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
