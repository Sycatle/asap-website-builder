/**
 * V1 Freelance Portfolio Renderer
 * 
 * Optimized single-page landing renderer for the FreelanceDevProfile model.
 * FROZEN: Do not modify until business validation.
 * 
 * Section Order (FIXED):
 * 1. Hero (+ CTA)
 * 2. Services
 * 3. Projects
 * 4. Process
 * 5. Stack (Skills)
 * 6. Proof (Testimonials/Metrics)
 * 7. About
 * 8. Contact
 */

import React from 'react';
import type { FreelanceDevProfile, FreelanceService, FreelanceProject, FreelanceProcessStep, FreelanceStackCategory, FreelanceProof } from '@asap/shared';
import { cn } from './utils';

// ============================================
// Icons for Services & Process
// ============================================

const Icons: Record<string, React.FC<{ className?: string }>> = {
  globe: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
    </svg>
  ),
  server: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01" />
    </svg>
  ),
  mobile: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
    </svg>
  ),
  code: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    </svg>
  ),
  database: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
    </svg>
  ),
  cloud: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z" />
    </svg>
  ),
  design: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
    </svg>
  ),
  consulting: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  ),
  chat: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
  pencil: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
    </svg>
  ),
  rocket: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
    </svg>
  ),
  check: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  handshake: ({ className }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 11.5V14m0-2.5v-6a1.5 1.5 0 113 0m-3 6a1.5 1.5 0 00-3 0v2a7.5 7.5 0 0015 0v-5a1.5 1.5 0 00-3 0m-6-3V11m0-5.5v-1a1.5 1.5 0 013 0v1m0 0V11m0-5.5a1.5 1.5 0 013 0v3m0 0V11" />
    </svg>
  ),
};

function getIcon(name: string): React.FC<{ className?: string }> {
  return Icons[name] || Icons.code;
}

// ============================================
// Availability Badge
// ============================================

function AvailabilityBadge({ status }: { status: 'available' | 'busy' | 'not-available' }) {
  const config = {
    available: { label: 'Disponible', color: 'bg-green-500' },
    busy: { label: 'Occupé', color: 'bg-yellow-500' },
    'not-available': { label: 'Indisponible', color: 'bg-red-500' },
  };
  const { label, color } = config[status];
  
  return (
    <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm text-sm font-medium text-white">
      <span className={cn('w-2 h-2 rounded-full animate-pulse', color)} />
      {label}
    </span>
  );
}

// ============================================
// Hero Section
// ============================================

interface HeroSectionProps {
  identity: FreelanceDevProfile['identity'];
  cta: FreelanceDevProfile['cta'];
  theme: FreelanceDevProfile['theme'];
}

export function HeroSection({ identity, cta, theme }: HeroSectionProps) {
  return (
    <section 
      id="hero"
      className="relative min-h-screen flex items-center justify-center overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900"
    >
      {/* Gradient decorations */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.15),transparent_70%)]" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />

      {/* Content */}
      <div className="relative z-10 text-center px-6 py-20 max-w-4xl mx-auto">
        {/* Availability badge */}
        <div className="mb-6">
          <AvailabilityBadge status={identity.availability} />
        </div>
        
        {/* Avatar */}
        {identity.avatar && (
          <div className="mb-8">
            <img 
              src={identity.avatar} 
              alt={identity.name}
              className={cn(
                'w-32 h-32 mx-auto object-cover border-4 border-white/20',
                theme.avatarStyle === 'circle' && 'rounded-full',
                theme.avatarStyle === 'rounded' && 'rounded-2xl',
                theme.avatarStyle === 'square' && 'rounded-none'
              )}
            />
          </div>
        )}
        
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold text-white mb-4 tracking-tight">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-200 to-white">
            {identity.name}
          </span>
        </h1>
        
        <h2 className="text-xl sm:text-2xl md:text-3xl text-indigo-400 font-medium mb-6">
          {identity.title}
        </h2>
        
        <p className="text-lg md:text-xl text-slate-300 mb-10 max-w-2xl mx-auto leading-relaxed">
          {identity.tagline}
        </p>
        
        {/* CTAs */}
        <div className="flex flex-wrap items-center justify-center gap-4">
          <a 
            href={cta.primaryAction === 'email' ? `mailto:${cta.primaryTarget}` : cta.primaryTarget}
            className="inline-flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-xl font-semibold text-lg hover:bg-indigo-500 transition-all duration-200 shadow-lg shadow-indigo-600/25 hover:shadow-xl hover:shadow-indigo-600/30 hover:-translate-y-0.5"
          >
            {cta.primaryText}
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
          
          {cta.secondaryText && (
            <a 
              href={cta.secondaryTarget}
              className="inline-flex items-center gap-2 px-8 py-4 bg-transparent text-white rounded-xl font-semibold text-lg border-2 border-slate-600 hover:border-indigo-500 transition-all duration-200"
            >
              {cta.secondaryText}
            </a>
          )}
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce opacity-50">
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
    </section>
  );
}

