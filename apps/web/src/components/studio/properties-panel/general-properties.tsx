"use client";

import { useState, useEffect } from "react";
import { WebsiteElement, UpdateElementRequest } from "@asap/shared";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useDebounce } from "@/hooks/use-debounce";

interface GeneralPropertiesProps {
  element: WebsiteElement;
  onUpdate: (updates: Partial<UpdateElementRequest>) => Promise<void>;
  isUpdating: boolean;
}

export function GeneralProperties({
  element,
  onUpdate,
  isUpdating,
}: GeneralPropertiesProps) {
  const [title, setTitle] = useState(element.title || "");
  const [isVisible, setIsVisible] = useState(element.is_visible);

  const debouncedTitle = useDebounce(title, 500);

  // Update title when debounced value changes
  useEffect(() => {
    if (debouncedTitle !== element.title) {
      onUpdate({ title: debouncedTitle });
    }
  }, [debouncedTitle]);

  // Reset title when element changes
  useEffect(() => {
    setTitle(element.title || "");
  }, [element.id, element.title]);

  const handleVisibilityChange = async (checked: boolean) => {
    setIsVisible(checked);
    await onUpdate({ is_visible: checked });
  };

  return (
    <div className="space-y-4">
      {/* Title */}
      <div className="space-y-2">
        <Label htmlFor="element-title">Title</Label>
        <Input
          id="element-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter element title..."
          disabled={isUpdating}
        />
        <p className="text-xs text-muted-foreground">
          Optional title for internal reference
        </p>
      </div>

      {/* Visibility */}
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="element-visibility">Visible</Label>
          <p className="text-xs text-muted-foreground">
            Show this element on the published site
          </p>
        </div>
        <Switch
          id="element-visibility"
          checked={isVisible}
          onCheckedChange={handleVisibilityChange}
          disabled={isUpdating}
        />
      </div>
    </div>
  );
}
