"use client"

import React, { useMemo, useState } from "react"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import {
  Trash2,
  Copy,
  Undo2,
  Redo2,
  Save,
  Eye,
  EyeOff,
  ArrowUp,
  ArrowDown,
  Monitor,
  Tablet,
  Smartphone,
  Sun,
  Moon,
  Home,
  FileText,
  Layout,
  Type,
  Image,
  MessageSquare,
  Users,
  Star,
  Briefcase,
  Mail,
  Globe,
  Zap,
  ExternalLink,
} from "lucide-react"
import type { WebsiteElement } from "@/lib/types"

// =============================================================================
// Types
// =============================================================================

export interface CommandAction {
  id: string
  name: string
  description?: string
  icon?: React.ComponentType<{ className?: string }>
  shortcut?: string
  category: CommandCategory
  action: () => void
  disabled?: boolean
  keywords?: string[]
}

export type CommandCategory = 
  | "elements"
  | "actions"
  | "navigation"
  | "view"
  | "pages"

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  // Element actions
  selectedElement: WebsiteElement | null
  onAddElement?: (type: string) => void
  onDeleteElement?: () => void
  onDuplicateElement?: () => void
  onToggleVisibility?: () => void
  onMoveUp?: () => void
  onMoveDown?: () => void
  // History
  canUndo?: boolean
  canRedo?: boolean
  onUndo?: () => void
  onRedo?: () => void
  // Save/Publish
  onSave?: () => void
  onPublish?: () => void
  // View
  onDeviceChange?: (device: "desktop" | "tablet" | "mobile") => void
  onThemeChange?: (theme: "light" | "dark") => void
  // Pages
  pages?: Array<{ id: string; title: string; slug: string }>
  onPageSelect?: (pageId: string) => void
  // External
  websiteSlug?: string
}

// =============================================================================
// Element Types Configuration
// =============================================================================

const ELEMENT_TYPES = [
  { type: "navigation", name: "Navigation", icon: Layout },
  { type: "hero", name: "Hero", icon: Home },
  { type: "features", name: "Fonctionnalités", icon: Zap },
  { type: "pricing", name: "Tarification", icon: Star },
  { type: "testimonials", name: "Témoignages", icon: MessageSquare },
  { type: "team", name: "Équipe", icon: Users },
  { type: "cta", name: "Appel à l'action", icon: Briefcase },
  { type: "footer", name: "Pied de page", icon: FileText },
  { type: "text", name: "Texte", icon: Type },
  { type: "image", name: "Image", icon: Image },
  { type: "contact", name: "Contact", icon: Mail },
  { type: "faq", name: "FAQ", icon: MessageSquare },
] as const

// =============================================================================
// Component
// =============================================================================

