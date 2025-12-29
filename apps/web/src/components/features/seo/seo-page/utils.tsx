"use client"

// Re-export shared components
export { ChangeIndicator } from "@/components/shared";
export { StatusBadge } from "@/components/shared";

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
