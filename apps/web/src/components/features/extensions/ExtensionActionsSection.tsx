"use client";

/**
 * ExtensionActionsSection Component
 * 
 * Displays extension action buttons from manifest.
 * Can be integrated into ExtensionConfig or used standalone.
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ActionButton, type ActionDef, type ActionResult } from '@/components/ui/form-renderer';
import { useExtensionActions } from '@/lib/query/store';
import { Zap } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface ManifestAction {
  key: string;
  label: string;
  description?: string;
  endpoint: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  style?: 'primary' | 'secondary' | 'danger';
  confirm?: string;
  refreshAfter?: boolean;
  icon?: string;
}

export interface ExtensionActionsSectionProps {
  /** Website ID */
  websiteId: string;
  /** Extension slug */
  extensionSlug: string;
  /** Actions from manifest */
  actions: ManifestAction[];
  /** Additional payload to include with all actions */
  payload?: Record<string, unknown>;
  /** Called when an action completes */
  onActionComplete?: (actionKey: string, result: ActionResult) => void;
  /** Whether to show as a card or inline */
  variant?: 'card' | 'inline';
  /** Title for card variant */
  title?: string;
  /** Description for card variant */
  description?: string;
}

// ============================================================================
// Component
// ============================================================================

export function ExtensionActionsSection({
  websiteId,
  extensionSlug,
  actions,
  payload = {},
  onActionComplete,
  variant = 'card',
  title,
  description,
}: ExtensionActionsSectionProps) {
  const { t } = useTranslation(['dashboard', 'common']);
  // Track results for potential display (prefix with _ to indicate intentionally unused for now)
  const [_lastResults, setLastResults] = useState<Record<string, ActionResult>>({});
  
  const { 
    executeAction, 
    isActionExecuting,
    error,
  } = useExtensionActions(websiteId, extensionSlug);

  // Convert manifest actions to ActionDef format
  const actionDefs: ActionDef[] = actions.map((action) => ({
    key: action.key,
    label: action.label,
    description: action.description,
    endpoint: action.endpoint,
    method: action.method,
    style: action.style,
    confirm: action.confirm,
    refreshAfter: action.refreshAfter,
    icon: action.icon,
  }));

  // Handle action execution
  const handleExecute = async (actionKey: string, actionPayload?: Record<string, unknown>): Promise<ActionResult> => {
    const action = actions.find(a => a.key === actionKey);
    
    try {
      const result = await executeAction(actionKey, { ...payload, ...actionPayload });
      
      // Store result
      setLastResults(prev => ({ ...prev, [actionKey]: result }));
      
      // Show toast
      if (result.success) {
        toast.success(
          result.message || 
          t('dashboard:extensions.config.toast.actionExecuted', { action: action?.label || actionKey })
        );
      } else {
        toast.error(
          result.message || 
          t('dashboard:extensions.config.toast.actionError')
        );
      }
      
      // Callback
      onActionComplete?.(actionKey, result);
      
      return result;
    } catch (err) {
      const errorResult: ActionResult = {
        success: false,
        message: err instanceof Error ? err.message : 'Action failed',
      };
      
      setLastResults(prev => ({ ...prev, [actionKey]: errorResult }));
      toast.error(errorResult.message);
      onActionComplete?.(actionKey, errorResult);
      
      return errorResult;
    }
  };

  // Don't render if no actions
  if (!actions.length) {
    return null;
  }

  // Inline variant - just buttons
  if (variant === 'inline') {
    return (
      <div className="flex flex-wrap gap-2">
        {actionDefs.map((action) => (
          <ActionButton
            key={action.key}
            action={action}
            onExecute={handleExecute}
            isExecuting={isActionExecuting(action.key)}
            showInlineResult
          />
        ))}
      </div>
    );
  }

  // Card variant - with header and description
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Zap className="h-4 w-4" />
          {title || t('dashboard:extensions.config.actions.title')}
        </CardTitle>
        {description && (
          <CardDescription>{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {actionDefs.map((action) => (
            <ActionButton
              key={action.key}
              action={action}
              onExecute={handleExecute}
              isExecuting={isActionExecuting(action.key)}
              showInlineResult
            />
          ))}
        </div>
        
        {/* Show any global error */}
        {error && (
          <p className="mt-2 text-sm text-destructive">
            {error.message}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default ExtensionActionsSection;
