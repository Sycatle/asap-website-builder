"use client"

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Clock, AlertCircle, XCircle, Wifi, WifiOff, Globe, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Status types for different contexts
 */
export type PublishStatus = 'published' | 'draft';
export type ConnectionStatus = 'online' | 'offline';
export type WebVitalStatus = 'good' | 'needs-improvement' | 'poor';
export type GenericStatus = 'success' | 'warning' | 'error' | 'info' | 'neutral';

export interface StatusBadgeProps {
  /** The status to display */
  status: PublishStatus | ConnectionStatus | WebVitalStatus | GenericStatus;
  /** Optional custom label (overrides default) */
  label?: string;
  /** Show icon */
  showIcon?: boolean;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Additional class names */
  className?: string;
}

const statusConfig: Record<string, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  className: string;
}> = {
  // Publish status
  published: {
    label: 'En ligne',
    icon: CheckCircle2,
    className: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
  },
  draft: {
    label: 'Brouillon',
    icon: Clock,
    className: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
  },
  // Connection status
  online: {
    label: 'En ligne',
    icon: Wifi,
    className: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
  },
  offline: {
    label: 'Hors ligne',
    icon: WifiOff,
    className: 'bg-muted text-foreground border-border',
  },
  // Web Vitals status
  good: {
    label: 'Bon',
    icon: CheckCircle2,
    className: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
  },
  'needs-improvement': {
    label: 'À améliorer',
    icon: AlertCircle,
    className: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
  },
  poor: {
    label: 'Mauvais',
    icon: XCircle,
    className: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
  },
  // Generic status
  success: {
    label: 'Succès',
    icon: CheckCircle2,
    className: 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
  },
  warning: {
    label: 'Attention',
    icon: AlertCircle,
    className: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800',
  },
  error: {
    label: 'Erreur',
    icon: XCircle,
    className: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800',
  },
  info: {
    label: 'Info',
    icon: Globe,
    className: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
  },
  neutral: {
    label: 'Neutre',
    icon: Lock,
    className: 'bg-muted text-foreground border-border',
  },
};

const sizeClasses = {
  sm: 'text-[10px] px-1.5 py-0',
  md: 'text-xs px-2 py-0.5',
};

/**
 * StatusBadge - Reusable status indicator badge
 * 
 * @example
 * // Publish status
 * <StatusBadge status="published" />
 * <StatusBadge status="draft" />
 * 
 * @example
 * // Web Vitals
 * <StatusBadge status="good" />
 * <StatusBadge status="needs-improvement" />
 * 
 * @example
 * // Custom label and no icon
 * <StatusBadge status="success" label="Actif" showIcon={false} />
 */
export function StatusBadge({ 
  status, 
  label,
  showIcon = true,
  size = 'md',
  className,
}: StatusBadgeProps) {
  const { t } = useTranslation();
  const config = statusConfig[status];
  if (!config) return null;
  
  const Icon = config.icon;
  
  // Map status to translation keys
  const statusTranslations: Record<string, string> = {
    published: t('common:status.online'),
    online: t('common:status.online'),
    draft: t('common:status.draft'),
    offline: t('common:status.offline'),
    good: t('common:status.good'),
    'needs-improvement': t('common:status.needsImprovement'),
    poor: t('common:status.poor'),
    success: t('common:status.success'),
    warning: t('common:status.warning'),
    error: t('errors:generic.title'),
    info: t('common:status.info'),
    neutral: t('common:status.neutral'),
  };
  
  const displayLabel = label ?? statusTranslations[status] ?? config.label;
  
  return (
    <Badge 
      variant="outline" 
      className={cn(
        config.className,
        sizeClasses[size],
        'font-medium',
        className
      )}
    >
      {showIcon && <Icon className={cn('mr-1', size === 'sm' ? 'h-2.5 w-2.5' : 'h-3 w-3')} />}
      {displayLabel}
    </Badge>
  );
}

/**
 * Dot indicator for inline status display
 */
export function StatusDot({ 
  status, 
  pulse = false,
  className,
}: { 
  status: 'online' | 'offline' | 'success' | 'warning' | 'error';
  pulse?: boolean;
  className?: string;
}) {
  const colors: Record<string, string> = {
    online: 'bg-green-500',
    offline: 'bg-muted-foreground',
    success: 'bg-green-500',
    warning: 'bg-amber-500',
    error: 'bg-red-500',
  };
  
  return (
    <span className={cn('relative inline-flex', className)}>
      <span className={cn('h-2 w-2 rounded-full', colors[status])} />
      {pulse && (
        <span className={cn(
          'absolute inset-0 h-2 w-2 rounded-full animate-ping opacity-75',
          colors[status]
        )} />
      )}
    </span>
  );
}

export default StatusBadge;
