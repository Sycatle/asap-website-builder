"use client"

import React from "react"
import {
  Home,
  Pencil,
  FileText,
  Image,
  BarChart3,
  Search,
  Settings,
  Users,
  Palette,
  Puzzle,
  Link as LinkIcon,
  BookOpen,
  Mail,
} from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Centralized navigation configuration for consistent icons and colors
 * across the entire application (sidebar, page headers, etc.)
 * Using Phosphor Icons with "fill" weight for modern filled appearance
 */

// Page icon configuration
export const pageIcons = {
  // Main pages
  home: { icon: Home, gradient: "from-primary to-violet-500" },
  studio: { icon: Pencil, gradient: "from-orange-500 to-red-500" },
  pages: { icon: FileText, gradient: "from-violet-500 to-purple-500" },
  cloud: { icon: Image, gradient: "from-sky-500 to-blue-500" },
  analytics: { icon: BarChart3, gradient: "from-indigo-500 to-violet-500" },
  seo: { icon: Search, gradient: "from-emerald-500 to-teal-500" },
  settings: { icon: Settings, gradient: "from-zinc-500 to-zinc-700" },
  administrators: { icon: Users, gradient: "from-amber-500 to-orange-500" },
  theme: { icon: Palette, gradient: "from-pink-500 to-rose-500" },
  extensions: { icon: Puzzle, gradient: "from-fuchsia-500 to-purple-500" },
} as const

export type PageKey = keyof typeof pageIcons

// Extension category configuration
export const extensionCategoryConfig = {
  integration: { icon: LinkIcon, gradient: "from-cyan-500 to-blue-500" },
  content: { icon: BookOpen, gradient: "from-amber-500 to-yellow-500" },
  engagement: { icon: Mail, gradient: "from-red-500 to-pink-500" },
  analytics: { icon: BarChart3, gradient: "from-indigo-500 to-violet-500" },
  appearance: { icon: Palette, gradient: "from-pink-500 to-rose-500" },
} as const

export type ExtensionCategory = keyof typeof extensionCategoryConfig

// Get icon config for a page
export function getPageIconConfig(page: PageKey) {
  return pageIcons[page]
}

// Get icon config for an extension category
export function getExtensionIconConfig(category: string) {
  return extensionCategoryConfig[category as ExtensionCategory] || {
    icon: Puzzle,
    gradient: "from-fuchsia-500 to-purple-500"
  }
}

// Shared icon component props
interface PageIconProps {
  page: PageKey
  size?: "sm" | "md" | "lg"
  isActive?: boolean
  className?: string
}

// Size mappings
const sizeClasses = {
  sm: { container: "h-6 w-6 rounded-md", iconSize: 22, iconClass: "size-[22px]" },
  md: { container: "h-8 w-8 rounded-lg", iconSize: 20, iconClass: "size-5" },
  lg: { container: "h-10 w-10 rounded-xl shadow-lg", iconSize: 22, iconClass: "size-[22px]" },
}

/**
 * Reusable page icon component with consistent styling
 * - For sidebar (size="sm"): no background, bold weight when active
 * - For page headers (size="lg"): always show gradient background with white icon
 */
export function PageIcon({ page, size = "lg", isActive, className }: PageIconProps) {
  const config = pageIcons[page]
  const Icon = config.icon
  const sizeClass = sizeClasses[size]
  
  // For sidebar (sm size), render just the icon without container
  if (size === "sm") {
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
      <Icon 
        className={cn(sizeClass.iconClass, "text-white")}
      />
    </div>
  )
}

// Extension icon component
interface ExtensionIconProps {
  category: string
  size?: "sm" | "md" | "lg"
  isActive?: boolean
  className?: string
}

export function ExtensionIcon({ category, size = "lg", isActive, className }: ExtensionIconProps) {
  const config = getExtensionIconConfig(category)
  const Icon = config.icon
  const sizeClass = sizeClasses[size]
  
  // For sidebar (sm size), render just the icon without container
  if (size === "sm") {
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
      <Icon 
        className={cn(sizeClass.iconClass, "text-white")}
      />
    </div>
  )
}
