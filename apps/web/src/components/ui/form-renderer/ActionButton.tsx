"use client";

/**
 * ActionButton Component
 * 
 * Renders action buttons from extension manifest.
 * Supports confirmation dialogs, loading states, and result feedback.
 */

import { useState, useCallback, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { 
  RefreshCw, 
  Unlink, 
  Play, 
  AlertTriangle,
  Check,
  X,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

/** Action style from manifest */
export type ActionStyle = 'primary' | 'secondary' | 'danger';

/** Action definition from manifest */
export interface ActionDef {
  key: string;
  label: string;
  description?: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  style?: ActionStyle;
  /** Confirmation message - if set, shows dialog before executing */
  confirm?: string;
  /** Whether to refresh data after action completes */
  refreshAfter?: boolean;
  /** Icon name (mapped to Lucide icons) */
  icon?: string;
  /** Whether the action is disabled */
  disabled?: boolean;
}

/** Action execution result */
export interface ActionResult {
  success: boolean;
  message?: string;
  data?: unknown;
  status?: 'pending' | 'completed' | 'failed';
  refresh?: boolean;
}

/** Props for ActionButton */
export interface ActionButtonProps {
  /** Action definition from manifest */
  action: ActionDef;
  /** Execute action callback */
  onExecute: (actionKey: string, payload?: Record<string, unknown>) => Promise<ActionResult>;
  /** Whether this action is currently executing */
  isExecuting?: boolean;
  /** Callback when action completes */
  onComplete?: (result: ActionResult) => void;
  /** Additional payload to send with action */
  payload?: Record<string, unknown>;
  /** Additional CSS classes */
  className?: string;
  /** Button size */
  size?: 'default' | 'sm' | 'lg';
  /** Show result toast inline */
  showInlineResult?: boolean;
}

/** Props for ActionPanel */
export interface ActionPanelProps {
  /** Actions from manifest */
  actions: ActionDef[];
  /** Execute action callback */
  onExecute: (actionKey: string, payload?: Record<string, unknown>) => Promise<ActionResult>;
  /** Currently executing action key */
  executingAction?: string | null;
  /** Additional payload for all actions */
  payload?: Record<string, unknown>;
  /** Layout direction */
  direction?: 'horizontal' | 'vertical';
  /** Additional CSS classes */
  className?: string;
}

// ============================================================================
// Style Mapping
// ============================================================================

function getButtonVariant(style?: ActionStyle): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (style) {
    case 'primary':
      return 'default';
    case 'danger':
      return 'destructive';
    case 'secondary':
    default:
      return 'outline';
  }
}

// ============================================================================
// ActionButton Component
// ============================================================================

export function ActionButton({
  action,
  onExecute,
  isExecuting = false,
  onComplete,
  payload,
  className,
  size = 'default',
  showInlineResult = false,
}: ActionButtonProps) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [result, setResult] = useState<ActionResult | null>(null);

  const iconName = action.icon;
  const variant = getButtonVariant(action.style);

  const executeAction = useCallback(async () => {
    setShowConfirm(false);
    setResult(null);

    try {
      const actionResult = await onExecute(action.key, payload);
      setResult(actionResult);
      onComplete?.(actionResult);

      // Clear result after 3 seconds
      if (showInlineResult) {
        setTimeout(() => setResult(null), 3000);
      }
    } catch (error) {
      const errorResult: ActionResult = {
        success: false,
        message: error instanceof Error ? error.message : 'Action failed',
      };
      setResult(errorResult);
      onComplete?.(errorResult);

      if (showInlineResult) {
        setTimeout(() => setResult(null), 5000);
      }
    }
  }, [action.key, payload, onExecute, onComplete, showInlineResult]);

  const handleClick = useCallback(() => {
    if (action.confirm) {
      setShowConfirm(true);
    } else {
      executeAction();
    }
  }, [action.confirm, executeAction]);

  // Render the icon inline to avoid component reference warnings
  const renderIcon = () => {
    if (isExecuting) {
      return <Loader2 className="h-4 w-4 animate-spin mr-2" />;
    }
    if (!iconName) return null;
    
    const IconMap: Record<string, ReactNode> = {
      refresh: <RefreshCw className="h-4 w-4 mr-2" />,
      sync: <RefreshCw className="h-4 w-4 mr-2" />,
      unlink: <Unlink className="h-4 w-4 mr-2" />,
      disconnect: <Unlink className="h-4 w-4 mr-2" />,
      play: <Play className="h-4 w-4 mr-2" />,
      run: <Play className="h-4 w-4 mr-2" />,
      warning: <AlertTriangle className="h-4 w-4 mr-2" />,
      check: <Check className="h-4 w-4 mr-2" />,
      success: <Check className="h-4 w-4 mr-2" />,
      error: <X className="h-4 w-4 mr-2" />,
      close: <X className="h-4 w-4 mr-2" />,
    };
    
    return IconMap[iconName.toLowerCase()] || null;
  };

  return (
    <>
      <div className={cn('inline-flex items-center gap-2', className)}>
        <Button
          variant={variant}
          size={size}
          onClick={handleClick}
          disabled={action.disabled || isExecuting}
        >
          {renderIcon()}
          {action.label}
        </Button>

        {/* Inline result indicator */}
        {showInlineResult && result && (
          <span
            className={cn(
              'text-sm flex items-center gap-1',
              result.success ? 'text-green-600' : 'text-red-600'
            )}
          >
            {result.success ? (
              <Check className="h-4 w-4" />
            ) : (
              <X className="h-4 w-4" />
            )}
            {result.message}
          </span>
        )}
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Action</AlertDialogTitle>
            <AlertDialogDescription>
              {action.confirm}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={executeAction}
              className={cn(
                action.style === 'danger' && 'bg-destructive text-destructive-foreground hover:bg-destructive/90'
              )}
            >
              {action.label}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

// ============================================================================
// ActionPanel Component
// ============================================================================

/**
 * Panel displaying multiple action buttons
 */
export function ActionPanel({
  actions,
  onExecute,
  executingAction,
  payload,
  direction = 'horizontal',
  className,
}: ActionPanelProps) {
  if (!actions.length) return null;

  return (
    <div
      className={cn(
        'flex gap-2',
        direction === 'vertical' ? 'flex-col' : 'flex-row flex-wrap',
        className
      )}
    >
      {actions.map((action) => (
        <ActionButton
          key={action.key}
          action={action}
          onExecute={onExecute}
          isExecuting={executingAction === action.key}
          payload={payload}
          showInlineResult
        />
      ))}
    </div>
  );
}

export default ActionButton;
