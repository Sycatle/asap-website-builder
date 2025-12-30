/**
 * SaaS Section Renderer Adapters
 * 
 * These adapters wrap the SaaS-specific renderers from landing-saas-renderer.tsx
 * to make them compatible with the generic SectionRenderer interface.
 * 
 * They extract settings/data from the section and pass them to the SaaS renderers.
 */

import React, { useState } from 'react';
import type { SectionRendererProps } from './renderers';
import { getData, cn } from './utils';

// ============================================
// Icons (copied from landing-saas for standalone use)
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
  href?: string;
}

function Button({ children, variant = 'default', size = 'default', className, href }: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50';
  
  const variants = {
    default: 'bg-primary text-primary-foreground shadow hover:bg-primary/90',
    outline: 'border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground',
    secondary: 'bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80',
    ghost: 'hover:bg-accent hover:text-accent-foreground',
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
    default: 'border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80',
    secondary: 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
    outline: 'text-foreground border-border',
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
    <div className={cn('rounded-lg border border-border bg-card text-card-foreground shadow-sm', className)}>
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
  return <p className={cn('text-sm text-muted-foreground', className)}>{children}</p>;
}

function CardContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('p-6 pt-0', className)}>{children}</div>;
}

// ============================================
// Separator Component
// ============================================

function Separator({ orientation = 'horizontal', className }: { orientation?: 'horizontal' | 'vertical'; className?: string }) {
  return (
    <div className={cn(
      'shrink-0 bg-border',
      orientation === 'horizontal' ? 'h-[1px] w-full' : 'h-full w-[1px]',
      className
    )} />
  );
}

// ============================================
// Navigation SaaS Renderer
// ============================================

export function NavigationSaaSRenderer({ section }: SectionRendererProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const showLogo = getData(section, 'show_logo', true);
  const logoIcon = getData(section, 'logo_icon', 'zap');
  const brandName = getData(section, 'brand_name', 'ASAP');
  const navLinks = getData(section, 'nav_links', []) as Array<{ label: string; href: string }>;
  const showAuthButtons = getData(section, 'show_auth_buttons', true);
  const loginText = getData(section, 'login_text', 'Connexion');
  const loginHref = getData(section, 'login_href', '/login');
  const signupText = getData(section, 'signup_text', 'Commencer gratuitement');
  const signupHref = getData(section, 'signup_href', '/signup');
  const mobileMenu = getData(section, 'mobile_menu', true);

  const LogoIcon = getIcon(logoIcon);
  const MenuIcon = getIcon('menu');
  const XIcon = getIcon('x');

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="container mx-auto flex h-16 items-center justify-between px-4">
        {showLogo && (
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <LogoIcon className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">{brandName}</span>
          </div>
        )}

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link, i) => (
            <a key={i} href={link.href} className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              {link.label}
            </a>
          ))}
        </div>

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
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <XIcon className="h-6 w-6" /> : <MenuIcon className="h-6 w-6" />}
          </button>
        )}
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border bg-background p-4">
          <div className="flex flex-col gap-4">
            {navLinks.map((link, i) => (
              <a key={i} href={link.href} className="text-sm font-medium">{link.label}</a>
            ))}
            <Separator />
            <Button variant="outline" className="w-full" href={loginHref}>
              {loginText}
            </Button>
            <Button className="w-full" href={signupHref}>
              {signupText}
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}

// ============================================
// Hero SaaS Renderer
// ============================================

