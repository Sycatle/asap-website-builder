"use client"

import React from "react"
import {
  Github,
  BookOpen,
  Mail,
  BarChart3,
  Palette,
  Puzzle,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Centralized extension icon configuration
 * 
 * This is the single source of truth for extension icons.
 * The icon key should match the `icon` field from the extension definition
 * in the backend (extension_catalog.rs or extension.toml).
 */

// Extension icon configuration by icon key (from backend)
export const extensionIconConfig: Record<string, { 
  icon: LucideIcon
  gradient: string 
}> = {
  // Integration extensions
  github: { icon: Github, gradient: "from-zinc-700 to-zinc-900" },
  
  // Content extensions  
  blog: { icon: BookOpen, gradient: "from-amber-500 to-yellow-500" },
  
  // Engagement extensions
  contact: { icon: Mail, gradient: "from-red-500 to-pink-500" },
  mail: { icon: Mail, gradient: "from-red-500 to-pink-500" },
  
  // Analytics extensions (now core feature, kept for reference)
  analytics: { icon: BarChart3, gradient: "from-indigo-500 to-violet-500" },
  chart: { icon: BarChart3, gradient: "from-indigo-500 to-violet-500" },
  
  // Appearance extensions
  theme: { icon: Palette, gradient: "from-pink-500 to-rose-500" },
  palette: { icon: Palette, gradient: "from-pink-500 to-rose-500" },
  
  // Default fallback
  default: { icon: Puzzle, gradient: "from-fuchsia-500 to-purple-500" },
}

/**
 * Get icon configuration for an extension
 * @param iconKey - The icon key from the extension definition (e.g., "github", "blog")
 * @param slug - Fallback: the extension slug (e.g., "github-sync")
 */
export function getExtensionIconConfig(iconKey?: string | null, slug?: string) {
  // First try direct icon key match
  if (iconKey && extensionIconConfig[iconKey]) {
    return extensionIconConfig[iconKey]
  }
  
  // Fallback: try to match from slug
  if (slug) {
    for (const [key, config] of Object.entries(extensionIconConfig)) {
      if (key !== 'default' && slug.toLowerCase().includes(key)) {
        return config
      }
    }
  }
  
  return extensionIconConfig.default
}

// Size mappings for icons
const sizeClasses = {
  xs: { container: "h-6 w-6 rounded-md", iconClass: "size-4" },
  sm: { container: "h-6 w-6 rounded-md", iconClass: "size-[22px]" },
  md: { container: "h-8 w-8 rounded-lg", iconClass: "size-5" },
  lg: { container: "h-10 w-10 rounded-xl shadow-lg", iconClass: "size-[22px]" },
}

interface ExtensionIconProps {
  /** Icon key from extension definition */
  icon?: string | null
  /** Extension slug as fallback */
  slug?: string
  /** Extension category (deprecated, use icon instead) */
  category?: string
  size?: "xs" | "sm" | "md" | "lg"
  isActive?: boolean
  className?: string
}

/**
 * Unified extension icon component
 * Uses the icon key from extension definition, with fallbacks
 */
export function ExtensionIcon({ 
  icon, 
  slug, 
  category, 
  size = "lg", 
  isActive, 
  className 
}: ExtensionIconProps) {
  // Priority: icon > slug > category
  const config = getExtensionIconConfig(icon, slug || category)
  const Icon = config.icon
  const sizeClass = sizeClasses[size]
  
  // For sidebar (sm/xs size), render just the icon without container
  if (size === "sm" || size === "xs") {
    return (
      <Icon 
        className={cn(
          "shrink-0 transition-all duration-200",
          sizeClass.iconClass,
          isActive ? "text-primary stroke-[2.5]" : "text-muted-foreground",
          className
        )}
      />
    )
  }
  
  // For page headers (md/lg), show gradient background
  return (
    <div className={cn(
      sizeClass.container,
      "flex items-center justify-center shrink-0",
      `bg-gradient-to-br ${config.gradient}`,
      className
    )}>
      <Icon className={cn(sizeClass.iconClass, "text-white")} />
    </div>
  )
}

/**
 * Get just the Lucide icon component for an extension
 */
export function getExtensionLucideIcon(iconKey?: string | null, slug?: string): LucideIcon {
  return getExtensionIconConfig(iconKey, slug).icon
}
