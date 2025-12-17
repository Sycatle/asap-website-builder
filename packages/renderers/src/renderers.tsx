/**
 * Unified Section Renderers - Pure TailwindCSS
 * 
 * These renderers are used by both:
 * - apps/web (preview system)
 * - apps/sites (public published sites)
 * 
 * This ensures 100% visual parity between preview and production.
 */

import React from 'react';
import type { Section, Website } from './types';
import { getData, cn } from './utils';

// ============================================
// Common Props
// ============================================
export interface SectionRendererProps {
  section: Section;
  website?: Website;
  isSelected?: boolean;
  isEditable?: boolean;
  onClick?: () => void;
}

// ============================================
// Hero Section
// ============================================
export function HeroRenderer({ section, website, isSelected, onClick }: SectionRendererProps) {
  const name = getData(section, 'name', '') || getData(section, 'headline', '') || website?.title || 'Votre Nom';
  const title = getData(section, 'title', 'Développeur Full Stack');
  const subtitle = getData(section, 'subtitle', '') || getData(section, 'subheadline', '') || website?.tagline || '';
  const ctaText = getData(section, 'cta_text', '') || getData(section, 'ctaText', 'Voir mes projets');
  const ctaLink = getData(section, 'cta_link', '') || getData(section, 'ctaLink', '#projects');
  const secondaryCta = getData(section, 'secondary_cta', '') || getData(section, 'secondaryCta', '');
  const secondaryCtaLink = getData(section, 'secondary_cta_link', '') || getData(section, 'secondaryCtaLink', '#about');

  return (
    <section 
      id="hero"
      className={cn(
        'relative min-h-screen flex items-center justify-center overflow-hidden',
        'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900',
        isSelected && 'ring-2 ring-indigo-500 ring-offset-2'
      )}
      onClick={onClick}
    >
      {/* Gradient decorations */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.15),transparent_70%)]" />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-violet-500/10 rounded-full blur-3xl" />

      {/* Content */}
      <div className="relative z-10 text-center px-6 py-20 max-w-4xl mx-auto">
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold text-white mb-4 tracking-tight">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-white via-indigo-200 to-white">
            {name}
          </span>
        </h1>
        
        <h2 className="text-xl sm:text-2xl md:text-3xl text-indigo-400 font-medium mb-6">
          {title}
        </h2>
        
        {subtitle && (
          <p className="text-lg md:text-xl text-slate-300 mb-10 max-w-2xl mx-auto leading-relaxed">
            {subtitle}
          </p>
        )}
        
        <div className="flex flex-wrap items-center justify-center gap-4">
          <a 
            href={ctaLink}
            className="inline-flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-xl font-semibold text-lg hover:bg-indigo-500 transition-all duration-200 shadow-lg shadow-indigo-600/25 hover:shadow-xl hover:shadow-indigo-600/30 hover:-translate-y-0.5"
          >
            {ctaText}
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
            </svg>
          </a>
          
          {secondaryCta && (
            <a 
              href={secondaryCtaLink}
              className="inline-flex items-center gap-2 px-8 py-4 bg-transparent text-white rounded-xl font-semibold text-lg border-2 border-slate-600 hover:border-indigo-500 transition-all duration-200"
            >
              {secondaryCta}
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

      {/* Bottom gradient line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent" />
    </section>
  );
}

// ============================================
// About Section
// ============================================
export function AboutRenderer({ section, isSelected, onClick }: SectionRendererProps) {
  const title = section.title || 'À propos';
  const description = getData(section, 'description', '') || getData(section, 'bio', '');
  const image = getData(section, 'image', '') || getData(section, 'imageUrl', '');
  const highlights = getData<string[]>(section, 'highlights', []);
  const layout = section.layout || 'default';

  return (
    <section 
      id="about"
      className={cn(
        'py-20 md:py-28 px-6 bg-slate-50 dark:bg-slate-900/50',
        isSelected && 'ring-2 ring-indigo-500 ring-offset-2'
      )}
      onClick={onClick}
    >
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-12 text-slate-900 dark:text-white">
          {title}
        </h2>
        
        <div className={cn(
          'grid gap-12 items-center',
          layout === 'split' && 'md:grid-cols-2'
        )}>
          {image && layout === 'split' && (
            <div className="relative group">
              <div className="absolute -inset-4 bg-gradient-to-r from-indigo-500/20 to-violet-500/20 rounded-3xl blur-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <img 
                src={image} 
                alt="Profile"
                className="relative w-full max-w-md mx-auto rounded-2xl shadow-2xl object-cover aspect-[4/5]"
              />
            </div>
          )}
          
          <div className="space-y-6">
            {description && (
              <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                {description}
              </p>
            )}
            
            {highlights.length > 0 && (
              <ul className="space-y-3">
                {highlights.map((item, index) => (
                  <li key={index} className="flex items-center gap-3 text-slate-700 dark:text-slate-200">
                    <svg className="w-5 h-5 text-indigo-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ============================================
// Skills Section
// ============================================
interface SkillCategory {
  name: string;
  skills: string[];
}

export function SkillsRenderer({ section, isSelected, onClick }: SectionRendererProps) {
  const title = section.title || 'Compétences';
  const categories = getData<SkillCategory[]>(section, 'categories', []);
  const layout = section.layout || 'grid';

  return (
    <section 
      id="skills"
      className={cn(
        'py-20 md:py-28 px-6 bg-white dark:bg-slate-900',
        isSelected && 'ring-2 ring-indigo-500 ring-offset-2'
      )}
      onClick={onClick}
    >
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-12 text-slate-900 dark:text-white">
          {title}
        </h2>
        
        <div className={cn(
          'grid gap-6',
          layout === 'grid' ? 'md:grid-cols-2 lg:grid-cols-3' : 'md:grid-cols-2'
        )}>
          {categories.map((category, index) => (
            <div 
              key={index}
              className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:border-indigo-500/50 transition-colors"
            >
              <h3 className="text-xl font-semibold mb-4 text-indigo-600 dark:text-indigo-400">
                {category.name}
              </h3>
              <div className="flex flex-wrap gap-2">
                {category.skills.map((skill, skillIndex) => (
                  <span 
                    key={skillIndex}
                    className="px-3 py-1.5 text-sm rounded-full bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 font-medium"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
        
        {categories.length === 0 && (
          <p className="text-center text-slate-500 dark:text-slate-400">
            Aucune compétence configurée.
          </p>
        )}
      </div>
    </section>
  );
}

// ============================================
// Projects Section
// ============================================
interface Project {
  title: string;
  description?: string;
  image?: string;
  imageUrl?: string;
  tags?: string[];
  technologies?: string[];
  link?: string;
  liveUrl?: string;
  github?: string;
  githubUrl?: string;
}

export function ProjectsRenderer({ section, isSelected, onClick }: SectionRendererProps) {
  const title = section.title || 'Projets';
  const projects = getData<Project[]>(section, 'projects', []);
  const layout = section.layout || 'grid';

  return (
    <section 
      id="projects"
      className={cn(
        'py-20 md:py-28 px-6 bg-slate-50 dark:bg-slate-900/50',
        isSelected && 'ring-2 ring-indigo-500 ring-offset-2'
      )}
      onClick={onClick}
    >
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-12 text-slate-900 dark:text-white">
          {title}
        </h2>
        
        <div className={cn(
          'grid gap-6',
          layout === 'grid' ? 'md:grid-cols-2 lg:grid-cols-3' : ''
        )}>
          {projects.map((project, index) => (
            <article 
              key={index}
              className="group rounded-2xl overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:shadow-xl hover:border-indigo-500/30 transition-all duration-300"
            >
              {(project.image || project.imageUrl) && (
                <div className="aspect-video bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <img 
                    src={project.image || project.imageUrl} 
                    alt={project.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
              )}
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-2 text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                  {project.title}
                </h3>
                {project.description && (
                  <p className="text-slate-600 dark:text-slate-300 mb-4 line-clamp-2">
                    {project.description}
                  </p>
                )}
                {(project.tags || project.technologies) && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {(project.tags || project.technologies || []).slice(0, 5).map((tag, tagIndex) => (
                      <span 
                        key={tagIndex}
                        className="px-2 py-1 text-xs rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-3">
                  {(project.link || project.liveUrl) && (
                    <a 
                      href={project.link || project.liveUrl}
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
                  {(project.github || project.githubUrl) && (
                    <a 
                      href={project.github || project.githubUrl}
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
        
        {projects.length === 0 && (
          <p className="text-center text-slate-500 dark:text-slate-400">
            Aucun projet configuré.
          </p>
        )}
      </div>
    </section>
  );
}

// ============================================
// Experience Section
// ============================================
interface ExperienceItem {
  title?: string;
  position?: string;
  company?: string;
  organization?: string;
  period?: string;
  date?: string;
  description?: string;
  current?: boolean;
}

export function ExperienceRenderer({ section, isSelected, onClick }: SectionRendererProps) {
  const title = section.title || 'Expérience';
  const experiences = getData<ExperienceItem[]>(section, 'experiences', []) || getData<ExperienceItem[]>(section, 'items', []);
  const layout = section.layout || 'timeline';

  return (
    <section 
      id="experience"
      className={cn(
        'py-20 md:py-28 px-6 bg-white dark:bg-slate-900',
        isSelected && 'ring-2 ring-indigo-500 ring-offset-2'
      )}
      onClick={onClick}
    >
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-12 text-slate-900 dark:text-white">
          {title}
        </h2>
        
        <div className="relative">
          {/* Timeline line */}
          {layout === 'timeline' && (
            <div className="absolute left-0 md:left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-500 via-violet-500 to-indigo-500 transform -translate-x-1/2" />
          )}
          
          <div className="space-y-12">
            {experiences.map((exp, index) => (
              <div 
                key={index}
                className={cn(
                  'relative',
                  layout === 'timeline' && 'md:grid md:grid-cols-2 md:gap-8'
                )}
              >
                {layout === 'timeline' && (
                  <div className="absolute left-0 md:left-1/2 top-0 w-4 h-4 rounded-full bg-indigo-500 transform -translate-x-1/2 ring-4 ring-white dark:ring-slate-900" />
                )}
                
                <div className={cn(layout === 'timeline' && 'md:text-right md:pr-8 ml-8 md:ml-0')}>
                  <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1 md:justify-end">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {exp.period || exp.date}
                    {exp.current && (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 font-medium">
                        Actuel
                      </span>
                    )}
                  </div>
                </div>
                
                <div className={cn(layout === 'timeline' ? 'ml-8 md:ml-0 md:pl-8' : 'mt-2')}>
                  <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                    <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                      {exp.title || exp.position}
                    </h3>
                    <p className="text-indigo-600 dark:text-indigo-400 font-medium mb-2">
                      {exp.company || exp.organization}
                    </p>
                    {exp.description && (
                      <p className="text-slate-600 dark:text-slate-300">
                        {exp.description}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {experiences.length === 0 && (
          <p className="text-center text-slate-500 dark:text-slate-400">
            Aucune expérience configurée.
          </p>
        )}
      </div>
    </section>
  );
}

// ============================================
// Education Section
// ============================================
interface EducationItem {
  degree?: string;
  title?: string;
  school?: string;
  institution?: string;
  period?: string;
  date?: string;
  description?: string;
}

export function EducationRenderer({ section, isSelected, onClick }: SectionRendererProps) {
  const title = section.title || 'Formation';
  const education = getData<EducationItem[]>(section, 'education', []) || getData<EducationItem[]>(section, 'items', []);

  return (
    <section 
      id="education"
      className={cn(
        'py-20 md:py-28 px-6 bg-slate-50 dark:bg-slate-900/50',
        isSelected && 'ring-2 ring-indigo-500 ring-offset-2'
      )}
      onClick={onClick}
    >
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-12 text-slate-900 dark:text-white">
          {title}
        </h2>
        
        <div className="space-y-6">
          {education.map((edu, index) => (
            <div 
              key={index}
              className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
            >
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                    {edu.degree || edu.title}
                  </h3>
                  <p className="text-indigo-600 dark:text-indigo-400 font-medium">
                    {edu.school || edu.institution}
                  </p>
                  {edu.description && (
                    <p className="text-slate-600 dark:text-slate-300 mt-2">
                      {edu.description}
                    </p>
                  )}
                </div>
                <span className="text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  {edu.period || edu.date}
                </span>
              </div>
            </div>
          ))}
        </div>
        
        {education.length === 0 && (
          <p className="text-center text-slate-500 dark:text-slate-400">
            Aucune formation configurée.
          </p>
        )}
      </div>
    </section>
  );
}

// ============================================
// Contact Section
// ============================================
export function ContactRenderer({ section, isSelected, onClick }: SectionRendererProps) {
  const title = section.title || 'Contact';
  const email = getData(section, 'email', '');
  const phone = getData(section, 'phone', '');
  const location = getData(section, 'location', '');
  const description = getData(section, 'description', "N'hésitez pas à me contacter pour discuter de votre projet.");
  const socials = getData<{ platform: string; url: string }[]>(section, 'socials', []) || [];
  const socialLinks = getData<Record<string, string>>(section, 'socialLinks', {});
  const layout = section.layout || 'centered';

  // Merge social formats
  const allSocials = [
    ...socials,
    ...Object.entries(socialLinks).map(([platform, url]) => ({ platform, url }))
  ].filter(s => s.url);

  return (
    <section 
      id="contact"
      className={cn(
        'py-20 md:py-28 px-6 bg-white dark:bg-slate-900',
        isSelected && 'ring-2 ring-indigo-500 ring-offset-2'
      )}
      onClick={onClick}
    >
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-4 text-slate-900 dark:text-white">
          {title}
        </h2>
        
        <p className="text-center text-slate-600 dark:text-slate-300 mb-12 max-w-xl mx-auto">
          {description}
        </p>
        
        <div className={cn(
          'grid gap-8',
          layout === 'split' && 'md:grid-cols-2'
        )}>
          {/* Contact info */}
          <div className="space-y-4">
            {email && (
              <a 
                href={`mailto:${email}`}
                className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors group"
              >
                <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors">
                  <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Email</p>
                  <p className="font-medium text-slate-900 dark:text-white">{email}</p>
                </div>
              </a>
            )}
            
            {phone && (
              <a 
                href={`tel:${phone}`}
                className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors group"
              >
                <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center group-hover:bg-indigo-500/20 transition-colors">
                  <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Téléphone</p>
                  <p className="font-medium text-slate-900 dark:text-white">{phone}</p>
                </div>
              </a>
            )}
            
            {location && (
              <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800">
                <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center">
                  <svg className="w-5 h-5 text-indigo-600 dark:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Localisation</p>
                  <p className="font-medium text-slate-900 dark:text-white">{location}</p>
                </div>
              </div>
            )}
            
            {/* Social links */}
            {allSocials.length > 0 && (
              <div className="flex flex-wrap gap-3 pt-4">
                {allSocials.map((social, index) => (
                  <a
                    key={index}
                    href={social.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-indigo-500 hover:text-white text-slate-600 dark:text-slate-300 transition-all duration-200"
                    title={social.platform}
                  >
                    <SocialIcon platform={social.platform} />
                  </a>
                ))}
              </div>
            )}
          </div>
          
          {/* Contact form placeholder */}
          {layout === 'split' && (
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">
                Envoyer un message
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Nom</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    placeholder="Votre nom"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Email</label>
                  <input 
                    type="email" 
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    placeholder="votre@email.com"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Message</label>
                  <textarea 
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
                    rows={4}
                    placeholder="Votre message..."
                  />
                </div>
                <button className="w-full px-6 py-3 bg-indigo-600 text-white rounded-lg font-semibold hover:bg-indigo-500 transition-colors">
                  Envoyer
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// Social icon component
function SocialIcon({ platform }: { platform: string }) {
  const icons: Record<string, JSX.Element> = {
    github: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
      </svg>
    ),
    linkedin: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
      </svg>
    ),
    twitter: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
  };
  
  return icons[platform.toLowerCase()] || (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  );
}

// ============================================
// Additional Sections (Testimonials, Services, Pricing, FAQ, Gallery, Blog, Custom)
// ============================================

export function TestimonialsRenderer({ section, isSelected, onClick }: SectionRendererProps) {
  const title = section.title || 'Témoignages';
  const testimonials = getData<any[]>(section, 'testimonials', []) || getData<any[]>(section, 'items', []);

  return (
    <section 
      id="testimonials"
      className={cn(
        'py-20 md:py-28 px-6 bg-slate-50 dark:bg-slate-900/50',
        isSelected && 'ring-2 ring-indigo-500 ring-offset-2'
      )}
      onClick={onClick}
    >
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-12 text-slate-900 dark:text-white">
          {title}
        </h2>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t, index) => (
            <div key={index} className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <svg className="w-8 h-8 text-indigo-500/30 mb-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h4v10h-10z"/>
              </svg>
              <p className="text-slate-600 dark:text-slate-300 mb-6 italic">"{t.content || t.quote}"</p>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-600 font-semibold">
                  {(t.name || t.author || '?').charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">{t.name || t.author}</p>
                  <p className="text-sm text-slate-500">{t.role}{t.company && ` @ ${t.company}`}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ServicesRenderer({ section, isSelected, onClick }: SectionRendererProps) {
  const title = section.title || 'Services';
  const services = getData<any[]>(section, 'services', []) || getData<any[]>(section, 'items', []);

  return (
    <section 
      id="services"
      className={cn(
        'py-20 md:py-28 px-6 bg-white dark:bg-slate-900',
        isSelected && 'ring-2 ring-indigo-500 ring-offset-2'
      )}
      onClick={onClick}
    >
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-12 text-slate-900 dark:text-white">
          {title}
        </h2>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {services.map((service, index) => (
            <div key={index} className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-500/50 transition-colors">
              <h3 className="text-xl font-semibold mb-3 text-slate-900 dark:text-white">{service.title}</h3>
              <p className="text-slate-600 dark:text-slate-300 mb-4">{service.description}</p>
              {service.features && (
                <ul className="space-y-2">
                  {service.features.map((f: string, i: number) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function PricingRenderer({ section, isSelected, onClick }: SectionRendererProps) {
  const title = section.title || 'Tarifs';
  const plans = getData<any[]>(section, 'plans', []) || getData<any[]>(section, 'items', []);

  return (
    <section 
      id="pricing"
      className={cn(
        'py-20 md:py-28 px-6 bg-slate-50 dark:bg-slate-900/50',
        isSelected && 'ring-2 ring-indigo-500 ring-offset-2'
      )}
      onClick={onClick}
    >
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-12 text-slate-900 dark:text-white">
          {title}
        </h2>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan, index) => (
            <div 
              key={index}
              className={cn(
                'p-6 rounded-2xl border-2 transition-all',
                plan.highlighted 
                  ? 'bg-indigo-600 text-white border-indigo-600 scale-105 shadow-xl' 
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
              )}
            >
              <h3 className={cn('text-xl font-semibold mb-2', !plan.highlighted && 'text-slate-900 dark:text-white')}>
                {plan.name}
              </h3>
              <div className="mb-4">
                <span className="text-4xl font-bold">{plan.price}</span>
                {plan.period && <span className={plan.highlighted ? 'opacity-80' : 'text-slate-500'}>/{plan.period}</span>}
              </div>
              <p className={cn('mb-6', plan.highlighted ? 'opacity-90' : 'text-slate-600 dark:text-slate-300')}>
                {plan.description}
              </p>
              <ul className="space-y-3 mb-6">
                {(plan.features || []).map((f: string, i: number) => (
                  <li key={i} className="flex items-center gap-2">
                    <svg className={cn('w-4 h-4', !plan.highlighted && 'text-indigo-500')} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span className={!plan.highlighted ? 'text-slate-600 dark:text-slate-300' : ''}>{f}</span>
                  </li>
                ))}
              </ul>
              <button className={cn(
                'w-full py-3 rounded-lg font-semibold transition-colors',
                plan.highlighted 
                  ? 'bg-white text-indigo-600 hover:bg-slate-100' 
                  : 'bg-indigo-600 text-white hover:bg-indigo-500'
              )}>
                {plan.cta || 'Commencer'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FAQRenderer({ section, isSelected, onClick }: SectionRendererProps) {
  const title = section.title || 'Questions fréquentes';
  const items = getData<any[]>(section, 'faqs', []) || getData<any[]>(section, 'items', []);

  return (
    <section 
      id="faq"
      className={cn(
        'py-20 md:py-28 px-6 bg-white dark:bg-slate-900',
        isSelected && 'ring-2 ring-indigo-500 ring-offset-2'
      )}
      onClick={onClick}
    >
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-12 text-slate-900 dark:text-white">
          {title}
        </h2>
        
        <div className="space-y-4">
          {items.map((item, index) => (
            <details key={index} className="group p-6 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <summary className="flex items-center justify-between cursor-pointer font-semibold text-slate-900 dark:text-white list-none">
                {item.question}
                <svg className="w-5 h-5 text-indigo-500 transform group-open:rotate-180 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </summary>
              <p className="mt-4 text-slate-600 dark:text-slate-300">{item.answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function GalleryRenderer({ section, isSelected, onClick }: SectionRendererProps) {
  const title = section.title || 'Galerie';
  const images = getData<any[]>(section, 'images', []) || getData<any[]>(section, 'items', []);

  return (
    <section 
      id="gallery"
      className={cn(
        'py-20 md:py-28 px-6 bg-slate-50 dark:bg-slate-900/50',
        isSelected && 'ring-2 ring-indigo-500 ring-offset-2'
      )}
      onClick={onClick}
    >
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-12 text-slate-900 dark:text-white">
          {title}
        </h2>
        
        {images.length > 0 ? (
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {images.map((img, index) => (
              <div key={index} className="group relative aspect-square rounded-xl overflow-hidden">
                <img 
                  src={img.url || img.src} 
                  alt={img.caption || img.alt || `Image ${index + 1}`}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                />
                {(img.caption || img.alt) && (
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                    <p className="text-white text-sm">{img.caption || img.alt}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-center text-slate-500">Aucune image dans la galerie.</p>
        )}
      </div>
    </section>
  );
}

export function BlogRenderer({ section, isSelected, onClick }: SectionRendererProps) {
  const title = section.title || 'Blog';
  const posts = getData<any[]>(section, 'posts', []);

  return (
    <section 
      id="blog"
      className={cn(
        'py-20 md:py-28 px-6 bg-white dark:bg-slate-900',
        isSelected && 'ring-2 ring-indigo-500 ring-offset-2'
      )}
      onClick={onClick}
    >
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-12 text-slate-900 dark:text-white">
          {title}
        </h2>
        
        {posts.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post, index) => (
              <article key={index} className="rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                {post.image && (
                  <div className="aspect-video">
                    <img src={post.image} alt={post.title} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="p-6">
                  {post.date && <time className="text-sm text-slate-500">{post.date}</time>}
                  <h3 className="text-xl font-semibold mt-2 text-slate-900 dark:text-white">{post.title}</h3>
                  {post.excerpt && <p className="text-slate-600 dark:text-slate-300 mt-2 line-clamp-2">{post.excerpt}</p>}
                  <a href="#" className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 mt-4 hover:underline">
                    Lire la suite
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                  </a>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="text-center text-slate-500">Aucun article de blog.</p>
        )}
      </div>
    </section>
  );
}

export function CustomRenderer({ section, isSelected, onClick }: SectionRendererProps) {
  const title = section.title || 'Section personnalisée';
  const content = getData(section, 'content', '');
  const html = getData(section, 'html', '');

  return (
    <section 
      id={section.section_type}
      className={cn(
        'py-20 md:py-28 px-6 bg-slate-50 dark:bg-slate-900/50',
        isSelected && 'ring-2 ring-indigo-500 ring-offset-2'
      )}
      onClick={onClick}
    >
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-center mb-12 text-slate-900 dark:text-white">
          {title}
        </h2>
        
        {html ? (
          <div className="prose prose-slate dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: html }} />
        ) : content ? (
          <div className="prose prose-slate dark:prose-invert max-w-none">
            <p>{content}</p>
          </div>
        ) : (
          <p className="text-center text-slate-500">Configurez le contenu de cette section.</p>
        )}
      </div>
    </section>
  );
}

// ============================================
// Main Section Renderer - Routes to correct renderer
// ============================================
const renderers: Record<string, React.ComponentType<SectionRendererProps>> = {
  hero: HeroRenderer,
  about: AboutRenderer,
  skills: SkillsRenderer,
  projects: ProjectsRenderer,
  experience: ExperienceRenderer,
  education: EducationRenderer,
  contact: ContactRenderer,
  testimonials: TestimonialsRenderer,
  services: ServicesRenderer,
  pricing: PricingRenderer,
  faq: FAQRenderer,
  gallery: GalleryRenderer,
  blog: BlogRenderer,
  custom: CustomRenderer,
};

export function SectionRenderer({ section, website, isSelected, isEditable, onClick }: SectionRendererProps) {
  const Renderer = renderers[section.section_type] || CustomRenderer;
  return <Renderer section={section} website={website} isSelected={isSelected} isEditable={isEditable} onClick={onClick} />;
}

export { renderers };
