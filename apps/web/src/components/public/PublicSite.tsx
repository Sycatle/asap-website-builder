/**
 * PublicSite - Main component for rendering published websites
 * Renders all sections with beautiful minimalist styling
 */

import React from 'react';
import type { PublicWebsite, PublicSection } from '@/lib/api/public';

interface Theme {
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
  accentColor: string;
}

interface PublicSiteProps {
  website: PublicWebsite;
  sections: PublicSection[];
  theme: Theme;
}

// ===============================================
// Section Renderers
// ===============================================

function HeroSection({ section, website, theme }: { section: PublicSection; website: PublicWebsite; theme: Theme }) {
  const content = section.content || {};
  const headline = content.headline || website.title;
  const subheadline = content.subheadline || website.tagline;
  const ctaText = content.ctaText || 'Me contacter';
  const ctaLink = content.ctaLink || '#contact';
  
  return (
    <section 
      id="hero"
      className="hero-section"
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '4rem 2rem',
        position: 'relative',
      }}
    >
      {/* Gradient background */}
      <div 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `radial-gradient(ellipse at center, ${theme.primaryColor}15 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}
      />
      
      <div style={{ position: 'relative', maxWidth: '800px' }}>
        <h1 
          style={{
            fontSize: 'clamp(2.5rem, 8vw, 5rem)',
            fontWeight: 800,
            marginBottom: '1.5rem',
            background: `linear-gradient(135deg, ${theme.textColor}, ${theme.primaryColor})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          {headline}
        </h1>
        
        <p 
          style={{
            fontSize: 'clamp(1.1rem, 3vw, 1.5rem)',
            color: `${theme.textColor}99`,
            marginBottom: '2.5rem',
            maxWidth: '600px',
            margin: '0 auto 2.5rem',
          }}
        >
          {subheadline}
        </p>
        
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a 
            href={ctaLink}
            style={{
              padding: '1rem 2rem',
              background: theme.primaryColor,
              color: 'white',
              borderRadius: '0.75rem',
              fontWeight: 600,
              fontSize: '1.1rem',
              transition: 'transform 0.2s, box-shadow 0.2s',
              boxShadow: `0 4px 20px ${theme.primaryColor}40`,
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = `0 8px 30px ${theme.primaryColor}60`;
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = `0 4px 20px ${theme.primaryColor}40`;
            }}
          >
            {ctaText}
          </a>
          
          {content.secondaryCta && (
            <a 
              href={content.secondaryCtaLink || '#about'}
              style={{
                padding: '1rem 2rem',
                background: 'transparent',
                color: theme.textColor,
                border: `2px solid ${theme.textColor}30`,
                borderRadius: '0.75rem',
                fontWeight: 600,
                fontSize: '1.1rem',
                transition: 'border-color 0.2s',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.borderColor = theme.primaryColor;
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.borderColor = `${theme.textColor}30`;
              }}
            >
              {content.secondaryCta}
            </a>
          )}
        </div>
      </div>
      
      {/* Scroll indicator */}
      <div 
        className="scroll-indicator"
        style={{
          position: 'absolute',
          bottom: '2rem',
          left: '50%',
          transform: 'translateX(-50%)',
          opacity: 0.5,
        }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={theme.textColor} strokeWidth="2">
          <path d="M12 5v14M5 12l7 7 7-7" />
        </svg>
      </div>
    </section>
  );
}

