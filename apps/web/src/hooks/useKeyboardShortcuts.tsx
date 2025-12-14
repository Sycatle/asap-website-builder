"use client"

import { useEffect, useCallback } from 'react'

type KeyboardShortcut = {
  key: string
  ctrl?: boolean
  meta?: boolean
  shift?: boolean
  alt?: boolean
  action: () => void
  description?: string
  enabled?: boolean
}

export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[]) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = event.target as HTMLElement
      const isInput = target.tagName === 'INPUT' || 
                      target.tagName === 'TEXTAREA' || 
                      target.isContentEditable

      for (const shortcut of shortcuts) {
        if (shortcut.enabled === false) continue

        const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase()
        const ctrlMatches = shortcut.ctrl ? (event.ctrlKey || event.metaKey) : !event.ctrlKey && !event.metaKey
        const shiftMatches = shortcut.shift ? event.shiftKey : !event.shiftKey
        const altMatches = shortcut.alt ? event.altKey : !event.altKey

        // For shortcuts with modifiers, allow them even in inputs
        const hasModifier = shortcut.ctrl || shortcut.meta || shortcut.alt
        
        if (keyMatches && ctrlMatches && shiftMatches && altMatches) {
          if (!hasModifier && isInput) continue
          
          event.preventDefault()
          shortcut.action()
          return
        }
      }
    },
    [shortcuts]
  )

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])
}

// Keyboard shortcut indicator component
export function KeyboardShortcut({ 
  keys, 
  className = "" 
}: { 
  keys: string[]
  className?: string 
}) {
  return (
    <span className={`inline-flex items-center gap-0.5 ${className}`}>
      {keys.map((key, index) => (
        <kbd
          key={index}
          className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-medium text-muted-foreground bg-muted border border-border rounded shadow-sm"
        >
          {key}
        </kbd>
      ))}
    </span>
  )
}

// Platform-aware modifier key
export function getModifierKey(): string {
  if (typeof window === 'undefined') return '⌘'
  return navigator.platform.toLowerCase().includes('mac') ? '⌘' : 'Ctrl'
}
