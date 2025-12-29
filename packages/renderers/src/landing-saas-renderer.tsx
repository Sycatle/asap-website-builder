/**
 * Landing Page SaaS Renderer
 * 
 * Renders a complete SaaS landing page from preset configuration.
 * Matches the exact design of apps/web/src/components/landing/LandingPage.tsx
 * 
 * Section Order:
 * 1. Navigation
 * 2. Hero
 * 3. Features
 * 4. How It Works
 * 5. Pricing
 * 6. Testimonials
 * 7. CTA
 * 8. Footer
 */

import React, { useState } from 'react';
import { cn } from './utils';

// ============================================
// Types
// ============================================

export interface LandingSaaSConfig {
  extensions: string[];
  pages: LandingSaaSPage[];
  theme: LandingSaaSTheme;
  meta: LandingSaaSMeta;
}

export interface LandingSaaSPage {
  slug: string;
  title: string;
  description: string;
  is_homepage: boolean;
  sections: LandingSaaSSection[];
}

export interface LandingSaaSSection {
  section_type: string;
  slug: string;
  title: string;
  layout: string;
  order: number;
  settings: Record<string, unknown>;
}

export interface LandingSaaSTheme {
  primary_color: string;
  accent_color: string;
  dark_mode: boolean;
  font_heading: string;
  font_body: string;
}

export interface LandingSaaSMeta {
  target_audience: string;
  difficulty: string;
  estimated_setup_time: string;
}

// ============================================
// Icons
// ============================================

const Icons: Record<string, React.FC<{ className?: string }>> = {
  zap: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  ),
  github: ({ className }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
    </svg>
  ),
  globe: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
    </svg>
  ),
  cloud: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
    </svg>
  ),
  sparkles: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
    </svg>
  ),
  puzzle: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" />
    </svg>
  ),
  'bar-chart-3': ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  shield: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  check: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  ),
  'arrow-right': ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
    </svg>
  ),
  play: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  star: ({ className }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  ),
  users: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  ),
  rocket: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
    </svg>
  ),
  'chevron-right': ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  ),
  menu: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  ),
  x: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  twitter: ({ className }) => (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  ),
};

function getIcon(name: string): React.FC<{ className?: string }> {
  return Icons[name] || Icons.zap;
}

// ============================================
// Button Component
// ============================================

interface ButtonProps {
  children: React.ReactNode;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  size?: 'default' | 'lg';
  className?: string;
  asChild?: boolean;
  href?: string;
}

function Button({ children, variant = 'default', size = 'default', className, href }: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';
  
  const variants = {
    default: 'bg-blue-600 text-white hover:bg-blue-700',
    outline: 'border border-gray-300 bg-transparent hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800',
    secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:hover:bg-gray-700',
    ghost: 'hover:bg-gray-100 dark:hover:bg-gray-800',
  };
  
  const sizes = {
    default: 'h-10 px-4 py-2 text-sm',
    lg: 'h-12 px-8 py-3 text-base',
  };
  
  const classes = cn(baseStyles, variants[variant], sizes[size], className);
  
  if (href) {
    return <a href={href} className={classes}>{children}</a>;
  }
  
  return <button className={classes}>{children}</button>;
}

// ============================================
// Badge Component
// ============================================

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'secondary' | 'outline';
  className?: string;
}

function Badge({ children, variant = 'default', className }: BadgeProps) {
  const variants = {
    default: 'bg-blue-600 text-white',
    secondary: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    outline: 'border border-gray-300 text-gray-700 dark:border-gray-700 dark:text-gray-300',
  };
  
  return (
    <span className={cn(
      'inline-flex items-center rounded-full px-3 py-1 text-xs font-medium',
      variants[variant],
      className
    )}>
      {children}
    </span>
  );
}

// ============================================
// Card Components
// ============================================

function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-lg border bg-white dark:bg-gray-900 dark:border-gray-800 shadow-sm', className)}>
      {children}
    </div>
  );
}

function CardHeader({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('flex flex-col space-y-1.5 p-6', className)}>{children}</div>;
}

function CardTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return <h3 className={cn('text-lg font-semibold leading-none tracking-tight', className)}>{children}</h3>;
}

