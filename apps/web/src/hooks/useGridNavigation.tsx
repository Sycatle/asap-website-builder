"use client"

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'

interface UseGridNavigationOptions<T> {
  items: T[]
  getItemId: (item: T) => string
  columns?: number // For grid view, number of columns
  onSelect?: (item: T) => void
  onOpen?: (item: T) => void
  onDelete?: (items: T[]) => void
  enabled?: boolean
}

interface UseGridNavigationReturn<T> {
  focusedIndex: number
  selectedIds: Set<string>
  setFocusedIndex: (index: number) => void
  handleKeyDown: (e: React.KeyboardEvent) => void
  isSelected: (item: T) => boolean
  isFocused: (index: number) => boolean
  selectAll: () => void
  clearSelection: () => void
  toggleSelection: (item: T) => void
  containerRef: React.RefObject<HTMLDivElement>
  getItemProps: (item: T, index: number) => {
    tabIndex: number
    'data-focused': boolean
    'data-selected': boolean
    onFocus: () => void
    onClick: (e: React.MouseEvent) => void
    onKeyDown: (e: React.KeyboardEvent) => void
  }
}

export function useGridNavigation<T>({
  items,
  getItemId,
  columns = 1,
  onSelect,
  onOpen,
  onDelete,
  enabled = true,
}: UseGridNavigationOptions<T>): UseGridNavigationReturn<T> {
  const [focusedIndex, setFocusedIndex] = useState(-1)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const containerRef = useRef<HTMLDivElement>(null)
  const itemRefs = useRef<Map<number, HTMLElement>>(new Map())

  // Clear selection when items change significantly
  useEffect(() => {
    setSelectedIds(prev => {
      const newSet = new Set<string>()
      const itemIds = new Set(items.map(getItemId))
      prev.forEach(id => {
        if (itemIds.has(id)) newSet.add(id)
      })
      return newSet
    })
  }, [items, getItemId])

  const focusItem = useCallback((index: number) => {
    if (index < 0 || index >= items.length) return
    setFocusedIndex(index)
    
    // Focus the actual DOM element
    const element = itemRefs.current.get(index)
    if (element) {
      element.focus()
    }
  }, [items.length])

  const isSelected = useCallback((item: T) => {
    return selectedIds.has(getItemId(item))
  }, [selectedIds, getItemId])

  const isFocused = useCallback((index: number) => {
    return focusedIndex === index
  }, [focusedIndex])

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(items.map(getItemId)))
  }, [items, getItemId])

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set())
    setFocusedIndex(-1)
  }, [])

  const toggleSelection = useCallback((item: T) => {
    const id = getItemId(item)
    setSelectedIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(id)) {
        newSet.delete(id)
      } else {
        newSet.add(id)
      }
      return newSet
    })
  }, [getItemId])

  const selectRange = useCallback((fromIndex: number, toIndex: number) => {
    const start = Math.min(fromIndex, toIndex)
    const end = Math.max(fromIndex, toIndex)
    const newIds = new Set(selectedIds)
    
    for (let i = start; i <= end; i++) {
      if (items[i]) {
        newIds.add(getItemId(items[i]))
      }
    }
    
    setSelectedIds(newIds)
  }, [items, getItemId, selectedIds])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!enabled || items.length === 0) return

    const { key, ctrlKey, metaKey, shiftKey } = e
    const modifier = ctrlKey || metaKey
    const currentIndex = focusedIndex >= 0 ? focusedIndex : 0

    switch (key) {
      case 'ArrowRight': {
        e.preventDefault()
        const nextIndex = Math.min(currentIndex + 1, items.length - 1)
        if (shiftKey) {
          selectRange(currentIndex, nextIndex)
        }
        focusItem(nextIndex)
        break
      }
      
      case 'ArrowLeft': {
        e.preventDefault()
        const prevIndex = Math.max(currentIndex - 1, 0)
        if (shiftKey) {
          selectRange(currentIndex, prevIndex)
        }
        focusItem(prevIndex)
        break
      }
      
      case 'ArrowDown': {
        e.preventDefault()
        const nextIndex = Math.min(currentIndex + columns, items.length - 1)
        if (shiftKey) {
          selectRange(currentIndex, nextIndex)
        }
        focusItem(nextIndex)
        break
      }
      
      case 'ArrowUp': {
        e.preventDefault()
        const prevIndex = Math.max(currentIndex - columns, 0)
        if (shiftKey) {
          selectRange(currentIndex, prevIndex)
        }
        focusItem(prevIndex)
        break
      }
      
      case 'Home': {
        e.preventDefault()
        if (shiftKey) {
          selectRange(currentIndex, 0)
        }
        focusItem(0)
        break
      }
      
      case 'End': {
        e.preventDefault()
        if (shiftKey) {
          selectRange(currentIndex, items.length - 1)
        }
        focusItem(items.length - 1)
        break
      }
      
      case 'a':
      case 'A': {
        if (modifier) {
          e.preventDefault()
          selectAll()
        }
        break
      }
      
      case 'Escape': {
        e.preventDefault()
        clearSelection()
        break
      }
      
      case 'Enter':
      case ' ': {
        e.preventDefault()
        if (focusedIndex >= 0 && items[focusedIndex]) {
          if (modifier || shiftKey) {
            toggleSelection(items[focusedIndex])
          } else if (onOpen) {
            onOpen(items[focusedIndex])
          } else if (onSelect) {
            onSelect(items[focusedIndex])
          }
        }
        break
      }
      
      case 'Delete':
      case 'Backspace': {
        if (selectedIds.size > 0 && onDelete) {
          e.preventDefault()
          const selectedItems = items.filter(item => selectedIds.has(getItemId(item)))
          onDelete(selectedItems)
        } else if (focusedIndex >= 0 && items[focusedIndex] && onDelete) {
          e.preventDefault()
          onDelete([items[focusedIndex]])
        }
        break
      }
      
      case 'Tab': {
        // Let Tab work normally for accessibility
        // But track the focus
        const nextIndex = shiftKey 
          ? Math.max(currentIndex - 1, 0)
          : Math.min(currentIndex + 1, items.length - 1)
        setFocusedIndex(nextIndex)
        break
      }
    }
  }, [
    enabled,
    items,
    focusedIndex,
    columns,
    focusItem,
    selectRange,
    selectAll,
    clearSelection,
    toggleSelection,
    onOpen,
    onSelect,
    onDelete,
    selectedIds,
    getItemId,
  ])

  const getItemProps = useCallback((item: T, index: number) => {
    return {
      tabIndex: focusedIndex === index || (focusedIndex === -1 && index === 0) ? 0 : -1,
      'data-focused': focusedIndex === index,
      'data-selected': selectedIds.has(getItemId(item)),
      ref: (el: HTMLElement | null) => {
        if (el) {
          itemRefs.current.set(index, el)
        } else {
          itemRefs.current.delete(index)
        }
      },
      onFocus: () => setFocusedIndex(index),
      onClick: (e: React.MouseEvent) => {
        const modifier = e.ctrlKey || e.metaKey
        
        if (modifier) {
          e.preventDefault()
          toggleSelection(item)
        } else if (e.shiftKey && focusedIndex >= 0) {
          e.preventDefault()
          selectRange(focusedIndex, index)
        } else {
          // Clear previous selection on normal click
          setSelectedIds(new Set([getItemId(item)]))
        }
        setFocusedIndex(index)
      },
      onKeyDown: handleKeyDown,
    }
  }, [focusedIndex, selectedIds, getItemId, toggleSelection, selectRange, handleKeyDown])

  return {
    focusedIndex,
    selectedIds,
    setFocusedIndex,
    handleKeyDown,
    isSelected,
    isFocused,
    selectAll,
    clearSelection,
    toggleSelection,
    containerRef: containerRef as React.RefObject<HTMLDivElement>,
    getItemProps,
  }
}

// Helper component to show keyboard shortcuts hint
export function KeyboardHint({ className = "" }: { className?: string }) {
  return (
    <div className={`text-xs text-muted-foreground ${className}`}>
      <span className="hidden sm:inline">
        Navigation: <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">↑↓←→</kbd>
        {' · '}Sélection: <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">⌘A</kbd>
        {' · '}Ouvrir: <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">Entrée</kbd>
      </span>
    </div>
  )
}
