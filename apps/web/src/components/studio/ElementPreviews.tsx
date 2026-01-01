/**
 * V1 MVP: Premium Element Previews
 * 
 * Visual previews of portfolio sections for the Studio editor.
 * Pure WYSIWYG rendering - shows exactly what the final site looks like.
 */

"use client"

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import type { WebsiteElement } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Briefcase,
  Code,
  Zap,
  MessageCircle,
  Mail,
  Star,
  MapPin,
  Calendar,
  ExternalLink,
  Github,
  ArrowRight,
  Quote,
  TrendingUp,
} from 'lucide-react';

// Import Landing SaaS renderers from the unified renderer wrapper
// This uses @asap/renderers as the single source of truth
import {
  LandingNavigationPreview,
  LandingHeroPreview,
  LandingFeaturesPreview,
  LandingHowItWorksPreview,
  LandingPricingPreview,
  LandingTestimonialsPreview,
  LandingCTAPreview,
  LandingFooterPreview,
} from './LandingSaaSRendererWrapper';

// ============================================
// Types
// ============================================

export interface ElementPreviewProps {
  element: WebsiteElement;
  isSelected?: boolean;
  onClick?: () => void;
  isDragging?: boolean;
}

// Type-safe data access helpers
function getString(data: Record<string, unknown> | undefined, key: string, fallback: string = ''): string {
  if (!data) return fallback;
  const value = data[key];
  return typeof value === 'string' ? value : fallback;
}

function getNumber(data: Record<string, unknown> | undefined, key: string, fallback: number = 0): number {
  if (!data) return fallback;
  const value = data[key];
  return typeof value === 'number' ? value : fallback;
}

function getArray<T>(data: Record<string, unknown> | undefined, key: string): T[] {
  if (!data) return [];
  const value = data[key];
  return Array.isArray(value) ? value : [];
}

// ============================================
// Hero Preview
// ============================================

