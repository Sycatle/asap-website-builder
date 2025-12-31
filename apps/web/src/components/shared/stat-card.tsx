"use client"

import React from 'react';
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChangeIndicator } from "./change-indicator";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export interface StatCardProps {
  /** Card title/label */
  title: string;
  /** Main value to display */
  value: number | string;
  /** Optional subtitle under the value */
  subtitle?: string;
  /** Icon to display */
  icon?: LucideIcon | React.ReactNode;
  /** Percentage change from previous period */
  change?: number;
  /** If true, negative change is good (e.g., bounce rate) */
  changeInverted?: boolean;
  /** Tooltip description */
  tooltip?: string;
  /** Visual variant */
  variant?: 'default' | 'highlight' | 'success' | 'warning' | 'danger';
  /** Format value as locale string */
  formatValue?: boolean;
  /** Additional class names */
  className?: string;
  /** Click handler */
  onClick?: () => void;
}

const variantStyles = {
  default: {
    card: 'shadow-sm hover:shadow-md transition-shadow',
    icon: 'bg-primary/10 text-primary',
    value: '',
  },
  highlight: {
    card: 'border-green-500/30 bg-gradient-to-br from-green-500/10 via-green-500/5 to-transparent shadow-lg shadow-green-500/5',
    icon: 'bg-green-500/10 text-green-600',
    value: 'text-green-600',
  },
  success: {
    card: 'border-green-500/20 bg-green-50/50 dark:bg-green-950/20',
    icon: 'bg-green-500/10 text-green-600',
    value: 'text-green-600',
  },
  warning: {
    card: 'border-amber-500/20 bg-amber-50/50 dark:bg-amber-950/20',
    icon: 'bg-amber-500/10 text-amber-600',
    value: 'text-amber-600',
  },
  danger: {
    card: 'border-red-500/20 bg-red-50/50 dark:bg-red-950/20',
    icon: 'bg-red-500/10 text-red-600',
    value: 'text-red-600',
  },
};

/**
 * StatCard - Reusable statistics card component
 * 
 * @example
 * // Basic usage
 * <StatCard
 *   title="Visites totales"
 *   value={1234}
 *   icon={Activity}
 *   change={12}
 *   tooltip="Nombre total de visites"
 * />
 * 
 * @example
 * // Highlight variant (for hero stats)
 * <StatCard
 *   title="Live"
 *   value={42}
 *   subtitle="visiteurs actifs"
 *   variant="highlight"
 *   change={8}
 * />
 * 
 * @example
 * // With inverted change (bounce rate)
 * <StatCard
 *   title="Taux de rebond"
 *   value="45%"
 *   icon={TrendingDown}
 *   change={-5}
 *   changeInverted
 *   tooltip="Un taux de rebond plus bas est meilleur"
 * />
 */
export function StatCard({
  title,
  value,
  subtitle,
  icon,
  change,
  changeInverted = false,
  tooltip,
  variant = 'default',
  formatValue = true,
  className,
  onClick,
}: StatCardProps) {
  const styles = variantStyles[variant];
  
  // Format numeric values
  const displayValue = typeof value === 'number' && formatValue
    ? value.toLocaleString('fr-FR')
    : value;
  
  // Render icon
  const renderIcon = () => {
    if (!icon) return null;
    
    if (React.isValidElement(icon)) {
      return icon;
    }
    
    const IconComponent = icon as LucideIcon;
    return (
      <div className={cn('p-1.5 rounded-lg', styles.icon)}>
        <IconComponent className="h-4 w-4" />
      </div>
    );
  };
  
  const cardContent = (
    <Card 
      className={cn(
        styles.card,
        onClick && 'cursor-pointer',
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          {renderIcon()}
          {change !== undefined && (
            <ChangeIndicator value={change} inverted={changeInverted} />
          )}
        </div>
        <p className={cn('text-3xl font-bold tabular-nums', styles.value)}>
          {displayValue}
        </p>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
        {!subtitle && title && (
          <p className="text-xs text-muted-foreground mt-1">{title}</p>
        )}
      </CardContent>
    </Card>
  );
  
  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="cursor-help">{cardContent}</div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  return cardContent;
}

/**
 * StatCardGrid - Grid container for stat cards
 */
export function StatCardGrid({ 
  children,
  columns = 4,
  className,
}: { 
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}) {
  const colClasses = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-2 lg:grid-cols-4',
  };
  
  return (
    <div className={cn('grid gap-3', colClasses[columns], className)}>
      {children}
    </div>
  );
}

/**
 * LiveStatCard - Stat card with live indicator
 */
export function LiveStatCard({
  value,
  subtitle = 'visiteurs actifs',
  change,
  tooltip,
  className,
}: {
  value: number;
  subtitle?: string;
  change?: number;
  tooltip?: string;
  className?: string;
}) {
  const content = (
    <Card className={cn(
      'relative overflow-hidden border-green-500/30 bg-gradient-to-br from-green-500/10 via-green-500/5 to-transparent shadow-lg shadow-green-500/5',
      className
    )}>
      <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/10 rounded-full blur-2xl" />
      <CardContent className="p-4 relative">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="relative">
              <div className="h-2 w-2 rounded-full bg-green-500" />
              <div className="absolute inset-0 h-2 w-2 rounded-full bg-green-500 animate-ping" />
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-green-600">Live</span>
          </div>
          {change !== undefined && <ChangeIndicator value={change} />}
        </div>
        <p className="text-4xl font-bold text-green-600 tabular-nums">{value}</p>
        <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
      </CardContent>
    </Card>
  );
  
  if (tooltip) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="cursor-help">{content}</div>
          </TooltipTrigger>
          <TooltipContent>
            <p>{tooltip}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }
  
  return content;
}

export default StatCard;