function CardDescription({ children, className }: { children: React.ReactNode; className?: string }) {
  return <p className={cn('text-sm text-gray-500 dark:text-gray-400', className)}>{children}</p>;
}

function CardContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('p-6 pt-0', className)}>{children}</div>;
}

function CardFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('flex items-center p-6 pt-0', className)}>{children}</div>;
}

// ============================================
// Separator Component
// ============================================

function Separator({ orientation = 'horizontal', className }: { orientation?: 'horizontal' | 'vertical'; className?: string }) {
  return (
    <div className={cn(
      'shrink-0 bg-gray-200 dark:bg-gray-800',
      orientation === 'horizontal' ? 'h-[1px] w-full' : 'h-full w-[1px]',
      className
    )} />
  );
}

// ============================================
// Navigation Section
// ============================================

interface NavigationSettings {
  show_logo?: boolean;
  logo_icon?: string;
  brand_name?: string;
  nav_links?: Array<{ label: string; href: string }>;
  show_auth_buttons?: boolean;
  login_text?: string;
  login_href?: string;
  signup_text?: string;
  signup_href?: string;
  mobile_menu?: boolean;
}

function NavigationSection({ settings }: { settings: NavigationSettings }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const LogoIcon = getIcon(settings.logo_icon || 'zap');
  const MenuIcon = getIcon('menu');
  const XIcon = getIcon('x');

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:bg-gray-950/95 dark:supports-[backdrop-filter]:bg-gray-950/60 dark:border-gray-800">
      <nav className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
            <LogoIcon className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-bold">{settings.brand_name || 'ASAP'}</span>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          {settings.nav_links?.map((link, i) => (
            <a key={i} href={link.href} className="text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">
              {link.label}
            </a>
          ))}
        </div>

        {settings.show_auth_buttons && (
          <div className="hidden md:flex items-center gap-4">
            <Button variant="ghost" href={settings.login_href || '/login'}>
              {settings.login_text || 'Connexion'}
            </Button>
            <Button href={settings.signup_href || '/signup'}>
              {settings.signup_text || 'Commencer gratuitement'}
            </Button>
          </div>
        )}

        {/* Mobile Menu Button */}
        {settings.mobile_menu && (
          <button
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <XIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
          </button>
        )}
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t bg-white dark:bg-gray-950 p-4">
          <div className="flex flex-col gap-4">
            {settings.nav_links?.map((link, i) => (
              <a key={i} href={link.href} className="text-sm font-medium">{link.label}</a>
            ))}
            <Separator />
            <Button variant="outline" className="w-full" href={settings.login_href || '/login'}>
              {settings.login_text || 'Connexion'}
            </Button>
            <Button className="w-full" href={settings.signup_href || '/signup'}>
              {settings.signup_text || 'Commencer gratuitement'}
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}

// ============================================
// Hero Section
// ============================================

interface HeroSettings {
  show_badge?: boolean;
  badge_icon?: string;
  badge_text?: string;
  headline_line1?: string;
  headline_line2?: string;
  subheadline?: string;
  subheadline_bold?: string;
  cta_primary_text?: string;
  cta_primary_href?: string;
  cta_primary_icon?: string;
  cta_secondary_text?: string;
  cta_secondary_href?: string;
  cta_secondary_icon?: string;
  show_social_proof?: boolean;
  social_proof_avatars_count?: number;
  social_proof_text?: string;
  social_proof_rating?: string;
  show_dashboard_preview?: boolean;
  dashboard_url?: string;
  dashboard_stats?: Array<{ icon: string; value: string; label: string }>;
  background_type?: string;
  background_decorations?: boolean;
}

