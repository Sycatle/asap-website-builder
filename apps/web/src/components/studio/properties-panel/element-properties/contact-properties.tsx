"use client";

import { useState, useEffect } from "react";
import { ContactContent } from "@asap/shared";
import { WebsiteElement, UpdateElementRequest } from "@/lib/types";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useDebounce } from "@/hooks/use-debounce";

interface ContactPropertiesProps {
  element: WebsiteElement;
  onUpdate: (updates: Partial<UpdateElementRequest>) => Promise<void>;
  isUpdating: boolean;
}

export function ContactProperties({
  element,
  onUpdate,
  isUpdating,
}: ContactPropertiesProps) {
  const content = element.content as any || {};
  
  const [title, setTitle] = useState(content.title || "");
  const [email, setEmail] = useState(content.email || "");
  const [phone, setPhone] = useState(content.phone || "");

  const debouncedTitle = useDebounce(title, 500);
  const debouncedEmail = useDebounce(email, 500);
  const debouncedPhone = useDebounce(phone, 500);

  // Auto-save when debounced values change
  useEffect(() => {
    const updates: any = {};
    let hasUpdates = false;

    if (debouncedTitle !== content.title) {
      updates.title = debouncedTitle;
      hasUpdates = true;
    }
    if (debouncedEmail !== content.email) {
      updates.email = debouncedEmail;
      hasUpdates = true;
    }
    if (debouncedPhone !== content.phone) {
      updates.phone = debouncedPhone;
      hasUpdates = true;
    }

    if (hasUpdates) {
      onUpdate({ content: { ...content, ...updates } });
    }
  }, [debouncedTitle, debouncedEmail, debouncedPhone]);

  // Reset when element changes
  useEffect(() => {
    setTitle(content.title || "");
    setEmail(content.email || "");
    setPhone(content.phone || "");
  }, [element.id]);

  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="contact-title">Section Title</Label>
        <Input
          id="contact-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Get In Touch"
          disabled={isUpdating}
        />
      </div>

      {/* Email */}
      <div className="space-y-2">
        <Label htmlFor="contact-email">Email Address</Label>
        <Input
          id="contact-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="hello@example.com"
          disabled={isUpdating}
        />
      </div>

      {/* Phone */}
      <div className="space-y-2">
        <Label htmlFor="contact-phone">Phone Number</Label>
        <Input
          id="contact-phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+1 (555) 123-4567"
          disabled={isUpdating}
        />
      </div>
    </div>
  );
}
