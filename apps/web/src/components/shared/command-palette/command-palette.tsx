"use client"

import * as React from "react"
import { useCallback, useEffect, useState } from "react"
import {
  ResponsiveCommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import {
  Puzzle,
  Cloud,
  Settings,
  FileText,
  Plus,
  ExternalLink,
  Palette,
  Globe,
  LayoutDashboard,
} from "lucide-react"
import { navigate } from "@/components/app-router"
import { useWebsiteContext } from "@/contexts/WebsiteContext"

// ============================================================================
// Types
// ============================================================================

export interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface CommandItem {
  id: string
  label: string
  icon: React.ElementType
  shortcut?: string
  action: () => void
}

// ============================================================================
// Context for shared state
// ============================================================================

interface CommandPaletteContextValue {
  open: boolean
  setOpen: (open: boolean) => void
}

const CommandPaletteContext = React.createContext<CommandPaletteContextValue | null>(null)

/**
 * Provider to share command palette state across components
 */
export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      // Open with Cmd+K or Ctrl+K
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
      // Also open with "/" when not in input
      if (e.key === "/" && !["INPUT", "TEXTAREA"].includes((e.target as Element)?.tagName)) {
        e.preventDefault()
        setOpen(true)
      }
    }

    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  return (
    <CommandPaletteContext.Provider value={{ open, setOpen }}>
      {children}
    </CommandPaletteContext.Provider>
  )
}

// ============================================================================
// Hooks
// ============================================================================

/**
 * Hook to access command palette state from context
 * Must be used within CommandPaletteProvider
 */
export function useCommandPalette() {
  const context = React.useContext(CommandPaletteContext)
  if (!context) {
    throw new Error('useCommandPalette must be used within a CommandPaletteProvider')
  }
  return context
}

// ============================================================================
// Config / Commands
// ============================================================================

function useNavigationCommands(baseUrl: string): CommandItem[] {
  return [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      shortcut: 'g d',
      action: () => navigate(baseUrl),
    },
    {
      id: 'pages',
      label: 'Pages',
      icon: FileText,
      action: () => navigate(`${baseUrl}/pages`),
    },
    {
      id: 'extensions',
      label: 'Extensions',
      icon: Puzzle,
      shortcut: 'g e',
      action: () => navigate(`${baseUrl}/extensions`),
    },
    {
      id: 'cloud',
      label: 'Cloud',
      icon: Cloud,
      shortcut: 'g c',
      action: () => navigate(`${baseUrl}/cloud`),
    },
    {
      id: 'settings',
      label: 'Paramètres',
      icon: Settings,
      action: () => navigate(`${baseUrl}/settings`),
    },
  ]
}

function useQuickActionCommands(baseUrl: string, currentWebsite: { slug: string } | null): CommandItem[] {
  const commands: CommandItem[] = [
    {
      id: 'new-page',
      label: 'Créer une page',
      icon: Plus,
      action: () => navigate(`${baseUrl}/pages/new`),
    },
  ]

  if (currentWebsite) {
    commands.push(
      {
        id: 'studio',
        label: 'Ouvrir le Studio',
        icon: Palette,
        action: () => navigate(`${baseUrl}/studio`),
      },
      {
        id: 'view-site',
        label: 'Voir le site en ligne',
        icon: ExternalLink,
        action: () => window.open(`https://${currentWebsite.slug}.asap.cool`, '_blank'),
      }
    )
  }

  return commands
}

// ============================================================================
// Sub-components
// ============================================================================

interface CommandGroupItemsProps {
  items: CommandItem[]
  onSelect: (command: () => void) => void
}

function CommandGroupItems({ items, onSelect }: CommandGroupItemsProps) {
  return (
    <>
      {items.map((item) => (
        <CommandItem key={item.id} onSelect={() => onSelect(item.action)}>
          <item.icon className="mr-2 h-4 w-4" />
          <span>{item.label}</span>
          {item.shortcut && <CommandShortcut>{item.shortcut}</CommandShortcut>}
        </CommandItem>
      ))}
    </>
  )
}

interface WebsiteSwitcherProps {
  websites: Array<{ id: string; title: string; slug: string }>
  currentWebsiteId: string | null
  onSelect: (command: () => void) => void
}

function WebsiteSwitcher({ websites, currentWebsiteId, onSelect }: WebsiteSwitcherProps) {
  const otherWebsites = websites
    .filter(w => w.id !== currentWebsiteId)
    .slice(0, 5)

  if (otherWebsites.length === 0) return null

  return (
    <>
      <CommandSeparator />
      <CommandGroup heading="Changer de site">
        {otherWebsites.map((website) => (
          <CommandItem
            key={website.id}
            onSelect={() => onSelect(() => navigate(`/${website.id}`))}
          >
            <Globe className="mr-2 h-4 w-4" />
            <span>{website.title}</span>
            <span className="ml-2 text-xs text-muted-foreground">
              {website.slug}.asap.cool
            </span>
          </CommandItem>
        ))}
      </CommandGroup>
    </>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const { currentWebsiteId, currentWebsite, websites } = useWebsiteContext()
  const [search, setSearch] = useState("")

  const baseUrl = currentWebsiteId ? `/${currentWebsiteId}` : '/'

  // Get commands
  const navigationCommands = useNavigationCommands(baseUrl)
  const quickActionCommands = useQuickActionCommands(baseUrl, currentWebsite)

  const runCommand = useCallback((command: () => void) => {
    onOpenChange(false)
    command()
  }, [onOpenChange])

  // Reset search when dialog closes
  useEffect(() => {
    if (!open) {
      setSearch("")
    }
  }, [open])

  return (
    <ResponsiveCommandDialog open={open} onOpenChange={onOpenChange} title="Rechercher ou exécuter une commande">
      <CommandInput 
        placeholder="Rechercher une page, action ou commande..." 
        value={search}
        onValueChange={setSearch}
      />
      <CommandList>
        <CommandEmpty>Aucun résultat trouvé.</CommandEmpty>

        {/* Navigation */}
        <CommandGroup heading="Navigation">
          <CommandGroupItems items={navigationCommands} onSelect={runCommand} />
        </CommandGroup>

        <CommandSeparator />

        {/* Quick Actions */}
        <CommandGroup heading="Actions rapides">
          <CommandGroupItems items={quickActionCommands} onSelect={runCommand} />
        </CommandGroup>

        {/* Website Switcher */}
        {websites && websites.length > 1 && (
          <WebsiteSwitcher 
            websites={websites} 
            currentWebsiteId={currentWebsiteId} 
            onSelect={runCommand} 
          />
        )}
      </CommandList>
    </ResponsiveCommandDialog>
  )
}
