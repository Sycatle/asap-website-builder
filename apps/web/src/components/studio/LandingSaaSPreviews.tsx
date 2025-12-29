/**
 * Landing SaaS Element Previews
 * 
 * WYSIWYG previews at 1:1 scale - exact same as LandingPage.tsx
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
} from 'lucide-react';

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

  return (
    <header 
      id="navigation"
      className="w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50"
    >
      <nav className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold">{brandName}</span>
        </div>

        <div className="hidden md:flex items-center gap-8">
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

        <div className="flex items-center gap-4">
          <Button variant="ghost">
            {loginText}
          </Button>
          <Button>
            {signupText}
          </Button>
        </div>
      </nav>
    </header>
  );
}

// ============================================
// Hero Preview
// ============================================

export function LandingHeroPreview({ element }: LandingPreviewProps) {
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
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 py-20 md:py-32">
        <div className="mx-auto max-w-4xl text-center">
          {/* Badge */}
          <Badge variant="secondary" className="mb-6 px-4 py-2">
            <Sparkles className="mr-2 h-3.5 w-3.5" />
            {badgeText}
          </Badge>

          {/* Headline */}
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl mb-6">
            {headline1}
            <span className="block text-primary mt-2">{headline2}</span>
          </h1>

          {/* Subheadline */}
          <p className="mx-auto max-w-2xl text-lg md:text-xl text-muted-foreground mb-8">
            {subheadline}
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Button size="lg" className="w-full sm:w-auto text-base px-8">
              {ctaPrimaryText}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="w-full sm:w-auto text-base px-8">
              <Play className="mr-2 h-4 w-4" />
              {ctaSecondaryText}
            </Button>
          </div>

          {/* Social Proof */}
          {showSocialProof && (
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="h-8 w-8 rounded-full border-2 border-background bg-gradient-to-br from-primary/60 to-purple-500/60"
                    />
                  ))}
                </div>
                <span>{socialProofText}</span>
              </div>
              <Separator orientation="vertical" className="hidden sm:block h-6" />
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                ))}
                <span className="ml-1">{socialProofRating}</span>
              </div>
            </div>
          )}
        </div>

        {/* Dashboard Preview */}
        {showDashboardPreview && (
          <div className="mt-16 mx-auto max-w-5xl">
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
                  <div className="grid grid-cols-3 gap-4 mb-6">
                    {[
                      { icon: Globe, label: 'Sites', value: '3' },
                      { icon: Cloud, label: 'Storage', value: '2.4 GB' },
                      { icon: Sparkles, label: 'Tokens', value: '8,500' },
                    ].map((stat, i) => (
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

  return (
    <section id="features" className="py-20 md:py-32 bg-muted/30 scroll-mt-16">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <Badge variant="outline" className="mb-4">{badgeText}</Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl mb-4">
            {headline1}
            <span className="text-primary"> {headline2}</span>
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {displayFeatures.slice(0, 6).map((feature, i) => {
            const Icon = iconMap[feature.icon] || Sparkles;
            return (
              <Card key={i} className="relative group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                {feature.badge && (
                  <Badge className="absolute -top-2 -right-2" variant="default">
                    {feature.badge}
                  </Badge>
                )}
                <CardHeader>
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
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
// How It Works Preview
// ============================================

export function HowItWorksPreview({ element }: LandingPreviewProps) {
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

  return (
    <section id="how-it-works" className="py-20 md:py-32 scroll-mt-16">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <Badge variant="outline" className="mb-4">{badgeText}</Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl mb-4">
            {headline1} <span className="text-primary">{headline2}</span>
          </h2>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {displaySteps.slice(0, 4).map((step, i) => (
            <div key={i} className="relative">
              {/* Connector line */}
              {i < displaySteps.length - 1 && (
                <div className="hidden lg:block absolute top-8 left-[60%] w-full h-0.5 bg-gradient-to-r from-primary/50 to-primary/10" />
              )}
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary text-primary-foreground text-2xl font-bold">
                  {step.number}
                </div>
                <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
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
// Pricing Preview
// ============================================

export function PricingPreview({ element }: LandingPreviewProps) {
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

  return (
    <section id="pricing" className="py-20 md:py-32 bg-muted/30 scroll-mt-16">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <Badge variant="outline" className="mb-4">{badgeText}</Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl mb-4">
            {headline1}
            <span className="text-primary"> {headline2}</span>
          </h2>
        </div>

        <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
          {displayPlans.slice(0, 3).map((plan, i) => (
            <Card
              key={i}
              className={`relative flex flex-col ${
                plan.popular ? 'border-primary shadow-lg scale-105' : ''
              }`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                  Populaire
                </Badge>
              )}
              <CardHeader className="text-center pb-2">
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <div className="text-center mb-6">
                  <span className="text-4xl font-bold">{plan.price}€</span>
                  <span className="text-muted-foreground"> {plan.period}</span>
                </div>
                {plan.features && (
                  <ul className="space-y-3">
                    {plan.features.map((feature, j) => (
                      <li key={j} className="flex items-start gap-2">
                        <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
              <CardFooter>
                <Button className="w-full" variant={plan.popular ? 'default' : 'outline'}>
                  Commencer
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

  return (
    <section id="testimonials" className="py-20 md:py-32 scroll-mt-16">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <Badge variant="outline" className="mb-4">{badgeText}</Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl mb-4">
            {headline1}
            <span className="text-primary"> {headline2}</span>
          </h2>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {displayTestimonials.slice(0, 3).map((testimonial, i) => (
            <Card key={i} className="relative">
              <CardContent className="pt-6">
                {/* Quote marks */}
                <div className="absolute top-4 left-4 text-6xl text-primary/10 font-serif leading-none">
                  "
                </div>
                <p className="relative z-10 text-muted-foreground mb-6 italic">
                  "{testimonial.quote}"
                </p>
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-semibold">
                    {testimonial.avatar || testimonial.author.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold">{testimonial.author}</div>
                    <div className="text-sm text-muted-foreground">{testimonial.role}</div>
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
  const settings = (element.settings || {}) as Record<string, unknown>;
  const headline = getString(settings, 'headline', 'Prêt à créer votre site ?');
  const subtitle1 = getString(settings, 'subtitle_line1', 'Rejoignez des milliers de créateurs.');
  const subtitle2 = getString(settings, 'subtitle_line2', 'C\'est gratuit pour commencer.');
  const ctaPrimaryText = getString(settings, 'cta_primary_text', 'Créer mon site gratuitement');
  const ctaSecondaryText = getString(settings, 'cta_secondary_text', 'Voir les tarifs');

  return (
    <section id="cta" className="py-20 md:py-32 bg-primary text-primary-foreground scroll-mt-16">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl mb-6">
            {headline}
          </h2>
          <p className="text-lg opacity-90 mb-8">
            {subtitle1}
            <br />
            {subtitle2}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" variant="secondary" className="text-base px-8">
              {ctaPrimaryText}
              <Rocket className="ml-2 h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" className="text-base px-8 bg-transparent border-primary-foreground/30 hover:bg-primary-foreground/10">
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
  const settings = (element.settings || {}) as Record<string, unknown>;
  const brandName = getString(settings, 'brand_name', 'ASAP');
  const tagline = getString(settings, 'tagline', 'Créez votre présence en ligne, rapidement.');
  const copyright = getString(settings, 'copyright', '© 2024 ASAP. Tous droits réservés.');

  return (
    <footer id="footer" className="border-t bg-background py-12">
      <div className="container mx-auto px-4">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Zap className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">{brandName}</span>
            </div>
            <p className="text-sm text-muted-foreground mb-4">{tagline}</p>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                <Shield className="mr-1 h-3 w-3" />
                RGPD
              </Badge>
              <Badge variant="outline" className="text-xs">
                🇫🇷 Made in France
              </Badge>
            </div>
          </div>

          {['Produit', 'Entreprise', 'Légal'].map((title, i) => (
            <div key={i}>
              <h4 className="font-semibold mb-4">{title}</h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {['Fonctionnalités', 'Tarifs', 'Documentation', 'Changelog'].slice(0, 4).map((link, j) => (
                  <li key={j} className="hover:text-foreground cursor-pointer transition-colors">{link}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>{copyright}</p>
          <div className="flex items-center gap-4">
            <Github className="h-5 w-5 hover:text-foreground cursor-pointer transition-colors" />
            <svg className="h-5 w-5 hover:text-foreground cursor-pointer transition-colors" fill="currentColor" viewBox="0 0 24 24">
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
