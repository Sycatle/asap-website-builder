"use client";

import React, { useState, useMemo } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import * as LucideIcons from "lucide-react";

// Common icons used in SaaS landing pages
const POPULAR_ICONS = [
  // General
  "sparkles", "zap", "star", "heart", "check", "x", "plus", "minus",
  // Actions
  "arrow-right", "arrow-left", "arrow-up", "arrow-down", "external-link", "download", "upload",
  // Communication
  "mail", "phone", "message-circle", "send", "at-sign",
  // Social
  "github", "twitter", "linkedin", "instagram", "youtube", "globe",
  // Business
  "briefcase", "building", "credit-card", "dollar-sign", "trending-up", "chart-bar",
  // Tech
  "code", "terminal", "database", "cloud", "server", "cpu", "smartphone", "monitor",
  // Features
  "shield", "lock", "key", "eye", "search", "filter", "settings", "sliders",
  // UI
  "menu", "home", "user", "users", "bell", "calendar", "clock", "bookmark",
  // Content
  "file", "folder", "image", "video", "music", "headphones", "mic",
  // Other
  "rocket", "target", "flag", "award", "gift", "coffee", "sun", "moon",
  "layers", "layout", "grid", "list", "box", "package", "puzzle",
];

// Convert kebab-case to PascalCase for Lucide icon lookup
function toPascalCase(str: string): string {
  return str
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
}

// Render icon by name - creates element directly instead of returning component
function renderIcon(name: string, className?: string): React.ReactNode {
  const pascalName = toPascalCase(name);
  const Icon = (LucideIcons as Record<string, unknown>)[pascalName];
  if (typeof Icon === "function") {
    const IconComponent = Icon as React.ComponentType<{ className?: string }>;
    return <IconComponent className={className} />;
  }
  return null;
}

interface IconPickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
}

export function IconPicker({
  value,
  onChange,
  label,
  placeholder = "Sélectionner une icône",
  disabled = false,
}: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Filter icons based on search
  const filteredIcons = useMemo(() => {
    if (!search) return POPULAR_ICONS;
    const lower = search.toLowerCase();
    return POPULAR_ICONS.filter((icon) => icon.includes(lower));
  }, [search]);

  const handleSelect = (iconName: string) => {
    onChange(iconName);
    setOpen(false);
    setSearch("");
  };

  return (
    <div className="space-y-2">
      {label && (
        <Label className="text-xs">{label}</Label>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-start h-8 text-sm font-normal"
            disabled={disabled}
          >
            {value ? (
              <div className="flex items-center gap-2">
                {renderIcon(value, "h-4 w-4")}
                <span>{value}</span>
              </div>
            ) : (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-0" align="start">
          <div className="p-2 border-b">
            <Input
              placeholder="Rechercher une icône..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8"
            />
          </div>
          <ScrollArea className="h-[240px]">
            <div className="grid grid-cols-6 gap-1 p-2">
              {filteredIcons.map((iconName) => {
                const iconElement = renderIcon(iconName, "h-4 w-4");
                if (!iconElement) return null;
                
                const isSelected = value === iconName;
                
                return (
                  <Button
                    key={iconName}
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-9 w-9",
                      isSelected && "bg-primary text-primary-foreground hover:bg-primary/90"
                    )}
                    onClick={() => handleSelect(iconName)}
                    title={iconName}
                  >
                    {iconElement}
                  </Button>
                );
              })}
              {filteredIcons.length === 0 && (
                <div className="col-span-6 text-center py-4 text-sm text-muted-foreground">
                  Aucune icône trouvée
                </div>
              )}
            </div>
          </ScrollArea>
          {value && (
            <div className="p-2 border-t">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Sélectionné: {value}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => handleSelect("")}
                >
                  Effacer
                </Button>
              </div>
            </div>
          )}
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default IconPicker;