export function CommandPalette({
  open,
  onOpenChange,
  selectedElement,
  onAddElement,
  onDeleteElement,
  onDuplicateElement,
  onToggleVisibility,
  onMoveUp,
  onMoveDown,
  canUndo = false,
  canRedo = false,
  onUndo,
  onRedo,
  onSave,
  onPublish,
  onDeviceChange,
  onThemeChange,
  pages = [],
  onPageSelect,
  websiteSlug,
}: CommandPaletteProps) {
  const [search, setSearch] = useState("")

  // Build command list
  const commands = useMemo<CommandAction[]>(() => {
    const cmds: CommandAction[] = []

    // Add Element commands
    if (onAddElement) {
      ELEMENT_TYPES.forEach(({ type, name, icon }) => {
        cmds.push({
          id: `add-${type}`,
          name: `Ajouter ${name}`,
          description: `Ajouter une section ${name}`,
          icon,
          category: "elements",
          action: () => {
            onAddElement(type)
            onOpenChange(false)
          },
          keywords: ["ajouter", "nouveau", "créer", type, name.toLowerCase()],
        })
      })
    }

    // Element actions (only if element selected)
    if (selectedElement) {
      if (onDuplicateElement) {
        cmds.push({
          id: "duplicate",
          name: "Dupliquer l'élément",
          description: "Créer une copie de l'élément sélectionné",
          icon: Copy,
          shortcut: "Ctrl+D",
          category: "actions",
          action: () => {
            onDuplicateElement()
            onOpenChange(false)
          },
          keywords: ["copier", "dupliquer", "clone"],
        })
      }

      if (onDeleteElement) {
        cmds.push({
          id: "delete",
          name: "Supprimer l'élément",
          description: "Supprimer l'élément sélectionné",
          icon: Trash2,
          shortcut: "Suppr",
          category: "actions",
          action: () => {
            onDeleteElement()
            onOpenChange(false)
          },
          keywords: ["supprimer", "effacer", "delete"],
        })
      }

      if (onToggleVisibility) {
        const isVisible = selectedElement.visible !== false
        cmds.push({
          id: "toggle-visibility",
          name: isVisible ? "Masquer l'élément" : "Afficher l'élément",
          description: isVisible ? "Rendre l'élément invisible" : "Rendre l'élément visible",
          icon: isVisible ? EyeOff : Eye,
          shortcut: "Ctrl+H",
          category: "actions",
          action: () => {
            onToggleVisibility()
            onOpenChange(false)
          },
          keywords: ["visible", "masquer", "cacher", "afficher"],
        })
      }

      if (onMoveUp) {
        cmds.push({
          id: "move-up",
          name: "Déplacer vers le haut",
          description: "Monter l'élément dans l'ordre",
          icon: ArrowUp,
          shortcut: "Ctrl+↑",
          category: "actions",
          action: () => {
            onMoveUp()
            onOpenChange(false)
          },
          keywords: ["monter", "haut", "ordre"],
        })
      }

      if (onMoveDown) {
        cmds.push({
          id: "move-down",
          name: "Déplacer vers le bas",
          description: "Descendre l'élément dans l'ordre",
          icon: ArrowDown,
          shortcut: "Ctrl+↓",
          category: "actions",
          action: () => {
            onMoveDown()
            onOpenChange(false)
          },
          keywords: ["descendre", "bas", "ordre"],
        })
      }
    }

    // History commands
    if (onUndo) {
      cmds.push({
        id: "undo",
        name: "Annuler",
        description: "Annuler la dernière action",
        icon: Undo2,
        shortcut: "Ctrl+Z",
        category: "actions",
        action: () => {
          onUndo()
          onOpenChange(false)
        },
        disabled: !canUndo,
        keywords: ["annuler", "undo", "retour"],
      })
    }

    if (onRedo) {
      cmds.push({
        id: "redo",
        name: "Rétablir",
        description: "Rétablir la dernière action annulée",
        icon: Redo2,
        shortcut: "Ctrl+Y",
        category: "actions",
        action: () => {
          onRedo()
          onOpenChange(false)
        },
        disabled: !canRedo,
        keywords: ["rétablir", "redo", "refaire"],
      })
    }

    // Save/Publish
    if (onSave) {
      cmds.push({
        id: "save",
        name: "Sauvegarder",
        description: "Sauvegarder les modifications",
        icon: Save,
        shortcut: "Ctrl+S",
        category: "actions",
        action: () => {
          onSave()
          onOpenChange(false)
        },
        keywords: ["sauvegarder", "enregistrer", "save"],
      })
    }

    if (onPublish) {
      cmds.push({
        id: "publish",
        name: "Publier le site",
        description: "Publier les modifications en ligne",
        icon: Globe,
        category: "actions",
        action: () => {
          onPublish()
          onOpenChange(false)
        },
        keywords: ["publier", "déployer", "publish"],
      })
    }

    // View commands
    if (onDeviceChange) {
      cmds.push(
        {
          id: "device-desktop",
          name: "Aperçu Desktop",
          description: "Afficher en mode bureau",
          icon: Monitor,
          category: "view",
          action: () => {
            onDeviceChange("desktop")
            onOpenChange(false)
          },
          keywords: ["desktop", "bureau", "ordinateur", "écran"],
        },
        {
          id: "device-tablet",
          name: "Aperçu Tablette",
          description: "Afficher en mode tablette",
          icon: Tablet,
          category: "view",
          action: () => {
            onDeviceChange("tablet")
            onOpenChange(false)
          },
          keywords: ["tablet", "tablette", "ipad"],
        },
        {
          id: "device-mobile",
          name: "Aperçu Mobile",
          description: "Afficher en mode mobile",
          icon: Smartphone,
          category: "view",
          action: () => {
            onDeviceChange("mobile")
            onOpenChange(false)
          },
          keywords: ["mobile", "téléphone", "smartphone", "iphone"],
        }
      )
    }

    if (onThemeChange) {
      cmds.push(
        {
          id: "theme-light",
          name: "Thème clair",
          description: "Basculer en mode clair",
          icon: Sun,
          category: "view",
          action: () => {
            onThemeChange("light")
            onOpenChange(false)
          },
          keywords: ["clair", "light", "jour"],
        },
        {
          id: "theme-dark",
          name: "Thème sombre",
          description: "Basculer en mode sombre",
          icon: Moon,
          category: "view",
          action: () => {
            onThemeChange("dark")
            onOpenChange(false)
          },
          keywords: ["sombre", "dark", "nuit"],
        }
      )
    }

    // Page navigation
    if (pages.length > 0 && onPageSelect) {
      pages.forEach((page) => {
        cmds.push({
          id: `page-${page.id}`,
          name: `Aller à: ${page.title}`,
          description: `/${page.slug}`,
          icon: FileText,
          category: "pages",
          action: () => {
            onPageSelect(page.id)
            onOpenChange(false)
          },
          keywords: ["page", page.title.toLowerCase(), page.slug],
        })
      })
    }

    // External links
    if (websiteSlug) {
      cmds.push({
        id: "preview-site",
        name: "Voir le site publié",
        description: `Ouvrir ${websiteSlug}.asap.cool`,
        icon: ExternalLink,
        category: "navigation",
        action: () => {
          window.open(`https://${websiteSlug}.asap.cool`, "_blank")
          onOpenChange(false)
        },
        keywords: ["voir", "preview", "site", "publié"],
      })
    }

    return cmds
  }, [
    selectedElement,
    onAddElement,
    onDeleteElement,
    onDuplicateElement,
    onToggleVisibility,
    onMoveUp,
    onMoveDown,
    canUndo,
    canRedo,
    onUndo,
    onRedo,
    onSave,
    onPublish,
    onDeviceChange,
    onThemeChange,
    pages,
    onPageSelect,
    websiteSlug,
    onOpenChange,
  ])

  // Group commands by category
  const groupedCommands = useMemo(() => {
    const groups: Record<CommandCategory, CommandAction[]> = {
      elements: [],
      actions: [],
      navigation: [],
      view: [],
      pages: [],
    }

    commands.forEach((cmd) => {
      groups[cmd.category].push(cmd)
    })

    return groups
  }, [commands])

  // Category labels
  const categoryLabels: Record<CommandCategory, string> = {
    elements: "Ajouter un élément",
    actions: "Actions",
    navigation: "Navigation",
    view: "Affichage",
    pages: "Pages",
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange} title="Palette de commandes">
      <CommandInput
        placeholder="Rechercher une commande..."
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>Aucune commande trouvée.</CommandEmpty>

        {/* Actions (if element selected) */}
        {groupedCommands.actions.length > 0 && (
          <CommandGroup heading={categoryLabels.actions}>
            {groupedCommands.actions.map((cmd) => (
              <CommandItem
                key={cmd.id}
                value={`${cmd.name} ${cmd.keywords?.join(" ") || ""}`}
                onSelect={cmd.action}
                disabled={cmd.disabled}
                className="flex items-center gap-2"
              >
                {cmd.icon && <cmd.icon className="h-4 w-4 text-muted-foreground" />}
                <div className="flex flex-col flex-1">
                  <span>{cmd.name}</span>
                  {cmd.description && (
                    <span className="text-xs text-muted-foreground">{cmd.description}</span>
                  )}
                </div>
                {cmd.shortcut && <CommandShortcut>{cmd.shortcut}</CommandShortcut>}
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {/* View */}
        {groupedCommands.view.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading={categoryLabels.view}>
              {groupedCommands.view.map((cmd) => (
                <CommandItem
                  key={cmd.id}
                  value={`${cmd.name} ${cmd.keywords?.join(" ") || ""}`}
                  onSelect={cmd.action}
                  className="flex items-center gap-2"
                >
                  {cmd.icon && <cmd.icon className="h-4 w-4 text-muted-foreground" />}
                  <span>{cmd.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* Pages */}
        {groupedCommands.pages.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading={categoryLabels.pages}>
              {groupedCommands.pages.map((cmd) => (
                <CommandItem
                  key={cmd.id}
                  value={`${cmd.name} ${cmd.keywords?.join(" ") || ""}`}
                  onSelect={cmd.action}
                  className="flex items-center gap-2"
                >
                  {cmd.icon && <cmd.icon className="h-4 w-4 text-muted-foreground" />}
                  <div className="flex flex-col flex-1">
                    <span>{cmd.name}</span>
                    {cmd.description && (
                      <span className="text-xs text-muted-foreground">{cmd.description}</span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* Elements */}
        {groupedCommands.elements.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading={categoryLabels.elements}>
              {groupedCommands.elements.map((cmd) => (
                <CommandItem
                  key={cmd.id}
                  value={`${cmd.name} ${cmd.keywords?.join(" ") || ""}`}
                  onSelect={cmd.action}
                  className="flex items-center gap-2"
                >
                  {cmd.icon && <cmd.icon className="h-4 w-4 text-muted-foreground" />}
                  <span>{cmd.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {/* Navigation */}
        {groupedCommands.navigation.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading={categoryLabels.navigation}>
              {groupedCommands.navigation.map((cmd) => (
                <CommandItem
                  key={cmd.id}
                  value={`${cmd.name} ${cmd.keywords?.join(" ") || ""}`}
                  onSelect={cmd.action}
                  className="flex items-center gap-2"
                >
                  {cmd.icon && <cmd.icon className="h-4 w-4 text-muted-foreground" />}
                  <div className="flex flex-col flex-1">
                    <span>{cmd.name}</span>
                    {cmd.description && (
                      <span className="text-xs text-muted-foreground">{cmd.description}</span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  )
}
