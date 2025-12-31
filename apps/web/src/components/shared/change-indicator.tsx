"use client"

import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ChangeIndicatorProps {
  /** The percentage change value */
  value: number;
  /** If true, negative values are shown as positive (e.g., bounce rate decrease is good) */
  inverted?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Show as badge with background */
  showBadge?: boolean;
  /** Additional class names */
  className?: string;
}

const sizeClasses = {
  sm: { text: 'text-[10px]', icon: 'h-2.5 w-2.5' },
  md: { text: 'text-xs', icon: 'h-3 w-3' },
  lg: { text: 'text-sm', icon: 'h-3.5 w-3.5' },
};

/**
 * ChangeIndicator - Shows positive/negative percentage changes with visual feedback
 * 
 * @example
 * // Basic usage
 * <ChangeIndicator value={12} />  // Shows "+12%" in green
 * <ChangeIndicator value={-5} />  // Shows "-5%" in red
 * 
 * @example
 * // Inverted (good when negative, like bounce rate)
 * <ChangeIndicator value={-8} inverted />  // Shows "-8%" in green
 * 
 * @example
 * // With badge styling
 * <ChangeIndicator value={25} showBadge />
 */
export function ChangeIndicator({ 
  value, 
  inverted = false,
  size = 'md',
  showBadge = false,
  className,
}: ChangeIndicatorProps) {
  const isPositive = inverted ? value < 0 : value > 0;
  const isNegative = inverted ? value > 0 : value < 0;
  const isNeutral = value === 0;
  
  const { text: textSize, icon: iconSize } = sizeClasses[size];
  
  const colorClass = isPositive 
    ? 'text-green-600' 
    : isNegative 
    ? 'text-red-500' 
    : 'text-muted-foreground';
  
  const badgeClass = showBadge
    ? isPositive
      ? 'bg-green-100 dark:bg-green-900/30 px-1.5 py-0.5 rounded-full'
      : isNegative
      ? 'bg-red-100 dark:bg-red-900/30 px-1.5 py-0.5 rounded-full'
      : 'bg-muted px-1.5 py-0.5 rounded-full'
    : '';
  
  const Icon = value > 0 ? ArrowUpRight : value < 0 ? ArrowDownRight : Minus;
  
  return (
    <span className={cn(
      'inline-flex items-center gap-0.5 font-medium',
      textSize,
      colorClass,
      badgeClass,
      className
    )}>
      {!isNeutral && <Icon className={iconSize} />}
      {value > 0 ? '+' : ''}{value}%
    </span>
  );
}

/**
 * Calculate percentage change between two values
 */
export function getPercentageChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

export default ChangeIndicator;
