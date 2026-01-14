"use client";

import { useState, useEffect } from "react";
import { HeroContent } from "@asap/shared";
import { WebsiteElement, UpdateElementRequest } from "@/lib/types";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useDebounce } from "@/hooks/use-debounce";

interface HeroPropertiesProps {
  element: WebsiteElement;
  onUpdate: (updates: Partial<UpdateElementRequest>) => Promise<void>;
  isUpdating: boolean;
}

export function HeroProperties({
  element,
  onUpdate,
  isUpdating,
}: HeroPropertiesProps) {
  const content = element.content as any || {};
  
  const [name, setName] = useState(content.name || "");
  const [tagline, setTagline] = useState(content.tagline || "");
  const [ctaText, setCtaText] = useState(content.cta_text || "");
  const [ctaUrl, setCtaUrl] = useState(content.cta_url || "");

  const debouncedName = useDebounce(name, 500);
  const debouncedTagline = useDebounce(tagline, 500);
  const debouncedCtaText = useDebounce(ctaText, 500);
  const debouncedCtaUrl = useDebounce(ctaUrl, 500);

  // Auto-save when debounced values change
  useEffect(() => {
    const updates: any = {};
    let hasUpdates = false;

    if (debouncedName !== content.name) {
      updates.name = debouncedName;
      hasUpdates = true;
    }
    if (debouncedTagline !== content.tagline) {
      updates.tagline = debouncedTagline;
      hasUpdates = true;
    }
    if (debouncedCtaText !== content.cta_text) {
      updates.cta_text = debouncedCtaText;
      hasUpdates = true;
    }
    if (debouncedCtaUrl !== content.cta_url) {
      updates.cta_url = debouncedCtaUrl;
      hasUpdates = true;
    }

    if (hasUpdates) {
      onUpdate({ content: { ...content, ...updates } });
    }
  }, [debouncedName, debouncedTagline, debouncedCtaText, debouncedCtaUrl]);

  // Reset when element changes
  useEffect(() => {
    setName(content.name || "");
    setTagline(content.tagline || "");
    setCtaText(content.cta_text || "");
    setCtaUrl(content.cta_url || "");
  }, [element.id]);

  return (
    <div className="space-y-4">
      {/* Name/Headline */}
      <div className="space-y-2">
        <Label htmlFor="hero-name">Name / Headline</Label>
        <Input
          id="hero-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your Name or Main Headline"
          disabled={isUpdating}
        />
      </div>

      {/* Tagline */}
      <div className="space-y-2">
        <Label htmlFor="hero-tagline">Tagline / Description</Label>
        <Textarea
          id="hero-tagline"
          value={tagline}
          onChange={(e) => setTagline(e.target.value)}
          placeholder="Brief description or tagline..."
          rows={3}
          disabled={isUpdating}
        />
      </div>

      {/* CTA Button Text */}
      <div className="space-y-2">
        <Label htmlFor="hero-cta-text">Button Text</Label>
        <Input
          id="hero-cta-text"
          value={ctaText}
          onChange={(e) => setCtaText(e.target.value)}
          placeholder="Get Started"
          disabled={isUpdating}
        />
      </div>

      {/* CTA Button URL */}
      <div className="space-y-2">
        <Label htmlFor="hero-cta-url">Button URL</Label>
        <Input
          id="hero-cta-url"
          value={ctaUrl}
          onChange={(e) => setCtaUrl(e.target.value)}
          placeholder="https://example.com/contact"
          disabled={isUpdating}
        />
      </div>
    </div>
  );
}
