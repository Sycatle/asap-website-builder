/**
 * SaaS Section Renderer Adapters
 * 
 * These adapters implement the section renderers using shared UI components.
 * They use getDefaultSettings from @asap/shared for consistent defaults.
 * 
 * Architecture:
 * - UI Components: imported from ./components/ui
 * - Icons: imported from ./components/icons (getIcon function)
 * - Default values: from @asap/shared/landing-saas-schema
 * - Data access: getData from ./utils
 */

import React, { useState } from 'react';
import type { SectionRendererProps } from './renderers';
import { getData, cn } from './utils';
import { 
  Button, 
  Badge, 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  Separator 
} from './components/ui';
import { Icons, getIcon } from './components/icons';
import { 
  HERO_SCHEMA,
  FEATURES_SCHEMA,
  HOW_IT_WORKS_SCHEMA,
  PRICING_SCHEMA,
  TESTIMONIALS_SCHEMA,
  CTA_SCHEMA,
  NAVIGATION_SCHEMA,
  FOOTER_SCHEMA,
} from '@asap/shared';

// ============================================
// Navigation SaaS Renderer
// ============================================

export function NavigationSaaSRenderer({ section }: SectionRendererProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const defaults = NAVIGATION_SCHEMA.defaultSettings;
  
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
            {mobileMenuOpen ? <Icons.x className="h-6 w-6" /> : <Icons.menu className="h-6 w-6" />}
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

export function HeroSaaSRenderer({ section }: SectionRendererProps) {
  const defaults = HERO_SCHEMA.defaultSettings;
  
  const showBadge = getData(section, 'show_badge', defaults.show_badge as boolean);
  const badgeIcon = getData(section, 'badge_icon', defaults.badge_icon as string);
  const badgeText = getData(section, 'badge_text', defaults.badge_text as string);
  const headlineLine1 = getData(section, 'headline_line1', defaults.headline_line1 as string);
  const headlineLine2 = getData(section, 'headline_line2', defaults.headline_line2 as string);
  const subheadline = getData(section, 'subheadline', defaults.subheadline as string);
  const subheadlineBold = getData(section, 'subheadline_bold', defaults.subheadline_bold as string);
  const ctaPrimaryText = getData(section, 'cta_primary_text', defaults.cta_primary_text as string);
  const ctaPrimaryHref = getData(section, 'cta_primary_href', defaults.cta_primary_href as string);
  const ctaPrimaryIcon = getData(section, 'cta_primary_icon', defaults.cta_primary_icon as string);
  const ctaSecondaryText = getData(section, 'cta_secondary_text', defaults.cta_secondary_text as string);
  const ctaSecondaryHref = getData(section, 'cta_secondary_href', defaults.cta_secondary_href as string);
  const ctaSecondaryIcon = getData(section, 'cta_secondary_icon', defaults.cta_secondary_icon as string);
  const showSocialProof = getData(section, 'show_social_proof', defaults.show_social_proof as boolean);
  const socialProofAvatarsCount = getData(section, 'social_proof_avatars_count', defaults.social_proof_avatars_count as number);
  const socialProofText = getData(section, 'social_proof_text', defaults.social_proof_text as string);
  const socialProofRating = getData(section, 'social_proof_rating', defaults.social_proof_rating as string);
  const backgroundDecorations = getData(section, 'background_decorations', defaults.background_decorations as boolean);
  const showDashboardPreview = getData(section, 'show_dashboard_preview', defaults.show_dashboard_preview as boolean);
  const dashboardUrl = getData(section, 'dashboard_url', defaults.dashboard_url as string);
  const dashboardStats = getData(section, 'dashboard_stats', defaults.dashboard_stats as Array<{ icon: string; value: string; label: string }>);

  const BadgeIcon = badgeIcon ? getIcon(badgeIcon) : null;
  const PrimaryIcon = ctaPrimaryIcon ? getIcon(ctaPrimaryIcon) : null;
  const SecondaryIcon = ctaSecondaryIcon ? getIcon(ctaSecondaryIcon) : null;

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
                      <Icons.star key={i} className="w-4 h-4 text-yellow-400" />
                    ))}
                  </div>
                  <span>{socialProofRating}</span>
                </div>
              )}
            </div>
          )}

          {/* Dashboard Preview */}
          {showDashboardPreview && (
            <div className="mt-16 mx-auto max-w-5xl">
              <div className="relative rounded-xl border border-border bg-card shadow-2xl overflow-hidden">
                {/* Browser chrome */}
                <div className="border-b border-border bg-muted/50 px-4 py-3 flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500" />
                    <div className="w-3 h-3 rounded-full bg-green-500" />
                  </div>
                  <div className="flex-1 flex justify-center">
                    <div className="flex items-center gap-2 rounded-md bg-background px-3 py-1 text-xs text-muted-foreground">
                      <Icons.shield className="h-3 w-3" />
                      {dashboardUrl}
                    </div>
                  </div>
                </div>
                {/* Dashboard content */}
                <div className="aspect-[16/9] bg-gradient-to-br from-primary/5 via-background to-purple-500/5 flex items-center justify-center">
                  <div className="text-center p-8">
                    <div className="grid grid-cols-3 gap-4 mb-6">
                      {dashboardStats.map((stat, i) => {
                        const StatIcon = getIcon(stat.icon);
                        return (
                          <div key={i} className="p-4 rounded-lg border bg-background/80 backdrop-blur">
                            <StatIcon className="h-6 w-6 text-primary mx-auto mb-2" />
                            <div className="text-2xl font-bold">{stat.value}</div>
                            <div className="text-xs text-muted-foreground">{stat.label}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
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
  const defaults = FEATURES_SCHEMA.defaultSettings;
  
  const badgeText = getData(section, 'badge_text', defaults.badge_text as string);
  const headlineLine1 = getData(section, 'headline_line1', defaults.headline_line1 as string);
  const headlineLine2 = getData(section, 'headline_line2', defaults.headline_line2 as string);
  const subheadline = getData(section, 'subheadline', defaults.subheadline as string);
  const features = getData(section, 'features', defaults.features as Array<{
    icon?: string;
    title: string;
    description: string;
    badge?: string;
  }>);
  const columns = getData<string>(section, 'columns', defaults.columns as string);
  const showBadges = getData(section, 'show_badges', defaults.show_badges as boolean);
  const showIcons = getData(section, 'show_icons', defaults.show_icons as boolean);
  const hoverEffect = getData(section, 'hover_effect', defaults.hover_effect as boolean);

  return (
    <section id="features" className="py-20 md:py-32 bg-muted/30 scroll-mt-16">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <Badge variant="outline" className="mb-4">
            {badgeText}
          </Badge>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">
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
          columns === '2' && 'md:grid-cols-2',
          columns === '3' && 'md:grid-cols-2 lg:grid-cols-3',
          columns === '4' && 'md:grid-cols-2 lg:grid-cols-4'
        )}>
          {features.map((feature, i) => {
            const FeatureIcon = feature.icon ? getIcon(feature.icon) : null;
            return (
              <Card key={i} className={cn(
                'relative overflow-hidden group',
                hoverEffect && 'transition-all duration-300 hover:shadow-lg hover:-translate-y-1'
              )}>
                {showBadges && feature.badge && (
                  <Badge className="absolute -top-2 -right-2 z-10" variant="default">
                    {feature.badge}
                  </Badge>
                )}
                <CardHeader>
                  {showIcons && FeatureIcon && (
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                      <FeatureIcon className="w-6 h-6 text-primary" />
                    </div>
                  )}
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-base">{feature.description}</CardDescription>
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
// How It Works SaaS Renderer
// ============================================

export function HowItWorksSaaSRenderer({ section }: SectionRendererProps) {
  const defaults = HOW_IT_WORKS_SCHEMA.defaultSettings;
  
  const badgeText = getData(section, 'badge_text', defaults.badge_text as string);
  const headlineLine1 = getData(section, 'headline_line1', defaults.headline_line1 as string);
  const headlineLine2 = getData(section, 'headline_line2', defaults.headline_line2 as string);
  const subheadline = getData(section, 'subheadline', defaults.subheadline as string);
  const steps = getData(section, 'steps', defaults.steps as Array<{
    number?: string;
    title: string;
    description: string;
  }>);
  const showNumbers = getData(section, 'show_numbers', defaults.show_numbers as boolean);
  const showConnectors = getData(section, 'show_connectors', defaults.show_connectors as boolean);

  return (
    <section id="how-it-works" className="py-20 md:py-32 scroll-mt-16">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <Badge variant="outline" className="mb-4">
            {badgeText}
          </Badge>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-4">
            {headlineLine1}
            <span className="text-primary"> {headlineLine2}</span>
          </h2>
          {subheadline && (
            <p className="text-lg text-muted-foreground">
              {subheadline}
            </p>
          )}
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, i) => (
            <div key={i} className="relative">
              {showConnectors && i < steps.length - 1 && (
                <div className="hidden lg:block absolute top-8 left-[60%] w-full h-0.5 bg-gradient-to-r from-primary/50 to-primary/10" />
              )}
              <div className="relative z-10 flex flex-col items-center text-center">
                {showNumbers && (
                  <div className="h-16 w-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mb-4">
                    {step.number || String(i + 1)}
                  </div>
                )}
                <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                <p className="text-muted-foreground text-base">{step.description}</p>
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
  const defaults = PRICING_SCHEMA.defaultSettings;
  
  const badgeText = getData(section, 'badge_text', defaults.badge_text as string);
  const headlineLine1 = getData(section, 'headline_line1', defaults.headline_line1 as string);
  const headlineLine2 = getData(section, 'headline_line2', defaults.headline_line2 as string);
  const subheadline = getData(section, 'subheadline', defaults.subheadline as string);
  const plans = getData(section, 'plans', defaults.plans as Array<{
    name: string;
    description?: string;
    price: string;
    period?: string;
    popular?: boolean;
    features?: string[];
    cta_text?: string;
    cta_variant?: string;
  }>);
  const popularBadgeText = getData(section, 'popular_badge_text', defaults.popular_badge_text as string);
  const currency = getData(section, 'currency', defaults.currency as string);

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
          {plans.map((plan, i) => (
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
                        <Icons.check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
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
  const defaults = TESTIMONIALS_SCHEMA.defaultSettings;
  
  const badgeText = getData(section, 'badge_text', defaults.badge_text as string);
  const headlineLine1 = getData(section, 'headline_line1', defaults.headline_line1 as string);
  const headlineLine2 = getData(section, 'headline_line2', defaults.headline_line2 as string);
  const subheadline = getData(section, 'subheadline', defaults.subheadline as string);
  const testimonials = getData(section, 'testimonials', defaults.testimonials as Array<{
    quote: string;
    author: string;
    role: string;
    avatar_initials?: string;
  }>);

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
          {testimonials.map((testimonial, i) => (
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
  const defaults = CTA_SCHEMA.defaultSettings;
  
  const headline = getData(section, 'headline', defaults.headline as string);
  const subheadlineLine1 = getData(section, 'subheadline_line1', defaults.subheadline_line1 as string);
  const subheadlineLine2 = getData(section, 'subheadline_line2', defaults.subheadline_line2 as string);
  const ctaPrimaryText = getData(section, 'cta_primary_text', defaults.cta_primary_text as string);
  const ctaPrimaryHref = getData(section, 'cta_primary_href', defaults.cta_primary_href as string);
  const ctaPrimaryIcon = getData(section, 'cta_primary_icon', defaults.cta_primary_icon as string);
  const ctaSecondaryText = getData(section, 'cta_secondary_text', defaults.cta_secondary_text as string);
  const ctaSecondaryHref = getData(section, 'cta_secondary_href', defaults.cta_secondary_href as string);
  const ctaSecondaryIcon = getData(section, 'cta_secondary_icon', defaults.cta_secondary_icon as string);

  const PrimaryIcon = ctaPrimaryIcon ? getIcon(ctaPrimaryIcon) : null;
  const SecondaryIcon = ctaSecondaryIcon ? getIcon(ctaSecondaryIcon) : null;

  return (
    <section id="cta" className="py-20 md:py-32 bg-primary scroll-mt-16">
      <div className="container mx-auto px-4 text-center">
        <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-primary-foreground mb-4">
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
  const defaults = FOOTER_SCHEMA.defaultSettings;
  
  const showLogo = getData(section, 'show_logo', defaults.show_logo as boolean);
  const logoIcon = getData(section, 'logo_icon', defaults.logo_icon as string);
  const brandName = getData(section, 'brand_name', defaults.brand_name as string);
  const tagline = getData(section, 'tagline', defaults.tagline as string);
  const columns = getData(section, 'columns', defaults.columns as Array<{
    title: string;
    links: Array<{ label: string; href: string }>;
  }>);
  const showBadges = getData(section, 'show_badges', defaults.show_badges as boolean);
  const badges = getData(section, 'badges', defaults.badges as Array<{ icon?: string; text: string }>);
  const copyright = getData(section, 'copyright', defaults.copyright as string);
  const showSocialLinks = getData(section, 'show_social_links', defaults.show_social_links as boolean);
  const socialLinks = getData(section, 'social_links', defaults.social_links as Array<{ platform: string; href: string }>);

  const LogoIcon = getIcon(logoIcon);

  const socialIcons: Record<string, React.ReactNode> = {
    github: <Icons.github className="w-5 h-5" />,
    twitter: <Icons.twitter className="w-5 h-5" />,
    linkedin: <Icons.linkedin className="w-5 h-5" />,
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
