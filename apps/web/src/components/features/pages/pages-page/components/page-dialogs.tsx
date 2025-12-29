"use client"

import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation(['common', 'dashboard']);
  
  const handleFormChange = (updates: Partial<PageFormData>) => {
    onFormDataChange({ ...formData, ...updates });
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{t('dashboard:pages.dialogs.create.title')}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {t('dashboard:pages.dialogs.create.description')}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <FieldGroup className="gap-4 py-4">
          <Field>
            <FieldLabel htmlFor="title">{t('dashboard:pages.form.title')}</FieldLabel>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleFormChange({ 
                title: e.target.value,
                slug: formData.slug || slugify(e.target.value)
              })}
              placeholder={t('dashboard:pages.form.titlePlaceholder')}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="slug">{t('dashboard:pages.form.slug')}</FieldLabel>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">/</span>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => handleFormChange({ 
                  slug: slugify(e.target.value)
                })}
                placeholder={t('dashboard:pages.form.slugPlaceholder')}
              />
            </div>
            <FieldDescription>
              {t('dashboard:pages.form.slugDescription')}
            </FieldDescription>
          </Field>
          <Field>
            <FieldLabel htmlFor="description">{t('dashboard:pages.form.description')}</FieldLabel>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleFormChange({ description: e.target.value })}
              placeholder={t('dashboard:pages.form.descriptionPlaceholder')}
              rows={2}
            />
          </Field>
          <Field orientation="horizontal">
            <FieldContent>
              <FieldLabel>{t('dashboard:pages.form.homepage')}</FieldLabel>
              <FieldDescription>
                {t('dashboard:pages.form.homepageDescription')}
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
            {t('common:actions.cancel')}
          </Button>
          <Button onClick={onSubmit}>
            {t('dashboard:pages.list.create')}
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
  const { t } = useTranslation(['common', 'dashboard']);
  
  const handleFormChange = (updates: Partial<PageFormData>) => {
    onFormDataChange({ ...formData, ...updates });
  };

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent>
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>{t('dashboard:pages.dialogs.edit.title')}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {t('dashboard:pages.dialogs.edit.description')}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        <FieldGroup className="gap-4 py-4">
          <Field>
            <FieldLabel htmlFor="edit-title">{t('dashboard:pages.form.title')}</FieldLabel>
            <Input
              id="edit-title"
              value={formData.title}
              onChange={(e) => handleFormChange({ title: e.target.value })}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="edit-slug">{t('dashboard:pages.form.slug')}</FieldLabel>
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
                {t('dashboard:pages.form.slugDisabled')}
              </FieldDescription>
            )}
          </Field>
          <Field>
            <FieldLabel htmlFor="edit-description">{t('dashboard:pages.form.description')}</FieldLabel>
            <Textarea
              id="edit-description"
              value={formData.description}
              onChange={(e) => handleFormChange({ description: e.target.value })}
              rows={2}
            />
          </Field>
          <Field orientation="horizontal">
            <FieldContent>
              <FieldLabel>{t('dashboard:pages.form.homepage')}</FieldLabel>
              <FieldDescription>
                {t('dashboard:pages.form.homepageDescription')}
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
              <FieldLabel>{t('dashboard:pages.form.visible')}</FieldLabel>
              <FieldDescription>
                {t('dashboard:pages.form.visibleDescription')}
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
            {t('common:actions.cancel')}
          </Button>
          <Button onClick={onSubmit}>
            {t('common:actions.save')}
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
  const { t } = useTranslation(['common', 'dashboard']);
  
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t('dashboard:pages.dialogs.delete.title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('dashboard:pages.dialogs.delete.description', { title: selectedPage?.title })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t('common:actions.cancel')}</AlertDialogCancel>
          <AlertDialogAction 
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {t('common:actions.delete')}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
