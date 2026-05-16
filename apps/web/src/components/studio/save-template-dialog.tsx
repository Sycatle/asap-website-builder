"use client";

import { useState } from 'react';
import { toast } from 'sonner';
import { Save, Star, Tag, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { templatesAPI } from '@/lib/api/templates';

export interface SaveTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  elementType: string;
  /** Native `Element.variant_key`. Optional during the transition window. */
  variantKey?: string | null;
  settings: Record<string, unknown>;
  defaultName?: string;
  onSaved?: () => void;
}

export function SaveTemplateDialog({
  open,
  onOpenChange,
  elementType,
  variantKey,
  settings,
  defaultName = '',
  onSaved,
}: SaveTemplateDialogProps) {
  const [name, setName] = useState(defaultName);
  const [description, setDescription] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const handleAddTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !tags.includes(tag)) {
      setTags([...tags, tag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter(t => t !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Le nom du template est requis');
      return;
    }

    setIsSaving(true);
    try {
      // Prefer the native column; fall back to the legacy settings.variant field
      // for templates created before the variant_key migration.
      const variant =
        variantKey ?? (typeof settings.variant_key === 'string'
          ? settings.variant_key
          : (settings.variant as string | undefined)) ?? undefined;

      await templatesAPI.create({
        name: name.trim(),
        description: description.trim() || undefined,
        element_type: elementType,
        variant,
        settings,
        tags,
      });

      toast.success('Template sauvegardé !');
      onOpenChange(false);
      onSaved?.();
      
      // Reset form
      setName('');
      setDescription('');
      setTags([]);
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde du template');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            Sauvegarder comme template
          </DialogTitle>
          <DialogDescription>
            Sauvegardez cette configuration de section pour la réutiliser plus tard.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Nom <span className="text-destructive">*</span>
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Hero moderne avec CTA"
              autoFocus
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez ce template..."
              rows={2}
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1">
              <Tag className="h-3.5 w-3.5" />
              Tags
            </label>
            <div className="flex gap-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ajouter un tag..."
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddTag}
                disabled={!tagInput.trim()}
              >
                Ajouter
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {tags.map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="gap-1 cursor-pointer hover:bg-destructive/20"
                    onClick={() => handleRemoveTag(tag)}
                  >
                    {tag}
                    <X className="h-3 w-3" />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Element type info */}
          <div className="text-xs text-muted-foreground bg-muted/50 rounded-md p-2">
            <span className="font-medium">Type de section:</span>{' '}
            <Badge variant="outline" className="font-mono text-xs">
              {elementType}
            </Badge>
            {(() => {
              const displayVariant =
                variantKey ??
                (typeof settings.variant_key === 'string' ? settings.variant_key : undefined) ??
                (typeof settings.variant === 'string' ? settings.variant : undefined);
              return displayVariant ? (
                <>
                  {' · '}
                  <span className="font-medium">Variante:</span>{' '}
                  <Badge variant="outline" className="font-mono text-xs">
                    {displayVariant}
                  </Badge>
                </>
              ) : null;
            })()}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Annuler
          </Button>
          <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
            {isSaving ? (
              <>
                <Spinner className="h-4 w-4 mr-2" />
                Sauvegarde...
              </>
            ) : (
              <>
                <Star className="h-4 w-4 mr-2" />
                Sauvegarder
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SaveTemplateDialog;