function HeroPreview({ element, isSelected }: ElementPreviewProps) {
  const { t } = useTranslation(['common', 'editor']);
  const data = (element.content || element.data || {}) as Record<string, unknown>;
  const name = getString(data, 'name', t('editor:previews.hero.defaultName'));
  const title = getString(data, 'title', t('editor:previews.hero.defaultTitle'));
  const tagline = getString(data, 'tagline', t('editor:previews.hero.defaultTagline'));
  const avatar = getString(data, 'avatar');
  const availability = getString(data, 'availability', 'available');

  const availabilityConfig = {
    available: { label: t('editor:previews.hero.availability.available'), color: 'bg-green-500', textColor: 'text-green-600' },
    busy: { label: t('editor:previews.hero.availability.busy'), color: 'bg-yellow-500', textColor: 'text-yellow-600' },
    'not-available': { label: t('editor:previews.hero.availability.unavailable'), color: 'bg-red-500', textColor: 'text-red-600' },
  }[availability] || { label: t('editor:previews.hero.availability.available'), color: 'bg-green-500', textColor: 'text-green-600' };

  return (
    <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-lg p-6 text-white relative overflow-hidden">
      {/* Decorative gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.15),transparent_50%)]" />
      
      <div className="relative z-10">
        <div className="flex items-start gap-4">
          <Avatar className="h-16 w-16 border-2 border-white/20">
            <AvatarImage src={avatar} />
            <AvatarFallback className="bg-indigo-600 text-white text-lg">
              {name.charAt(0)}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="secondary" className="bg-card/10 text-white border-0 gap-1">
                <span className={`h-2 w-2 rounded-full ${availabilityConfig.color}`} />
                {availabilityConfig.label}
              </Badge>
            </div>
            <h3 className="text-xl font-bold truncate">{name}</h3>
            <p className="text-indigo-300 text-sm">{title}</p>
          </div>
        </div>
        <p className="mt-4 text-sm text-slate-300 line-clamp-2">{tagline}</p>
        <div className="flex gap-2 mt-4">
          <Button size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs">
            {t('editor:previews.hero.contactMe')}
            <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
          <Button size="sm" variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700 text-xs">
            {t('editor:previews.hero.viewProjects')}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Services Preview
// ============================================

function ServicesPreview({ element }: ElementPreviewProps) {
  const { t } = useTranslation(['common', 'editor']);
  const data = (element.content || element.data || {}) as Record<string, unknown>;
  const services = getArray<{ title: string; description: string; icon?: string }>(data, 'services');
  
  const displayServices = services.length > 0 ? services.slice(0, 3) : [
    { title: t('editor:previews.services.defaults.webApps.title'), description: t('editor:previews.services.defaults.webApps.description'), icon: 'globe' },
    { title: t('editor:previews.services.defaults.apis.title'), description: t('editor:previews.services.defaults.apis.description'), icon: 'server' },
    { title: t('editor:previews.services.defaults.consulting.title'), description: t('editor:previews.services.defaults.consulting.description'), icon: 'consulting' },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Zap className="h-4 w-4 text-violet-500 fill-violet-500" />
        <h4 className="font-medium text-sm">{element.title || 'Services'}</h4>
        <Badge variant="secondary" className="text-xs">{services.length || 3}</Badge>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {displayServices.map((service, i) => (
          <div key={i} className="p-3 rounded-lg bg-muted/50 border">
            <div className="h-8 w-8 rounded-lg bg-violet-500/10 flex items-center justify-center mb-2">
              <Briefcase className="h-4 w-4 text-violet-500" />
            </div>
            <p className="font-medium text-xs truncate">{service.title}</p>
            <p className="text-[10px] text-muted-foreground truncate">{service.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// Projects Preview
// ============================================

function ProjectsPreview({ element }: ElementPreviewProps) {
  const data = (element.content || element.data || {}) as Record<string, unknown>;
  const projects = getArray<{ title: string; description: string; technologies?: string[]; featured?: boolean }>(data, 'projects');
  
  const displayProjects = projects.length > 0 ? projects.slice(0, 2) : [
    { title: 'E-commerce Platform', technologies: ['React', 'Node.js'], featured: true },
    { title: 'Dashboard Analytics', technologies: ['Next.js', 'TypeScript'], featured: false },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Code className="h-4 w-4 text-emerald-500" />
        <h4 className="font-medium text-sm">{element.title || 'Projets'}</h4>
        <Badge variant="secondary" className="text-xs">{projects.length || 2}</Badge>
      </div>
      <div className="space-y-2">
        {displayProjects.map((project, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
            <div className="h-12 w-16 rounded bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 flex items-center justify-center">
              <Code className="h-5 w-5 text-emerald-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-sm truncate">{project.title}</p>
                {project.featured && <Star className="h-3 w-3 text-amber-500 fill-amber-500" />}
              </div>
              <div className="flex gap-1 mt-1">
                {(project.technologies || []).slice(0, 3).map((tech, j) => (
                  <Badge key={j} variant="outline" className="text-[10px] py-0 h-5">
                    {tech}
                  </Badge>
                ))}
              </div>
            </div>
            <ArrowSquareOut className="h-4 w-4 text-muted-foreground" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// Skills/Stack Preview
// ============================================

function SkillsPreview({ element }: ElementPreviewProps) {
  const data = (element.content || element.data || {}) as Record<string, unknown>;
  const categories = getArray<{ name: string; skills: string[] }>(data, 'categories');
  
  const displayCategories = categories.length > 0 ? categories.slice(0, 2) : [
    { name: 'Frontend', skills: ['React', 'Next.js', 'TypeScript'] },
    { name: 'Backend', skills: ['Node.js', 'Rust', 'PostgreSQL'] },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-sky-500" />
        <h4 className="font-medium text-sm">{element.title || 'Stack technique'}</h4>
      </div>
      <div className="space-y-2">
        {displayCategories.map((category, i) => (
          <div key={i} className="space-y-1.5">
            <p className="text-xs font-medium text-muted-foreground">{category.name}</p>
            <div className="flex flex-wrap gap-1">
              {category.skills.slice(0, 4).map((skill, j) => (
                <Badge key={j} className="text-xs bg-sky-500/10 text-sky-600 hover:bg-sky-500/20 border-0">
                  {skill}
                </Badge>
              ))}
              {category.skills.length > 4 && (
                <Badge variant="outline" className="text-xs">+{category.skills.length - 4}</Badge>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// Process Preview
// ============================================

function ProcessPreview({ element }: ElementPreviewProps) {
  const { t } = useTranslation(['common', 'editor']);
  const data = (element.content || element.data || {}) as Record<string, unknown>;
  const steps = getArray<{ step: number; title: string; description: string }>(data, 'steps');
  
  const displaySteps = steps.length > 0 ? steps.slice(0, 4) : [
    { step: 1, title: t('editor:previews.process.defaults.discovery.title'), description: t('editor:previews.process.defaults.discovery.description') },
    { step: 2, title: t('editor:previews.process.defaults.proposal.title'), description: t('editor:previews.process.defaults.proposal.description') },
    { step: 3, title: t('editor:previews.process.defaults.development.title'), description: t('editor:previews.process.defaults.development.description') },
    { step: 4, title: t('editor:previews.process.defaults.delivery.title'), description: t('editor:previews.process.defaults.delivery.description') },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Zap className="h-4 w-4 text-amber-500 fill-amber-500" />
        <h4 className="font-medium text-sm">{element.title || 'Process'}</h4>
      </div>
      <div className="flex gap-1">
        {displaySteps.map((step, i) => (
          <div key={i} className="flex-1 text-center">
            <div className="h-8 w-8 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto mb-1 text-xs font-bold">
              {step.step}
            </div>
            <p className="text-[10px] font-medium truncate">{step.title}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// Proof/Testimonials Preview
// ============================================

function ProofPreview({ element }: ElementPreviewProps) {
  const { t } = useTranslation(['common', 'editor']);
  const data = (element.content || element.data || {}) as Record<string, unknown>;
  const items = getArray<{ type: string; value?: string; label?: string; content?: string; author?: string }>(data, 'items');
  
  const metrics = items.filter(i => i.type === 'metric').slice(0, 3);
  const testimonials = items.filter(i => i.type === 'testimonial').slice(0, 1);

  const displayMetrics = metrics.length > 0 ? metrics : [
    { type: 'metric', value: '50+', label: t('editor:previews.proof.defaults.projects') },
    { type: 'metric', value: '30+', label: t('editor:previews.proof.defaults.clients') },
    { type: 'metric', value: '5+', label: t('editor:previews.proof.defaults.experience') },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Star className="h-4 w-4 text-amber-500" />
        <h4 className="font-medium text-sm">{element.title || 'Preuves sociales'}</h4>
      </div>
      
      {/* Metrics */}
      <div className="grid grid-cols-3 gap-2">
        {displayMetrics.map((metric, i) => (
          <div key={i} className="text-center p-2 rounded-lg bg-muted/50">
            <p className="text-lg font-bold text-primary">{metric.value}</p>
            <p className="text-[10px] text-muted-foreground">{metric.label}</p>
          </div>
        ))}
      </div>

      {/* Testimonial */}
      {testimonials.length > 0 && (
        <div className="p-3 rounded-lg bg-muted/50 border">
          <Quote className="h-4 w-4 text-muted-foreground mb-1" />
          <p className="text-xs italic line-clamp-2">"{testimonials[0].content}"</p>
          <p className="text-[10px] text-muted-foreground mt-1">— {testimonials[0].author}</p>
        </div>
      )}
    </div>
  );
}

