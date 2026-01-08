/**
 * Install Button Component
 * 
 * Smart button handling install/uninstall states with plan checks.
 */

import React from 'react';
import { Button, type ButtonProps } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Download, Check, Loader2, Lock, Trash2 } from 'lucide-react';

// Plan hierarchy for comparison
const PLAN_HIERARCHY: Record<string, number> = {
  free: 0,
  starter: 1,
  pro: 2,
  business: 3,
  enterprise: 4,
};

function canAccessPlan(userPlan: string, requiredPlan: string): boolean {
  return (PLAN_HIERARCHY[userPlan] || 0) >= (PLAN_HIERARCHY[requiredPlan] || 0);
}

interface InstallButtonProps {
  isInstalled: boolean;
  isInstalling: boolean;
  requiredPlan?: string;
  userPlan?: string;
  onInstall: () => void;
  onUninstall: () => void;
  size?: ButtonProps['size'];
  className?: string;
}

export function InstallButton({
  isInstalled,
  isInstalling,
  requiredPlan = 'free',
  userPlan = 'free',
  onInstall,
  onUninstall,
  size = 'default',
  className,
}: InstallButtonProps) {
  const hasAccess = canAccessPlan(userPlan, requiredPlan);

  // Already installed - show uninstall option
  if (isInstalled) {
    return (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            size={size}
            className={className}
            disabled={isInstalling}
          >
            {isInstalling ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uninstalling...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Installed
              </>
            )}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Uninstall Extension?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the extension from your account and deactivate it
              from all websites where it's currently active.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onUninstall}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Uninstall
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }

  // Not installed - check plan access
  if (!hasAccess) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="secondary"
              size={size}
              className={className}
              disabled
            >
              <Lock className="w-4 h-4 mr-2" />
              {requiredPlan.charAt(0).toUpperCase() + requiredPlan.slice(1)} Plan
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Upgrade to {requiredPlan} plan to install this extension</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  // Can install
  return (
    <Button
      variant="default"
      size={size}
      className={className}
      onClick={onInstall}
      disabled={isInstalling}
    >
      {isInstalling ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Installing...
        </>
      ) : (
        <>
          <Download className="w-4 h-4 mr-2" />
          Install
        </>
      )}
    </Button>
  );
}

/**
 * Compact variant for cards
 */
interface InstallButtonCompactProps {
  isInstalled: boolean;
  isInstalling: boolean;
  requiredPlan?: string;
  userPlan?: string;
  onClick: () => void;
}

export function InstallButtonCompact({
  isInstalled,
  isInstalling,
  requiredPlan = 'free',
  userPlan = 'free',
  onClick,
}: InstallButtonCompactProps) {
  const hasAccess = canAccessPlan(userPlan, requiredPlan);

  if (isInstalled) {
    return (
      <Button variant="ghost" size="sm" disabled className="text-green-600">
        <Check className="w-4 h-4 mr-1" />
        Installed
      </Button>
    );
  }

  if (!hasAccess) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="sm" disabled>
              <Lock className="w-4 h-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>Requires {requiredPlan} plan</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      disabled={isInstalling}
    >
      {isInstalling ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Download className="w-4 h-4" />
      )}
    </Button>
  );
}
