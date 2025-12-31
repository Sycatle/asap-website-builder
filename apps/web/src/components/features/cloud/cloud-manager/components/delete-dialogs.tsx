"use client"

import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { Trash2, AlertTriangle } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import type { DeleteConfirmDialogProps, BulkDeleteDialogProps } from "../types";

/**
 * Single file delete confirmation dialog
 */
export function DeleteConfirmDialog({
  deleteConfirm,
  isDeleting,
  onConfirm,
  onCancel,
}: DeleteConfirmDialogProps) {
  const { t } = useTranslation(['common', 'dashboard']);

  return (
    <ResponsiveDialog open={!!deleteConfirm} onOpenChange={onCancel}>
      <ResponsiveDialogContent className="sm:max-w-md">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            {t('dashboard:cloud.delete.title')}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription className="pt-2">
            <span dangerouslySetInnerHTML={{ __html: t('dashboard:cloud.delete.description', { filename: deleteConfirm?.file.filename }) }} />
            <br />
            <span className="text-muted-foreground">{t('dashboard:cloud.delete.irreversible')}</span>
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <ResponsiveDialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isDeleting}
          >
            {t('common:actions.cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Spinner className="h-4 w-4 mr-2" />
                {t('dashboard:cloud.delete.deleting')}
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                {t('common:actions.delete')}
              </>
            )}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}

/**
 * Bulk delete confirmation dialog
 */
export function BulkDeleteDialog({
  isOpen,
  selectedCount,
  isDeleting,
  onConfirm,
  onCancel,
}: BulkDeleteDialogProps) {
  const { t } = useTranslation(['common', 'dashboard']);

  return (
    <ResponsiveDialog open={isOpen} onOpenChange={onCancel}>
      <ResponsiveDialogContent className="sm:max-w-md">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            {t('dashboard:cloud.delete.title')}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription className="pt-2">
            <span dangerouslySetInnerHTML={{ __html: t('dashboard:cloud.delete.descriptionBulk', { count: selectedCount }) }} />
            <br />
            <span className="text-muted-foreground">{t('dashboard:cloud.delete.irreversible')}</span>
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <ResponsiveDialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isDeleting}
          >
            {t('common:actions.cancel')}
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Spinner className="h-4 w-4 mr-2" />
                {t('dashboard:cloud.delete.deleting')}
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                {t('common:actions.delete')} {selectedCount} {t('dashboard:cloud.selection.count', { count: selectedCount })}
              </>
            )}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
