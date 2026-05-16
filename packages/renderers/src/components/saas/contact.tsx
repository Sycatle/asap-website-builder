/**
 * Contact Section Component
 * 
 * Contact form section with multiple variants.
 * - simple: Simple contact form
 * - split: Form + contact info side by side
 * - map: Form with map integration
 */

import React, { useState } from 'react';
import { cn, getData, withVariantFields } from '../../utils';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { SectionWrapper } from '../ui/section-wrapper';
import { Container } from '../ui/container';
import { Icons, getIcon } from '../icons';
import { CONTACT_SCHEMA } from '@asap/shared';
import type { Section } from '../../types';
import { ContactInlineStrip } from './contact-variants/inline-strip';

export interface SectionProps {
  section: Section;
  className?: string;
}

interface SocialLink {
  platform: string;
  href: string;
}

export function ContactSection({ section: rawSection, className }: SectionProps) {
  const section = withVariantFields(rawSection);
  const variant = section.variant_key;
  if (variant === 'contact/inline-strip') {
    return <ContactInlineStrip section={section} className={className} />;
  }
  return <ContactDefault section={section} className={className} />;
}

function ContactDefault({ section, className }: SectionProps) {
  const defaults = CONTACT_SCHEMA.defaultSettings;

  // Extract data from section
  const variant = getData(section, 'variant', defaults.variant as string);
  const badgeText = getData(section, 'badge_text', defaults.badge_text as string);
  const headline = getData(section, 'headline', defaults.headline as string);
  const subheadline = getData(section, 'subheadline', defaults.subheadline as string);
  const email = getData(section, 'email', defaults.email as string);
  const phone = getData(section, 'phone', defaults.phone as string);
  const address = getData(section, 'address', defaults.address as string);
  const showName = getData(section, 'show_name', defaults.show_name as boolean);
  const showPhone = getData(section, 'show_phone', defaults.show_phone as boolean);
  const showSubject = getData(section, 'show_subject', defaults.show_subject as boolean);
  const submitText = getData(section, 'submit_text', defaults.submit_text as string);
  const successMessage = getData(section, 'success_message', defaults.success_message as string);
  const showSocial = getData(section, 'show_social', defaults.show_social as boolean);
  const socialLinks = getData(section, 'social_links', defaults.social_links as SocialLink[]);

  // Form state (for demo purposes)
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  // Contact form component
  const ContactForm = () => (
    <form onSubmit={handleSubmit} className="space-y-4">
      {showName && (
        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-1">
            Nom
          </label>
          <input
            type="text"
            id="name"
            name="name"
            placeholder="Votre nom"
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-background"
            required
          />
        </div>
      )}
      
      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-1">
          Email
        </label>
        <input
          type="email"
          id="email"
          name="email"
          placeholder="votre@email.com"
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-background"
          required
        />
      </div>

      {showPhone && (
        <div>
          <label htmlFor="phone" className="block text-sm font-medium mb-1">
            Téléphone
          </label>
          <input
            type="tel"
            id="phone"
            name="phone"
            placeholder="+33 1 23 45 67 89"
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-background"
          />
        </div>
      )}

      {showSubject && (
        <div>
          <label htmlFor="subject" className="block text-sm font-medium mb-1">
            Sujet
          </label>
          <input
            type="text"
            id="subject"
            name="subject"
            placeholder="Sujet de votre message"
            className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-background"
            required
          />
        </div>
      )}

      <div>
        <label htmlFor="message" className="block text-sm font-medium mb-1">
          Message
        </label>
        <textarea
          id="message"
          name="message"
          rows={5}
          placeholder="Votre message..."
          className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all bg-background resize-none"
          required
        />
      </div>

      <Button type="submit" className="w-full" disabled={submitted}>
        {submitted ? (
          <>
            <Icons.check className="mr-2 h-4 w-4" />
            {successMessage}
          </>
        ) : (
          submitText
        )}
      </Button>
    </form>
  );

  // Contact info component
  const ContactInfo = () => (
    <div className="space-y-6">
      {email && (
        <div className="flex items-start gap-4">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Icons.mail className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium mb-1">Email</p>
            <a href={`mailto:${email}`} className="text-muted-foreground hover:text-primary transition-colors">
              {email}
            </a>
          </div>
        </div>
      )}

      {phone && (
        <div className="flex items-start gap-4">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Icons.phone className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium mb-1">Téléphone</p>
            <a href={`tel:${phone}`} className="text-muted-foreground hover:text-primary transition-colors">
              {phone}
            </a>
          </div>
        </div>
      )}

      {address && (
        <div className="flex items-start gap-4">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Icons.mapPin className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium mb-1">Adresse</p>
            <p className="text-muted-foreground whitespace-pre-line">{address}</p>
          </div>
        </div>
      )}

      {showSocial && socialLinks.length > 0 && (
        <div className="pt-4 border-t">
          <p className="font-medium mb-3">Suivez-nous</p>
          <div className="flex gap-3">
            {socialLinks.map((link, index) => {
              const Icon = getIcon(link.platform);
              return (
                <a
                  key={index}
                  href={link.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 bg-muted rounded-lg hover:bg-primary/10 hover:text-primary transition-all"
                >
                  {Icon && <Icon className="h-5 w-5" />}
                </a>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );

  // Simple variant
  if (variant === 'simple') {
    return (
      <SectionWrapper variant="default" padding="lg" className={className}>
        <Container size="sm">
          {/* Header */}
          <div className="text-center mb-8">
            {badgeText && (
              <Badge variant="secondary" size="lg" className="mb-4">
                {badgeText}
              </Badge>
            )}
            {headline && (
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                {headline}
              </h2>
            )}
            {subheadline && (
              <p className="text-muted-foreground">
                {subheadline}
              </p>
            )}
          </div>

          {/* Form */}
          <div className="p-6 border rounded-lg">
            <ContactForm />
          </div>
        </Container>
      </SectionWrapper>
    );
  }

  // Split variant
  if (variant === 'split') {
    return (
      <SectionWrapper variant="default" padding="lg" className={className}>
        <Container>
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Left: Info */}
            <div>
              {badgeText && (
                <Badge variant="secondary" size="lg" className="mb-4">
                  {badgeText}
                </Badge>
              )}
              {headline && (
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
                  {headline}
                </h2>
              )}
              {subheadline && (
                <p className="text-muted-foreground mb-8">
                  {subheadline}
                </p>
              )}
              <ContactInfo />
            </div>

            {/* Right: Form */}
            <div className="p-6 border rounded-lg h-fit">
              <ContactForm />
            </div>
          </div>
        </Container>
      </SectionWrapper>
    );
  }

  // Map variant (placeholder for map)
  return (
    <SectionWrapper variant="default" padding="lg" className={className}>
      <Container>
        {/* Header */}
        <div className="text-center mb-8">
          {badgeText && (
            <Badge variant="secondary" size="lg" className="mb-4">
              {badgeText}
            </Badge>
          )}
          {headline && (
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">
              {headline}
            </h2>
          )}
          {subheadline && (
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {subheadline}
            </p>
          )}
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Map placeholder */}
          <div className="aspect-video lg:aspect-square bg-muted rounded-lg flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <Icons.mapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Carte</p>
            </div>
          </div>

          {/* Form + Info */}
          <div className="space-y-8">
            <div className="p-6 border rounded-lg">
              <ContactForm />
            </div>
            <ContactInfo />
          </div>
        </div>
      </Container>
    </SectionWrapper>
  );
}
