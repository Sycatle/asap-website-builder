"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

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
 */
export function AIChatProvider({ children, defaultOpen = false, defaultPanelSize = 30 }: AIChatProviderProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [panelSize, setPanelSize] = useState(defaultPanelSize);

  const open = useCallback(() => setIsOpen(true), []);
  const close = useCallback(() => setIsOpen(false), []);
  const toggle = useCallback(() => setIsOpen(prev => !prev), []);

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