export function HeroSaaSRenderer({ section, website }: SectionRendererProps) {
  const showBadge = getData(section, 'show_badge', true);
  const badgeIcon = getData(section, 'badge_icon', 'sparkles');
  const badgeText = getData(section, 'badge_text', '');
  const headlineLine1 = getData(section, 'headline_line1', website?.title || 'Créez votre site');
  const headlineLine2 = getData(section, 'headline_line2', 'en quelques minutes');
  const subheadline = getData(section, 'subheadline', website?.tagline || '');
  const subheadlineBold = getData(section, 'subheadline_bold', '');
  const ctaPrimaryText = getData(section, 'cta_primary_text', 'Commencer gratuitement');
  const ctaPrimaryHref = getData(section, 'cta_primary_href', '/signup');
  const ctaPrimaryIcon = getData(section, 'cta_primary_icon', 'arrow-right');
  const ctaSecondaryText = getData(section, 'cta_secondary_text', 'Voir la démo');
  const ctaSecondaryHref = getData(section, 'cta_secondary_href', '#demo');
  const ctaSecondaryIcon = getData(section, 'cta_secondary_icon', 'play');
  const showSocialProof = getData(section, 'show_social_proof', true);
  const socialProofAvatarsCount = getData(section, 'social_proof_avatars_count', 5);
  const socialProofText = getData(section, 'social_proof_text', '+500 créateurs nous font confiance');
  const socialProofRating = getData(section, 'social_proof_rating', '4.9/5');
  const backgroundDecorations = getData(section, 'background_decorations', true);
  const showDashboardPreview = getData(section, 'show_dashboard_preview', true);
  const dashboardUrl = getData(section, 'dashboard_url', '');
  const dashboardStats = getData(section, 'dashboard_stats', []) as Array<{ icon: string; value: string; label: string }>;

  const BadgeIcon = badgeIcon ? getIcon(badgeIcon) : null;
  const PrimaryIcon = ctaPrimaryIcon ? getIcon(ctaPrimaryIcon) : null;
  const SecondaryIcon = ctaSecondaryIcon ? getIcon(ctaSecondaryIcon) : null;
  const StarIcon = getIcon('star');

  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-background via-background to-muted/30">
      {/* Background decoration */}
      {backgroundDecorations && (
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
        </div>
      )}

      <div className="container mx-auto px-4 py-20 md:py-32">
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          {showBadge && badgeText && (
            <Badge variant="secondary" className="mb-6 px-4 py-2">
              {BadgeIcon && <BadgeIcon className="mr-2 h-3.5 w-3.5" />}
              {badgeText}
            </Badge>
          )}

          {/* Headline */}
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl mb-6">
            {headlineLine1}
            <span className="block text-primary mt-2">{headlineLine2}</span>
          </h1>

          {/* Subheadline */}
          <p className="mx-auto max-w-2xl text-lg md:text-xl text-muted-foreground mb-8">
            {subheadline}
            {subheadlineBold && (
              <span className="font-semibold text-foreground"> {subheadlineBold}</span>
            )}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Button size="lg" className="w-full sm:w-auto text-base px-8" href={ctaPrimaryHref}>
              {ctaPrimaryText}
              {PrimaryIcon && <PrimaryIcon className="ml-2 h-4 w-4" />}
            </Button>
            {ctaSecondaryText && (
              <Button size="lg" variant="outline" className="w-full sm:w-auto text-base px-8" href={ctaSecondaryHref}>
                {SecondaryIcon && <SecondaryIcon className="mr-2 h-4 w-4" />}
                {ctaSecondaryText}
              </Button>
            )}
          </div>

          {/* Social Proof */}
          {showSocialProof && (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {Array.from({ length: socialProofAvatarsCount }).map((_, i) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded-full border-2 border-background bg-gradient-to-br from-primary/60 to-purple-500/60"
                    />
                  ))}
                </div>
                <span>{socialProofText}</span>
              </div>
              {socialProofRating && (
                <div className="flex items-center gap-1">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <StarIcon key={i} className="w-4 h-4 text-yellow-400" />
                    ))}
                  </div>
                  <span>{socialProofRating}</span>
                </div>
              )}
            </div>
          )}

          {/* Dashboard Preview */}
          {showDashboardPreview && (
            <div className="mt-16 relative">
              <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-transparent z-10 pointer-events-none" />
              <div className="relative rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
                <div className="border-b border-border bg-muted/50 px-4 py-3 flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                  </div>
                  <div className="flex-1 text-center text-sm text-muted-foreground">{dashboardUrl}</div>
                </div>
                <div className="p-6 grid grid-cols-3 gap-4">
                  {dashboardStats.map((stat, i) => {
                    const StatIcon = getIcon(stat.icon);
                    return (
                      <div key={i} className="p-4 rounded-lg bg-muted">
                        <StatIcon className="w-6 h-6 text-primary mb-2" />
                        <div className="text-2xl font-bold">{stat.value}</div>
                        <div className="text-sm text-muted-foreground">{stat.label}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// ============================================
// Features SaaS Renderer
// ============================================

export function FeaturesSaaSRenderer({ section }: SectionRendererProps) {
  const badgeText = getData(section, 'badge_text', 'Fonctionnalités');
  const headlineLine1 = getData(section, 'headline_line1', 'Tout ce dont vous avez besoin');
  const headlineLine2 = getData(section, 'headline_line2', 'pour réussir');
  const subheadline = getData(section, 'subheadline', '');
  const features = getData(section, 'features', []) as Array<{
    icon?: string;
    title: string;
    description: string;
    badge?: string;
  }>;
  const columns = getData<number>(section, 'columns', 3);
  const showBadges = getData(section, 'show_badges', true);
  const showIcons = getData(section, 'show_icons', true);
  const hoverEffect = getData(section, 'hover_effect', true);

  return (
    <section id="features" className="py-20 md:py-32 bg-muted/30 scroll-mt-16">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4">
            {badgeText}
          </Badge>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            {headlineLine1}
            <span className="text-primary"> {headlineLine2}</span>
          </h2>
          {subheadline && (
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {subheadline}
            </p>
          )}
        </div>

        <div className={cn(
          'grid gap-6',
          columns === 2 && 'md:grid-cols-2',
          columns === 3 && 'md:grid-cols-2 lg:grid-cols-3',
          columns === 4 && 'md:grid-cols-2 lg:grid-cols-4'
        )}>
          {features.map((feature, i) => {
            const FeatureIcon = feature.icon ? getIcon(feature.icon) : null;
            return (
              <Card key={i} className={cn(
                'relative overflow-hidden',
                hoverEffect && 'transition-all duration-300 hover:shadow-lg hover:-translate-y-1'
              )}>
                <CardHeader>
                  {showIcons && FeatureIcon && (
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                      <FeatureIcon className="w-6 h-6 text-primary" />
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <CardTitle>{feature.title}</CardTitle>
                    {showBadges && feature.badge && (
                      <Badge variant="secondary" className="text-xs">
                        {feature.badge}
                      </Badge>
                    )}
                  </div>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ============================================
// How It Works SaaS Renderer
// ============================================

export function HowItWorksSaaSRenderer({ section }: SectionRendererProps) {
  const badgeText = getData(section, 'badge_text', 'Comment ça marche');
  const headlineLine1 = getData(section, 'headline_line1', 'Lancez-vous');
  const headlineLine2 = getData(section, 'headline_line2', 'en 4 étapes');
  const subheadline = getData(section, 'subheadline', '');
  const steps = getData(section, 'steps', []) as Array<{
    number?: string;
    title: string;
    description: string;
  }>;
  const showNumbers = getData(section, 'show_numbers', true);
  const showConnectors = getData(section, 'show_connectors', true);

  return (
    <section className="py-20 md:py-32">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4">
            {badgeText}
          </Badge>
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4">
            {headlineLine1}
            <span className="text-primary"> {headlineLine2}</span>
          </h2>
          {subheadline && (
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {subheadline}
            </p>
          )}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, i) => (
            <div key={i} className="relative">
              {showConnectors && i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-8 left-1/2 w-full h-0.5 bg-gradient-to-r from-primary/50 to-primary/10" />
              )}
              <div className="relative flex flex-col items-center text-center">
                {showNumbers && (
                  <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold mb-4 relative z-10">
                    {step.number || String(i + 1).padStart(2, '0')}
                  </div>
                )}
                <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================
// Pricing SaaS Renderer
// ============================================

export function PricingSaaSRenderer({ section }: SectionRendererProps) {
  const badgeText = getData(section, 'badge_text', 'Tarifs');
  const headlineLine1 = getData(section, 'headline_line1', 'Des prix simples');
  const headlineLine2 = getData(section, 'headline_line2', 'et transparents');
  const subheadline = getData(section, 'subheadline', '');
  const plans = getData(section, 'plans', []) as Array<{
    name: string;
    description?: string;
    price: string;
    period?: string;
    popular?: boolean;
    features?: string[];
    cta_text?: string;
    cta_variant?: string;
  }>;
  const popularBadgeText = getData(section, 'popular_badge_text', 'Populaire');
  const currency = getData(section, 'currency', '€');

  type PricingPlan = {
    name: string;
    description?: string;
    price: string;
    period?: string;
    popular?: boolean;
    features?: string[];
    cta_text?: string;
    cta_variant?: string;
  };

  const defaultPlans: PricingPlan[] = [
    { name: 'Gratuit', description: 'Pour démarrer', price: '0', period: 'Toujours gratuit', features: ['1 site web', '500 Mo de stockage', '1000 tokens IA', 'Sous-domaine asap.cool'] },
    { name: 'Pro', description: 'Pour les créateurs', price: '9', period: '/mois', popular: true, features: ['5 sites web', '10 Go de stockage', '10 000 tokens IA', 'Domaines personnalisés', 'Analytics avancés'] },
    { name: 'Team', description: 'Pour les équipes', price: '29', period: '/mois', features: ['Sites illimités', '100 Go de stockage', 'Tokens illimités', 'Multi-utilisateurs', 'API access'] },
  ];

  const displayPlans: PricingPlan[] = plans.length > 0 ? plans : defaultPlans;

  const CheckIcon = getIcon('check');

  return (
    <section id="pricing" className="py-20 md:py-32 bg-muted/30 scroll-mt-16">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <Badge variant="outline" className="mb-4">{badgeText}</Badge>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">
            {headlineLine1}
            <span className="text-primary"> {headlineLine2}</span>
          </h2>
          {subheadline && (
            <p className="text-muted-foreground text-lg">{subheadline}</p>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {displayPlans.map((plan, i) => (
            <Card
              key={i}
              className={cn(
                "relative flex flex-col",
                plan.popular && 'border-primary shadow-lg scale-105'
              )}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                  {popularBadgeText}
                </Badge>
              )}
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="text-center mb-6">
                  <span className="text-4xl font-bold">{plan.price}{currency}</span>
                  <span className="text-muted-foreground"> {plan.period}</span>
                </div>
                {plan.features && (
                  <ul className="space-y-3">
                    {plan.features.map((feature, j) => (
                      <li key={j} className="flex items-start gap-2">
                        <CheckIcon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
              <div className="p-6 pt-0">
                <Button 
                  className="w-full" 
                  variant={plan.popular ? 'default' : 'outline'}
                >
                  {plan.cta_text || 'Commencer'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================
// Testimonials SaaS Renderer
// ============================================

export function TestimonialsSaaSRenderer({ section }: SectionRendererProps) {
  const badgeText = getData(section, 'badge_text', 'Témoignages');
  const headlineLine1 = getData(section, 'headline_line1', 'Ils nous font');
  const headlineLine2 = getData(section, 'headline_line2', 'confiance');
  const subheadline = getData(section, 'subheadline', '');
  const testimonials = getData(section, 'testimonials', []) as Array<{
    quote: string;
    author: string;
    role: string;
    avatar_initials?: string;
  }>;

  const defaultTestimonials = [
    { quote: 'ASAP a complètement transformé ma façon de présenter mes projets. L\'éditeur est intuitif et le résultat est professionnel.', author: 'Marie L.', role: 'Développeuse Full-Stack', avatar_initials: 'ML' },
    { quote: 'En tant que freelance, j\'avais besoin d\'un site rapidement. ASAP a rendu cela possible en une soirée seulement.', author: 'Thomas R.', role: 'Designer UX/UI', avatar_initials: 'TR' },
    { quote: 'Notre agence utilise ASAP pour créer des portfolios pour nos clients. Le gain de temps est considérable.', author: 'Kevin M.', role: 'Directeur d\'agence', avatar_initials: 'KM' },
  ];

  const displayTestimonials = testimonials.length > 0 ? testimonials : defaultTestimonials;

  return (
    <section id="testimonials" className="py-20 md:py-32 scroll-mt-16">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <Badge variant="outline" className="mb-4">{badgeText}</Badge>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">
            {headlineLine1}
            <span className="text-primary"> {headlineLine2}</span>
          </h2>
          {subheadline && (
            <p className="text-muted-foreground text-lg">{subheadline}</p>
          )}
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {displayTestimonials.map((testimonial, i) => (
            <Card key={i} className="relative">
              <CardContent className="pt-6">
                {/* Quote marks */}
                <div className="absolute top-4 left-4 text-6xl text-primary/10 font-serif leading-none">
                  "
                </div>
                <p className="relative z-10 text-muted-foreground italic mb-6">
                  "{testimonial.quote}"
                </p>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 flex items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm">
                    {testimonial.avatar_initials || testimonial.author.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{testimonial.author}</p>
                    <p className="text-sm text-muted-foreground">{testimonial.role}</p>
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
// CTA SaaS Renderer
// ============================================

export function CTASaaSRenderer({ section }: SectionRendererProps) {
  const headline = getData(section, 'headline', 'Prêt à commencer ?');
  const subheadlineLine1 = getData(section, 'subheadline_line1', '');
  const subheadlineLine2 = getData(section, 'subheadline_line2', '');
  const ctaPrimaryText = getData(section, 'cta_primary_text', 'Commencer gratuitement');
  const ctaPrimaryHref = getData(section, 'cta_primary_href', '/signup');
  const ctaPrimaryIcon = getData(section, 'cta_primary_icon', 'rocket');
  const ctaSecondaryText = getData(section, 'cta_secondary_text', '');
  const ctaSecondaryHref = getData(section, 'cta_secondary_href', '#pricing');
  const ctaSecondaryIcon = getData(section, 'cta_secondary_icon', 'chevron-right');

  const PrimaryIcon = ctaPrimaryIcon ? getIcon(ctaPrimaryIcon) : null;
  const SecondaryIcon = ctaSecondaryIcon ? getIcon(ctaSecondaryIcon) : null;

  return (
    <section className="py-20 md:py-32 bg-primary">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-primary-foreground mb-4">
          {headline}
        </h2>
        {(subheadlineLine1 || subheadlineLine2) && (
          <p className="text-lg md:text-xl text-primary-foreground/80 max-w-2xl mx-auto mb-8">
            {subheadlineLine1}
            {subheadlineLine2 && <span className="block">{subheadlineLine2}</span>}
          </p>
        )}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button 
            size="lg" 
            variant="secondary"
            className="w-full sm:w-auto text-base px-8" 
            href={ctaPrimaryHref}
          >
            {PrimaryIcon && <PrimaryIcon className="mr-2 h-4 w-4" />}
            {ctaPrimaryText}
          </Button>
          {ctaSecondaryText && (
            <Button 
              size="lg" 
              variant="outline" 
              className="w-full sm:w-auto text-base px-8 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10" 
              href={ctaSecondaryHref}
            >
              {ctaSecondaryText}
              {SecondaryIcon && <SecondaryIcon className="ml-2 h-4 w-4" />}
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}

// ============================================
// Footer SaaS Renderer
// ============================================

export function FooterSaaSRenderer({ section }: SectionRendererProps) {
  const showLogo = getData(section, 'show_logo', true);
  const logoIcon = getData(section, 'logo_icon', 'zap');
  const brandName = getData(section, 'brand_name', 'ASAP');
  const tagline = getData(section, 'tagline', '');
  const columns = getData(section, 'columns', []) as Array<{
    title: string;
    links: Array<{ label: string; href: string }>;
  }>;
  const showBadges = getData(section, 'show_badges', true);
  const badges = getData(section, 'badges', []) as Array<{ icon?: string; text: string }>;
  const copyright = getData(section, 'copyright', `© ${new Date().getFullYear()} ${brandName}. Tous droits réservés.`);
  const showSocialLinks = getData(section, 'show_social_links', true);
  const socialLinks = getData(section, 'social_links', []) as Array<{ platform: string; href: string }>;

  const LogoIcon = getIcon(logoIcon);
  const ShieldIcon = getIcon('shield');

  const socialIcons: Record<string, React.ReactNode> = {
    github: <Icons.github className="w-5 h-5" />,
    twitter: <Icons.twitter className="w-5 h-5" />,
  };

  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="container mx-auto px-4 py-12 md:py-16">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-5">
          {/* Brand Column */}
          <div className="lg:col-span-2">
            {showLogo && (
              <div className="flex items-center gap-2 mb-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                  <LogoIcon className="h-5 w-5 text-primary-foreground" />
                </div>
                <span className="text-xl font-bold">{brandName}</span>
              </div>
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
                    <Badge key={i} variant="outline" className="text-xs">
                      {BadgeIcon && <BadgeIcon className="mr-1 h-3 w-3" />}
                      {badge.text}
                    </Badge>
                  );
                })}
              </div>
            )}
          </div>

          {/* Link Columns */}
          {columns.map((column, i) => (
            <div key={i}>
              <h4 className="font-semibold mb-4">{column.title}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {column.links.map((link, j) => (
                  <li key={j}>
                    <a href={link.href} className="hover:text-foreground transition-colors">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>{copyright}</p>
          {showSocialLinks && socialLinks.length > 0 && (
            <div className="flex items-center gap-4">
              {socialLinks.map((social, i) => (
                <a key={i} href={social.href} className="hover:text-foreground transition-colors">
                  {socialIcons[social.platform] || social.platform}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </footer>
  );
}
