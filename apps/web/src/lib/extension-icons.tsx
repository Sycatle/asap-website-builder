"use client"

import React from "react"
import {
  Github,
  BookOpen,
  Mail,
  BarChart3,
  Palette,
  Puzzle,
  Plug,
  Globe,
  Share2,
  ShoppingCart,
  Shield,
  Zap,
  Search,
  MessageCircle,
  Bell,
  Image,
  Video,
  Code,
  Layers,
  Rocket,
  Bot,
  Users,
  Calendar,
  MapPin,
  FileText,
  CreditCard,
  TrendingUp,
  Eye,
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
  integration: { icon: Plug, gradient: "from-blue-500 to-cyan-500" },
  plug: { icon: Plug, gradient: "from-blue-500 to-cyan-500" },
  webhook: { icon: Globe, gradient: "from-emerald-500 to-teal-500" },
  
  // Content extensions  
  blog: { icon: BookOpen, gradient: "from-amber-500 to-yellow-500" },
  content: { icon: FileText, gradient: "from-orange-500 to-amber-500" },
  image: { icon: Image, gradient: "from-violet-500 to-purple-500" },
  gallery: { icon: Image, gradient: "from-violet-500 to-purple-500" },
  video: { icon: Video, gradient: "from-red-500 to-rose-500" },
  
  // Engagement extensions
  contact: { icon: Mail, gradient: "from-red-500 to-pink-500" },
  mail: { icon: Mail, gradient: "from-red-500 to-pink-500" },
  chat: { icon: MessageCircle, gradient: "from-green-500 to-emerald-500" },
  notification: { icon: Bell, gradient: "from-yellow-500 to-orange-500" },
  bell: { icon: Bell, gradient: "from-yellow-500 to-orange-500" },
  
  // Analytics extensions
  analytics: { icon: BarChart3, gradient: "from-indigo-500 to-violet-500" },
  'chart-bar': { icon: BarChart3, gradient: "from-indigo-500 to-violet-500" },
  chart: { icon: BarChart3, gradient: "from-indigo-500 to-violet-500" },
  stats: { icon: TrendingUp, gradient: "from-blue-500 to-indigo-500" },
  views: { icon: Eye, gradient: "from-cyan-500 to-blue-500" },
  
  // Appearance extensions
  theme: { icon: Palette, gradient: "from-pink-500 to-rose-500" },
  palette: { icon: Palette, gradient: "from-pink-500 to-rose-500" },
  design: { icon: Layers, gradient: "from-fuchsia-500 to-pink-500" },
  
  // Social & Marketing
  social: { icon: Share2, gradient: "from-sky-500 to-blue-500" },
  share: { icon: Share2, gradient: "from-sky-500 to-blue-500" },
  marketing: { icon: TrendingUp, gradient: "from-green-500 to-emerald-500" },
  
  // E-commerce
  ecommerce: { icon: ShoppingCart, gradient: "from-orange-500 to-red-500" },
  shop: { icon: ShoppingCart, gradient: "from-orange-500 to-red-500" },
  payment: { icon: CreditCard, gradient: "from-slate-600 to-slate-800" },
  
  // Security
  security: { icon: Shield, gradient: "from-emerald-500 to-green-600" },
  shield: { icon: Shield, gradient: "from-emerald-500 to-green-600" },
  
  // Utilities
  utility: { icon: Zap, gradient: "from-yellow-400 to-orange-500" },
  zap: { icon: Zap, gradient: "from-yellow-400 to-orange-500" },
  performance: { icon: Rocket, gradient: "from-violet-500 to-indigo-500" },
  rocket: { icon: Rocket, gradient: "from-violet-500 to-indigo-500" },
  
  // AI & Automation
  ai: { icon: Bot, gradient: "from-purple-500 to-violet-600" },
  bot: { icon: Bot, gradient: "from-purple-500 to-violet-600" },
  automation: { icon: Zap, gradient: "from-amber-500 to-orange-500" },
  
  // Development
  code: { icon: Code, gradient: "from-gray-600 to-gray-800" },
  development: { icon: Code, gradient: "from-gray-600 to-gray-800" },
  
  // SEO
  seo: { icon: Search, gradient: "from-green-500 to-teal-500" },
  search: { icon: Search, gradient: "from-green-500 to-teal-500" },
  
  // Community
  community: { icon: Users, gradient: "from-blue-500 to-indigo-500" },
  users: { icon: Users, gradient: "from-blue-500 to-indigo-500" },
  
  // Events & Scheduling
  calendar: { icon: Calendar, gradient: "from-red-500 to-pink-500" },
  events: { icon: Calendar, gradient: "from-red-500 to-pink-500" },
  
  // Location
  location: { icon: MapPin, gradient: "from-red-500 to-rose-500" },
  map: { icon: MapPin, gradient: "from-red-500 to-rose-500" },
  
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
