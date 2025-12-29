"use client"

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
  return (
    <ResponsiveDialog open={!!deleteConfirm} onOpenChange={onCancel}>
      <ResponsiveDialogContent className="sm:max-w-md">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Confirmer la suppression
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription className="pt-2">
            Êtes-vous sûr de vouloir supprimer <span className="font-medium text-foreground">{deleteConfirm?.file.filename}</span> ?
            <br />
            <span className="text-muted-foreground">Cette action est irréversible.</span>
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <ResponsiveDialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isDeleting}
          >
            Annuler
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Spinner className="h-4 w-4 mr-2" />
                Suppression...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer
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
  return (
    <ResponsiveDialog open={isOpen} onOpenChange={onCancel}>
      <ResponsiveDialogContent className="sm:max-w-md">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Confirmer la suppression
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription className="pt-2">
            Êtes-vous sûr de vouloir supprimer <span className="font-medium text-foreground">{selectedCount} fichier{selectedCount > 1 ? 's' : ''}</span> ?
            <br />
            <span className="text-muted-foreground">Cette action est irréversible.</span>
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <ResponsiveDialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isDeleting}
          >
            Annuler
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Spinner className="h-4 w-4 mr-2" />
                Suppression...
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 mr-2" />
                Supprimer {selectedCount} fichier{selectedCount > 1 ? 's' : ''}
              </>
            )}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
