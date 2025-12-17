'use client';

import { useState } from 'react';
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
            Fonctionnalités
          </a>
          <a href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Tarifs
          </a>
          <a href="#testimonials" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
            Témoignages
          </a>
        </div>

        <div className="hidden md:flex items-center gap-4">
          <Button variant="ghost" asChild>
            <a href="/login">Se connecter</a>
          </Button>
          <Button asChild>
            <a href="/signup">Commencer gratuitement</a>
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
            <a href="#features" className="text-sm font-medium">Fonctionnalités</a>
            <a href="#pricing" className="text-sm font-medium">Tarifs</a>
            <a href="#testimonials" className="text-sm font-medium">Témoignages</a>
            <Separator />
            <Button variant="outline" asChild className="w-full">
              <a href="/login">Se connecter</a>
            </Button>
            <Button asChild className="w-full">
              <a href="/signup">Commencer gratuitement</a>
            </Button>
          </div>
        </div>
      )}
    </header>
  );
}

// Hero Section
function HeroSection() {
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
            Nouveau : Génération IA de portfolio
          </Badge>

          {/* Headline */}
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl mb-6">
            Votre site professionnel
            <span className="block text-primary mt-2">en 5 minutes chrono</span>
          </h1>

          {/* Subheadline */}
          <p className="mx-auto max-w-2xl text-lg md:text-xl text-muted-foreground mb-8">
            Importez vos projets GitHub, personnalisez votre présentation, publiez.
            <span className="font-semibold text-foreground"> Remplacez 10 outils par un seul dashboard.</span>
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <Button size="lg" className="w-full sm:w-auto text-base px-8" asChild>
              <a href="/signup">
                Commencer gratuitement
                <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
            <Button size="lg" variant="outline" className="w-full sm:w-auto text-base px-8" asChild>
              <a href="#demo">
                <Play className="mr-2 h-4 w-4" />
                Voir la démo
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
              <span>+500 créateurs</span>
            </div>
            <Separator orientation="vertical" className="hidden sm:block h-6" />
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((i) => (
                <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              ))}
              <span className="ml-1">4.9/5 de satisfaction</span>
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
                    { icon: Globe, label: 'Sites', value: '3' },
                    { icon: Cloud, label: 'Stockage', value: '2.4 GB' },
                    { icon: Sparkles, label: 'Tokens IA', value: '8,500' },
                  ].map((stat, i) => (
                    <div key={i} className="p-4 rounded-lg border bg-background/80 backdrop-blur">
                      <stat.icon className="h-6 w-6 text-primary mx-auto mb-2" />
                      <div className="text-2xl font-bold">{stat.value}</div>
                      <div className="text-xs text-muted-foreground">{stat.label}</div>
                    </div>
                  ))}
                </div>
                <p className="text-muted-foreground">Aperçu de votre dashboard centralisé</p>
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
  const features = [
    {
      icon: Github,
      title: 'Import GitHub automatique',
      description: 'Connectez GitHub et importez vos projets en un clic. Descriptions, technologies, stats : tout est là.',
      badge: 'Populaire',
    },
    {
      icon: Globe,
      title: 'Multi-sites illimités',
      description: 'Créez autant de sites que vous voulez. Portfolio, blog, landing page : gérez tout depuis un seul endroit.',
    },
    {
      icon: Cloud,
      title: 'Stockage cloud intégré',
      description: '1 GB gratuit pour héberger vos fichiers, images et documents. Uploadez, organisez, partagez.',
    },
    {
      icon: Sparkles,
      title: 'Génération IA',
      description: 'Laissez l\'IA générer vos descriptions, bio et contenus. Tokens offerts chaque mois.',
      badge: 'Nouveau',
    },
    {
      icon: Puzzle,
      title: 'Extensions modulaires',
      description: 'Analytics, thèmes premium, projections : activez uniquement ce dont vous avez besoin.',
    },
    {
      icon: BarChart3,
      title: 'Analytics en temps réel',
      description: 'Suivez vos visiteurs, pages vues et performances. Données claires, sans complexité.',
    },
  ];

  return (
    <section id="features" className="py-20 md:py-32 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <Badge variant="outline" className="mb-4">Fonctionnalités</Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl mb-4">
            Tout ce qu'il vous faut,
            <span className="text-primary"> rien de superflu</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Une plateforme pensée pour les créateurs qui veulent se concentrer sur l'essentiel : leur travail.
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
  const steps = [
    {
      number: '01',
      title: 'Créez votre compte',
      description: 'Inscription gratuite en 30 secondes. Pas de carte bancaire requise.',
    },
    {
      number: '02',
      title: 'Connectez GitHub',
      description: 'Autorisez l\'accès et sélectionnez les projets à importer.',
    },
    {
      number: '03',
      title: 'Personnalisez',
      description: 'Choisissez un thème, ajustez les couleurs et le contenu.',
    },
    {
      number: '04',
      title: 'Publiez !',
      description: 'Un clic et votre site est en ligne sur votre sous-domaine ASAP.',
    },
  ];

  return (
    <section id="demo" className="py-20 md:py-32">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <Badge variant="outline" className="mb-4">Comment ça marche</Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl mb-4">
            4 étapes, <span className="text-primary">5 minutes</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            De zéro à un site professionnel en moins de temps qu'il n'en faut pour faire un café.
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
  const plans = [
    {
      name: 'Gratuit',
      description: 'Pour découvrir ASAP',
      price: '0',
      period: 'pour toujours',
      features: [
        '1 site publié',
        '1 GB de stockage cloud',
        '1 000 tokens IA / mois',
        'Sous-domaine asap.cool',
        'Analytics de base',
        'Support communautaire',
      ],
      cta: 'Commencer gratuitement',
      variant: 'outline' as const,
    },
    {
      name: 'Pro',
      description: 'Pour les créateurs sérieux',
      price: '9',
      period: '/ mois',
      popular: true,
      features: [
        '5 sites publiés',
        '10 GB de stockage cloud',
        '10 000 tokens IA / mois',
        'Domaines personnalisés',
        'Analytics avancés',
        'Thèmes premium',
        'Support prioritaire',
        'Pas de pub ASAP',
      ],
      cta: 'Essai gratuit 14 jours',
      variant: 'default' as const,
    },
    {
      name: 'Team',
      description: 'Pour les agences et équipes',
      price: '29',
      period: '/ mois',
      features: [
        'Sites illimités',
        '50 GB de stockage cloud',
        '50 000 tokens IA / mois',
        'Multi-utilisateurs',
        'API complète',
        'Marque blanche',
        'Account manager dédié',
        'SLA 99.9%',
      ],
      cta: 'Contacter les ventes',
      variant: 'outline' as const,
    },
  ];

  return (
    <section id="pricing" className="py-20 md:py-32 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <Badge variant="outline" className="mb-4">Tarifs</Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl mb-4">
            Un prix simple,
            <span className="text-primary"> sans surprise</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Commencez gratuitement. Évoluez quand vous êtes prêt.
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
                  Le plus populaire
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
  const testimonials = [
    {
      quote: "J'ai remplacé mon portfolio WordPress + mon stockage Dropbox + mes analytics Google. Tout est centralisé et 10x plus rapide.",
      author: 'Marie L.',
      role: 'Designer Freelance',
      avatar: 'ML',
    },
    {
      quote: "En tant qu'agence, on gère les sites de 15 clients depuis un seul dashboard. Le gain de temps est énorme.",
      author: 'Thomas R.',
      role: 'Directeur d\'agence',
      avatar: 'TR',
    },
    {
      quote: "L'import GitHub automatique m'a fait gagner des heures. Mon portfolio était en ligne en 10 minutes chrono.",
      author: 'Kevin M.',
      role: 'Développeur Full Stack',
      avatar: 'KM',
    },
  ];

  return (
    <section id="testimonials" className="py-20 md:py-32">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl text-center mb-16">
          <Badge variant="outline" className="mb-4">Témoignages</Badge>
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl mb-4">
            Ils ont choisi
            <span className="text-primary"> ASAP</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Rejoignez des centaines de créateurs qui simplifient leur présence en ligne.
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
  return (
    <section className="py-20 md:py-32 bg-primary text-primary-foreground">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl mb-6">
            Prêt à créer votre site ?
          </h2>
          <p className="text-lg opacity-90 mb-8">
            Rejoignez +500 créateurs qui utilisent ASAP pour gérer leur présence en ligne.
            <br />
            Gratuit pour commencer, aucune carte bancaire requise.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" variant="secondary" className="text-base px-8" asChild>
              <a href="/signup">
                Commencer gratuitement
                <Rocket className="ml-2 h-4 w-4" />
              </a>
            </Button>
            <Button size="lg" variant="outline" className="text-base px-8 bg-transparent border-primary-foreground/30 hover:bg-primary-foreground/10" asChild>
              <a href="#pricing">
                Voir les tarifs
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
              La plateforme tout-en-un pour créateurs et entrepreneurs.
            </p>
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

          <div>
            <h4 className="font-semibold mb-4">Produit</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#features" className="hover:text-foreground transition-colors">Fonctionnalités</a></li>
              <li><a href="#pricing" className="hover:text-foreground transition-colors">Tarifs</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Documentation</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Changelog</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Entreprise</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground transition-colors">À propos</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Blog</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Contact</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Partenaires</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Légal</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-foreground transition-colors">Politique de confidentialité</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">CGU</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Mentions légales</a></li>
              <li><a href="#" className="hover:text-foreground transition-colors">Cookies</a></li>
            </ul>
          </div>
        </div>

        <Separator className="my-8" />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© 2024 ASAP. Tous droits réservés.</p>
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
