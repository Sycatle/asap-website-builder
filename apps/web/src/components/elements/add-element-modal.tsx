"use client"

import { useState, useMemo } from 'react';
import type { CreateElementRequest } from '@/lib/api';
import { slugify } from '@/lib/utils/formatters';
import { ELEMENT_TYPES, ELEMENT_LAYOUTS, type ElementType } from '@asap/shared';
import { getElementIcon } from '@/lib/constants/elements';
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogFooter,
} from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  Plus,
} from "lucide-react";

interface AddElementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (data: CreateElementRequest) => Promise<void>;
  existingElementsCount: number;
}

type Step = 'type' | 'details';

export function AddElementModal({ 
  isOpen, 
  onClose, 
  onAdd, 
  existingElementsCount 
}: AddElementModalProps) {
  const [step, setStep] = useState<Step>('type');
  const [selectedType, setSelectedType] = useState<ElementType | null>(null);
  const [title, setTitle] = useState('');
  const [layout, setLayout] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Get available layouts for selected type
  const availableLayouts = useMemo(() => {
    if (!selectedType) return [];
    return ELEMENT_LAYOUTS[selectedType] || [];
  }, [selectedType]);

  // Reset layout when type changes
  const handleTypeSelect = (type: ElementType) => {
    setSelectedType(type);
    const layouts = ELEMENT_LAYOUTS[type];
    if (layouts && layouts.length > 0) {
      setLayout(layouts[0].value);
    }
    // Auto-fill title with type label
    const typeInfo = ELEMENT_TYPES.find(t => t.value === type);
    if (typeInfo) {
      setTitle(typeInfo.label);
    }
  };

  const handleNext = () => {
    if (selectedType) {
      setStep('details');
    }
  };

  const handleBack = () => {
    setStep('type');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedType || !title.trim() || !layout) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    setIsCreating(true);
    
    try {
      await onAdd({
        element_type: selectedType,
        slug: slugify(title),
        title: title.trim(),
        layout,
        order: existingElementsCount,
        visible: true,
        settings: {},
      });
      handleClose();
    } catch {
      // Error handled by parent
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    setStep('type');
    setSelectedType(null);
    setTitle('');
    setLayout('');
    onClose();
  };

  return (
    <ResponsiveDialog open={isOpen} onOpenChange={handleClose}>
      <ResponsiveDialogContent className="sm:max-w-[500px]">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle>Ajouter un élément</ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {step === 'type' 
              ? 'Choisissez le type d\'élément à ajouter' 
              : 'Personnalisez votre nouvel élément'
            }
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        {step === 'type' ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {ELEMENT_TYPES.map((type) => {
                const Icon = getElementIcon(type.value);
                const isSelected = selectedType === type.value;
                
                return (
                  <Card
                    key={type.value}
                    className={`cursor-pointer transition-all hover:border-primary ${
                      isSelected ? 'border-primary bg-primary/5 ring-2 ring-primary' : ''
                    }`}
                    onClick={() => handleTypeSelect(type.value as ElementType)}
                  >
                    <CardContent className="p-4 flex flex-col items-center gap-2 text-center">
                      <div className={`p-2 rounded-lg ${
                        isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                      }`}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{type.label}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {type.description}
                        </p>
                      </div>
                      {isSelected && (
                        <Check className="h-4 w-4 text-primary absolute top-2 right-2" />
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            
            <ResponsiveDialogFooter className="flex-row justify-end gap-2 sm:justify-end">
              <Button variant="outline" onClick={handleClose}>
                Annuler
              </Button>
              <Button onClick={handleNext} disabled={!selectedType}>
                Suivant
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </ResponsiveDialogFooter>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="title">Titre</FieldLabel>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Titre de l'élément"
                  autoFocus
                />
              </Field>

              {availableLayouts.length > 0 && (
                <Field>
                  <FieldLabel htmlFor="layout">Disposition</FieldLabel>
                  <Select value={layout} onValueChange={setLayout}>
                    <SelectTrigger>
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
                </Field>
              )}
            </FieldGroup>

            <ResponsiveDialogFooter className="flex-row justify-between gap-2 sm:justify-between">
              <Button type="button" variant="outline" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Retour
              </Button>
              <Button type="submit" disabled={isCreating || !title.trim()}>
                {isCreating ? (
                  <>
                    <Spinner className="h-4 w-4 mr-2" />
                    Création...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Ajouter
                  </>
                )}
              </Button>
            </ResponsiveDialogFooter>
          </form>
        )}
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