function HeroSection({ settings }: { settings: HeroSettings }) {
  const BadgeIcon = settings.badge_icon ? getIcon(settings.badge_icon) : null;
  const PrimaryIcon = settings.cta_primary_icon ? getIcon(settings.cta_primary_icon) : null;
  const SecondaryIcon = settings.cta_secondary_icon ? getIcon(settings.cta_secondary_icon) : null;
  const ShieldIcon = getIcon('shield');
  const StarIcon = getIcon('star');

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-white via-white to-gray-100/30 dark:from-gray-950 dark:via-gray-950 dark:to-gray-900/30">
      {/* Background decoration */}
      {settings.background_decorations && (
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
        </div>
      )}

      <div className="container mx-auto px-4 py-20 md:py-32">
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          {settings.show_badge && (
            <Badge variant="secondary" className="mb-6 px-4 py-2">
              {BadgeIcon && <BadgeIcon className="mr-2 h-3.5 w-3.5" />}
              {settings.badge_text}
            </Badge>
          )}

          {/* Headline */}
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl mb-6">
            {settings.headline_line1}
            <span className="block text-blue-600 mt-2">{settings.headline_line2}</span>
          </h1>

          {/* Subheadline */}
          <p className="mx-auto max-w-2xl text-lg md:text-xl text-gray-500 dark:text-gray-400 mb-8">
            {settings.subheadline}
            {settings.subheadline_bold && (
              <span className="font-semibold text-gray-900 dark:text-white"> {settings.subheadline_bold}</span>
            )}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Button size="lg" className="w-full sm:w-auto text-base px-8" href={settings.cta_primary_href}>
              {settings.cta_primary_text}
              {PrimaryIcon && <PrimaryIcon className="ml-2 h-4 w-4" />}
            </Button>
            <Button size="lg" variant="outline" className="w-full sm:w-auto text-base px-8" href={settings.cta_secondary_href}>
              {SecondaryIcon && <SecondaryIcon className="mr-2 h-4 w-4" />}
              {settings.cta_secondary_text}
            </Button>
          </div>

          {/* Social Proof */}
          {settings.show_social_proof && (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {Array.from({ length: settings.social_proof_avatars_count || 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-8 w-8 rounded-full border-2 border-white dark:border-gray-950 bg-gradient-to-br from-blue-500/60 to-purple-500/60"
                    />
                  ))}
                </div>
                <span>{settings.social_proof_text}</span>
              </div>
              <Separator orientation="vertical" className="hidden sm:block h-6" />
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <StarIcon key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ))}
                <span className="ml-1">{settings.social_proof_rating}</span>
              </div>
            </div>
          )}
        </div>

        {/* Dashboard Preview */}
        {settings.show_dashboard_preview && (
          <div className="mt-16 mx-auto max-w-5xl">
            <div className="relative rounded-xl border bg-white dark:bg-gray-900 dark:border-gray-800 shadow-2xl overflow-hidden">
              {/* Browser chrome */}
              <div className="flex items-center gap-2 border-b bg-gray-50 dark:bg-gray-800/50 px-4 py-3">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <div className="h-3 w-3 rounded-full bg-yellow-500" />
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="flex items-center gap-2 rounded-md bg-white dark:bg-gray-900 px-3 py-1 text-xs text-gray-500">
                    <ShieldIcon className="h-3 w-3" />
                    {settings.dashboard_url}
                  </div>
                </div>
              </div>
              {/* Dashboard preview */}
              <div className="aspect-[16/9] bg-gradient-to-br from-blue-500/5 via-white dark:via-gray-900 to-purple-500/5 flex items-center justify-center">
                <div className="text-center p-8">
                  {settings.dashboard_stats && (
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      {settings.dashboard_stats.map((stat, i) => {
                        const StatIcon = getIcon(stat.icon);
                        return (
                          <div key={i} className="p-4 rounded-lg border bg-white/80 dark:bg-gray-900/80 backdrop-blur">
                            <StatIcon className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                            <div className="text-2xl font-bold">{stat.value}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  <p className="text-gray-500 dark:text-gray-400">Aperçu du dashboard</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

// ============================================
// Features Section
// ============================================

interface FeatureItem {
  icon: string;
  title: string;
  description: string;
  badge?: string;
}

interface FeaturesSettings {
  badge_text?: string;
  headline_line1?: string;
  headline_line2?: string;
  subheadline?: string;
  columns?: number;
  show_badges?: boolean;
  show_icons?: boolean;
  hover_effect?: boolean;
  features?: FeatureItem[];
}

function FeaturesSection({ settings }: { settings: FeaturesSettings }) {
  return (
    <section id="features" className="py-20 md:py-32 bg-gray-50/50 dark:bg-gray-900/30">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <Badge variant="outline" className="mb-4">{settings.badge_text}</Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl mb-4">
            {settings.headline_line1}
            <span className="text-blue-600"> {settings.headline_line2}</span>
          </h2>
          <p className="text-lg text-gray-500 dark:text-gray-400">
            {settings.subheadline}
          </p>
        </div>

        <div className={cn(
          'grid gap-6',
          settings.columns === 2 && 'md:grid-cols-2',
          settings.columns === 3 && 'md:grid-cols-2 lg:grid-cols-3'
        )}>
          {settings.features?.map((feature, i) => {
            const FeatureIcon = getIcon(feature.icon);
            return (
              <Card key={i} className={cn(
                'relative group',
                settings.hover_effect && 'hover:shadow-lg transition-all duration-300 hover:-translate-y-1'
              )}>
                {settings.show_badges && feature.badge && (
                  <Badge className="absolute -top-2 -right-2">
                    {feature.badge}
                  </Badge>
                )}
                <CardHeader>
                  {settings.show_icons && (
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-500/10 group-hover:bg-blue-500/20 transition-colors">
                      <FeatureIcon className="h-6 w-6 text-blue-600" />
                    </div>
                  )}
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">
                    {feature.description}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ============================================
// How It Works Section
// ============================================

interface StepItem {
  number: string;
  title: string;
  description: string;
}

interface HowItWorksSettings {
  badge_text?: string;
  headline_line1?: string;
  headline_line2?: string;
  subheadline?: string;
  show_numbers?: boolean;
  show_connectors?: boolean;
  steps?: StepItem[];
}

function HowItWorksSection({ settings }: { settings: HowItWorksSettings }) {
  return (
    <section id="demo" className="py-20 md:py-32">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <Badge variant="outline" className="mb-4">{settings.badge_text}</Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl mb-4">
            {settings.headline_line1} <span className="text-blue-600">{settings.headline_line2}</span>
          </h2>
          <p className="text-lg text-gray-500 dark:text-gray-400">
            {settings.subheadline}
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {settings.steps?.map((step, i) => (
            <div key={i} className="relative">
              {/* Connector line */}
              {settings.show_connectors && i < (settings.steps?.length || 0) - 1 && (
                <div className="hidden lg:block absolute top-8 left-[60%] w-full h-0.5 bg-gradient-to-r from-blue-500/50 to-blue-500/10" />
              )}
              <div className="relative z-10 flex flex-col items-center text-center">
                {settings.show_numbers && (
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-600 text-white text-2xl font-bold">
                    {step.number}
                  </div>
                )}
                <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                <p className="text-gray-500 dark:text-gray-400">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================
// Pricing Section
// ============================================

interface PricingPlan {
  name: string;
  description: string;
  price: string;
  period: string;
  popular?: boolean;
  features: string[];
  cta_text: string;
  cta_variant: 'default' | 'outline';
}

interface PricingSettings {
  badge_text?: string;
  headline_line1?: string;
  headline_line2?: string;
  subheadline?: string;
  currency?: string;
  currency_position?: 'before' | 'after';
  billing_period?: string;
  show_popular_badge?: boolean;
  popular_badge_text?: string;
  plans?: PricingPlan[];
}

function PricingSection({ settings }: { settings: PricingSettings }) {
  const CheckIcon = getIcon('check');

  return (
    <section id="pricing" className="py-20 md:py-32 bg-gray-50/50 dark:bg-gray-900/30">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <Badge variant="outline" className="mb-4">{settings.badge_text}</Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl mb-4">
            {settings.headline_line1}
            <span className="text-blue-600"> {settings.headline_line2}</span>
          </h2>
          <p className="text-lg text-gray-500 dark:text-gray-400">
            {settings.subheadline}
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
          {settings.plans?.map((plan, i) => (
            <Card
              key={i}
              className={cn(
                'relative flex flex-col',
                plan.popular && 'border-blue-600 shadow-lg scale-105'
              )}
            >
              {settings.show_popular_badge && plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                  {settings.popular_badge_text}
                </Badge>
              )}
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="text-center mb-6">
                  <span className="text-4xl font-bold">{plan.price}{settings.currency}</span>
                  <span className="text-gray-500 dark:text-gray-400"> {plan.period}</span>
                </div>
                <ul className="space-y-3">
                  {plan.features.map((feature, j) => (
                    <li key={j} className="flex items-start gap-2">
                      <CheckIcon className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button className="w-full" variant={plan.cta_variant} href="/signup">
                  {plan.cta_text}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================
// Testimonials Section
// ============================================

interface TestimonialItem {
  quote: string;
  author: string;
  role: string;
  avatar_initials: string;
}

interface TestimonialsSettings {
  badge_text?: string;
  headline_line1?: string;
  headline_line2?: string;
  subheadline?: string;
  columns?: number;
  show_avatars?: boolean;
  show_quotes?: boolean;
  testimonials?: TestimonialItem[];
}

function TestimonialsSection({ settings }: { settings: TestimonialsSettings }) {
  return (
    <section id="testimonials" className="py-20 md:py-32">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <Badge variant="outline" className="mb-4">{settings.badge_text}</Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl mb-4">
            {settings.headline_line1}
            <span className="text-blue-600"> {settings.headline_line2}</span>
          </h2>
          <p className="text-lg text-gray-500 dark:text-gray-400">
            {settings.subheadline}
          </p>
        </div>

        <div className={cn(
          'grid gap-8',
          settings.columns === 3 && 'md:grid-cols-3'
        )}>
          {settings.testimonials?.map((testimonial, i) => (
            <Card key={i} className="relative">
              <CardContent className="pt-6">
                {/* Quote marks */}
                {settings.show_quotes && (
                  <div className="absolute top-4 left-4 text-6xl text-blue-500/10 font-serif leading-none">
                    "
                  </div>
                )}
                <p className="relative z-10 text-gray-500 dark:text-gray-400 mb-6 italic">
                  "{testimonial.quote}"
                </p>
                <div className="flex items-center gap-3">
                  {settings.show_avatars && (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-white text-sm font-semibold">
                      {testimonial.avatar_initials}
                    </div>
                  )}
                  <div>
                    <div className="font-semibold">{testimonial.author}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{testimonial.role}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================
// CTA Section
// ============================================

interface CTASettings {
  background_style?: 'primary' | 'secondary';
  headline?: string;
  subheadline_line1?: string;
  subheadline_line2?: string;
  cta_primary_text?: string;
  cta_primary_href?: string;
  cta_primary_icon?: string;
  cta_primary_variant?: 'default' | 'secondary' | 'outline';
  cta_secondary_text?: string;
  cta_secondary_href?: string;
  cta_secondary_icon?: string;
  cta_secondary_variant?: 'default' | 'secondary' | 'outline';
}

function CTASection({ settings }: { settings: CTASettings }) {
  const PrimaryIcon = settings.cta_primary_icon ? getIcon(settings.cta_primary_icon) : null;
  const SecondaryIcon = settings.cta_secondary_icon ? getIcon(settings.cta_secondary_icon) : null;

  return (
    <section className={cn(
      'py-20 md:py-32',
      settings.background_style === 'primary' && 'bg-blue-600 text-white'
    )}>
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl mb-6">
            {settings.headline}
          </h2>
          <p className="text-lg opacity-90 mb-8">
            {settings.subheadline_line1}
            <br />
            {settings.subheadline_line2}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button
              size="lg"
              variant={settings.cta_primary_variant || 'secondary'}
              className="text-base px-8"
              href={settings.cta_primary_href}
            >
              {settings.cta_primary_text}
              {PrimaryIcon && <PrimaryIcon className="ml-2 h-4 w-4" />}
            </Button>
            <Button
              size="lg"
              variant={settings.cta_secondary_variant || 'outline'}
              className={cn(
                'text-base px-8',
                settings.background_style === 'primary' && 'bg-transparent border-white/30 hover:bg-white/10'
              )}
              href={settings.cta_secondary_href}
            >
              {settings.cta_secondary_text}
              {SecondaryIcon && <SecondaryIcon className="ml-2 h-4 w-4" />}
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================
// Footer Section
// ============================================

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

interface FooterSocialLink {
  platform: string;
  href: string;
}

interface FooterSettings {
  show_logo?: boolean;
  logo_icon?: string;
  brand_name?: string;
  tagline?: string;
  show_badges?: boolean;
  badges?: FooterBadge[];
  columns?: FooterColumn[];
  show_social_links?: boolean;
  social_links?: FooterSocialLink[];
  copyright?: string;
}

function FooterSection({ settings }: { settings: FooterSettings }) {
  const LogoIcon = getIcon(settings.logo_icon || 'zap');
  const GithubIcon = getIcon('github');
  const TwitterIcon = getIcon('twitter');
  const ShieldIcon = getIcon('shield');

  const socialIcons: Record<string, React.ReactNode> = {
    github: <GithubIcon className="h-5 w-5" />,
    twitter: <TwitterIcon className="h-5 w-5" />,
  };

  return (
    <footer className="border-t bg-white dark:bg-gray-950 dark:border-gray-800 py-12">
      <div className="container mx-auto px-4">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            {settings.show_logo && (
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
                  <LogoIcon className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold">{settings.brand_name}</span>
              </div>
            )}
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {settings.tagline}
            </p>
            {settings.show_badges && settings.badges && (
              <div className="flex items-center gap-2">
                {settings.badges.map((badge, i) => {
                  const BadgeIcon = badge.icon ? getIcon(badge.icon) : null;
                  return (
                    <Badge key={i} variant="outline" className="text-xs">
                      {BadgeIcon && <BadgeIcon className="mr-1 h-3 w-3" />}
                      {badge.text}
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>

          {settings.columns?.map((column, i) => (
            <div key={i}>
              <h4 className="font-semibold mb-4">{column.title}</h4>
              <ul className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
                {column.links.map((link, j) => (
                  <li key={j}>
                    <a href={link.href} className="hover:text-gray-900 dark:hover:text-white transition-colors">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500 dark:text-gray-400">
          <p>{settings.copyright}</p>
          {settings.show_social_links && settings.social_links && (
            <div className="flex items-center gap-4">
              {settings.social_links.map((social, i) => (
                <a key={i} href={social.href} className="hover:text-gray-900 dark:hover:text-white transition-colors">
                  {socialIcons[social.platform]}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}

// ============================================
// Section Router
// ============================================

function renderSection(section: LandingSaaSSection) {
  const settings = section.settings as Record<string, unknown>;
  
  switch (section.section_type) {
    case 'navigation':
      return <NavigationSection key={section.slug} settings={settings as NavigationSettings} />;
    case 'hero':
      return <HeroSection key={section.slug} settings={settings as HeroSettings} />;
    case 'features':
      return <FeaturesSection key={section.slug} settings={settings as FeaturesSettings} />;
    case 'how-it-works':
      return <HowItWorksSection key={section.slug} settings={settings as HowItWorksSettings} />;
    case 'pricing':
      return <PricingSection key={section.slug} settings={settings as PricingSettings} />;
    case 'testimonials':
      return <TestimonialsSection key={section.slug} settings={settings as TestimonialsSettings} />;
    case 'cta':
      return <CTASection key={section.slug} settings={settings as CTASettings} />;
    case 'footer':
      return <FooterSection key={section.slug} settings={settings as FooterSettings} />;
    default:
      return null;
  }
}

// ============================================
// Full Page Renderer
// ============================================

interface LandingSaaSPageRendererProps {
  config: LandingSaaSConfig;
}

/**
 * Landing Page SaaS Renderer
 * 
 * Renders a complete SaaS landing page from preset configuration.
 */
export function LandingSaaSPageRenderer({ config }: LandingSaaSPageRendererProps) {
  const homepage = config.pages.find(p => p.is_homepage) || config.pages[0];
  
  if (!homepage) {
    return <div>No homepage found</div>;
  }

  // Sort sections by order
  const sortedSections = [...homepage.sections].sort((a, b) => a.order - b.order);

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950">
      {sortedSections.map(section => renderSection(section))}
    </div>
  );
}

export default LandingSaaSPageRenderer;
