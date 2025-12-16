"use client"

import { useState, useEffect, useMemo } from 'react';
import type { Section, UpdateSectionRequest } from '@/lib/api';
import { SECTION_TYPES, SECTION_LAYOUTS, type SectionTypeValue } from '@/hooks/useSections';
import { getSectionIcon, getSectionTypeInfo } from '@/lib/constants/sections';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { 
  Save,
  Loader2,
  Layout,
  Eye,
  EyeOff,
} from "lucide-react";

interface SectionEditorProps {
  section: Section | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (sectionId: string, data: UpdateSectionRequest) => Promise<void>;
}

export function SectionEditor({ 
  section, 
  isOpen, 
  onClose, 
  onSave 
}: SectionEditorProps) {
  const [title, setTitle] = useState('');
  const [layout, setLayout] = useState('');
  const [visible, setVisible] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form when section changes
  useEffect(() => {
    if (section) {
      setTitle(section.title || '');
      setLayout(section.layout || '');
      setVisible(section.visible);
      setHasChanges(false);
    }
  }, [section]);

  // Track changes
  useEffect(() => {
    if (section) {
      const changed = 
        title !== (section.title || '') ||
        layout !== (section.layout || '') ||
        visible !== section.visible;
      setHasChanges(changed);
    }
  }, [section, title, layout, visible]);

  // Get available layouts for section type
  const availableLayouts = useMemo(() => {
    if (!section) return [];
    const type = section.section_type as SectionTypeValue;
    return SECTION_LAYOUTS[type] || SECTION_LAYOUTS.custom;
  }, [section]);

  // Get section type info
  const sectionTypeInfo = useMemo(() => {
    if (!section) return null;
    return getSectionTypeInfo(section.section_type);
  }, [section]);

  const SectionIcon = section ? getSectionIcon(section.section_type) : Layout;

  const handleSave = async () => {
    if (!section || !hasChanges) return;

    setIsSaving(true);
    
    try {
      await onSave(section.id, {
        title: title.trim(),
        layout,
        visible,
      });
      
      toast.success('Section mise à jour !');
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Une erreur est survenue';
      toast.error('Erreur lors de la mise à jour', {
        description: message,
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    if (hasChanges) {
      // Could show a confirmation dialog here
      // For now, just close
    }
    onClose();
  };

  if (!section) return null;

  return (
    <Sheet open={isOpen} onOpenChange={handleClose}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <SectionIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <SheetTitle>Modifier la section</SheetTitle>
              <SheetDescription>
                {sectionTypeInfo?.label} • {sectionTypeInfo?.description}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="edit-title">Titre</Label>
            <Input
              id="edit-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Titre de la section"
            />
          </div>

          {/* Layout */}
          <div className="space-y-2">
            <Label htmlFor="edit-layout">Disposition</Label>
            <Select value={layout} onValueChange={setLayout}>
              <SelectTrigger id="edit-layout">
                <SelectValue placeholder="Choisir une disposition" />
              </SelectTrigger>
              <SelectContent>
                {availableLayouts.map((l) => (
                  <SelectItem key={l.value} value={l.value}>
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Visibility */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="edit-visible" className="flex items-center gap-2">
                {visible ? (
                  <Eye className="h-4 w-4 text-muted-foreground" />
                ) : (
                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                )}
                Visibilité
              </Label>
              <p className="text-xs text-muted-foreground">
                {visible 
                  ? 'Cette section est visible sur votre site' 
                  : 'Cette section est masquée'}
              </p>
            </div>
            <Switch
              id="edit-visible"
              checked={visible}
              onCheckedChange={setVisible}
            />
          </div>

          <Separator />

          {/* Section Type Info (read-only) */}
          <div className="p-3 rounded-lg bg-muted/50 border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Layout className="h-4 w-4" />
              <span>Type de section</span>
            </div>
            <p className="font-medium">{sectionTypeInfo?.label}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Le type ne peut pas être modifié après création
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-4">
            <Button 
              variant="outline" 
              onClick={handleClose}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button 
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
              className="flex-1 gap-2"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enregistrement...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Enregistrer
                </>
              )}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
