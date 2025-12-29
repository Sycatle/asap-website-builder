"use client"

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { slugify } from "@/lib/utils/formatters";
import type { CreatePageDialogProps, EditPageDialogProps, DeletePageDialogProps, PageFormData } from "../types";

/**
 * Dialog for creating a new page
 */
export function CreatePageDialog({
  open,
  onOpenChange,
  formData,
  onFormDataChange,
  onSubmit,
}: CreatePageDialogProps) {
  const handleFormChange = (updates: Partial<PageFormData>) => {
    onFormDataChange({ ...formData, ...updates });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouvelle page</DialogTitle>
          <DialogDescription>
            Créez une nouvelle page pour votre site web
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="title">Titre</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleFormChange({ 
                title: e.target.value,
                slug: formData.slug || slugify(e.target.value)
              })}
              placeholder="Contact"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="slug">URL (slug)</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">/</span>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => handleFormChange({ 
                  slug: slugify(e.target.value)
                })}
                placeholder="contact"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Laissez vide pour la page d'accueil
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleFormChange({ description: e.target.value })}
              placeholder="Description de la page (optionnel)"
              rows={2}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Page d'accueil</Label>
              <p className="text-xs text-muted-foreground">
                Définir comme page principale
              </p>
            </div>
            <Switch
              checked={formData.is_homepage}
              onCheckedChange={(checked) => handleFormChange({ 
                is_homepage: checked,
                slug: checked ? '' : formData.slug
              })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={onSubmit}>
            Créer la page
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Dialog for editing an existing page
 */
export function EditPageDialog({
  open,
  onOpenChange,
  formData,
  onFormDataChange,
  onSubmit,
}: EditPageDialogProps) {
  const handleFormChange = (updates: Partial<PageFormData>) => {
    onFormDataChange({ ...formData, ...updates });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier la page</DialogTitle>
          <DialogDescription>
            Modifiez les informations de la page
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="edit-title">Titre</Label>
            <Input
              id="edit-title"
              value={formData.title}
              onChange={(e) => handleFormChange({ title: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-slug">URL (slug)</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">/</span>
              <Input
                id="edit-slug"
                value={formData.slug}
                onChange={(e) => handleFormChange({ 
                  slug: slugify(e.target.value)
                })}
                disabled={formData.is_homepage}
              />
            </div>
            {formData.is_homepage && (
              <p className="text-xs text-muted-foreground">
                Le slug ne peut pas être modifié pour la page d'accueil
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="edit-description">Description</Label>
            <Textarea
              id="edit-description"
              value={formData.description}
              onChange={(e) => handleFormChange({ description: e.target.value })}
              rows={2}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Page d'accueil</Label>
              <p className="text-xs text-muted-foreground">
                Définir comme page principale
              </p>
            </div>
            <Switch
              checked={formData.is_homepage}
              onCheckedChange={(checked) => handleFormChange({ 
                is_homepage: checked,
                slug: checked ? '' : formData.slug
              })}
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Visible</Label>
              <p className="text-xs text-muted-foreground">
                Afficher la page sur le site
              </p>
            </div>
            <Switch
              checked={formData.visible}
              onCheckedChange={(checked) => handleFormChange({ visible: checked })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={onSubmit}>
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Delete confirmation dialog
 */
export function DeletePageDialog({
  open,
  onOpenChange,
  selectedPage,
  onConfirm,
}: DeletePageDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Supprimer la page ?</AlertDialogTitle>
          <AlertDialogDescription>
            Êtes-vous sûr de vouloir supprimer la page "{selectedPage?.title}" ?
            Cette action est irréversible.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Annuler</AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Supprimer
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
