'use client';

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Separator } from '../ui/separator';
import {
  Zap,
  Globe,
  Cloud,
  Puzzle,
  BarChart3,
  Shield,
  Github,
  Sparkles,
  Check,
  ArrowRight,
  Play,
  Star,
  Users,
  Rocket,
  ChevronRight,
  Menu,
  X
} from 'lucide-react';

// Navigation component
function Navigation() {
  const { t } = useTranslation(['common']);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <nav className="container mx-auto flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold">ASAP</span>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            {t('landing.nav.features')}
          </a>
          <a href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            {t('landing.nav.pricing')}
          </a>
          <a href="#testimonials" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            {t('landing.nav.testimonials')}
          </a>
        </div>

        <div className="hidden md:flex items-center gap-4">
          <Button variant="ghost" asChild>
            <a href="/login">{t('landing.nav.login')}</a>
          </Button>
          <Button asChild>
            <a href="/signup">{t('landing.nav.startFree')}</a>
          </Button>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t bg-background p-4">
          <div className="flex flex-col gap-4">
            <a href="#features" className="text-sm font-medium">{t('landing.nav.features')}</a>
            <a href="#pricing" className="text-sm font-medium">{t('landing.nav.pricing')}</a>
            <a href="#testimonials" className="text-sm font-medium">{t('landing.nav.testimonials')}</a>
            <Separator />
            <Button variant="outline" asChild className="w-full">
              <a href="/login">{t('landing.nav.login')}</a>
            </Button>
            <Button asChild className="w-full">
              <a href="/signup">{t('landing.nav.startFree')}</a>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}

