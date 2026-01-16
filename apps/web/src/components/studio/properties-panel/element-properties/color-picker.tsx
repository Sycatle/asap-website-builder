"use client";

import React, { useState, useCallback } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

interface ColorPickerProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  disabled?: boolean;
  showPresets?: boolean;
}

// Common color presets
const COLOR_PRESETS = {
  brand: [
    { name: "Indigo", value: "#6366f1" },
    { name: "Blue", value: "#3b82f6" },
    { name: "Cyan", value: "#06b6d4" },
    { name: "Emerald", value: "#10b981" },
    { name: "Green", value: "#22c55e" },
    { name: "Yellow", value: "#eab308" },
    { name: "Orange", value: "#f97316" },
    { name: "Red", value: "#ef4444" },
    { name: "Pink", value: "#ec4899" },
    { name: "Purple", value: "#a855f7" },
    { name: "Violet", value: "#8b5cf6" },
    { name: "Rose", value: "#f43f5e" },
  ],
  neutral: [
    { name: "Slate", value: "#64748b" },
    { name: "Gray", value: "#6b7280" },
    { name: "Zinc", value: "#71717a" },
    { name: "Stone", value: "#78716c" },
    { name: "Black", value: "#000000" },
    { name: "White", value: "#ffffff" },
  ],
  gradient: [
    { name: "Sunset", value: "linear-gradient(to right, #f97316, #ec4899)" },
    { name: "Ocean", value: "linear-gradient(to right, #06b6d4, #3b82f6)" },
    { name: "Forest", value: "linear-gradient(to right, #22c55e, #10b981)" },
    { name: "Purple haze", value: "linear-gradient(to right, #8b5cf6, #ec4899)" },
    { name: "Dark", value: "linear-gradient(to right, #1f2937, #374151)" },
  ],
};

export function ColorPicker({
  value,
  onChange,
  label,
  disabled = false,
  showPresets = true,
}: ColorPickerProps) {
  const [open, setOpen] = useState(false);
  const [customColor, setCustomColor] = useState(value || "");

  const handlePresetClick = useCallback((color: string) => {
    onChange(color);
    setCustomColor(color);
  }, [onChange]);

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setCustomColor(newValue);
    // Auto-apply if it looks like a valid color
    if (newValue.match(/^#[0-9A-Fa-f]{6}$/) || newValue.match(/^#[0-9A-Fa-f]{3}$/)) {
      onChange(newValue);
    }
  };

  const handleCustomColorSubmit = () => {
    if (customColor.trim()) {
      onChange(customColor);
    }
  };

  // Preview style - handle both solid colors and gradients
  const previewStyle = value?.includes("gradient")
    ? { background: value }
    : { backgroundColor: value || "#6366f1" };

  return (
    <div className="space-y-2">
      {label && <Label className="text-xs">{label}</Label>}
      
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start gap-2 h-9",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            disabled={disabled}
          >
            <div
              className="h-5 w-5 rounded border shrink-0"
              style={previewStyle}
            />
            <span className="truncate text-sm">
              {value || "Sélectionner une couleur"}
            </span>
          </Button>
        </PopoverTrigger>
        
        <PopoverContent className="w-72 p-3" align="start">
          <div className="space-y-4">
            {/* Custom color input */}
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Couleur personnalisée</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    value={customColor}
                    onChange={handleCustomColorChange}
                    placeholder="#6366f1"
                    className="h-8 text-sm pl-8"
                    onKeyDown={(e) => e.key === "Enter" && handleCustomColorSubmit()}
                  />
                  <input
                    type="color"
                    value={value?.startsWith("#") ? value : "#6366f1"}
                    onChange={(e) => {
                      setCustomColor(e.target.value);
                      onChange(e.target.value);
                    }}
                    className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 cursor-pointer border-0 p-0"
                    style={{ appearance: "none", background: "transparent" }}
                  />
                </div>
                <Button
                  size="sm"
                  className="h-8"
                  onClick={handleCustomColorSubmit}
                  disabled={!customColor.trim()}
                >
                  OK
                </Button>
              </div>
            </div>

            {showPresets && (
              <>
                {/* Brand colors */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Couleurs de marque</Label>
                  <div className="grid grid-cols-6 gap-1.5">
                    {COLOR_PRESETS.brand.map((color) => (
                      <button
                        key={color.value}
                        className={cn(
                          "h-7 w-7 rounded border transition-all hover:scale-110",
                          "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1",
                          value === color.value && "ring-2 ring-primary ring-offset-1"
                        )}
                        style={{ backgroundColor: color.value }}
                        onClick={() => handlePresetClick(color.value)}
                        title={color.name}
                      >
                        {value === color.value && (
                          <Check className="h-4 w-4 mx-auto text-white drop-shadow" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Neutral colors */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Neutres</Label>
                  <div className="grid grid-cols-6 gap-1.5">
                    {COLOR_PRESETS.neutral.map((color) => (
                      <button
                        key={color.value}
                        className={cn(
                          "h-7 w-7 rounded border transition-all hover:scale-110",
                          "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1",
                          value === color.value && "ring-2 ring-primary ring-offset-1"
                        )}
                        style={{ backgroundColor: color.value }}
                        onClick={() => handlePresetClick(color.value)}
                        title={color.name}
                      >
                        {value === color.value && (
                          <Check 
                            className={cn(
                              "h-4 w-4 mx-auto drop-shadow",
                              color.value === "#ffffff" ? "text-black" : "text-white"
                            )} 
                          />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Gradient presets */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Dégradés</Label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {COLOR_PRESETS.gradient.map((gradient) => (
                      <button
                        key={gradient.value}
                        className={cn(
                          "h-7 rounded border transition-all hover:scale-105",
                          "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-1",
                          value === gradient.value && "ring-2 ring-primary ring-offset-1"
                        )}
                        style={{ background: gradient.value }}
                        onClick={() => handlePresetClick(gradient.value)}
                        title={gradient.name}
                      >
                        {value === gradient.value && (
                          <Check className="h-4 w-4 mx-auto text-white drop-shadow" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}

export default ColorPicker;