function AboutSection({ section, theme }: { section: PublicSection; theme: Theme }) {
  const content = section.content || {};
  const title = content.title || section.title || 'À propos';
  const bio = content.bio || content.description || '';
  const imageUrl = content.imageUrl || content.image;
  
  return (
    <section 
      id="about"
      style={{
        padding: '6rem 2rem',
        maxWidth: '1200px',
        margin: '0 auto',
      }}
    >
      <h2 
        style={{
          fontSize: '2.5rem',
          fontWeight: 700,
          marginBottom: '3rem',
          textAlign: 'center',
        }}
      >
        {title}
      </h2>
      
      <div 
        style={{
          display: 'grid',
          gridTemplateColumns: imageUrl ? 'repeat(auto-fit, minmax(300px, 1fr))' : '1fr',
          gap: '3rem',
          alignItems: 'center',
        }}
      >
        {imageUrl && (
          <div style={{ textAlign: 'center' }}>
            <img 
              src={imageUrl}
              alt="Profile"
              style={{
                width: '100%',
                maxWidth: '400px',
                borderRadius: '1rem',
                boxShadow: `0 20px 40px ${theme.backgroundColor === '#0f172a' ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.1)'}`,
              }}
            />
          </div>
        )}
        
        <div>
          <p 
            style={{
              fontSize: '1.15rem',
              lineHeight: 1.8,
              color: `${theme.textColor}cc`,
              whiteSpace: 'pre-line',
            }}
          >
            {bio}
          </p>
        </div>
      </div>
    </section>
  );
}

