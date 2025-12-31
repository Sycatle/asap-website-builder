"use client"

import type { ReactNode } from "react";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  /** Variant for the icon container */
  iconVariant?: "default" | "icon";
}

/**
 * EmptyState - Wrapper around shadcn/ui Empty component
 * Provides backward compatibility with existing API
 */
export function EmptyState({ 
  icon, 
  title, 
  description, 
  action, 
  className,
  iconVariant = "default",
}: EmptyStateProps) {
  return (
    <Empty className={cn("border-2 bg-muted/30", className)}>
      <EmptyHeader>
        {icon && (
          <EmptyMedia variant={iconVariant} className="opacity-50">
            {icon}
          </EmptyMedia>
        )}
        <EmptyTitle>{title}</EmptyTitle>
        {description && (
          <EmptyDescription>{description}</EmptyDescription>
        )}
      </EmptyHeader>
      {action && (
        <EmptyContent>
          {action}
        </EmptyContent>
      )}
    </Empty>
  );
}

// Re-export primitives for advanced usage
export {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
