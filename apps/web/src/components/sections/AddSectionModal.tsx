"use client"

import { useState, useMemo } from 'react';
import type { CreateSectionRequest } from '@/lib/api';
import { slugify } from '@/lib/utils/formatters';
import { SECTION_TYPES, SECTION_LAYOUTS, type SectionTypeValue } from '@/hooks/useSections';
import { getSectionIcon } from '@/lib/constants/sections';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  Loader2,
  Plus,
} from "lucide-react";

interface AddSectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (data: CreateSectionRequest) => Promise<void>;
  existingSectionsCount: number;
}

type Step = 'type' | 'details';

export function AddSectionModal({ 
  isOpen, 
  onClose, 
  onAdd, 
  existingSectionsCount 
}: AddSectionModalProps) {
  const [step, setStep] = useState<Step>('type');
  const [selectedType, setSelectedType] = useState<SectionTypeValue | null>(null);
  const [title, setTitle] = useState('');
  const [layout, setLayout] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Get available layouts for selected type
  const availableLayouts = useMemo(() => {
    if (!selectedType) return [];
    return SECTION_LAYOUTS[selectedType] || [];
  }, [selectedType]);

  // Reset layout when type changes
  const handleTypeSelect = (type: SectionTypeValue) => {
    setSelectedType(type);
    const layouts = SECTION_LAYOUTS[type];
    if (layouts && layouts.length > 0) {
      setLayout(layouts[0].value);
    }
    // Auto-fill title with type label
    const typeInfo = SECTION_TYPES.find(t => t.value === type);
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
        section_type: selectedType,
        slug: slugify(title),
        title: title.trim(),
        order: existingSectionsCount,
        layout,
        visible: true,
      });
      
      toast.success('Section ajoutée !', {
        description: `La section "${title}" a été créée.`,
      });
      
      // Reset and close
      handleClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Une erreur est survenue';
      toast.error('Erreur lors de la création', {
        description: message,
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    // Reset form
    setStep('type');
    setSelectedType(null);
    setTitle('');
    setLayout('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-primary" />
            {step === 'type' ? 'Choisir un type de section' : 'Configurer la section'}
          </DialogTitle>
          <DialogDescription>
            {step === 'type' 
              ? 'Sélectionnez le type de section à ajouter'
              : 'Personnalisez les informations de la section'
            }
          </DialogDescription>
        </DialogHeader>

        {step === 'type' ? (
          <div className="flex-1 overflow-y-auto py-4">
            <div className="grid grid-cols-2 gap-3">
              {SECTION_TYPES.map((type) => {
                const IconComponent = getSectionIcon(type.value);
                const isSelected = selectedType === type.value;
                
                return (
                  <Card 
                    key={type.value}
                    className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                      isSelected 
                        ? 'ring-2 ring-primary bg-primary/5' 
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => handleTypeSelect(type.value)}
                  >
                    <CardContent className="p-3 sm:p-4">
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${
                          isSelected ? 'bg-primary/10' : 'bg-muted'
                        }`}>
                          <IconComponent className={`h-4 w-4 ${
                            isSelected ? 'text-primary' : 'text-muted-foreground'
                          }`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm">{type.label}</h4>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {type.description}
                          </p>
                        </div>
                        {isSelected && (
                          <div className="shrink-0 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                            <Check className="h-3 w-3 text-primary-foreground" />
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-4 space-y-4">
            {/* Selected type indicator */}
            {selectedType && (
              <div className="p-3 rounded-lg bg-muted/50 border flex items-center gap-3">
                {(() => {
                  const IconComponent = getSectionIcon(selectedType);
                  const typeInfo = SECTION_TYPES.find(t => t.value === selectedType);
                  return (
                    <>
                      <div className="p-2 rounded-lg bg-primary/10">
                        <IconComponent className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Type de section</p>
                        <p className="font-medium">{typeInfo?.label}</p>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
            
            {/* Title field */}
            <div className="space-y-2">
              <Label htmlFor="section-title">Titre de la section</Label>
              <Input
                id="section-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ma section"
                autoFocus
              />
            </div>
            
            {/* Layout selector */}
            <div className="space-y-2">
              <Label htmlFor="section-layout">Disposition</Label>
              <Select value={layout} onValueChange={setLayout}>
                <SelectTrigger id="section-layout">
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
              <p className="text-xs text-muted-foreground">
                La disposition détermine l'apparence de la section
              </p>
            </div>
          </form>
        )}

        {/* Footer with actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          {step === 'type' ? (
            <>
              <Button variant="ghost" onClick={handleClose}>
                Annuler
              </Button>
              <Button 
                onClick={handleNext} 
                disabled={!selectedType}
                className="gap-2"
              >
                Suivant
                <ArrowRight className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={handleBack} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Retour
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={isCreating || !title.trim() || !layout}
                className="gap-2"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Création...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Ajouter la section
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
