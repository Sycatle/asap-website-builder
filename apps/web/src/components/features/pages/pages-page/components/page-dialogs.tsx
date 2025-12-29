"use client"

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldContent, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
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
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Nouvelle page</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Créez une nouvelle page pour votre site web
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <FieldGroup className="gap-4 py-4">
          <Field>
            <FieldLabel htmlFor="title">Titre</FieldLabel>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleFormChange({ 
                title: e.target.value,
                slug: formData.slug || slugify(e.target.value)
              })}
              placeholder="Contact"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="slug">URL (slug)</FieldLabel>
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
            <FieldDescription>
              Laissez vide pour la page d'accueil
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="description">Description</FieldLabel>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleFormChange({ description: e.target.value })}
              placeholder="Description de la page (optionnel)"
              rows={2}
            />
          </Field>
          <Field orientation="horizontal">
            <FieldContent>
              <FieldLabel>Page d'accueil</FieldLabel>
              <FieldDescription>
                Définir comme page principale
              </FieldDescription>
            </FieldContent>
            <Switch
              checked={formData.is_homepage}
              onCheckedChange={(checked) => handleFormChange({ 
                is_homepage: checked,
                slug: checked ? '' : formData.slug
              })}
            />
          </Field>
        </FieldGroup>
        <ResponsiveDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={onSubmit}>
            Créer la page
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
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
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Modifier la page</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            Modifiez les informations de la page
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <FieldGroup className="gap-4 py-4">
          <Field>
            <FieldLabel htmlFor="edit-title">Titre</FieldLabel>
            <Input
              id="edit-title"
              value={formData.title}
              onChange={(e) => handleFormChange({ title: e.target.value })}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="edit-slug">URL (slug)</FieldLabel>
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
              <FieldDescription>
                Le slug ne peut pas être modifié pour la page d'accueil
              </FieldDescription>
            )}
          </Field>
          <Field>
            <FieldLabel htmlFor="edit-description">Description</FieldLabel>
            <Textarea
              id="edit-description"
              value={formData.description}
              onChange={(e) => handleFormChange({ description: e.target.value })}
              rows={2}
            />
          </Field>
          <Field orientation="horizontal">
            <FieldContent>
              <FieldLabel>Page d'accueil</FieldLabel>
              <FieldDescription>
                Définir comme page principale
              </FieldDescription>
            </FieldContent>
            <Switch
              checked={formData.is_homepage}
              onCheckedChange={(checked) => handleFormChange({ 
                is_homepage: checked,
                slug: checked ? '' : formData.slug
              })}
            />
          </Field>
          <Field orientation="horizontal">
            <FieldContent>
              <FieldLabel>Visible</FieldLabel>
              <FieldDescription>
                Afficher la page sur le site
              </FieldDescription>
            </FieldContent>
            <Switch
              checked={formData.visible}
              onCheckedChange={(checked) => handleFormChange({ visible: checked })}
            />
          </Field>
        </FieldGroup>
        <ResponsiveDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Annuler
          </Button>
          <Button onClick={onSubmit}>
            Enregistrer
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
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
