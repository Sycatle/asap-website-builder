"use client";

import { useState, useEffect } from "react";
import { AboutContent } from "@asap/shared";
import { WebsiteElement, UpdateElementRequest } from "@/lib/types";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useDebounce } from "@/hooks/use-debounce";

interface AboutPropertiesProps {
  element: WebsiteElement;
  onUpdate: (updates: Partial<UpdateElementRequest>) => Promise<void>;
  isUpdating: boolean;
}

export function AboutProperties({
  element,
  onUpdate,
  isUpdating,
}: AboutPropertiesProps) {
  const content = element.content as any || {};
  
  const [title, setTitle] = useState(content.title || "");
  const [bio, setBio] = useState(content.bio || "");

  const debouncedTitle = useDebounce(title, 500);
  const debouncedBio = useDebounce(bio, 500);

  // Auto-save when debounced values change
  useEffect(() => {
    const updates: any = {};
    let hasUpdates = false;

    if (debouncedTitle !== content.title) {
      updates.title = debouncedTitle;
      hasUpdates = true;
    }
    if (debouncedBio !== content.bio) {
      updates.bio = debouncedBio;
      hasUpdates = true;
    }

    if (hasUpdates) {
      onUpdate({ content: { ...content, ...updates } });
    }
  }, [debouncedTitle, debouncedBio]);

  // Reset when element changes
  useEffect(() => {
    setTitle(content.title || "");
    setBio(content.bio || "");
  }, [element.id]);

  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="about-title">Section Title</Label>
        <Input
          id="about-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="About Me"
          disabled={isUpdating}
        />
      </div>

      {/* Bio */}
      <div className="space-y-2">
        <Label htmlFor="about-bio">Biography</Label>
        <Textarea
          id="about-bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Tell your story..."
          rows={6}
          disabled={isUpdating}
        />
      </div>
    </div>
  );
}