// Hero Section
function HeroSection() {
  const { t } = useTranslation(['common']);
  
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-background via-background to-muted/30">
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
            {t('landing.hero.badge')}
          </Badge>

          {/* Headline */}
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl mb-6">
            {t('landing.hero.titleLine1')}
            <span className="block text-primary mt-2">{t('landing.hero.titleLine2')}</span>
          </h1>

          {/* Subheadline */}
          <p className="mx-auto max-w-2xl text-lg md:text-xl text-muted-foreground mb-8">
            {t('landing.hero.subtitle')}
            <span className="font-semibold text-foreground"> {t('landing.hero.subtitleBold')}</span>
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Button size="lg" className="w-full sm:w-auto text-base px-8" asChild>
              <a href="/signup">
                {t('landing.hero.ctaStart')}
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
            <Button size="lg" variant="outline" className="w-full sm:w-auto text-base px-8" asChild>
              <a href="#demo">
                <Play className="mr-2 h-4 w-4" />
                {t('landing.hero.ctaDemo')}
              </a>
            </Button>
          </div>

          {/* Social Proof */}
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
              <span>{t('landing.hero.socialProofCreators')}</span>
            </div>
            <Separator orientation="vertical" className="hidden sm:block h-6" />
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              ))}
              <span className="ml-1">{t('landing.hero.socialProofRating')}</span>
            </div>
          </div>
        </div>

        {/* Dashboard Preview */}
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
                  app.asap.cool/dashboard
                </div>
              </div>
            </div>
            {/* Dashboard preview image placeholder */}
            <div className="aspect-[16/9] bg-gradient-to-br from-primary/5 via-background to-purple-500/5 flex items-center justify-center">
              <div className="text-center p-8">
                <div className="grid grid-cols-3 gap-4 mb-6">
                  {[
                    { icon: Globe, label: t('landing.hero.statSites'), value: '3' },
                    { icon: Cloud, label: t('landing.hero.statStorage'), value: '2.4 GB' },
                    { icon: Sparkles, label: t('landing.hero.statTokens'), value: '8,500' },
                  ].map((stat, i) => (
                    <div key={i} className="p-4 rounded-lg border bg-background/80 backdrop-blur">
                      <stat.icon className="h-6 w-6 text-primary mx-auto mb-2" />
                      <div className="text-2xl font-bold">{stat.value}</div>
                      <div className="text-xs text-muted-foreground">{stat.label}</div>
                    </div>
                  ))}
                </div>
                <p className="text-muted-foreground">{t('landing.hero.dashboardPreview')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Features Section
function FeaturesSection() {
  const { t } = useTranslation(['common']);
  
  const features = [
    {
      icon: Github,
      title: t('landing.features.github.title'),
      description: t('landing.features.github.description'),
      badge: t('landing.features.github.badge'),
    },
    {
      icon: Globe,
      title: t('landing.features.multiSites.title'),
      description: t('landing.features.multiSites.description'),
    },
    {
      icon: Cloud,
      title: t('landing.features.cloud.title'),
      description: t('landing.features.cloud.description'),
    },
    {
      icon: Sparkles,
      title: t('landing.features.ai.title'),
      description: t('landing.features.ai.description'),
      badge: t('landing.features.ai.badge'),
    },
    {
      icon: Puzzle,
      title: t('landing.features.extensions.title'),
      description: t('landing.features.extensions.description'),
    },
    {
      icon: BarChart3,
      title: t('landing.features.analytics.title'),
      description: t('landing.features.analytics.description'),
    },
  ];

  return (
    <section id="features" className="py-20 md:py-32 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <Badge variant="outline" className="mb-4">{t('landing.features.badge')}</Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl mb-4">
            {t('landing.features.titleLine1')}
            <span className="text-primary"> {t('landing.features.titleLine2')}</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            {t('landing.features.subtitle')}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => (
            <Card key={i} className="relative group hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
              {feature.badge && (
                <Badge className="absolute -top-2 -right-2" variant="default">
                  {feature.badge}
                </Badge>
              )}
              <CardHeader>
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-xl">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">
                  {feature.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

// How It Works Section
function HowItWorksSection() {
  const { t } = useTranslation(['common']);
  
  const steps = [
    {
      number: '01',
      title: t('landing.howItWorks.step1.title'),
      description: t('landing.howItWorks.step1.description'),
    },
    {
      number: '02',
      title: t('landing.howItWorks.step2.title'),
      description: t('landing.howItWorks.step2.description'),
    },
    {
      number: '03',
      title: t('landing.howItWorks.step3.title'),
      description: t('landing.howItWorks.step3.description'),
    },
    {
      number: '04',
      title: t('landing.howItWorks.step4.title'),
      description: t('landing.howItWorks.step4.description'),
    },
  ];

  return (
    <section id="demo" className="py-20 md:py-32">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <Badge variant="outline" className="mb-4">{t('landing.howItWorks.badge')}</Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl mb-4">
            {t('landing.howItWorks.titleLine1')} <span className="text-primary">{t('landing.howItWorks.titleLine2')}</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            {t('landing.howItWorks.subtitle')}
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
          {steps.map((step, i) => (
            <div key={i} className="relative">
              {/* Connector line */}
              {i < steps.length - 1 && (
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

// Pricing Section
function PricingSection() {
  const { t } = useTranslation(['common']);
  
  const plans = [
    {
      name: t('landing.pricing.free.name'),
      description: t('landing.pricing.free.description'),
      price: '0',
      period: t('landing.pricing.forever'),
      features: [
        t('landing.pricing.free.features.sites'),
        t('landing.pricing.free.features.storage'),
        t('landing.pricing.free.features.tokens'),
        t('landing.pricing.free.features.subdomain'),
        t('landing.pricing.free.features.analytics'),
        t('landing.pricing.free.features.support'),
      ],
      cta: t('landing.pricing.free.cta'),
      variant: 'outline' as const,
    },
    {
      name: t('landing.pricing.pro.name'),
      description: t('landing.pricing.pro.description'),
      price: '9',
      period: t('landing.pricing.perMonth'),
      popular: true,
      features: [
        t('landing.pricing.pro.features.sites'),
        t('landing.pricing.pro.features.storage'),
        t('landing.pricing.pro.features.tokens'),
        t('landing.pricing.pro.features.domains'),
        t('landing.pricing.pro.features.analytics'),
        t('landing.pricing.pro.features.themes'),
        t('landing.pricing.pro.features.support'),
        t('landing.pricing.pro.features.noAds'),
      ],
      cta: t('landing.pricing.pro.cta'),
      variant: 'default' as const,
    },
    {
      name: t('landing.pricing.team.name'),
      description: t('landing.pricing.team.description'),
      price: '29',
      period: t('landing.pricing.perMonth'),
      features: [
        t('landing.pricing.team.features.sites'),
        t('landing.pricing.team.features.storage'),
        t('landing.pricing.team.features.tokens'),
        t('landing.pricing.team.features.multiUsers'),
        t('landing.pricing.team.features.api'),
        t('landing.pricing.team.features.whiteLabel'),
        t('landing.pricing.team.features.accountManager'),
        t('landing.pricing.team.features.sla'),
      ],
      cta: t('landing.pricing.team.cta'),
      variant: 'outline' as const,
    },
  ];

  return (
    <section id="pricing" className="py-20 md:py-32 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <Badge variant="outline" className="mb-4">{t('landing.pricing.badge')}</Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl mb-4">
            {t('landing.pricing.titleLine1')}
            <span className="text-primary"> {t('landing.pricing.titleLine2')}</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            {t('landing.pricing.subtitle')}
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3 max-w-5xl mx-auto">
          {plans.map((plan, i) => (
            <Card
              key={i}
              className={`relative flex flex-col ${
                plan.popular
                  ? 'border-primary shadow-lg scale-105'
                  : ''
              }`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                  {t('landing.pricing.mostPopular')}
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
                <ul className="space-y-3">
                  {plan.features.map((feature, j) => (
                    <li key={j} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                <Button className="w-full" variant={plan.variant} asChild>
                  <a href="/signup">{plan.cta}</a>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

// Testimonials Section
function TestimonialsSection() {
  const { t } = useTranslation(['common']);
  
  const testimonials = [
    {
      quote: t('landing.testimonials.quote1.text'),
      author: t('landing.testimonials.quote1.author'),
      role: t('landing.testimonials.quote1.role'),
      avatar: 'ML',
    },
    {
      quote: t('landing.testimonials.quote2.text'),
      author: t('landing.testimonials.quote2.author'),
      role: t('landing.testimonials.quote2.role'),
      avatar: 'TR',
    },
    {
      quote: t('landing.testimonials.quote3.text'),
      author: t('landing.testimonials.quote3.author'),
      role: t('landing.testimonials.quote3.role'),
      avatar: 'KM',
    },
  ];

  return (
    <section id="testimonials" className="py-20 md:py-32">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <Badge variant="outline" className="mb-4">{t('landing.testimonials.badge')}</Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl mb-4">
            {t('landing.testimonials.titleLine1')}
            <span className="text-primary"> {t('landing.testimonials.titleLine2')}</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            {t('landing.testimonials.subtitle')}
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {testimonials.map((testimonial, i) => (
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
                    {testimonial.avatar}
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

// CTA Section
function CTASection() {
  const { t } = useTranslation(['common']);
  
  return (
    <section className="py-20 md:py-32 bg-primary text-primary-foreground">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl mb-6">
            {t('landing.cta.title')}
          </h2>
          <p className="text-lg opacity-90 mb-8">
            {t('landing.cta.subtitleLine1')}
            <br />
            {t('landing.cta.subtitleLine2')}
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" variant="secondary" className="text-base px-8" asChild>
              <a href="/signup">
                {t('landing.cta.startFree')}
                <Rocket className="ml-2 h-4 w-4" />
              </a>
            </Button>
            <Button size="lg" variant="outline" className="text-base px-8 bg-transparent border-primary-foreground/30 hover:bg-primary-foreground/10" asChild>
              <a href="#pricing">
                {t('landing.cta.seePricing')}
                <ChevronRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

// Footer
function Footer() {
  const { t } = useTranslation(['common']);
  
  return (
    <footer className="border-t bg-background py-12">
      <div className="container mx-auto px-4">
        <div className="grid gap-8 md:grid-cols-4">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <Zap className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">ASAP</span>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              {t('landing.footer.tagline')}
            </p>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                <Shield className="mr-1 h-3 w-3" />
                RGPD
              </Badge>
              <Badge variant="outline" className="text-xs">
                🇫🇷 {t('landing.footer.madeInFrance')}
              </Badge>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-4">{t('landing.footer.product')}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#features" className="hover:text-foreground transition-colors">{t('landing.nav.features')}</a></li>
              <li><a href="#pricing" className="hover:text-foreground transition-colors">{t('landing.nav.pricing')}</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">{t('landing.footer.documentation')}</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">{t('landing.footer.changelog')}</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">{t('landing.footer.company')}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground transition-colors">{t('landing.footer.about')}</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">{t('landing.footer.blog')}</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">{t('landing.footer.contact')}</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">{t('landing.footer.partners')}</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">{t('landing.footer.legal')}</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground transition-colors">{t('landing.footer.privacy')}</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">{t('landing.footer.terms')}</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">{t('landing.footer.legalNotice')}</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">{t('landing.footer.cookies')}</a></li>
            </ul>
          </div>
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>{t('landing.footer.copyright')}</p>
          <div className="flex items-center gap-4">
            <a href="https://github.com" className="hover:text-foreground transition-colors">
              <Github className="h-5 w-5" />
            </a>
            <a href="https://twitter.com" className="hover:text-foreground transition-colors">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}

// Main Landing Page Component
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main>
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <PricingSection />
        <TestimonialsSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
