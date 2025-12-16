"use client"

import type { Section } from "@/lib/api"
import { 
  Mail, 
  Github, 
  Linkedin, 
  Twitter, 
  ExternalLink,
  MapPin,
  Phone,
  Calendar,
  ArrowRight,
  Star,
  Quote,
  Check,
} from "lucide-react"

/**
 * Section renderers for the preview system
 * Each renderer takes a section and renders it as it would appear on the final site
 */

interface SectionRendererProps {
  section: Section
  isSelected?: boolean
  onClick?: () => void
}

// Helper to get data with defaults
function getData<T>(section: Section, key: string, defaultValue: T): T {
  return (section.data?.[key] as T) ?? defaultValue
}

// ============================================
// Hero Section Renderer
// ============================================
export function HeroRenderer({ section, isSelected, onClick }: SectionRendererProps) {
  const name = getData(section, 'name', 'Votre Nom')
  const title = getData(section, 'title', 'Développeur Full Stack')
  const subtitle = getData(section, 'subtitle', 'Créateur de solutions numériques innovantes')
  const ctaText = getData(section, 'cta_text', 'Voir mes projets')
  const ctaLink = getData(section, 'cta_link', '#projects')
  const backgroundImage = getData(section, 'background_image', '')

  return (
    <section 
      className={`min-h-[80vh] flex items-center justify-center relative overflow-hidden transition-all duration-200 ${
        isSelected ? 'ring-2 ring-primary ring-offset-2' : ''
      }`}
      onClick={onClick}
      style={{
        backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
      
      {/* Content */}
      <div className="relative z-10 text-center px-6 py-20 max-w-4xl mx-auto">
        <h1 className="text-5xl md:text-7xl font-bold text-white mb-4 tracking-tight">
          {name}
        </h1>
        <h2 className="text-2xl md:text-3xl text-primary font-medium mb-6">
          {title}
        </h2>
        <p className="text-lg md:text-xl text-slate-300 mb-10 max-w-2xl mx-auto">
          {subtitle}
        </p>
        <a 
          href={ctaLink}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-lg font-semibold text-lg hover:bg-primary/90 transition-colors"
        >
          {ctaText}
          <ArrowRight className="w-5 h-5" />
        </a>
      </div>

      {/* Decorative elements */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
    </section>
  )
}

// ============================================
// About Section Renderer
// ============================================
export function AboutRenderer({ section, isSelected, onClick }: SectionRendererProps) {
  const title = section.title || 'À propos'
  const description = getData(section, 'description', 'Passionné par le développement web et les nouvelles technologies, je crée des applications modernes et performantes.')
  const image = getData(section, 'image', '')
  const highlights = getData<string[]>(section, 'highlights', [
    '5+ années d\'expérience',
    'Projets internationaux',
    'Technologies modernes'
  ])

  return (
    <section 
      className={`py-20 px-6 bg-slate-50 dark:bg-slate-900/50 transition-all duration-200 ${
        isSelected ? 'ring-2 ring-primary ring-offset-2' : ''
      }`}
      onClick={onClick}
    >
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-slate-900 dark:text-white">
          {title}
        </h2>
        
        <div className={`grid gap-12 items-center ${section.layout === 'split' ? 'md:grid-cols-2' : ''}`}>
          {image && section.layout === 'split' && (
            <div className="relative">
              <div className="aspect-square rounded-2xl overflow-hidden bg-slate-200 dark:bg-slate-800">
                <img 
                  src={image} 
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-primary/20 rounded-2xl -z-10" />
            </div>
          )}
          
          <div className="space-y-6">
            <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed">
              {description}
            </p>
            
            {highlights.length > 0 && (
              <ul className="space-y-3">
                {highlights.map((item, index) => (
                  <li key={index} className="flex items-center gap-3 text-slate-700 dark:text-slate-200">
                    <Check className="w-5 h-5 text-primary flex-shrink-0" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

// ============================================
// Skills Section Renderer
// ============================================
interface SkillCategory {
  name: string
  skills: string[]
}

export function SkillsRenderer({ section, isSelected, onClick }: SectionRendererProps) {
  const title = section.title || 'Compétences'
  const categories = getData<SkillCategory[]>(section, 'categories', [
    { name: 'Frontend', skills: ['React', 'TypeScript', 'Tailwind CSS'] },
    { name: 'Backend', skills: ['Node.js', 'Rust', 'PostgreSQL'] },
    { name: 'DevOps', skills: ['Docker', 'AWS', 'CI/CD'] },
  ])

  return (
    <section 
      className={`py-20 px-6 bg-white dark:bg-slate-900 transition-all duration-200 ${
        isSelected ? 'ring-2 ring-primary ring-offset-2' : ''
      }`}
      onClick={onClick}
    >
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-slate-900 dark:text-white">
          {title}
        </h2>
        
        <div className={`grid gap-8 ${section.layout === 'grid' ? 'md:grid-cols-3' : ''}`}>
          {categories.map((category, index) => (
            <div 
              key={index}
              className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700"
            >
              <h3 className="text-xl font-semibold mb-4 text-slate-900 dark:text-white">
                {category.name}
              </h3>
              <div className="flex flex-wrap gap-2">
                {category.skills.map((skill, skillIndex) => (
                  <span 
                    key={skillIndex}
                    className="px-3 py-1.5 text-sm rounded-full bg-primary/10 text-primary font-medium"
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
  )
}

// ============================================
// Projects Section Renderer
// ============================================
interface Project {
  title: string
  description: string
  image?: string
  tags?: string[]
  link?: string
  github?: string
}

export function ProjectsRenderer({ section, isSelected, onClick }: SectionRendererProps) {
  const title = section.title || 'Projets'
  const projects = getData<Project[]>(section, 'projects', [
    {
      title: 'Projet 1',
      description: 'Description du projet avec les technologies utilisées.',
      tags: ['React', 'Node.js'],
    },
    {
      title: 'Projet 2',
      description: 'Un autre projet innovant.',
      tags: ['TypeScript', 'PostgreSQL'],
    },
  ])

  return (
    <section 
      className={`py-20 px-6 bg-slate-50 dark:bg-slate-900/50 transition-all duration-200 ${
        isSelected ? 'ring-2 ring-primary ring-offset-2' : ''
      }`}
      onClick={onClick}
      id="projects"
    >
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-slate-900 dark:text-white">
          {title}
        </h2>
        
        <div className={`grid gap-6 ${section.layout === 'grid' ? 'md:grid-cols-2 lg:grid-cols-3' : ''}`}>
          {projects.map((project, index) => (
            <div 
              key={index}
              className="group rounded-2xl overflow-hidden bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:shadow-xl transition-all duration-300"
            >
              {project.image && (
                <div className="aspect-video bg-slate-200 dark:bg-slate-700 overflow-hidden">
                  <img 
                    src={project.image} 
                    alt={project.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              )}
              <div className="p-6">
                <h3 className="text-xl font-semibold mb-2 text-slate-900 dark:text-white">
                  {project.title}
                </h3>
                <p className="text-slate-600 dark:text-slate-300 mb-4">
                  {project.description}
                </p>
                {project.tags && (
                  <div className="flex flex-wrap gap-2 mb-4">
                    {project.tags.map((tag, tagIndex) => (
                      <span 
                        key={tagIndex}
                        className="px-2 py-1 text-xs rounded bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <div className="flex gap-3">
                  {project.link && (
                    <a 
                      href={project.link}
                      className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Voir
                    </a>
                  )}
                  {project.github && (
                    <a 
                      href={project.github}
                      className="inline-flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400 hover:text-primary"
                    >
                      <Github className="w-4 h-4" />
                      Code
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ============================================
// Experience Section Renderer
// ============================================
interface Experience {
  title: string
  company: string
  period: string
  description: string
  current?: boolean
}

export function ExperienceRenderer({ section, isSelected, onClick }: SectionRendererProps) {
  const title = section.title || 'Expérience'
  const experiences = getData<Experience[]>(section, 'experiences', [
    {
      title: 'Développeur Senior',
      company: 'Entreprise Tech',
      period: '2022 - Présent',
      description: 'Développement d\'applications web modernes.',
      current: true,
    },
    {
      title: 'Développeur Full Stack',
      company: 'Startup Innovation',
      period: '2020 - 2022',
      description: 'Création de solutions digitales.',
    },
  ])

  return (
    <section 
      className={`py-20 px-6 bg-white dark:bg-slate-900 transition-all duration-200 ${
        isSelected ? 'ring-2 ring-primary ring-offset-2' : ''
      }`}
      onClick={onClick}
    >
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-slate-900 dark:text-white">
          {title}
        </h2>
        
        <div className="relative">
          {/* Timeline line */}
          {section.layout === 'timeline' && (
            <div className="absolute left-0 md:left-1/2 top-0 bottom-0 w-px bg-slate-200 dark:bg-slate-700 transform -translate-x-1/2" />
          )}
          
          <div className="space-y-12">
            {experiences.map((exp, index) => (
              <div 
                key={index}
                className={`relative ${section.layout === 'timeline' ? 'md:grid md:grid-cols-2 md:gap-8' : ''}`}
              >
                {section.layout === 'timeline' && (
                  <div className="absolute left-0 md:left-1/2 top-0 w-4 h-4 rounded-full bg-primary transform -translate-x-1/2 ring-4 ring-white dark:ring-slate-900" />
                )}
                
                <div className={`${section.layout === 'timeline' ? 'md:text-right md:pr-8 ml-8 md:ml-0' : ''}`}>
                  <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 mb-1">
                    <Calendar className="w-4 h-4" />
                    {exp.period}
                    {exp.current && (
                      <span className="px-2 py-0.5 text-xs rounded-full bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        Actuel
                      </span>
                    )}
                  </div>
                </div>
                
                <div className={`${section.layout === 'timeline' ? 'ml-8 md:ml-0 md:pl-8' : 'mt-2'}`}>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                    {exp.title}
                  </h3>
                  <p className="text-primary font-medium mb-2">{exp.company}</p>
                  <p className="text-slate-600 dark:text-slate-300">{exp.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

// ============================================
// Education Section Renderer
// ============================================
interface Education {
  degree: string
  school: string
  period: string
  description?: string
}

export function EducationRenderer({ section, isSelected, onClick }: SectionRendererProps) {
  const title = section.title || 'Formation'
  const education = getData<Education[]>(section, 'education', [
    {
      degree: 'Master en Informatique',
      school: 'Université Tech',
      period: '2018 - 2020',
      description: 'Spécialisation en développement logiciel.',
    },
  ])

  return (
    <section 
      className={`py-20 px-6 bg-slate-50 dark:bg-slate-900/50 transition-all duration-200 ${
        isSelected ? 'ring-2 ring-primary ring-offset-2' : ''
      }`}
      onClick={onClick}
    >
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-slate-900 dark:text-white">
          {title}
        </h2>
        
        <div className="space-y-8">
          {education.map((edu, index) => (
            <div 
              key={index}
              className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                    {edu.degree}
                  </h3>
                  <p className="text-primary font-medium">{edu.school}</p>
                  {edu.description && (
                    <p className="text-slate-600 dark:text-slate-300 mt-2">{edu.description}</p>
                  )}
                </div>
                <span className="text-sm text-slate-500 dark:text-slate-400 whitespace-nowrap">
                  {edu.period}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ============================================
// Contact Section Renderer
// ============================================
export function ContactRenderer({ section, isSelected, onClick }: SectionRendererProps) {
  const title = section.title || 'Contact'
  const email = getData(section, 'email', 'contact@example.com')
  const phone = getData(section, 'phone', '')
  const location = getData(section, 'location', '')
  const socials = getData<{ platform: string; url: string }[]>(section, 'socials', [])

  const socialIcons: Record<string, React.ElementType> = {
    github: Github,
    linkedin: Linkedin,
    twitter: Twitter,
  }

  return (
    <section 
      className={`py-20 px-6 bg-white dark:bg-slate-900 transition-all duration-200 ${
        isSelected ? 'ring-2 ring-primary ring-offset-2' : ''
      }`}
      onClick={onClick}
    >
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-slate-900 dark:text-white">
          {title}
        </h2>
        <p className="text-center text-slate-600 dark:text-slate-300 mb-12 max-w-xl mx-auto">
          N'hésitez pas à me contacter pour discuter de votre projet.
        </p>
        
        <div className={`grid gap-8 ${section.layout === 'split' ? 'md:grid-cols-2' : ''}`}>
          {/* Contact info */}
          <div className="space-y-4">
            <a 
              href={`mailto:${email}`}
              className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-slate-500 dark:text-slate-400">Email</p>
                <p className="font-medium text-slate-900 dark:text-white">{email}</p>
              </div>
            </a>
            
            {phone && (
              <a 
                href={`tel:${phone}`}
                className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Phone className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Téléphone</p>
                  <p className="font-medium text-slate-900 dark:text-white">{phone}</p>
                </div>
              </a>
            )}
            
            {location && (
              <div className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Localisation</p>
                  <p className="font-medium text-slate-900 dark:text-white">{location}</p>
                </div>
              </div>
            )}
            
            {socials.length > 0 && (
              <div className="flex gap-3 pt-4">
                {socials.map((social, index) => {
                  const Icon = socialIcons[social.platform.toLowerCase()] || ExternalLink
                  return (
                    <a
                      key={index}
                      href={social.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-primary hover:text-white transition-colors"
                    >
                      <Icon className="w-5 h-5" />
                    </a>
                  )
                })}
              </div>
            )}
          </div>
          
          {/* Contact form placeholder */}
          {section.layout === 'split' && (
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <h3 className="text-lg font-semibold mb-4 text-slate-900 dark:text-white">
                Envoyer un message
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Nom</label>
                  <input 
                    type="text" 
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Votre nom"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Email</label>
                  <input 
                    type="email" 
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="votre@email.com"
                  />
                </div>
                <div>
                  <label className="block text-sm text-slate-600 dark:text-slate-400 mb-1">Message</label>
                  <textarea 
                    className="w-full px-4 py-2 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                    rows={4}
                    placeholder="Votre message..."
                  />
                </div>
                <button className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-lg font-semibold hover:bg-primary/90 transition-colors">
                  Envoyer
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

// ============================================
// Testimonials Section Renderer
// ============================================
interface Testimonial {
  name: string
  role: string
  company?: string
  content: string
  avatar?: string
  rating?: number
}

export function TestimonialsRenderer({ section, isSelected, onClick }: SectionRendererProps) {
  const title = section.title || 'Témoignages'
  const testimonials = getData<Testimonial[]>(section, 'testimonials', [
    {
      name: 'Marie Dupont',
      role: 'CEO',
      company: 'TechCorp',
      content: 'Excellent travail, très professionnel et réactif.',
      rating: 5,
    },
  ])

  return (
    <section 
      className={`py-20 px-6 bg-slate-50 dark:bg-slate-900/50 transition-all duration-200 ${
        isSelected ? 'ring-2 ring-primary ring-offset-2' : ''
      }`}
      onClick={onClick}
    >
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-slate-900 dark:text-white">
          {title}
        </h2>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((testimonial, index) => (
            <div 
              key={index}
              className="p-6 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
            >
              <Quote className="w-8 h-8 text-primary/30 mb-4" />
              
              {testimonial.rating && (
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star 
                      key={i}
                      className={`w-4 h-4 ${i < testimonial.rating! ? 'text-yellow-400 fill-yellow-400' : 'text-slate-300'}`}
                    />
                  ))}
                </div>
              )}
              
              <p className="text-slate-600 dark:text-slate-300 mb-6 italic">
                "{testimonial.content}"
              </p>
              
              <div className="flex items-center gap-3">
                {testimonial.avatar ? (
                  <img 
                    src={testimonial.avatar} 
                    alt={testimonial.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                    {testimonial.name.charAt(0)}
                  </div>
                )}
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">
                    {testimonial.name}
                  </p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {testimonial.role}
                    {testimonial.company && ` @ ${testimonial.company}`}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ============================================
// Services Section Renderer
// ============================================
interface Service {
  title: string
  description: string
  icon?: string
  features?: string[]
}

export function ServicesRenderer({ section, isSelected, onClick }: SectionRendererProps) {
  const title = section.title || 'Services'
  const services = getData<Service[]>(section, 'services', [
    {
      title: 'Développement Web',
      description: 'Création de sites web modernes et performants.',
      features: ['React / Next.js', 'API REST', 'Base de données'],
    },
  ])

  return (
    <section 
      className={`py-20 px-6 bg-white dark:bg-slate-900 transition-all duration-200 ${
        isSelected ? 'ring-2 ring-primary ring-offset-2' : ''
      }`}
      onClick={onClick}
    >
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-slate-900 dark:text-white">
          {title}
        </h2>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {services.map((service, index) => (
            <div 
              key={index}
              className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-primary/50 transition-colors"
            >
              <h3 className="text-xl font-semibold mb-3 text-slate-900 dark:text-white">
                {service.title}
              </h3>
              <p className="text-slate-600 dark:text-slate-300 mb-4">
                {service.description}
              </p>
              {service.features && (
                <ul className="space-y-2">
                  {service.features.map((feature, fIndex) => (
                    <li key={fIndex} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                      <Check className="w-4 h-4 text-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ============================================
// Pricing Section Renderer
// ============================================
interface PricingPlan {
  name: string
  price: string
  period?: string
  description: string
  features: string[]
  highlighted?: boolean
  cta?: string
}

export function PricingRenderer({ section, isSelected, onClick }: SectionRendererProps) {
  const title = section.title || 'Tarifs'
  const plans = getData<PricingPlan[]>(section, 'plans', [
    {
      name: 'Starter',
      price: '500€',
      description: 'Pour les petits projets',
      features: ['Site one-page', 'Design responsive', 'SEO de base'],
    },
    {
      name: 'Pro',
      price: '1500€',
      description: 'Pour les entreprises',
      features: ['Site multi-pages', 'CMS intégré', 'Support prioritaire'],
      highlighted: true,
    },
  ])

  return (
    <section 
      className={`py-20 px-6 bg-slate-50 dark:bg-slate-900/50 transition-all duration-200 ${
        isSelected ? 'ring-2 ring-primary ring-offset-2' : ''
      }`}
      onClick={onClick}
    >
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-slate-900 dark:text-white">
          {title}
        </h2>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan, index) => (
            <div 
              key={index}
              className={`p-6 rounded-2xl border-2 transition-all ${
                plan.highlighted 
                  ? 'bg-primary text-primary-foreground border-primary scale-105' 
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
              }`}
            >
              <h3 className={`text-xl font-semibold mb-2 ${plan.highlighted ? '' : 'text-slate-900 dark:text-white'}`}>
                {plan.name}
              </h3>
              <div className="mb-4">
                <span className="text-4xl font-bold">{plan.price}</span>
                {plan.period && (
                  <span className={`text-sm ${plan.highlighted ? 'opacity-80' : 'text-slate-500'}`}>
                    /{plan.period}
                  </span>
                )}
              </div>
              <p className={`mb-6 ${plan.highlighted ? 'opacity-90' : 'text-slate-600 dark:text-slate-300'}`}>
                {plan.description}
              </p>
              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, fIndex) => (
                  <li key={fIndex} className="flex items-center gap-2">
                    <Check className={`w-4 h-4 ${plan.highlighted ? '' : 'text-primary'}`} />
                    <span className={plan.highlighted ? '' : 'text-slate-600 dark:text-slate-300'}>
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>
              <button 
                className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                  plan.highlighted 
                    ? 'bg-white text-primary hover:bg-slate-100' 
                    : 'bg-primary text-primary-foreground hover:bg-primary/90'
                }`}
              >
                {plan.cta || 'Commencer'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ============================================
// FAQ Section Renderer
// ============================================
interface FAQItem {
  question: string
  answer: string
}

export function FAQRenderer({ section, isSelected, onClick }: SectionRendererProps) {
  const title = section.title || 'Questions fréquentes'
  const items = getData<FAQItem[]>(section, 'items', [
    {
      question: 'Quels sont les délais de livraison ?',
      answer: 'Les délais varient selon la complexité du projet, généralement entre 2 et 8 semaines.',
    },
  ])

  return (
    <section 
      className={`py-20 px-6 bg-white dark:bg-slate-900 transition-all duration-200 ${
        isSelected ? 'ring-2 ring-primary ring-offset-2' : ''
      }`}
      onClick={onClick}
    >
      <div className="max-w-3xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-slate-900 dark:text-white">
          {title}
        </h2>
        
        <div className="space-y-4">
          {items.map((item, index) => (
            <details 
              key={index}
              className="group p-6 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
            >
              <summary className="flex items-center justify-between cursor-pointer font-semibold text-slate-900 dark:text-white list-none">
                {item.question}
                <span className="transform group-open:rotate-180 transition-transform">
                  ▼
                </span>
              </summary>
              <p className="mt-4 text-slate-600 dark:text-slate-300">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  )
}

// ============================================
// Gallery Section Renderer
// ============================================
export function GalleryRenderer({ section, isSelected, onClick }: SectionRendererProps) {
  const title = section.title || 'Galerie'
  const images = getData<{ url: string; caption?: string }[]>(section, 'images', [])

  return (
    <section 
      className={`py-20 px-6 bg-slate-50 dark:bg-slate-900/50 transition-all duration-200 ${
        isSelected ? 'ring-2 ring-primary ring-offset-2' : ''
      }`}
      onClick={onClick}
    >
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-slate-900 dark:text-white">
          {title}
        </h2>
        
        {images.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            Ajoutez des images à votre galerie
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {images.map((image, index) => (
              <div key={index} className="group relative aspect-square rounded-xl overflow-hidden">
                <img 
                  src={image.url} 
                  alt={image.caption || `Image ${index + 1}`}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
                {image.caption && (
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                    <p className="text-white text-sm">{image.caption}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

// ============================================
// Blog Section Renderer
// ============================================
interface BlogPost {
  title: string
  excerpt: string
  date: string
  image?: string
  slug?: string
}

export function BlogRenderer({ section, isSelected, onClick }: SectionRendererProps) {
  const title = section.title || 'Blog'
  const posts = getData<BlogPost[]>(section, 'posts', [])

  return (
    <section 
      className={`py-20 px-6 bg-white dark:bg-slate-900 transition-all duration-200 ${
        isSelected ? 'ring-2 ring-primary ring-offset-2' : ''
      }`}
      onClick={onClick}
    >
      <div className="max-w-6xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-slate-900 dark:text-white">
          {title}
        </h2>
        
        {posts.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            Aucun article de blog pour le moment
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {posts.map((post, index) => (
              <article key={index} className="rounded-2xl overflow-hidden bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                {post.image && (
                  <div className="aspect-video bg-slate-200 dark:bg-slate-700">
                    <img src={post.image} alt={post.title} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="p-6">
                  <time className="text-sm text-slate-500">{post.date}</time>
                  <h3 className="text-xl font-semibold mt-2 text-slate-900 dark:text-white">{post.title}</h3>
                  <p className="text-slate-600 dark:text-slate-300 mt-2">{post.excerpt}</p>
                  <a href={`#${post.slug || ''}`} className="inline-flex items-center gap-1 text-primary mt-4 hover:underline">
                    Lire la suite <ArrowRight className="w-4 h-4" />
                  </a>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

// ============================================
// Custom Section Renderer
// ============================================
export function CustomRenderer({ section, isSelected, onClick }: SectionRendererProps) {
  const title = section.title || 'Section personnalisée'
  const content = getData(section, 'content', '')
  const html = getData(section, 'html', '')

  return (
    <section 
      className={`py-20 px-6 bg-slate-50 dark:bg-slate-900/50 transition-all duration-200 ${
        isSelected ? 'ring-2 ring-primary ring-offset-2' : ''
      }`}
      onClick={onClick}
    >
      <div className="max-w-4xl mx-auto">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-slate-900 dark:text-white">
          {title}
        </h2>
        
        {html ? (
          <div 
            className="prose prose-slate dark:prose-invert max-w-none"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        ) : content ? (
          <div className="prose prose-slate dark:prose-invert max-w-none">
            <p>{content}</p>
          </div>
        ) : (
          <div className="text-center py-12 text-slate-500">
            Configurez le contenu de cette section
          </div>
        )}
      </div>
    </section>
  )
}

// ============================================
// Main Section Renderer - Routes to correct renderer
// ============================================
export function SectionRenderer({ section, isSelected, onClick }: SectionRendererProps) {
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
  }

  const Renderer = renderers[section.section_type] || CustomRenderer
  
  return <Renderer section={section} isSelected={isSelected} onClick={onClick} />
}
