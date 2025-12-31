/**
 * Landing SaaS Element Previews
 * 
 * WYSIWYG previews at 1:1 scale - exact same as LandingPage.tsx
 * Now responsive to preview context (device simulation)
 */

"use client"

import * as React from 'react';
import type { WebsiteElement } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Zap,
  Globe,
  Cloud,
  Sparkles,
  Github,
  Puzzle,
  BarChart3,
  Shield,
  Star,
  ArrowRight,
  Play,
  Check,
  Rocket,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { usePreviewContext, getResponsiveClass } from "./PreviewContext";

// ============================================
// Types
// ============================================

export interface LandingPreviewProps {
  element: WebsiteElement;
  isSelected?: boolean;
}

// Type-safe data access helpers
function getString(data: Record<string, unknown> | undefined, key: string, fallback: string = ''): string {
  if (!data) return fallback;
  const value = data[key];
  return typeof value === 'string' ? value : fallback;
}

function getArray<T>(data: Record<string, unknown> | undefined, key: string): T[] {
  if (!data) return [];
  const value = data[key];
  return Array.isArray(value) ? value : [];
}

function getBoolean(data: Record<string, unknown> | undefined, key: string, fallback: boolean = false): boolean {
  if (!data) return fallback;
  const value = data[key];
  return typeof value === 'boolean' ? value : fallback;
}

// ============================================
// Smooth scroll helper for internal links
// ============================================

