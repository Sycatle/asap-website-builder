"use client"

import type { WebsiteElement } from "@/lib/api"
import { getElementIcon, getElementLabel } from "@/lib/constants/elements"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

/**
 * V1 Section Renderer
 * 
 * Renders a preview of an element in the studio.
 * For V1 MVP, this is a simplified visual representation.
 */

export interface SectionRendererProps {
  element: WebsiteElement
  isSelected?: boolean
  onClick?: () => void
}

// Type-safe array access helper
function getArrayLength(value: unknown): number {
  return Array.isArray(value) ? value.length : 0
}

// Type-safe string access helper
function getString(value: unknown, fallback: string): string {
  return typeof value === 'string' ? value : fallback
}

export function SectionRenderer({ element, isSelected, onClick }: SectionRendererProps) {
  const Icon = getElementIcon(element.element_type)
  const label = getElementLabel(element.element_type)
  
  // Get preview content based on element type
  const getPreviewContent = (): { 
    title: string
    subtitle?: string
    description?: string
    email?: string
    itemCount?: number
  } => {
    const content = element.content || {}
    const data = element.data || {}
    
    switch (element.element_type) {
      case 'hero':
        return {
          title: getString(content.name || data.name, 'Votre Nom'),
          subtitle: getString(content.title || data.title, 'Développeur Full Stack'),
          description: getString(content.subtitle || data.subtitle, 'Une courte description...'),
        }
      case 'about':
        return {
          title: element.title || 'À propos',
          description: getString(content.description || data.description, 'Votre description...'),
        }
      case 'services':
        return {
          title: element.title || 'Services',
          itemCount: getArrayLength(content.services || data.services),
        }
      case 'projects':
        return {
          title: element.title || 'Projets',
          itemCount: getArrayLength(content.projects || data.projects),
        }
      case 'process':
        return {
          title: element.title || 'Process',
          itemCount: getArrayLength(content.steps || data.steps),
        }
      case 'skills':
        return {
          title: element.title || 'Stack',
          itemCount: getArrayLength(content.categories || data.categories),
        }
      case 'proof':
        return {
          title: element.title || 'Preuves',
          itemCount: getArrayLength(content.testimonials || data.testimonials),
        }
      case 'contact':
        return {
          title: element.title || 'Contact',
          email: getString(content.email || data.email, 'contact@example.com'),
        }
      default:
        return {
          title: element.title || label,
        }
    }
  }
  
  const preview = getPreviewContent()
  
  return (
    <Card 
      className={`cursor-pointer transition-all border-2 ${
        isSelected 
          ? 'border-primary ring-2 ring-primary/20' 
          : 'border-transparent hover:border-muted-foreground/20'
      }`}
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`p-2 rounded-lg ${isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-medium text-sm">{preview.title}</h3>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </div>
            {!element.visible && (
              <Badge variant="outline" className="text-xs">Masqué</Badge>
            )}
          </div>
          
          {/* Preview Content */}
          <div className="text-sm text-muted-foreground space-y-1">
            {preview.subtitle && (
              <p className="font-medium text-foreground">{preview.subtitle}</p>
            )}
            {preview.description && (
              <p className="line-clamp-2">{preview.description}</p>
            )}
            {preview.email && (
              <p className="text-xs">{preview.email}</p>
            )}
            {typeof preview.itemCount === 'number' && (
              <p className="text-xs">
                {preview.itemCount} {preview.itemCount > 1 ? 'éléments' : 'élément'}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// Legacy exports for compatibility
export const HeroRenderer = SectionRenderer
export const AboutRenderer = SectionRenderer
export const SkillsRenderer = SectionRenderer
export const ProjectsRenderer = SectionRenderer
export const ContactRenderer = SectionRenderer
export const ServicesRenderer = SectionRenderer

// Type re-exports for compatibility
export type Section = WebsiteElement
export type Website = Record<string, unknown>
