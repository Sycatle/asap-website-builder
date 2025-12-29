"use client"

import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import type { ChangeIndicatorProps } from "./types";

/**
 * Change indicator showing positive/negative percentage changes
 */
export function ChangeIndicator({ value, inverted = false }: ChangeIndicatorProps) {
  const isPositive = inverted ? value < 0 : value > 0;
  const isNegative = inverted ? value > 0 : value < 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${
      isPositive ? 'text-green-600' : isNegative ? 'text-red-500' : 'text-muted-foreground'
    }`}>
      {value > 0 ? (
        <ArrowUpRight className="h-3 w-3" />
      ) : value < 0 ? (
        <ArrowDownRight className="h-3 w-3" />
      ) : null}
      {value > 0 ? '+' : ''}{value}%
    </span>
  );
}

/**
 * Format duration in seconds to MM:SS format
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