function handleInternalLink(e: React.MouseEvent<HTMLAnchorElement>, href: string) {
  // Only handle internal anchor links
  if (href.startsWith('#')) {
    e.preventDefault();
    const targetId = href.slice(1);
    const targetElement = document.getElementById(targetId);
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}

// ============================================
// Navigation Preview
// ============================================

export function NavigationPreview({ element }: LandingPreviewProps) {
  const { isMobile, isTablet, device } = usePreviewContext();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  
  const settings = (element.settings || {}) as Record<string, unknown>;
  const brandName = getString(settings, 'brand_name', 'ASAP');
  const navLinks = getArray<{label: string; href: string}>(settings, 'nav_links');
  const loginText = getString(settings, 'login_text', 'Connexion');
  const signupText = getString(settings, 'signup_text', 'Commencer gratuitement');

  const defaultLinks = [
    { label: 'Fonctionnalités', href: '#features' },
    { label: 'Tarifs', href: '#pricing' },
    { label: 'Témoignages', href: '#testimonials' },
  ];
  const displayLinks = navLinks.length > 0 ? navLinks : defaultLinks;
  
  // Show mobile nav on mobile/tablet preview
  const showMobileNav = isMobile || isTablet;

  return (
    <header 
      id="navigation"
      className="w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50"
    >
      <nav className={cn(
        "container mx-auto flex items-center justify-between",
        getResponsiveClass(device, {
          mobile: 'h-14 px-3',
          tablet: 'h-14 px-4',
          desktop: 'h-16 px-4',
        })
      )}>
        <div className="flex items-center gap-2">
          <div className={cn(
            "flex items-center justify-center rounded-lg bg-primary",
            getResponsiveClass(device, {
              mobile: 'h-7 w-7',
              desktop: 'h-8 w-8',
            })
          )}>
            <Zap className={cn(
              "text-primary-foreground",
              getResponsiveClass(device, {
                mobile: 'h-4 w-4',
                desktop: 'h-5 w-5',
              })
            )} />
          </div>
          <span className={cn(
            "font-bold",
            getResponsiveClass(device, {
              mobile: 'text-lg',
              desktop: 'text-xl',
            })
          )}>{brandName}</span>
        </div>

        {/* Desktop navigation */}
        {!showMobileNav && (
          <div className="flex items-center gap-8">
            {displayLinks.map((link, i) => (
              <a 
                key={i} 
                href={link.href}
                onClick={(e) => handleInternalLink(e, link.href)}
                className="text-sm font-medium text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>
        )}

        {/* Desktop buttons */}
        {!showMobileNav && (
          <div className="flex items-center gap-4">
            <Button variant="ghost">
              {loginText}
            </Button>
            <Button>
              {signupText}
            </Button>
          </div>
        )}
        
        {/* Mobile menu button */}
        {showMobileNav && (
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        )}
      </nav>
      
      {/* Mobile menu dropdown */}
      {showMobileNav && mobileMenuOpen && (
        <div className="absolute top-full left-0 right-0 bg-background border-b shadow-lg z-50">
          <div className="container mx-auto px-4 py-4 space-y-4">
            {displayLinks.map((link, i) => (
              <a 
                key={i} 
                href={link.href}
                onClick={(e) => {
                  handleInternalLink(e, link.href);
                  setMobileMenuOpen(false);
                }}
                className="block text-base font-medium text-muted-foreground hover:text-foreground py-2"
              >
                {link.label}
              </a>
            ))}
            <Separator />
            <div className="flex flex-col gap-2">
              <Button variant="outline" className="w-full">
                {loginText}
              </Button>
              <Button className="w-full">
                {signupText}
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}

// ============================================
// Hero Preview
// ============================================

export function LandingHeroPreview({ element }: LandingPreviewProps) {
  const { isMobile, isTablet, device } = usePreviewContext();
  
  const settings = (element.settings || {}) as Record<string, unknown>;
  const badgeText = getString(settings, 'badge_text', 'Nouvelle version disponible');
  const headline1 = getString(settings, 'headline_line1', 'Créez votre site web');
  const headline2 = getString(settings, 'headline_line2', 'en quelques minutes');
  const subheadline = getString(settings, 'subheadline', 'La plateforme tout-en-un pour créer, gérer et faire évoluer votre présence en ligne.');
  const ctaPrimaryText = getString(settings, 'cta_primary_text', 'Commencer gratuitement');
  const ctaSecondaryText = getString(settings, 'cta_secondary_text', 'Voir la démo');
  const showSocialProof = getBoolean(settings, 'show_social_proof', true);
  const socialProofText = getString(settings, 'social_proof_text', '+500 créateurs nous font confiance');
  const socialProofRating = getString(settings, 'social_proof_rating', '4.9/5 sur 200+ avis');
  const showDashboardPreview = getBoolean(settings, 'show_dashboard_preview', true);

  return (
    <section id="hero" className="relative overflow-hidden bg-gradient-to-b from-background via-background to-muted/30">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className={cn(
          "absolute top-0 left-1/4 bg-primary/5 rounded-full blur-3xl",
          getResponsiveClass(device, {
            mobile: 'w-48 h-48',
            tablet: 'w-64 h-64',
            desktop: 'w-96 h-96',
          })
        )} />
        <div className={cn(
          "absolute bottom-0 right-1/4 bg-purple-500/5 rounded-full blur-3xl",
          getResponsiveClass(device, {
            mobile: 'w-48 h-48',
            tablet: 'w-64 h-64',
            desktop: 'w-96 h-96',
          })
        )} />
      </div>

      <div className={cn(
        "container mx-auto",
        getResponsiveClass(device, {
          mobile: 'px-4 py-12',
          tablet: 'px-4 py-16',
          desktop: 'px-4 py-20 md:py-32',
        })
      )}>
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <Badge variant="secondary" className={cn(
            "mb-4",
            getResponsiveClass(device, {
              mobile: 'px-3 py-1.5 text-xs',
              desktop: 'mb-6 px-4 py-2',
            })
          )}>
            <Sparkles className={cn(
              "mr-2",
              getResponsiveClass(device, {
                mobile: 'h-3 w-3',
                desktop: 'h-3.5 w-3.5',
              })
            )} />
            {badgeText}
          </Badge>

          {/* Headline */}
          <h1 className={cn(
            "font-bold tracking-tight mb-4",
            getResponsiveClass(device, {
              mobile: 'text-2xl',
              tablet: 'text-3xl',
              desktop: 'text-4xl sm:text-5xl md:text-6xl lg:text-7xl mb-6',
            })
          )}>
            {headline1}
            <span className={cn(
              "block text-primary",
              getResponsiveClass(device, {
                mobile: 'mt-1',
                desktop: 'mt-2',
              })
            )}>{headline2}</span>
          </h1>

          {/* Subheadline */}
          <p className={cn(
            "mx-auto max-w-2xl text-muted-foreground mb-6",
            getResponsiveClass(device, {
              mobile: 'text-sm',
              tablet: 'text-base',
              desktop: 'text-lg md:text-xl mb-8',
            })
          )}>
            {subheadline}
          </p>

          {/* CTA Buttons */}
          <div className={cn(
            "flex items-center justify-center gap-3",
            getResponsiveClass(device, {
              mobile: 'flex-col mb-8',
              tablet: 'flex-col mb-10',
              desktop: 'flex-row gap-4 mb-12',
            })
          )}>
            <Button 
              size={isMobile ? "default" : "lg"} 
              className={cn(
                getResponsiveClass(device, {
                  mobile: 'w-full text-sm',
                  tablet: 'w-full text-base',
                  desktop: 'w-auto text-base px-8',
                })
              )}
            >
              {ctaPrimaryText}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button 
              size={isMobile ? "default" : "lg"} 
              variant="outline" 
              className={cn(
                getResponsiveClass(device, {
                  mobile: 'w-full text-sm',
                  tablet: 'w-full text-base',
                  desktop: 'w-auto text-base px-8',
                })
              )}
            >
              <Play className="mr-2 h-4 w-4" />
              {ctaSecondaryText}
            </Button>
          </div>

          {/* Social Proof */}
          {showSocialProof && (
            <div className={cn(
              "flex items-center justify-center text-sm text-muted-foreground",
              getResponsiveClass(device, {
                mobile: 'flex-col gap-3',
                tablet: 'flex-col gap-4',
                desktop: 'flex-row gap-6',
              })
            )}>
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4, 5].slice(0, isMobile ? 3 : 5).map((i) => (
                    <div
                      key={i}
                      className={cn(
                        "rounded-full border-2 border-background bg-gradient-to-br from-primary/60 to-purple-500/60",
                        getResponsiveClass(device, {
                          mobile: 'h-6 w-6',
                          desktop: 'h-8 w-8',
                        })
                      )}
                    />
                  ))}
                </div>
                <span className={isMobile ? 'text-xs' : 'text-sm'}>{socialProofText}</span>
              </div>
              {!isMobile && <Separator orientation="vertical" className="h-6" />}
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className={cn(
                    "fill-yellow-400 text-yellow-400",
                    getResponsiveClass(device, {
                      mobile: 'h-3 w-3',
                      desktop: 'h-4 w-4',
                    })
                  )} />
                ))}
                <span className={cn("ml-1", isMobile ? 'text-xs' : 'text-sm')}>{socialProofRating}</span>
              </div>
            </div>
          )}
        </div>

        {/* Dashboard Preview - hidden on mobile */}
        {showDashboardPreview && !isMobile && (
          <div className={cn(
            "mx-auto",
            getResponsiveClass(device, {
              tablet: 'mt-10 max-w-2xl',
              desktop: 'mt-16 max-w-5xl',
            })
          )}>
            <div className="relative rounded-xl border bg-background shadow-2xl overflow-hidden">
              {/* Browser chrome */}
              <div className="flex items-center gap-2 border-b bg-muted/50 px-4 py-3">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <div className="h-3 w-3 rounded-full bg-yellow-500" />
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="flex items-center gap-2 rounded-md bg-background px-3 py-1 text-xs text-muted-foreground">
                    <Shield className="h-3 w-3" />
                    app.asap.cool
                  </div>
                </div>
              </div>
              {/* Dashboard preview */}
              <div className="aspect-[16/9] bg-gradient-to-br from-primary/5 via-background to-purple-500/5 flex items-center justify-center">
                <div className="text-center p-8">
                  <div className={cn(
                    "grid gap-4 mb-6",
                    getResponsiveClass(device, {
                      tablet: 'grid-cols-2',
                      desktop: 'grid-cols-3',
                    })
                  )}>
                    {[
                      { icon: Globe, label: 'Sites', value: '3' },
                      { icon: Cloud, label: 'Storage', value: '2.4 GB' },
                      { icon: Sparkles, label: 'Tokens', value: '8,500' },
                    ].slice(0, isTablet ? 2 : 3).map((stat, i) => (
                      <div key={i} className="p-4 rounded-lg border bg-background/80 backdrop-blur">
                        <stat.icon className="h-6 w-6 text-primary mx-auto mb-2" />
                        <div className="text-2xl font-bold">{stat.value}</div>
                        <div className="text-xs text-muted-foreground">{stat.label}</div>
                      </div>
                    ))}
                  </div>
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
// Features Preview
// ============================================

export function FeaturesPreview({ element }: LandingPreviewProps) {
  const { isMobile, isTablet, device } = usePreviewContext();
  
  const settings = (element.settings || {}) as Record<string, unknown>;
  const badgeText = getString(settings, 'badge_text', 'Fonctionnalités');
  const headline1 = getString(settings, 'headline_line1', 'Tout ce dont vous avez besoin');
  const headline2 = getString(settings, 'headline_line2', 'pour réussir en ligne');
  const features = getArray<{icon: string; title: string; description: string; badge?: string}>(settings, 'features');

  const iconMap: Record<string, React.FC<{ className?: string }>> = {
    github: Github,
    globe: Globe,
    cloud: Cloud,
    sparkles: Sparkles,
    puzzle: Puzzle,
    'bar-chart-3': BarChart3,
  };

  const defaultFeatures = [
    { icon: 'github', title: 'Sync GitHub', description: 'Synchronisez automatiquement vos projets GitHub', badge: 'Populaire' },
    { icon: 'globe', title: 'Multi-sites', description: 'Gérez plusieurs sites depuis un seul tableau de bord' },
    { icon: 'cloud', title: 'Hébergement inclus', description: 'Hébergement cloud rapide et sécurisé inclus' },
    { icon: 'sparkles', title: 'Assistant IA', description: 'Générez du contenu avec l\'intelligence artificielle', badge: 'Nouveau' },
    { icon: 'puzzle', title: 'Extensions', description: 'Étendez les fonctionnalités avec notre marketplace' },
    { icon: 'bar-chart-3', title: 'Analytics', description: 'Suivez vos performances avec des statistiques détaillées' },
  ];

  const displayFeatures = features.length > 0 ? features : defaultFeatures;
  // Limit features based on device
  const visibleFeatures = isMobile ? displayFeatures.slice(0, 4) : displayFeatures.slice(0, 6);

  return (
    <section id="features" className={cn(
      "bg-muted/30 scroll-mt-16",
      getResponsiveClass(device, {
        mobile: 'py-12',
        tablet: 'py-16',
        desktop: 'py-20 md:py-32',
      })
    )}>
      <div className={cn(
        "container mx-auto",
        getResponsiveClass(device, {
          mobile: 'px-4',
          desktop: 'px-4',
        })
      )}>
        <div className={cn(
          "mx-auto max-w-2xl text-center",
          getResponsiveClass(device, {
            mobile: 'mb-8',
            tablet: 'mb-12',
            desktop: 'mb-16',
          })
        )}>
          <Badge variant="outline" className="mb-4">{badgeText}</Badge>
          <h2 className={cn(
            "font-bold tracking-tight mb-4",
            getResponsiveClass(device, {
              mobile: 'text-2xl',
              tablet: 'text-3xl',
              desktop: 'text-3xl sm:text-4xl md:text-5xl',
            })
          )}>
            {headline1}
            <span className="text-primary"> {headline2}</span>
          </h2>
        </div>

        <div className={cn(
          "grid gap-4",
          getResponsiveClass(device, {
            mobile: 'grid-cols-1',
            tablet: 'grid-cols-2 gap-6',
            desktop: 'md:grid-cols-2 lg:grid-cols-3 gap-6',
          })
        )}>
          {visibleFeatures.map((feature, i) => {
            const Icon = iconMap[feature.icon] || Sparkles;
            return (
              <Card key={i} className="relative group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                {feature.badge && (
                  <Badge className="absolute -top-2 -right-2" variant="default">
                    {feature.badge}
                  </Badge>
                )}
                <CardHeader className={isMobile ? 'p-4' : undefined}>
                  <div className={cn(
                    "mb-3 flex items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors",
                    getResponsiveClass(device, {
                      mobile: 'h-10 w-10',
                      desktop: 'mb-4 h-12 w-12',
                    })
                  )}>
                    <Icon className={cn(
                      "text-primary",
                      getResponsiveClass(device, {
                        mobile: 'h-5 w-5',
                        desktop: 'h-6 w-6',
                      })
                    )} />
                  </div>
                  <CardTitle className={cn(
                    getResponsiveClass(device, {
                      mobile: 'text-lg',
                      desktop: 'text-xl',
                    })
                  )}>{feature.title}</CardTitle>
                </CardHeader>
                <CardContent className={isMobile ? 'p-4 pt-0' : undefined}>
                  <CardDescription className={cn(
                    getResponsiveClass(device, {
                      mobile: 'text-sm',
                      desktop: 'text-base',
                    })
                  )}>
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
// How It Works Preview
// ============================================

export function HowItWorksPreview({ element }: LandingPreviewProps) {
  const { isMobile, isTablet, device } = usePreviewContext();
  
  const settings = (element.settings || {}) as Record<string, unknown>;
  const badgeText = getString(settings, 'badge_text', 'Simple comme bonjour');
  const headline1 = getString(settings, 'headline_line1', 'Lancez-vous');
  const headline2 = getString(settings, 'headline_line2', 'en 4 étapes');
  const steps = getArray<{number: string; title: string; description: string}>(settings, 'steps');

  const defaultSteps = [
    { number: '01', title: 'Créez votre compte', description: 'Inscription gratuite en 30 secondes' },
    { number: '02', title: 'Choisissez un template', description: 'Sélectionnez parmi nos modèles professionnels' },
    { number: '03', title: 'Ajoutez votre contenu', description: 'Personnalisez selon vos besoins' },
    { number: '04', title: 'Publiez en un clic', description: 'Votre site est en ligne instantanément' },
  ];

  const displaySteps = steps.length > 0 ? steps : defaultSteps;
  const visibleSteps = isMobile ? displaySteps.slice(0, 4) : displaySteps.slice(0, 4);

  return (
    <section id="how-it-works" className={cn(
      "scroll-mt-16",
      getResponsiveClass(device, {
        mobile: 'py-12',
        tablet: 'py-16',
        desktop: 'py-20 md:py-32',
      })
    )}>
      <div className="container mx-auto px-4">
        <div className={cn(
          "mx-auto max-w-2xl text-center",
          getResponsiveClass(device, {
            mobile: 'mb-8',
            tablet: 'mb-12',
            desktop: 'mb-16',
          })
        )}>
          <Badge variant="outline" className="mb-4">{badgeText}</Badge>
          <h2 className={cn(
            "font-bold tracking-tight mb-4",
            getResponsiveClass(device, {
              mobile: 'text-2xl',
              tablet: 'text-3xl',
              desktop: 'text-3xl sm:text-4xl md:text-5xl',
            })
          )}>
            {headline1} <span className="text-primary">{headline2}</span>
          </h2>
        </div>

        <div className={cn(
          "grid gap-6",
          getResponsiveClass(device, {
            mobile: 'grid-cols-2 gap-4',
            tablet: 'grid-cols-2 gap-8',
            desktop: 'md:grid-cols-2 lg:grid-cols-4 gap-8',
          })
        )}>
          {visibleSteps.map((step, i) => (
            <div key={i} className="relative">
              {/* Connector line - desktop only */}
              {!isMobile && !isTablet && i < displaySteps.length - 1 && (
                <div className="hidden lg:block absolute top-8 left-[60%] w-full h-0.5 bg-gradient-to-r from-primary/50 to-primary/10" />
              )}
              <div className={cn(
                "relative z-10 flex flex-col items-center text-center",
                getResponsiveClass(device, {
                  mobile: 'gap-2',
                  desktop: '',
                })
              )}>
                <div className={cn(
                  "flex items-center justify-center rounded-full bg-primary text-primary-foreground font-bold",
                  getResponsiveClass(device, {
                    mobile: 'h-12 w-12 text-lg mb-2',
                    tablet: 'h-14 w-14 text-xl mb-3',
                    desktop: 'mb-4 h-16 w-16 text-2xl',
                  })
                )}>
                  {step.number}
                </div>
                <h3 className={cn(
                  "font-semibold",
                  getResponsiveClass(device, {
                    mobile: 'text-sm mb-1',
                    tablet: 'text-base mb-2',
                    desktop: 'text-lg mb-2',
                  })
                )}>{step.title}</h3>
                <p className={cn(
                  "text-muted-foreground",
                  getResponsiveClass(device, {
                    mobile: 'text-xs',
                    tablet: 'text-sm',
                    desktop: 'text-base',
                  })
                )}>{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================
// Pricing Preview
// ============================================

export function PricingPreview({ element }: LandingPreviewProps) {
  const { isMobile, isTablet, device } = usePreviewContext();
  
  const settings = (element.settings || {}) as Record<string, unknown>;
  const badgeText = getString(settings, 'badge_text', 'Tarifs');
  const headline1 = getString(settings, 'headline_line1', 'Des prix simples');
  const headline2 = getString(settings, 'headline_line2', 'et transparents');
  const plans = getArray<{name: string; description?: string; price: string; period?: string; popular?: boolean; features?: string[]}>(settings, 'plans');

  const defaultPlans = [
    { name: 'Gratuit', description: 'Pour démarrer', price: '0', period: 'Toujours gratuit', features: ['1 site web', '500 Mo de stockage', '1000 tokens IA', 'Sous-domaine asap.cool'] },
    { name: 'Pro', description: 'Pour les créateurs', price: '9', period: '/mois', popular: true, features: ['5 sites web', '10 Go de stockage', '10 000 tokens IA', 'Domaines personnalisés', 'Analytics avancés'] },
    { name: 'Team', description: 'Pour les équipes', price: '29', period: '/mois', features: ['Sites illimités', '100 Go de stockage', 'Tokens illimités', 'Multi-utilisateurs', 'API access'] },
  ];

  const displayPlans = plans.length > 0 ? plans : defaultPlans;
  // On mobile, show only 2 plans (free + popular or first 2)
  const visiblePlans = isMobile 
    ? displayPlans.filter(p => p.popular || p.price === '0').slice(0, 2)
    : displayPlans.slice(0, 3);

  return (
    <section id="pricing" className={cn(
      "bg-muted/30 scroll-mt-16",
      getResponsiveClass(device, {
        mobile: 'py-12',
        tablet: 'py-16',
        desktop: 'py-20 md:py-32',
      })
    )}>
      <div className="container mx-auto px-4">
        <div className={cn(
          "mx-auto max-w-2xl text-center",
          getResponsiveClass(device, {
            mobile: 'mb-8',
            tablet: 'mb-12',
            desktop: 'mb-16',
          })
        )}>
          <Badge variant="outline" className="mb-4">{badgeText}</Badge>
          <h2 className={cn(
            "font-bold tracking-tight mb-4",
            getResponsiveClass(device, {
              mobile: 'text-2xl',
              tablet: 'text-3xl',
              desktop: 'text-3xl sm:text-4xl md:text-5xl',
            })
          )}>
            {headline1}
            <span className="text-primary"> {headline2}</span>
          </h2>
        </div>

        <div className={cn(
          "grid max-w-5xl mx-auto",
          getResponsiveClass(device, {
            mobile: 'grid-cols-1 gap-4',
            tablet: 'grid-cols-2 gap-6',
            desktop: 'md:grid-cols-3 gap-8',
          })
        )}>
          {visiblePlans.map((plan, i) => (
            <Card
              key={i}
              className={cn(
                "relative flex flex-col",
                plan.popular && !isMobile && 'border-primary shadow-lg scale-105',
                plan.popular && isMobile && 'border-primary shadow-lg',
              )}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                  Populaire
                </Badge>
              )}
              <CardHeader className={cn(
                "text-center pb-2",
                isMobile && 'p-4'
              )}>
                <CardTitle className={cn(
                  getResponsiveClass(device, {
                    mobile: 'text-lg',
                    desktop: 'text-xl',
                  })
                )}>{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className={cn(
                "flex-1",
                isMobile && 'p-4 pt-0'
              )}>
                <div className="text-center mb-4">
                  <span className={cn(
                    "font-bold",
                    getResponsiveClass(device, {
                      mobile: 'text-3xl',
                      desktop: 'text-4xl',
                    })
                  )}>{plan.price}€</span>
                  <span className="text-muted-foreground"> {plan.period}</span>
                </div>
                {plan.features && (
                  <ul className={cn(
                    "space-y-2",
                    getResponsiveClass(device, {
                      mobile: 'space-y-1.5',
                      desktop: 'space-y-3',
                    })
                  )}>
                    {plan.features.slice(0, isMobile ? 3 : 5).map((feature, j) => (
                      <li key={j} className="flex items-start gap-2">
                        <Check className={cn(
                          "text-primary shrink-0 mt-0.5",
                          getResponsiveClass(device, {
                            mobile: 'h-4 w-4',
                            desktop: 'h-5 w-5',
                          })
                        )} />
                        <span className={cn(
                          getResponsiveClass(device, {
                            mobile: 'text-xs',
                            desktop: 'text-sm',
                          })
                        )}>{feature}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
              <CardFooter className={isMobile ? 'p-4 pt-0' : undefined}>
                <Button 
                  className="w-full" 
                  variant={plan.popular ? 'default' : 'outline'}
                  size={isMobile ? 'sm' : 'default'}
                >
                  {(plan as Record<string, unknown>).cta_text as string || 'Commencer'}
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
// Testimonials Preview
// ============================================

export function TestimonialsPreview({ element }: LandingPreviewProps) {
  const { isMobile, isTablet, device } = usePreviewContext();
  
  const settings = (element.settings || {}) as Record<string, unknown>;
  const badgeText = getString(settings, 'badge_text', 'Témoignages');
  const headline1 = getString(settings, 'headline_line1', 'Ils nous font');
  const headline2 = getString(settings, 'headline_line2', 'confiance');
  const testimonials = getArray<{quote: string; author: string; role: string; avatar?: string}>(settings, 'testimonials');

  const defaultTestimonials = [
    { quote: 'ASAP a complètement transformé ma façon de présenter mes projets. L\'éditeur est intuitif et le résultat est professionnel.', author: 'Marie L.', role: 'Développeuse Full-Stack', avatar: 'ML' },
    { quote: 'En tant que freelance, j\'avais besoin d\'un site rapidement. ASAP a rendu cela possible en une soirée seulement.', author: 'Thomas R.', role: 'Designer UX/UI', avatar: 'TR' },
    { quote: 'Notre agence utilise ASAP pour créer des portfolios pour nos clients. Le gain de temps est considérable.', author: 'Kevin M.', role: 'Directeur d\'agence', avatar: 'KM' },
  ];

  const displayTestimonials = testimonials.length > 0 ? testimonials : defaultTestimonials;
  // On mobile, show only 1-2 testimonials
  const visibleTestimonials = isMobile 
    ? displayTestimonials.slice(0, 1) 
    : isTablet 
      ? displayTestimonials.slice(0, 2)
      : displayTestimonials.slice(0, 3);

  return (
    <section id="testimonials" className={cn(
      "scroll-mt-16",
      getResponsiveClass(device, {
        mobile: 'py-12',
        tablet: 'py-16',
        desktop: 'py-20 md:py-32',
      })
    )}>
      <div className="container mx-auto px-4">
        <div className={cn(
          "mx-auto max-w-2xl text-center",
          getResponsiveClass(device, {
            mobile: 'mb-6',
            tablet: 'mb-10',
            desktop: 'mb-16',
          })
        )}>
          <Badge variant="outline" className="mb-4">{badgeText}</Badge>
          <h2 className={cn(
            "font-bold tracking-tight mb-4",
            getResponsiveClass(device, {
              mobile: 'text-2xl',
              tablet: 'text-3xl',
              desktop: 'text-3xl sm:text-4xl md:text-5xl',
            })
          )}>
            {headline1}
            <span className="text-primary"> {headline2}</span>
          </h2>
        </div>

        <div className={cn(
          "grid",
          getResponsiveClass(device, {
            mobile: 'grid-cols-1 gap-4',
            tablet: 'grid-cols-2 gap-6',
            desktop: 'md:grid-cols-3 gap-8',
          })
        )}>
          {visibleTestimonials.map((testimonial, i) => (
            <Card key={i} className="relative">
              <CardContent className={cn(
                getResponsiveClass(device, {
                  mobile: 'p-4 pt-5',
                  desktop: 'pt-6',
                })
              )}>
                {/* Quote marks */}
                <div className={cn(
                  "absolute left-4 text-primary/10 font-serif leading-none",
                  getResponsiveClass(device, {
                    mobile: 'top-3 text-4xl',
                    desktop: 'top-4 text-6xl',
                  })
                )}>
                  "
                </div>
                <p className={cn(
                  "relative z-10 text-muted-foreground italic",
                  getResponsiveClass(device, {
                    mobile: 'text-sm mb-4',
                    desktop: 'mb-6',
                  })
                )}>
                  "{isMobile && testimonial.quote.length > 100 
                    ? testimonial.quote.slice(0, 100) + '...' 
                    : testimonial.quote}"
                </p>
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "flex items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold",
                    getResponsiveClass(device, {
                      mobile: 'h-8 w-8 text-xs',
                      desktop: 'h-10 w-10 text-sm',
                    })
                  )}>
                    {testimonial.avatar || testimonial.author.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className={cn(
                      "font-semibold",
                      getResponsiveClass(device, {
                        mobile: 'text-sm',
                        desktop: '',
                      })
                    )}>{testimonial.author}</div>
                    <div className={cn(
                      "text-muted-foreground",
                      getResponsiveClass(device, {
                        mobile: 'text-xs',
                        desktop: 'text-sm',
                      })
                    )}>{testimonial.role}</div>
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
// CTA Preview
// ============================================

export function CTAPreview({ element }: LandingPreviewProps) {
  const { isMobile, device } = usePreviewContext();
  
  const settings = (element.settings || {}) as Record<string, unknown>;
  const headline = getString(settings, 'headline', 'Prêt à créer votre site ?');
  const subheadlineLine1 = getString(settings, 'subheadline_line1', 'Rejoignez des milliers de créateurs.');
  const subheadlineLine2 = getString(settings, 'subheadline_line2', 'C\'est gratuit pour commencer.');
  const ctaPrimaryText = getString(settings, 'cta_primary_text', 'Créer mon site gratuitement');
  const ctaSecondaryText = getString(settings, 'cta_secondary_text', 'Voir les tarifs');

  return (
    <section id="cta" className={cn(
      "bg-primary text-primary-foreground scroll-mt-16",
      getResponsiveClass(device, {
        mobile: 'py-12',
        tablet: 'py-16',
        desktop: 'py-20 md:py-32',
      })
    )}>
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className={cn(
            "font-bold tracking-tight mb-4",
            getResponsiveClass(device, {
              mobile: 'text-2xl',
              tablet: 'text-3xl',
              desktop: 'text-3xl sm:text-4xl md:text-5xl mb-6',
            })
          )}>
            {headline}
          </h2>
          <p className={cn(
            "opacity-90",
            getResponsiveClass(device, {
              mobile: 'text-sm mb-6',
              tablet: 'text-base mb-6',
              desktop: 'text-lg mb-8',
            })
          )}>
            {subheadlineLine1}
            {!isMobile && <br />}
            {isMobile && ' '}
            {subheadlineLine2}
          </p>
          <div className={cn(
            "flex items-center justify-center gap-3",
            getResponsiveClass(device, {
              mobile: 'flex-col',
              tablet: 'flex-col',
              desktop: 'flex-row gap-4',
            })
          )}>
            <Button 
              size={isMobile ? "default" : "lg"} 
              variant="secondary" 
              className={cn(
                getResponsiveClass(device, {
                  mobile: 'w-full text-sm',
                  tablet: 'w-full text-base',
                  desktop: 'text-base px-8',
                })
              )}
            >
              {ctaPrimaryText}
              <Rocket className="ml-2 h-4 w-4" />
            </Button>
            <Button 
              size={isMobile ? "default" : "lg"} 
              variant="outline" 
              className={cn(
                "bg-transparent border-primary-foreground/30 hover:bg-primary-foreground/10",
                getResponsiveClass(device, {
                  mobile: 'w-full text-sm',
                  tablet: 'w-full text-base',
                  desktop: 'text-base px-8',
                })
              )}
            >
              {ctaSecondaryText}
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================
// Footer Preview
// ============================================

export function FooterPreview({ element }: LandingPreviewProps) {
  const { isMobile, isTablet, device } = usePreviewContext();
  
  const settings = (element.settings || {}) as Record<string, unknown>;
  const brandName = getString(settings, 'brand_name', 'ASAP');
  const tagline = getString(settings, 'tagline', 'Créez votre présence en ligne, rapidement.');
  const copyright = getString(settings, 'copyright', '© 2024 ASAP. Tous droits réservés.');

  const footerColumns = ['Produit', 'Entreprise', 'Légal'];
  const footerLinks = ['Fonctionnalités', 'Tarifs', 'Documentation', 'Changelog'];

  return (
    <footer id="footer" className={cn(
      "border-t bg-background",
      getResponsiveClass(device, {
        mobile: 'py-8',
        tablet: 'py-10',
        desktop: 'py-12',
      })
    )}>
      <div className="container mx-auto px-4">
        <div className={cn(
          "grid gap-8",
          getResponsiveClass(device, {
            mobile: 'grid-cols-1',
            tablet: 'grid-cols-2',
            desktop: 'md:grid-cols-4',
          })
        )}>
          {/* Brand column */}
          <div className={isMobile ? 'text-center' : ''}>
            <div className={cn(
              "flex items-center gap-2 mb-4",
              isMobile && 'justify-center'
            )}>
              <div className={cn(
                "flex items-center justify-center rounded-lg bg-primary",
                getResponsiveClass(device, {
                  mobile: 'h-7 w-7',
                  desktop: 'h-8 w-8',
                })
              )}>
                <Zap className={cn(
                  "text-primary-foreground",
                  getResponsiveClass(device, {
                    mobile: 'h-4 w-4',
                    desktop: 'h-5 w-5',
                  })
                )} />
              </div>
              <span className={cn(
                "font-bold",
                getResponsiveClass(device, {
                  mobile: 'text-lg',
                  desktop: 'text-xl',
                })
              )}>{brandName}</span>
            </div>
            <p className={cn(
              "text-muted-foreground mb-4",
              getResponsiveClass(device, {
                mobile: 'text-xs',
                desktop: 'text-sm',
              })
            )}>{tagline}</p>
            <div className={cn(
              "flex items-center gap-2",
              isMobile && 'justify-center'
            )}>
              <Badge variant="outline" className="text-xs">
                <Shield className="mr-1 h-3 w-3" />
                RGPD
              </Badge>
              <Badge variant="outline" className="text-xs">
                🇫🇷 Made in France
              </Badge>
            </div>
          </div>

          {/* Link columns - only on tablet/desktop */}
          {!isMobile && footerColumns.map((title, i) => (
            <div key={i}>
              <h4 className={cn(
                "font-semibold",
                getResponsiveClass(device, {
                  tablet: 'text-sm mb-3',
                  desktop: 'mb-4',
                })
              )}>{title}</h4>
              <ul className={cn(
                "text-muted-foreground",
                getResponsiveClass(device, {
                  tablet: 'space-y-1.5 text-xs',
                  desktop: 'space-y-2 text-sm',
                })
              )}>
                {footerLinks.slice(0, isTablet ? 3 : 4).map((link, j) => (
                  <li key={j} className="hover:text-foreground cursor-pointer transition-colors">{link}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Separator className={cn(
          "my-6",
          getResponsiveClass(device, {
            mobile: 'my-4',
            desktop: 'my-8',
          })
        )} />

        <div className={cn(
          "flex items-center gap-4 text-muted-foreground",
          getResponsiveClass(device, {
            mobile: 'flex-col text-center text-xs',
            tablet: 'flex-row justify-between text-sm',
            desktop: 'flex-row justify-between text-sm',
          })
        )}>
          <p>{copyright}</p>
          <div className="flex items-center gap-4">
            <Github className={cn(
              "hover:text-foreground cursor-pointer transition-colors",
              getResponsiveClass(device, {
                mobile: 'h-4 w-4',
                desktop: 'h-5 w-5',
              })
            )} />
            <svg className={cn(
              "hover:text-foreground cursor-pointer transition-colors",
              getResponsiveClass(device, {
                mobile: 'h-4 w-4',
                desktop: 'h-5 w-5',
              })
            )} fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ============================================
// Export all previews
// ============================================

export {
  NavigationPreview as LandingNavigationPreview,
  FeaturesPreview as LandingFeaturesPreview,
  HowItWorksPreview as LandingHowItWorksPreview,
  PricingPreview as LandingPricingPreview,
  TestimonialsPreview as LandingTestimonialsPreview,
  CTAPreview as LandingCTAPreview,
  FooterPreview as LandingFooterPreview,
};
