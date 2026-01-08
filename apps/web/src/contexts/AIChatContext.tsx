"use client"

import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';

// LocalStorage keys
const STORAGE_KEY_IS_OPEN = 'asap_ai_chat_open';
const STORAGE_KEY_PANEL_SIZE = 'asap_ai_chat_panel_size';

// Helper to safely access localStorage (handles SSR)
function getStoredValue<T>(key: string, defaultValue: T): T {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const stored = localStorage.getItem(key);
    if (stored === null) return defaultValue;
    return JSON.parse(stored) as T;
  } catch {
    return defaultValue;
  }
}

function setStoredValue<T>(key: string, value: T): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage errors (e.g., quota exceeded)
  }
}

// AI Chat Context Types
interface AIChatContextValue {
  /** Whether the AI chat panel is open */
  isOpen: boolean;
  /** Open the AI chat panel */
  open: () => void;
  /** Close the AI chat panel */
  close: () => void;
  /** Toggle the AI chat panel */
  toggle: () => void;
  /** Set the open state directly */
  setOpen: (open: boolean) => void;
  /** Current panel size as percentage (0-100) */
  panelSize: number;
  /** Update the panel size */
  setPanelSize: (size: number) => void;
}

const AIChatContext = createContext<AIChatContextValue | null>(null);

interface AIChatProviderProps {
  children: ReactNode;
  defaultOpen?: boolean;
  defaultPanelSize?: number;
}

/**
 * AIChatProvider - Global provider for AI chat state
 * Allows any component to control the AI chat panel visibility
 * State is persisted to localStorage for persistence across page reloads
 */
export function AIChatProvider({ children, defaultOpen = false, defaultPanelSize = 30 }: AIChatProviderProps) {
  // Initialize state from localStorage or defaults
  const [isOpen, setIsOpenState] = useState(() => getStoredValue(STORAGE_KEY_IS_OPEN, defaultOpen));
  const [panelSize, setPanelSizeState] = useState(() => getStoredValue(STORAGE_KEY_PANEL_SIZE, defaultPanelSize));

  // Persist isOpen to localStorage
  const setIsOpen = useCallback((value: boolean | ((prev: boolean) => boolean)) => {
    setIsOpenState(prev => {
      const newValue = typeof value === 'function' ? value(prev) : value;
      setStoredValue(STORAGE_KEY_IS_OPEN, newValue);
      return newValue;
    });
  }, []);

  // Persist panelSize to localStorage
  const setPanelSize = useCallback((size: number) => {
    setPanelSizeState(size);
    setStoredValue(STORAGE_KEY_PANEL_SIZE, size);
  }, []);

  const open = useCallback(() => setIsOpen(true), [setIsOpen]);
  const close = useCallback(() => setIsOpen(false), [setIsOpen]);
  const toggle = useCallback(() => setIsOpen(prev => !prev), [setIsOpen]);

  const value: AIChatContextValue = {
    isOpen,
    open,
    close,
    toggle,
    setOpen: setIsOpen,
    panelSize,
    setPanelSize,
  };

  return (
    <AIChatContext.Provider value={value}>
      {children}
    </AIChatContext.Provider>
  );
}

/**
 * useAIChat - Hook to access AI chat state and controls
 * Must be used within an AIChatProvider
 */
export function useAIChat(): AIChatContextValue {
  const context = useContext(AIChatContext);
  if (!context) {
    throw new Error('useAIChat must be used within an AIChatProvider');
  }
  return context;
}

/**
 * useAIChatOptional - Hook to optionally access AI chat state
 * Returns null if not within an AIChatProvider (useful for conditional rendering)
 */
export function useAIChatOptional(): AIChatContextValue | null {
  return useContext(AIChatContext);
}