// ============================================
// Services Section
// ============================================

interface ServicesSectionProps {
  services: FreelanceService[];
}

export function ServicesSection({ services }: ServicesSectionProps) {
  return (
    <section id="services" className="py-20 md:py-28 px-6 bg-white dark:bg-slate-900">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-4 text-slate-900 dark:text-white">
          Ce que je fais
        </h2>
        <p className="text-center text-slate-600 dark:text-slate-400 mb-12 max-w-2xl mx-auto">
          Des solutions techniques adaptées à vos besoins business
        </p>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {services.map((service, index) => {
            const Icon = getIcon(service.icon);
            return (
              <div 
                key={index} 
                className="group p-8 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:border-indigo-500/50 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="w-14 h-14 rounded-xl bg-indigo-500/10 flex items-center justify-center mb-6 group-hover:bg-indigo-500/20 transition-colors">
                  <Icon className="w-7 h-7 text-indigo-500" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-slate-900 dark:text-white">
                  {service.title}
                </h3>
                <p className="text-slate-600 dark:text-slate-300">
                  {service.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ============================================
// Projects Section
// ============================================

interface ProjectsSectionProps {
  projects: FreelanceProject[];
}

export function ProjectsSection({ projects }: ProjectsSectionProps) {
  // Sort: featured first
  const sortedProjects = [...projects].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
  
  return (
    <section id="projects" className="py-20 md:py-28 px-6 bg-slate-50 dark:bg-slate-900/50">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-4 text-slate-900 dark:text-white">
          Mes projets
        </h2>
        <p className="text-center text-slate-600 dark:text-slate-400 mb-12 max-w-2xl mx-auto">
          Une sélection de réalisations récentes
        </p>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {sortedProjects.map((project) => (
            <article 
              key={project.id}
              className="group rounded-2xl overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:shadow-xl hover:border-indigo-500/30 transition-all duration-300"
            >
              {project.image && (
                <div className="aspect-video bg-slate-200 dark:bg-slate-700 overflow-hidden relative">
                  <img 
                    src={project.image} 
                    alt={project.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  {project.featured && (
                    <span className="absolute top-3 right-3 px-2 py-1 text-xs font-medium bg-indigo-600 text-white rounded-lg">
                      Featured
                    </span>
                  )}
                </div>
              )}
              <div className="p-6">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {project.title}
                  </h3>
                  {project.fromGithub && project.stars && (
                    <span className="flex items-center gap-1 text-sm text-amber-500">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      {project.stars}
                    </span>
                  )}
                </div>
                <p className="text-slate-600 dark:text-slate-300 mb-4 line-clamp-2">
                  {project.description}
                </p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {project.technologies.slice(0, 5).map((tech, i) => (
                    <span 
                      key={i}
                      className="px-2 py-1 text-xs rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
                <div className="flex gap-3">
                  {project.liveUrl && (
                    <a 
                      href={project.liveUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-500 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                      </svg>
                      Voir
                    </a>
                  )}
                  {project.githubUrl && (
                    <a 
                      href={project.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-sm font-medium hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                      </svg>
                      Code
                    </a>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================
// Process Section (NEW)
// ============================================

interface ProcessSectionProps {
  process: FreelanceProcessStep[];
}

export function ProcessSection({ process }: ProcessSectionProps) {
  return (
    <section id="process" className="py-20 md:py-28 px-6 bg-white dark:bg-slate-900">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-4 text-slate-900 dark:text-white">
          Comment je travaille
        </h2>
        <p className="text-center text-slate-600 dark:text-slate-400 mb-12 max-w-2xl mx-auto">
          Un processus clair pour des projets réussis
        </p>
        
        <div className="relative">
          {/* Connection line */}
          <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-500 via-violet-500 to-indigo-500 -translate-x-1/2" />
          
          <div className="space-y-12 md:space-y-0 md:grid md:grid-cols-2 md:gap-8">
            {process.map((step, index) => {
              const Icon = getIcon(step.icon);
              const isEven = index % 2 === 0;
              
              return (
                <div 
                  key={step.step}
                  className={cn(
                    'relative',
                    isEven ? 'md:pr-12 md:text-right' : 'md:pl-12 md:col-start-2'
                  )}
                >
                  {/* Step number circle */}
                  <div className={cn(
                    'hidden md:flex absolute top-0 w-12 h-12 rounded-full bg-indigo-600 text-white items-center justify-center font-bold text-lg z-10',
                    isEven ? 'right-0 translate-x-1/2' : 'left-0 -translate-x-1/2'
                  )}>
                    {step.step}
                  </div>
                  
                  <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                    <div className={cn(
                      'flex items-center gap-4 mb-4',
                      isEven && 'md:flex-row-reverse'
                    )}>
                      <span className="md:hidden w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold">
                        {step.step}
                      </span>
                      <div className={cn(
                        'w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center',
                        isEven && 'md:ml-auto'
                      )}>
                        <Icon className="w-6 h-6 text-indigo-500" />
                      </div>
                    </div>
                    <h3 className="text-xl font-semibold mb-2 text-slate-900 dark:text-white">
                      {step.title}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-300">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================
// Stack Section
// ============================================

interface StackSectionProps {
  stack: FreelanceStackCategory[];
}

export function StackSection({ stack }: StackSectionProps) {
  return (
    <section id="stack" className="py-20 md:py-28 px-6 bg-slate-50 dark:bg-slate-900/50">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-4 text-slate-900 dark:text-white">
          Ma stack technique
        </h2>
        <p className="text-center text-slate-600 dark:text-slate-400 mb-12 max-w-2xl mx-auto">
          Les technologies que je maîtrise
        </p>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {stack.map((category, index) => (
            <div 
              key={index}
              className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
            >
              <h3 className="text-lg font-semibold mb-4 text-indigo-600 dark:text-indigo-400">
                {category.name}
              </h3>
              <div className="flex flex-wrap gap-2">
                {category.skills.map((skill, i) => (
                  <span 
                    key={i}
                    className="px-3 py-1.5 text-sm rounded-full bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-medium"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ============================================
// Proof Section (Testimonials + Metrics)
// ============================================

interface ProofSectionProps {
  proof: FreelanceProof[];
}

export function ProofSection({ proof }: ProofSectionProps) {
  const metrics = proof.filter(p => p.type === 'metric');
  const testimonials = proof.filter(p => p.type === 'testimonial');
  
  return (
    <section id="proof" className="py-20 md:py-28 px-6 bg-white dark:bg-slate-900">
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-12 text-slate-900 dark:text-white">
          Ils me font confiance
        </h2>
        
        {/* Metrics */}
        {metrics.length > 0 && (
          <div className="grid gap-6 md:grid-cols-3 mb-12">
            {metrics.map((m, i) => (
              <div key={i} className="text-center p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
                <p className="text-5xl font-bold text-indigo-600 dark:text-indigo-400 mb-2">
                  {m.value}
                </p>
                <p className="text-slate-600 dark:text-slate-300">
                  {m.label}
                </p>
              </div>
            ))}
          </div>
        )}
        
        {/* Testimonials */}
        {testimonials.length > 0 && (
          <div className="grid gap-6 md:grid-cols-2">
            {testimonials.map((t, i) => (
              <div key={i} className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                <svg className="w-8 h-8 text-indigo-500/30 mb-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h4v10h-10z"/>
                </svg>
                <p className="text-slate-600 dark:text-slate-300 mb-6 italic text-lg">
                  "{t.content}"
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-600 font-semibold text-lg">
                    {(t.author || '?').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">
                      {t.author}
                    </p>
                    <p className="text-sm text-slate-500">
                      {t.authorRole}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// ============================================
// About Section
// ============================================

interface AboutSectionProps {
  identity: FreelanceDevProfile['identity'];
}

export function AboutSection({ identity }: AboutSectionProps) {
  return (
    <section id="about" className="py-20 md:py-28 px-6 bg-slate-50 dark:bg-slate-900/50">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-12 text-slate-900 dark:text-white">
          À propos
        </h2>
        
        <div className="grid gap-12 md:grid-cols-5 items-center">
          {identity.avatar && (
            <div className="md:col-span-2">
              <img 
                src={identity.avatar} 
                alt={identity.name}
                className="w-full max-w-xs mx-auto rounded-2xl shadow-2xl"
              />
            </div>
          )}
          
          <div className={identity.avatar ? 'md:col-span-3' : 'md:col-span-5'}>
            <div className="prose prose-slate dark:prose-invert max-w-none">
              {identity.bio.split('\n\n').map((paragraph, i) => (
                <p key={i} className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>
            
            <div className="mt-8 flex flex-wrap gap-4 text-sm text-slate-500 dark:text-slate-400">
              {identity.location && (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {identity.location}
                </span>
              )}
              {identity.yearsOfExperience && (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {identity.yearsOfExperience}+ ans d'expérience
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================
// Contact Section
// ============================================

interface ContactSectionProps {
  contact: FreelanceDevProfile['contact'];
  cta: FreelanceDevProfile['cta'];
}

export function ContactSection({ contact, cta }: ContactSectionProps) {
  const socialIcons: Record<string, React.ReactNode> = {
    github: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
      </svg>
    ),
    linkedin: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
    twitter: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
    dribbble: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 24C5.385 24 0 18.615 0 12S5.385 0 12 0s12 5.385 12 12-5.385 12-12 12zm10.12-10.358c-.35-.11-3.17-.953-6.384-.438 1.34 3.684 1.887 6.684 1.992 7.308 2.3-1.555 3.936-4.02 4.395-6.87zm-6.115 7.808c-.153-.9-.75-4.032-2.19-7.77l-.066.02c-5.79 2.015-7.86 6.025-8.04 6.4 1.73 1.358 3.92 2.166 6.29 2.166 1.42 0 2.77-.29 4-.82zm-11.62-2.58c.232-.4 3.045-5.055 8.332-6.765.135-.045.27-.084.405-.12-.26-.585-.54-1.167-.832-1.74C7.17 11.775 2.206 11.71 1.756 11.7l-.004.312c0 2.633.998 5.037 2.634 6.855zm-2.42-8.955c.46.008 4.683.026 9.477-1.248-1.698-3.018-3.53-5.558-3.8-5.928-2.868 1.35-5.01 3.99-5.676 7.17zM9.6 2.052c.282.38 2.145 2.914 3.822 6 3.645-1.365 5.19-3.44 5.373-3.702-1.81-1.61-4.19-2.586-6.795-2.586-.825 0-1.63.1-2.4.29zm10.335 3.483c-.218.29-1.935 2.493-5.724 4.04.24.49.47.985.68 1.486.08.18.15.36.22.53 3.41-.43 6.8.26 7.14.33-.02-2.42-.88-4.64-2.31-6.38z"/>
      </svg>
    ),
    website: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9" />
      </svg>
    ),
  };
  
  return (
    <section id="contact" className="py-20 md:py-28 px-6 bg-white dark:bg-slate-900">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 text-slate-900 dark:text-white">
          Travaillons ensemble
        </h2>
        <p className="text-xl text-slate-600 dark:text-slate-300 mb-8">
          Prêt à démarrer votre projet ? Contactez-moi !
        </p>
        
        {/* Main CTA */}
        <a 
          href={`mailto:${contact.email}`}
          className="inline-flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-xl font-semibold text-lg hover:bg-indigo-500 transition-all duration-200 shadow-lg shadow-indigo-600/25 hover:shadow-xl hover:shadow-indigo-600/30 hover:-translate-y-0.5 mb-8"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
          </svg>
          {contact.email}
        </a>
        
        {/* Booking link */}
        {contact.bookingUrl && (
          <div className="mb-8">
            <a 
              href={contact.bookingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-xl font-medium hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              Réserver un appel
            </a>
          </div>
        )}
        
        {/* Social links */}
        <div className="flex justify-center gap-4">
          {Object.entries(contact.socials).map(([key, url]) => {
            if (!url) return null;
            return (
              <a
                key={key}
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 hover:bg-indigo-500 hover:text-white transition-all duration-200"
                title={key.charAt(0).toUpperCase() + key.slice(1)}
              >
                {socialIcons[key]}
              </a>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ============================================
// Full Page Renderer
// ============================================

interface FreelancePageRendererProps {
  profile: FreelanceDevProfile;
}

/**
 * V1 Freelance Landing Page Renderer
 * 
 * Renders a complete single-page portfolio from a FreelanceDevProfile.
 * Section order is FIXED and cannot be customized.
 */
export function FreelancePageRenderer({ profile }: FreelancePageRendererProps) {
  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <HeroSection 
        identity={profile.identity} 
        cta={profile.cta} 
        theme={profile.theme} 
      />
      <ServicesSection services={profile.services} />
      <ProjectsSection projects={profile.projects} />
      <ProcessSection process={profile.process} />
      <StackSection stack={profile.stack} />
      <ProofSection proof={profile.proof} />
      <AboutSection identity={profile.identity} />
      <ContactSection contact={profile.contact} cta={profile.cta} />
      
      {/* Footer */}
      <footer className="py-8 px-6 border-t border-slate-800 text-center text-slate-400 text-sm">
        <p>
          © {new Date().getFullYear()} {profile.identity.name}. 
          Créé avec <a href="https://asap.cool" className="text-indigo-400 hover:underline">ASAP</a>
        </p>
      </footer>
    </div>
  );
}

export default FreelancePageRenderer;
