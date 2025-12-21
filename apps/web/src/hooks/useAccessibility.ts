import { useCallback, useRef, useEffect } from 'react';

/**
 * Types for focusable elements
 */
const FOCUSABLE_ELEMENTS = [
  'a[href]',
  'area[href]',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'button:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable]',
  'audio[controls]',
  'video[controls]',
  'details>summary:first-of-type',
  'details',
] as const;

const FOCUSABLE_SELECTOR = FOCUSABLE_ELEMENTS.join(',');

/**
 * Hook to trap focus within a container (for modals, dialogs, etc.)
 */
export function useFocusTrap<T extends HTMLElement = HTMLElement>(
  isActive: boolean = true
) {
  const containerRef = useRef<T>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // Store the previously focused element
  useEffect(() => {
    if (isActive) {
      previousFocusRef.current = document.activeElement as HTMLElement;
    }
  }, [isActive]);

  // Restore focus when trap is deactivated
  useEffect(() => {
    return () => {
      if (previousFocusRef.current?.focus) {
        previousFocusRef.current.focus();
      }
    };
  }, []);

  // Focus first element when activated
  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const focusableElements = containerRef.current.querySelectorAll(FOCUSABLE_SELECTOR);
    const firstFocusable = focusableElements[0] as HTMLElement;
    
    if (firstFocusable) {
      // Small delay to ensure DOM is ready
      requestAnimationFrame(() => {
        firstFocusable.focus();
      });
    }
  }, [isActive]);

  // Handle keyboard navigation
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!isActive || !containerRef.current) return;
      if (event.key !== 'Tab') return;

      const focusableElements = containerRef.current.querySelectorAll(FOCUSABLE_SELECTOR);
      const firstFocusable = focusableElements[0] as HTMLElement;
      const lastFocusable = focusableElements[focusableElements.length - 1] as HTMLElement;

      // Shift + Tab
      if (event.shiftKey) {
        if (document.activeElement === firstFocusable) {
          event.preventDefault();
          lastFocusable?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastFocusable) {
          event.preventDefault();
          firstFocusable?.focus();
        }
      }
    },
    [isActive]
  );

  // Add/remove event listener
  useEffect(() => {
    if (!isActive) return;

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isActive, handleKeyDown]);

  return containerRef;
}

/**
 * Hook to announce messages to screen readers
 */
export function useAnnounce() {
  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcer = document.createElement('div');
    announcer.setAttribute('role', 'status');
    announcer.setAttribute('aria-live', priority);
    announcer.setAttribute('aria-atomic', 'true');
    announcer.className = 'sr-only';
    announcer.textContent = message;
    
    document.body.appendChild(announcer);
    
    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcer);
    }, 1000);
  }, []);

  return announce;
}

/**
 * Hook to manage skip links for keyboard navigation
 */
export function useSkipLink(targetId: string) {
  const handleClick = useCallback(
    (event: React.MouseEvent | React.KeyboardEvent) => {
      event.preventDefault();
      const target = document.getElementById(targetId);
      
      if (target) {
        target.tabIndex = -1;
        target.focus();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    },
    [targetId]
  );

  return {
    onClick: handleClick,
    onKeyDown: (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        handleClick(event);
      }
    },
  };
}

/**
 * Hook to handle escape key press
 */
export function useEscapeKey(callback: () => void, isActive: boolean = true) {
  useEffect(() => {
    if (!isActive) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        callback();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [callback, isActive]);
}

/**
 * Hook to detect reduced motion preference
 */
export function useReducedMotion(): boolean {
  const mediaQuery = typeof window !== 'undefined'
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : null;

  // Return true if user prefers reduced motion
  return mediaQuery?.matches ?? false;
}

/**
 * Hook to manage roving tabindex for composite widgets
 * (toolbars, menus, listboxes, etc.)
 */
export function useRovingTabIndex<T extends HTMLElement = HTMLElement>(
  items: T[],
  options: {
    orientation?: 'horizontal' | 'vertical' | 'both';
    loop?: boolean;
  } = {}
) {
  const { orientation = 'horizontal', loop = true } = options;
  const currentIndexRef = useRef(0);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent, index: number) => {
      const isHorizontal = orientation === 'horizontal' || orientation === 'both';
      const isVertical = orientation === 'vertical' || orientation === 'both';

      let nextIndex = index;

      switch (event.key) {
        case 'ArrowRight':
          if (isHorizontal) {
            event.preventDefault();
            nextIndex = loop
              ? (index + 1) % items.length
              : Math.min(index + 1, items.length - 1);
          }
          break;
        case 'ArrowLeft':
          if (isHorizontal) {
            event.preventDefault();
            nextIndex = loop
              ? (index - 1 + items.length) % items.length
              : Math.max(index - 1, 0);
          }
          break;
        case 'ArrowDown':
          if (isVertical) {
            event.preventDefault();
            nextIndex = loop
              ? (index + 1) % items.length
              : Math.min(index + 1, items.length - 1);
          }
          break;
        case 'ArrowUp':
          if (isVertical) {
            event.preventDefault();
            nextIndex = loop
              ? (index - 1 + items.length) % items.length
              : Math.max(index - 1, 0);
          }
          break;
        case 'Home':
          event.preventDefault();
          nextIndex = 0;
          break;
        case 'End':
          event.preventDefault();
          nextIndex = items.length - 1;
          break;
        default:
          return;
      }

      currentIndexRef.current = nextIndex;
      items[nextIndex]?.focus();
    },
    [items, orientation, loop]
  );

  const getTabIndex = useCallback(
    (index: number) => (index === currentIndexRef.current ? 0 : -1),
    []
  );

  return { handleKeyDown, getTabIndex };
}