// ============================================
// About Preview
// ============================================

function AboutPreview({ element }: ElementPreviewProps) {
  const { t } = useTranslation(['common', 'editor']);
  const data = (element.content || element.data || {}) as Record<string, unknown>;
  const bio = getString(data, 'bio', t('editor:previews.about.defaultBio'));
  const location = getString(data, 'location');
  const yearsOfExperience = getNumber(data, 'yearsOfExperience');

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <User className="h-4 w-4 text-indigo-500" />
        <h4 className="font-medium text-sm">{element.title || 'À propos'}</h4>
      </div>
      <p className="text-sm text-muted-foreground line-clamp-3">{bio}</p>
      <div className="flex gap-3">
        {location && (
          <Badge variant="outline" className="text-xs gap-1">
            <MapPin className="h-3 w-3" />
            {location}
          </Badge>
        )}
        {yearsOfExperience > 0 && (
          <Badge variant="outline" className="text-xs gap-1">
            <Calendar className="h-3 w-3" />
            {yearsOfExperience}+ {t('editor:previews.about.years')}
          </Badge>
        )}
      </div>
    </div>
  );
}

// ============================================
// Contact Preview
// ============================================

function ContactPreview({ element }: ElementPreviewProps) {
  const { t } = useTranslation(['common', 'editor']);
  const data = (element.content || element.data || {}) as Record<string, unknown>;
  const email = getString(data, 'email', 'contact@example.com');
  const socials = (data.socials || {}) as Record<string, string>;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Mail className="h-4 w-4 text-sky-500" />
        <h4 className="font-medium text-sm">{element.title || 'Contact'}</h4>
      </div>
      <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/50 border">
        <Mail className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm truncate flex-1">{email}</span>
        <Button size="sm" variant="ghost" className="h-7 text-xs">
          {t('editor:previews.contact.contactButton')}
        </Button>
      </div>
      <div className="flex gap-2">
        {socials.github && (
          <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
            <Github className="h-4 w-4" />
          </div>
        )}
        {socials.linkedin && (
          <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
            </svg>
          </div>
        )}
        {socials.twitter && (
          <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
            <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// Generic Preview
// ============================================

function GenericPreview({ element }: ElementPreviewProps) {
  const { t } = useTranslation(['common', 'editor']);
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Code className="h-4 w-4 text-muted-foreground" />
        <h4 className="font-medium text-sm">{element.title || element.element_type}</h4>
      </div>
      <p className="text-sm text-muted-foreground">
        {t('editor:previews.generic.elementType', { type: element.element_type })}
      </p>
    </div>
  );
}

// ============================================
// Main Preview Component
// ============================================

export function ElementPreview({ element, isSelected, onClick, isDragging }: ElementPreviewProps) {
  const { t } = useTranslation(['common', 'editor']);
  
  // Helper to detect if this is a Landing SaaS element based on settings
  const isLandingSaaSElement = (el: WebsiteElement): boolean => {
    const settings = el.settings as Record<string, unknown> | undefined;
    // Landing SaaS elements have specific settings like headline_line1, badge_text, etc.
    return !!(settings && (
      settings.headline_line1 || 
      settings.badge_text || 
      settings.nav_links ||
      settings.plans ||
      settings.cta_primary_text
    ));
  };

  const renderPreview = () => {
    const settings = element.settings as Record<string, unknown> | undefined;
    
    switch (element.element_type) {
      // Hero: detect context (Portfolio vs Landing SaaS)
      case 'hero':
        if (isLandingSaaSElement(element)) {
          return <LandingHeroPreview element={element} isSelected={isSelected} />;
        }
        return <HeroPreview element={element} isSelected={isSelected} />;
      
      // Portfolio element types
      case 'services':
        return <ServicesPreview element={element} isSelected={isSelected} />;
      case 'projects':
        return <ProjectsPreview element={element} isSelected={isSelected} />;
      case 'skills':
        return <SkillsPreview element={element} isSelected={isSelected} />;
      case 'process':
        return <ProcessPreview element={element} isSelected={isSelected} />;
      case 'proof':
        return <ProofPreview element={element} isSelected={isSelected} />;
      case 'about':
        return <AboutPreview element={element} isSelected={isSelected} />;
      case 'contact':
        return <ContactPreview element={element} isSelected={isSelected} />;
      
      // Landing SaaS element types (use new previews)
      case 'navigation':
        return <LandingNavigationPreview element={element} isSelected={isSelected} />;
      case 'features':
        return <LandingFeaturesPreview element={element} isSelected={isSelected} />;
      case 'how-it-works':
        return <LandingHowItWorksPreview element={element} isSelected={isSelected} />;
      case 'pricing':
        return <LandingPricingPreview element={element} isSelected={isSelected} />;
      case 'testimonials':
        return <LandingTestimonialsPreview element={element} isSelected={isSelected} />;
      case 'cta':
        return <LandingCTAPreview element={element} isSelected={isSelected} />;
      case 'footer':
        return <LandingFooterPreview element={element} isSelected={isSelected} />;
      
      default:
        return <GenericPreview element={element} isSelected={isSelected} />;
    }
  };

  // Pure WYSIWYG preview - no wrapper, just the visual render
  return (
    <div 
      className={`transition-all duration-200 cursor-pointer ${
        isSelected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''
      } ${isDragging ? 'opacity-50 scale-[0.98]' : ''} ${!element.visible ? 'opacity-40' : ''}`}
      onClick={onClick}
    >
      {renderPreview()}
    </div>
  );
}

// Export individual previews for direct use
export {
  // Portfolio previews
  HeroPreview,
  ServicesPreview,
  ProjectsPreview,
  SkillsPreview,
  ProcessPreview,
  ProofPreview,
  AboutPreview,
  ContactPreview,
  GenericPreview,
};

// Re-export Landing SaaS previews from the unified renderer wrapper
export {
  LandingNavigationPreview,
  LandingHeroPreview,
  LandingFeaturesPreview,
  LandingHowItWorksPreview,
  LandingPricingPreview,
  LandingTestimonialsPreview,
  LandingCTAPreview,
  LandingFooterPreview,
} from './LandingSaaSRendererWrapper';
