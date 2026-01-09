"use client"

import React, { useCallback, useEffect, useRef, forwardRef, useImperativeHandle, useState, useMemo } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface VirtualMessageListProps<T> {
  items: T[];
  renderItem: (item: T, index: number, isVisible: boolean) => React.ReactNode;
  getItemKey?: (item: T, index: number) => string | number;
  estimatedItemSize?: number;
  overscanCount?: number;
  onScroll?: (scrollOffset: number, scrollHeight: number, clientHeight: number) => void;
  className?: string;
}

export interface VirtualMessageListRef {
  scrollToBottom: (behavior?: 'auto' | 'smooth') => void;
  scrollToIndex: (index: number) => void;
}

// ============================================================================
// Constants
// ============================================================================

// Threshold for enabling windowing optimization (messages count)
const WINDOWING_THRESHOLD = 50;

// Number of items to render outside viewport
const DEFAULT_OVERSCAN = 5;

// ============================================================================
// Component
// ============================================================================

/**
 * VirtualMessageList - Optimized message list with windowing for long conversations
 * 
 * For conversations with 50+ messages, only renders visible items + buffer.
 * Uses CSS content-visibility for better scroll performance.
 * 
 * This is a simpler approach than react-window that works better with
 * variable-height content and React 19.
 */
function VirtualMessageListInner<T>(
  props: VirtualMessageListProps<T>,
  ref: React.Ref<VirtualMessageListRef>
) {
  const {
    items,
    renderItem,
    getItemKey = (_, index) => index,
    estimatedItemSize = 120,
    overscanCount = DEFAULT_OVERSCAN,
    onScroll,
    className,
  } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: items.length });
  const shouldWindow = items.length >= WINDOWING_THRESHOLD;

  // Calculate visible range on scroll
  const updateVisibleRange = useCallback(() => {
    if (!containerRef.current || !shouldWindow) return;

    const { scrollTop, clientHeight } = containerRef.current;
    const estimatedStart = Math.floor(scrollTop / estimatedItemSize);
    const estimatedVisible = Math.ceil(clientHeight / estimatedItemSize);
    
    const start = Math.max(0, estimatedStart - overscanCount);
    const end = Math.min(items.length, estimatedStart + estimatedVisible + overscanCount);
    
    setVisibleRange({ start, end });
  }, [items.length, estimatedItemSize, overscanCount, shouldWindow]);

  // Handle scroll events
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    
    // Update visible range for windowing
    updateVisibleRange();
    
    // Notify parent
    onScroll?.(scrollTop, scrollHeight, clientHeight);
  }, [updateVisibleRange, onScroll]);

  // Expose scroll methods via ref
  useImperativeHandle(ref, () => ({
    scrollToBottom: (behavior = 'auto') => {
      if (containerRef.current) {
        containerRef.current.scrollTo({
          top: containerRef.current.scrollHeight,
          behavior,
        });
      }
    },
    scrollToIndex: (index: number) => {
      if (containerRef.current) {
        // Estimate scroll position
        const estimatedTop = index * estimatedItemSize;
        containerRef.current.scrollTo({
          top: estimatedTop,
          behavior: 'smooth',
        });
      }
    },
  }), [estimatedItemSize]);

  // Auto-scroll to bottom when new items are added
  useEffect(() => {
    if (items.length > 0 && containerRef.current) {
      // Check if user was at bottom before
      const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
      const wasAtBottom = scrollHeight - scrollTop - clientHeight < 100;
      
      if (wasAtBottom) {
        requestAnimationFrame(() => {
          containerRef.current?.scrollTo({
            top: containerRef.current.scrollHeight,
            behavior: 'auto',
          });
        });
      }
    }
  }, [items.length]);

  // Initial visible range calculation
  useEffect(() => {
    updateVisibleRange();
  }, [updateVisibleRange]);

  // Render items with windowing optimization
  const renderedItems = useMemo(() => {
    if (!shouldWindow) {
      // Render all items for small lists
      return items.map((item, index) => (
        <div key={getItemKey(item, index)}>
          {renderItem(item, index, true)}
        </div>
      ));
    }

    // Windowed rendering for large lists
    const result: React.ReactNode[] = [];
    
    // Add spacer for items before visible range
    if (visibleRange.start > 0) {
      result.push(
        <div 
          key="spacer-top" 
          style={{ height: visibleRange.start * estimatedItemSize }}
          aria-hidden="true"
        />
      );
    }
    
    // Render visible items
    for (let i = visibleRange.start; i < visibleRange.end; i++) {
      const item = items[i];
      if (item) {
        result.push(
          <div 
            key={getItemKey(item, i)}
            style={{ contentVisibility: 'auto', containIntrinsicSize: `auto ${estimatedItemSize}px` }}
          >
            {renderItem(item, i, true)}
          </div>
        );
      }
    }
    
    // Add spacer for items after visible range
    if (visibleRange.end < items.length) {
      result.push(
        <div 
          key="spacer-bottom" 
          style={{ height: (items.length - visibleRange.end) * estimatedItemSize }}
          aria-hidden="true"
        />
      );
    }
    
    return result;
  }, [items, visibleRange, shouldWindow, estimatedItemSize, renderItem, getItemKey]);

  return (
    <div 
      ref={containerRef}
      className={className}
      style={{ height: '100%', overflowY: 'auto' }}
      onScroll={handleScroll}
    >
      <div className="space-y-3">
        {renderedItems}
      </div>
    </div>
  );
}

// Forward ref with generic support
export const VirtualMessageList = forwardRef(VirtualMessageListInner) as <T>(
  props: VirtualMessageListProps<T> & { ref?: React.Ref<VirtualMessageListRef> }
) => React.ReactElement;

export default VirtualMessageList;
