"use client"

import { useState, useMemo } from 'react';
import { usePresets, useCreateWebsiteFromPreset } from '@/hooks/usePresets';
import { useCacheActions } from '@/hooks/useCache';
import { slugify, validateSlug, getWebsiteDisplayUrl } from '@/lib/utils/formatters';
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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  Loader2, 
  Sparkles,
  Briefcase,
  Palette,
  PenTool,
  Globe,
  Code,
  BookOpen,
} from "lucide-react";

// Category icons
const categoryIcons: Record<string, React.ElementType> = {
  professional: Briefcase,
  creative: Palette,
  blog: BookOpen,
  business: Globe,
  developer: Code,
  personal: PenTool,
};

// Category labels in French
const categoryLabels: Record<string, string> = {
  professional: 'Professionnel',
  creative: 'Créatif',
  blog: 'Blog',
  business: 'Business',
  developer: 'Développeur',
  personal: 'Personnel',
};

interface CreateWebsiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (websiteId: string) => void;
}

type Step = 'preset' | 'details';

export function CreateWebsiteModal({ isOpen, onClose, onSuccess }: CreateWebsiteModalProps) {
  const [step, setStep] = useState<Step>('preset');
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [slug, setSlug] = useState('');
  const [title, setTitle] = useState('');
  
  const { presets, isLoading: presetsLoading } = usePresets();
  const { createWebsite, isCreating } = useCreateWebsiteFromPreset();
  const { invalidate } = useCacheActions();

  // Get selected preset
  const selectedPreset = useMemo(() => 
    presets.find(p => p.id === selectedPresetId),
    [presets, selectedPresetId]
  );

  // Group presets by category
  const presetsByCategory = useMemo(() => {
    const grouped: Record<string, typeof presets> = {};
    presets.forEach(preset => {
      const category = preset.category || 'other';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(preset);
    });
    return grouped;
  }, [presets]);

  // Generate slug from title using utility function
  const handleTitleChange = (value: string) => {
    setTitle(value);
    setSlug(slugify(value));
  };

  const handlePresetSelect = (presetId: string) => {
    setSelectedPresetId(presetId);
    const preset = presets.find(p => p.id === presetId);
    if (preset) {
      // Pre-fill title with preset name suggestion
      setTitle('');
      setSlug('');
    }
  };

  const handleNext = () => {
    if (selectedPresetId) {
      setStep('details');
    }
  };

  const handleBack = () => {
    setStep('preset');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate required fields
    if (!selectedPresetId) {
      toast.error('Veuillez sélectionner un template');
      return;
    }
    
    if (!title.trim()) {
      toast.error('Veuillez entrer un nom pour votre site');
      return;
    }
    
    // Validate slug using utility function
    const slugValidation = validateSlug(slug);
    if (!slugValidation.isValid) {
      toast.error(slugValidation.error);
      return;
    }

    try {
      const response = await createWebsite({
        preset_id: selectedPresetId,
        slug: slug.trim(),
        title: title.trim(),
      });
      
      // Invalidate websites cache to refresh the list
      invalidate('websites');
      
      const displayUrl = getWebsiteDisplayUrl(slug.trim());
      
      toast.success('Site créé avec succès !', {
        description: `Votre site est prêt à l'adresse ${displayUrl}`,
      });
      
      // Reset form
      setStep('preset');
      setSelectedPresetId(null);
      setSlug('');
      setTitle('');
      
      onClose();
      
      if (onSuccess) {
        onSuccess(response.website.id);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Une erreur est survenue';
      // Check for specific error messages from the API
      if (message.includes('slug') || message.includes('URL')) {
        toast.error('Cette URL est déjà utilisée', {
          description: 'Veuillez choisir une autre URL pour votre site.',
        });
      } else {
        toast.error('Erreur lors de la création du site', {
          description: message,
        });
      }
    }
  };

  const handleClose = () => {
    // Reset form on close
    setStep('preset');
    setSelectedPresetId(null);
    setSlug('');
    setTitle('');
    onClose();
  };

  const getCategoryIcon = (category: string) => {
    const IconComponent = categoryIcons[category] || Sparkles;
    return <IconComponent className="h-4 w-4" />;
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {step === 'preset' ? 'Choisir un template' : 'Configurer votre site'}
          </DialogTitle>
          <DialogDescription>
            {step === 'preset' 
              ? 'Sélectionnez un template pour démarrer rapidement'
              : "Personnalisez les informations de base de votre site"
            }
          </DialogDescription>
        </DialogHeader>

        {step === 'preset' ? (
          <div className="flex-1 overflow-y-auto py-4 space-y-6">
            {presetsLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-5 w-24" />
                    <div className="grid grid-cols-2 gap-3">
                      {[...Array(2)].map((_, j) => (
                        <Skeleton key={j} className="h-24 rounded-lg" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : presets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aucun template disponible</p>
              </div>
            ) : (
              Object.entries(presetsByCategory).map(([category, categoryPresets]) => (
                <div key={category} className="space-y-3">
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(category)}
                    <h3 className="font-medium text-sm">
                      {categoryLabels[category] || category}
                    </h3>
                    <Badge variant="secondary" className="text-xs">
                      {categoryPresets.length}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {categoryPresets.map((preset) => (
                      <Card 
                        key={preset.id}
                        className={`cursor-pointer transition-all duration-200 hover:shadow-md ${
                          selectedPresetId === preset.id 
                            ? 'ring-2 ring-primary bg-primary/5' 
                            : 'hover:bg-muted/50'
                        }`}
                        onClick={() => handlePresetSelect(preset.id)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-sm truncate">
                                {preset.name}
                              </h4>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {preset.description}
                              </p>
                            </div>
                            {selectedPresetId === preset.id && (
                              <div className="ml-2 flex-shrink-0 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                                <Check className="h-3 w-3 text-primary-foreground" />
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-4 space-y-6">
            {selectedPreset && (
              <div className="p-3 rounded-lg bg-muted/50 border">
                <p className="text-sm text-muted-foreground">Template sélectionné</p>
                <p className="font-medium">{selectedPreset.name}</p>
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="title">Nom de votre site</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => handleTitleChange(e.target.value)}
                placeholder="Mon super site"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Le nom qui apparaîtra sur votre site
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="slug">URL du site</Label>
              <div className="flex items-center">
                <span className="flex h-10 items-center rounded-l-md border border-r-0 bg-muted px-3 text-sm text-muted-foreground">
                  asap.cool/
                </span>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => {
                    const value = e.target.value.toLowerCase();
                    // Filter to only allow valid slug characters
                    setSlug(value.replace(/[^a-z0-9-]/g, ''));
                  }}
                  className="rounded-l-none"
                  placeholder="mon-site"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                L'URL ne pourra pas être modifiée après la création
              </p>
            </div>
          </form>
        )}

        <div className="flex items-center justify-between pt-4 border-t">
          {step === 'preset' ? (
            <>
              <Button variant="ghost" onClick={handleClose}>
                Annuler
              </Button>
              <Button 
                onClick={handleNext} 
                disabled={!selectedPresetId}
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
                disabled={isCreating || !slug || !title}
                className="gap-2"
              >
                {isCreating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Création...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    Créer le site
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
