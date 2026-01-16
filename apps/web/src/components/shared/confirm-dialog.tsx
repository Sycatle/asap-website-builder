"use client"

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { AlertTriangle, Trash2, LogOut, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export type ConfirmDialogVariant = 'danger' | 'warning' | 'info' | 'default';

export interface ConfirmDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when open state changes */
  onOpenChange: (open: boolean) => void;
  /** Dialog title */
  title: string;
  /** Dialog description */
  description: string | React.ReactNode;
  /** Confirm button text */
  confirmText?: string;
  /** Cancel button text */
  cancelText?: string;
  /** Callback when confirmed */
  onConfirm: () => void | Promise<void>;
  /** Visual variant */
  variant?: ConfirmDialogVariant;
  /** Show loading state on confirm */
  loading?: boolean;
  /** Icon to display (defaults based on variant) */
  icon?: React.ReactNode;
}

const variantConfig: Record<ConfirmDialogVariant, {
  icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
  buttonClass: string;
  defaultConfirmText: string;
}> = {
  danger: {
    icon: Trash2,
    iconClass: 'text-red-500 bg-red-100 dark:bg-red-900/30',
    buttonClass: 'bg-red-600 hover:bg-red-700 focus:ring-red-600',
    defaultConfirmText: 'Supprimer',
  },
  warning: {
    icon: AlertTriangle,
    iconClass: 'text-amber-500 bg-amber-100 dark:bg-amber-900/30',
    buttonClass: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-600',
    defaultConfirmText: 'Continuer',
  },
  info: {
    icon: Info,
    iconClass: 'text-blue-500 bg-blue-100 dark:bg-blue-900/30',
    buttonClass: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-600',
    defaultConfirmText: 'Confirmer',
  },
  default: {
    icon: Info,
    iconClass: 'text-primary bg-primary/10',
    buttonClass: '',
    defaultConfirmText: 'Confirmer',
  },
};

/**
 * ConfirmDialog - Reusable confirmation dialog
 * 
 * @example
 * // Delete confirmation
 * <ConfirmDialog
 *   open={showDelete}
 *   onOpenChange={setShowDelete}
 *   title="Supprimer le fichier"
 *   description="Cette action est irréversible."
 *   variant="danger"
 *   onConfirm={handleDelete}
 * />
 * 
 * @example
 * // Warning with custom button text
 * <ConfirmDialog
 *   open={showWarning}
 *   onOpenChange={setShowWarning}
 *   title="Attention"
 *   description="Êtes-vous sûr de vouloir continuer ?"
 *   variant="warning"
 *   confirmText="Oui, continuer"
 *   onConfirm={handleAction}
 * />
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText,
  cancelText,
  onConfirm,
  variant = 'default',
  loading = false,
  icon,
}: ConfirmDialogProps) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const displayCancelText = cancelText ?? t('common:actions.cancel');
  
  const config = variantConfig[variant];
  const IconComponent = config.icon;
  const displayConfirmText = confirmText ?? config.defaultConfirmText;
  const showLoading = loading || isLoading;
  
  const handleConfirm = async () => {
    try {
      setIsLoading(true);
      await onConfirm();
      onOpenChange(false);
    } catch (error) {
      // Error handling should be done in onConfirm
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="flex items-start gap-4">
            {icon ?? (
              <div className={cn('p-2 rounded-full', config.iconClass)}>
                <IconComponent className="h-5 w-5" />
              </div>
            )}
            <div className="flex-1">
              <AlertDialogTitle>{title}</AlertDialogTitle>
              <AlertDialogDescription className="mt-2">
                {description}
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={showLoading}>
            {displayCancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={showLoading}
            className={cn(config.buttonClass)}
          >
            {showLoading && <Spinner className="h-4 w-4 mr-2" />}
            {displayConfirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/**
 * DeleteConfirmDialog - Specialized delete confirmation
 */
export function DeleteConfirmDialog({
  open,
  onOpenChange,
  itemName,
  itemType = 'élément',
  onConfirm,
  loading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemName?: string;
  itemType?: string;
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
}) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={`Supprimer ${itemType}`}
      description={
        itemName 
          ? `Êtes-vous sûr de vouloir supprimer "${itemName}" ? Cette action est irréversible.`
          : `Êtes-vous sûr de vouloir supprimer cet ${itemType} ? Cette action est irréversible.`
      }
      variant="danger"
      onConfirm={onConfirm}
      loading={loading}
    />
  );
}

/**
 * LogoutConfirmDialog - Specialized logout confirmation
 */
export function LogoutConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  loading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
  loading?: boolean;
}) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Se déconnecter"
      description="Êtes-vous sûr de vouloir vous déconnecter ?"
      variant="warning"
      confirmText="Se déconnecter"
      icon={
        <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/30">
          <LogOut className="h-5 w-5 text-amber-500" />
        </div>
      }
      onConfirm={onConfirm}
      loading={loading}
    />
  );
}

export default ConfirmDialog;
