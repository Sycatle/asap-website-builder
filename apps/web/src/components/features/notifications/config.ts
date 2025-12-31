import type { NotificationCategory, NotificationPriority } from "@/lib/api/notifications"
import {
  Sparkles,
  Globe,
  CreditCard,
  Shield,
  BarChart3,
  Puzzle,
  User,
  Settings,
} from "lucide-react"

// ============================================================================
// Types
// ============================================================================

export type NotificationTabType = 'all' | 'unread' | 'settings'

// ============================================================================
// Category Config
// ============================================================================

export const categoryIcons: Record<NotificationCategory, React.ElementType> = {
  system: Sparkles,
  account: User,
  website: Globe,
  extension: Puzzle,
  billing: CreditCard,
  analytics: BarChart3,
  security: Shield,
}

export const categoryLabels: Record<NotificationCategory, string> = {
  system: 'Système',
  account: 'Compte',
  website: 'Site web',
  extension: 'Extension',
  billing: 'Facturation',
  analytics: 'Analytics',
  security: 'Sécurité',
}

// ============================================================================
// Priority Config
// ============================================================================

export const priorityLabels: Record<NotificationPriority, string> = {
  low: 'Basse',
  normal: 'Normale',
  high: 'Haute',
  urgent: 'Urgente',
}

export const priorityColors: Record<NotificationPriority, string> = {
  low: 'text-muted-foreground',
  normal: 'text-foreground',
  high: 'text-orange-500',
  urgent: 'text-red-500',
}

// ============================================================================
// Icon Mapping
// ============================================================================

export const iconMap: Record<string, React.ElementType> = {
  sparkles: Sparkles,
  globe: Globe,
  'credit-card': CreditCard,
  shield: Shield,
  puzzle: Puzzle,
  user: User,
  'bar-chart': BarChart3,
  settings: Settings,
}
