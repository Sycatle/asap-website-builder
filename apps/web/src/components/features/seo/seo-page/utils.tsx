"use client"

import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { WebVitalStatus } from "./types";

/**
 * Change indicator showing positive/negative trend
 */
export function ChangeIndicator({ 
  value, 
  inverted = false 
}: { 
  value: number; 
  inverted?: boolean;
}) {
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
 * Status badge for Core Web Vitals
 */
export function StatusBadge({ status }: { status: WebVitalStatus }) {
  const styles: Record<WebVitalStatus, string> = {
    'good': 'bg-green-100 text-green-700 border-green-200',
    'needs-improvement': 'bg-amber-100 text-amber-700 border-amber-200',
    'poor': 'bg-red-100 text-red-700 border-red-200',
  };
  
  const labels: Record<WebVitalStatus, string> = {
    'good': 'Bon',
    'needs-improvement': 'À améliorer',
    'poor': 'Mauvais',
  };
  
  return (
    <Badge variant="outline" className={styles[status]}>
      {labels[status]}
    </Badge>
  );
}

/**
 * Position indicator with color coding
 */
export function PositionIndicator({ position }: { position: string }) {
  const pos = parseFloat(position);
  const color = pos <= 3 ? 'text-green-600' : pos <= 10 ? 'text-amber-600' : 'text-muted-foreground';
  
  return <span className={`font-medium ${color}`}>{position}</span>;
}

/**
 * Ranking position badge with medal styling
 */
export function RankBadge({ rank }: { rank: number }) {
  const className = rank === 1 
    ? 'bg-amber-500/20 text-amber-600' 
    : rank === 2 
    ? 'bg-gray-300/30 text-gray-600' 
    : rank === 3 
    ? 'bg-orange-500/20 text-orange-600' 
    : 'bg-muted text-muted-foreground';
  
  return (
    <span className={`text-xs font-bold w-5 h-5 rounded flex items-center justify-center ${className}`}>
      {rank}
    </span>
  );
}

/**
 * Get SEO score color classes
 */
export function getSeoScoreColor(score: number): {
  border: string;
  background: string;
  badge: string;
  text: string;
} {
  if (score >= 80) {
    return {
      border: 'border-green-500/30',
      background: 'bg-gradient-to-r from-green-500/10 to-transparent',
      badge: 'bg-green-500/10 text-green-600 border-green-500/20',
      text: 'text-green-600',
    };
  }
  if (score >= 50) {
    return {
      border: 'border-amber-500/30',
      background: 'bg-gradient-to-r from-amber-500/10 to-transparent',
      badge: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
      text: 'text-amber-600',
    };
  }
  return {
    border: 'border-red-500/30',
    background: 'bg-gradient-to-r from-red-500/10 to-transparent',
    badge: 'bg-red-500/10 text-red-600 border-red-500/20',
    text: 'text-red-600',
  };
}

/**
 * Get CTR quality rating
 */
export function getCtrQuality(ctr: string): { label: string; color: string } {
  const value = parseFloat(ctr);
  if (value >= 5) return { label: 'Excellent', color: 'text-green-600' };
  if (value >= 2) return { label: 'Bon', color: 'text-amber-600' };
  return { label: 'À améliorer', color: 'text-red-500' };
}

/**
 * Get position quality rating
 */
export function getPositionQuality(position: string): { label: string; color: string } {
  const value = parseFloat(position);
  if (value <= 10) return { label: 'Page 1', color: 'text-green-600' };
  if (value <= 30) return { label: 'Top 3 pages', color: 'text-amber-600' };
  return { label: 'À optimiser', color: 'text-red-500' };
}
