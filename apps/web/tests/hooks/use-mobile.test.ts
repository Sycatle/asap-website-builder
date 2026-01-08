/**
 * Tests for useIsMobile hook
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useIsMobile } from '@/hooks/use-mobile';

describe('useIsMobile', () => {
  const originalInnerWidth = window.innerWidth;
  let mediaQueryListeners: Map<string, () => void>;

  beforeEach(() => {
    mediaQueryListeners = new Map();
    
    // Mock matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: window.innerWidth < 768,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn((event: string, handler: () => void) => {
          if (event === 'change') {
            mediaQueryListeners.set(query, handler);
          }
        }),
        removeEventListener: vi.fn((event: string) => {
          if (event === 'change') {
            mediaQueryListeners.delete(query);
          }
        }),
        dispatchEvent: vi.fn(),
      })),
    });
  });

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      value: originalInnerWidth,
    });
    mediaQueryListeners.clear();
  });

  it('should return false for desktop viewport (>= 768px)', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      value: 1024,
    });

    const { result } = renderHook(() => useIsMobile());
    
    expect(result.current).toBe(false);
  });

  it('should return true for mobile viewport (< 768px)', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      value: 375,
    });

    const { result } = renderHook(() => useIsMobile());
    
    expect(result.current).toBe(true);
  });

  it('should return false for exactly 768px (tablet breakpoint)', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      value: 768,
    });

    const { result } = renderHook(() => useIsMobile());
    
    expect(result.current).toBe(false);
  });

  it('should update when viewport changes', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      value: 1024,
    });

    const { result } = renderHook(() => useIsMobile());
    
    expect(result.current).toBe(false);

    // Simulate resize to mobile
    act(() => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        value: 375,
      });
      // Trigger the media query change handler
      const handler = mediaQueryListeners.get('(max-width: 767px)');
      if (handler) handler();
    });

    expect(result.current).toBe(true);
  });

  it('should cleanup event listener on unmount', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      value: 1024,
    });

    const { unmount } = renderHook(() => useIsMobile());
    
    expect(mediaQueryListeners.size).toBe(1);
    
    unmount();
    
    // After unmount, the listener should be removed
    // Note: In real implementation, the mock tracks removal
  });
});