function SkillsSection({ section, theme }: { section: PublicSection; theme: Theme }) {
  const content = section.content || {};
  const title = content.title || section.title || 'Compétences';
  const categories = content.categories || [];
  
  return (
    <section 
      id="skills"
      style={{
        padding: '6rem 2rem',
        background: `${theme.primaryColor}08`,
      }}
    >
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <h2 
          style={{
            fontSize: '2.5rem',
            fontWeight: 700,
            marginBottom: '3rem',
            textAlign: 'center',
          }}
        >
          {title}
        </h2>
        
        <div 
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '2rem',
          }}
        >
          {categories.map((category: any, index: number) => (
            <div 
              key={index}
              style={{
                background: theme.backgroundColor,
                padding: '2rem',
                borderRadius: '1rem',
                border: `1px solid ${theme.textColor}15`,
              }}
            >
              <h3 
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 600,
                  marginBottom: '1.5rem',
                  color: theme.primaryColor,
                }}
              >
                {category.name}
              </h3>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                {(category.skills || []).map((skill: string, skillIndex: number) => (
                  <span 
                    key={skillIndex}
                    style={{
                      padding: '0.5rem 1rem',
                      background: `${theme.primaryColor}15`,
                      borderRadius: '2rem',
                      fontSize: '0.9rem',
                      color: theme.textColor,
                    }}
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

function ProjectsSection({ section, theme }: { section: PublicSection; theme: Theme }) {
  const content = section.content || {};
  const title = content.title || section.title || 'Projets';
  const projects = content.projects || [];
  
  return (
    <section 
      id="projects"
      style={{
        padding: '6rem 2rem',
        maxWidth: '1200px',
        margin: '0 auto',
      }}
    >
      <h2 
        style={{
          fontSize: '2.5rem',
          fontWeight: 700,
          marginBottom: '3rem',
          textAlign: 'center',
        }}
      >
        {title}
      </h2>
      
      <div 
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
          gap: '2rem',
        }}
      >
        {projects.map((project: any, index: number) => (
          <div 
            key={index}
            style={{
              background: `${theme.textColor}05`,
              borderRadius: '1rem',
              overflow: 'hidden',
              border: `1px solid ${theme.textColor}15`,
              transition: 'transform 0.2s, box-shadow 0.2s',
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = `0 20px 40px ${theme.backgroundColor === '#0f172a' ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.1)'}`;
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {project.imageUrl && (
              <img 
                src={project.imageUrl}
                alt={project.title}
                style={{
                  width: '100%',
                  height: '200px',
                  objectFit: 'cover',
                }}
              />
            )}
            
            <div style={{ padding: '1.5rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.75rem' }}>
                {project.title}
              </h3>
              
              <p style={{ color: `${theme.textColor}99`, marginBottom: '1rem', fontSize: '0.95rem' }}>
                {project.description}
              </p>
              
              {project.technologies && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
                  {project.technologies.map((tech: string, techIndex: number) => (
                    <span 
                      key={techIndex}
                      style={{
                        padding: '0.25rem 0.75rem',
                        background: `${theme.primaryColor}20`,
                        borderRadius: '1rem',
                        fontSize: '0.8rem',
                        color: theme.primaryColor,
                      }}
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              )}
              
              <div style={{ display: 'flex', gap: '1rem' }}>
                {project.liveUrl && (
                  <a 
                    href={project.liveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: '0.5rem 1rem',
                      background: theme.primaryColor,
                      color: 'white',
                      borderRadius: '0.5rem',
                      fontSize: '0.9rem',
                      fontWeight: 500,
                    }}
                  >
                    Voir le projet
                  </a>
                )}
                
                {project.githubUrl && (
                  <a 
                    href={project.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      padding: '0.5rem 1rem',
                      border: `1px solid ${theme.textColor}30`,
                      color: theme.textColor,
                      borderRadius: '0.5rem',
                      fontSize: '0.9rem',
                      fontWeight: 500,
                    }}
                  >
                    GitHub
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ExperienceSection({ section, theme }: { section: PublicSection; theme: Theme }) {
  const content = section.content || {};
  const title = content.title || section.title || 'Expérience';
  const experiences = content.experiences || content.items || [];
  
  return (
    <section 
      id="experience"
      style={{
        padding: '6rem 2rem',
        background: `${theme.primaryColor}08`,
      }}
    >
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <h2 
          style={{
            fontSize: '2.5rem',
            fontWeight: 700,
            marginBottom: '3rem',
            textAlign: 'center',
          }}
        >
          {title}
        </h2>
        
        <div style={{ position: 'relative' }}>
          {/* Timeline line */}
          <div 
            style={{
              position: 'absolute',
              left: '0',
              top: '0',
              bottom: '0',
              width: '2px',
              background: `linear-gradient(to bottom, ${theme.primaryColor}, ${theme.accentColor})`,
            }}
          />
          
          {experiences.map((exp: any, index: number) => (
            <div 
              key={index}
              style={{
                paddingLeft: '2rem',
                paddingBottom: '2rem',
                position: 'relative',
              }}
            >
              {/* Timeline dot */}
              <div 
                style={{
                  position: 'absolute',
                  left: '-6px',
                  top: '0',
                  width: '14px',
                  height: '14px',
                  background: theme.primaryColor,
                  borderRadius: '50%',
                  border: `3px solid ${theme.backgroundColor}`,
                }}
              />
              
              <div 
                style={{
                  background: theme.backgroundColor,
                  padding: '1.5rem',
                  borderRadius: '1rem',
                  border: `1px solid ${theme.textColor}15`,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 600 }}>
                    {exp.title || exp.position}
                  </h3>
                  <span style={{ fontSize: '0.85rem', color: theme.primaryColor }}>
                    {exp.period || exp.date}
                  </span>
                </div>
                
                <p style={{ color: `${theme.textColor}99`, marginBottom: '0.75rem', fontWeight: 500 }}>
                  {exp.company || exp.organization}
                </p>
                
                {exp.description && (
                  <p style={{ fontSize: '0.95rem', color: `${theme.textColor}cc` }}>
                    {exp.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ContactSection({ section, theme }: { section: PublicSection; theme: Theme }) {
  const content = section.content || {};
  const title = content.title || section.title || 'Contact';
  const email = content.email || '';
  const description = content.description || "N'hésitez pas à me contacter pour discuter de vos projets.";
  const socials = content.socials || content.socialLinks || {};
  
  return (
    <section 
      id="contact"
      style={{
        padding: '6rem 2rem',
        maxWidth: '800px',
        margin: '0 auto',
        textAlign: 'center',
      }}
    >
      <h2 
        style={{
          fontSize: '2.5rem',
          fontWeight: 700,
          marginBottom: '1.5rem',
        }}
      >
        {title}
      </h2>
      
      <p 
        style={{
          fontSize: '1.15rem',
          color: `${theme.textColor}99`,
          marginBottom: '2rem',
        }}
      >
        {description}
      </p>
      
      {email && (
        <a 
          href={`mailto:${email}`}
          style={{
            display: 'inline-block',
            padding: '1rem 2rem',
            background: theme.primaryColor,
            color: 'white',
            borderRadius: '0.75rem',
            fontWeight: 600,
            fontSize: '1.1rem',
            marginBottom: '2rem',
            boxShadow: `0 4px 20px ${theme.primaryColor}40`,
          }}
        >
          {email}
        </a>
      )}
      
      {/* Social Links */}
      {Object.keys(socials).length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem' }}>
          {socials.github && (
            <a 
              href={socials.github}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: '0.75rem 1.5rem',
                border: `1px solid ${theme.textColor}30`,
                borderRadius: '0.5rem',
                color: theme.textColor,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
              </svg>
              GitHub
            </a>
          )}
          
          {socials.linkedin && (
            <a 
              href={socials.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: '0.75rem 1.5rem',
                border: `1px solid ${theme.textColor}30`,
                borderRadius: '0.5rem',
                color: theme.textColor,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/>
              </svg>
              LinkedIn
            </a>
          )}
          
          {socials.twitter && (
            <a 
              href={socials.twitter}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: '0.75rem 1.5rem',
                border: `1px solid ${theme.textColor}30`,
                borderRadius: '0.5rem',
                color: theme.textColor,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
              Twitter
            </a>
          )}
        </div>
      )}
    </section>
  );
}

function GenericSection({ section, theme }: { section: PublicSection; theme: Theme }) {
  const content = section.content || {};
  const title = content.title || section.title;
  const description = content.description || content.text || '';
  
  return (
    <section 
      id={section.section_type}
      style={{
        padding: '6rem 2rem',
        maxWidth: '800px',
        margin: '0 auto',
      }}
    >
      <h2 
        style={{
          fontSize: '2.5rem',
          fontWeight: 700,
          marginBottom: '2rem',
          textAlign: 'center',
        }}
      >
        {title}
      </h2>
      
      {description && (
        <p 
          style={{
            fontSize: '1.1rem',
            color: `${theme.textColor}cc`,
            textAlign: 'center',
            lineHeight: 1.8,
            whiteSpace: 'pre-line',
          }}
        >
          {description}
        </p>
      )}
    </section>
  );
}

// ===============================================
// Main PublicSite Component
// ===============================================

export default function PublicSite({ website, sections, theme }: PublicSiteProps) {
  // Sort sections by order_index
  const sortedSections = [...sections]
    .filter(s => s.visible !== false)
    .sort((a, b) => (a.order_index || 0) - (b.order_index || 0));

  // If no sections, show a basic page with website info
  if (sortedSections.length === 0) {
    return (
      <main>
        <HeroSection 
          section={{
            id: 'default-hero',
            website_id: website.id,
            section_type: 'hero',
            title: website.title,
            layout: 'full',
            content: {
              headline: website.title,
              subheadline: website.tagline,
            },
            settings: {},
            visible: true,
            order_index: 0,
          }}
          website={website}
          theme={theme}
        />
      </main>
    );
  }

  // Render section based on type
  const renderSection = (section: PublicSection) => {
    const props = { section, theme, website };
    
    switch (section.section_type) {
      case 'hero':
        return <HeroSection key={section.id} {...props} />;
      case 'about':
        return <AboutSection key={section.id} section={section} theme={theme} />;
      case 'skills':
        return <SkillsSection key={section.id} section={section} theme={theme} />;
      case 'projects':
        return <ProjectsSection key={section.id} section={section} theme={theme} />;
      case 'experience':
        return <ExperienceSection key={section.id} section={section} theme={theme} />;
      case 'education':
        return <ExperienceSection key={section.id} section={section} theme={theme} />;
      case 'contact':
        return <ContactSection key={section.id} section={section} theme={theme} />;
      default:
        return <GenericSection key={section.id} section={section} theme={theme} />;
    }
  };

  return (
    <main>
      {sortedSections.map(renderSection)}
    </main>
  );
}
