"use client"

import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { usePresets, useCreateWebsiteFromPreset } from '@/hooks/usePresets';
import { queryKeys } from '@/lib/query';
import { useQueryClient } from '@tanstack/react-query';
import { slugify, validateSlug, getWebsiteDisplayUrl } from '@/lib/utils/formatters';
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
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { 
  ArrowLeft, 
  ArrowRight, 
  Check, 
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

interface CreateWebsiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (websiteId: string) => void;
}

type Step = 'preset' | 'details';

export function CreateWebsiteModal({ isOpen, onClose, onSuccess }: CreateWebsiteModalProps) {
  const { t } = useTranslation(['common', 'dashboard']);
  const [step, setStep] = useState<Step>('preset');
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(null);
  const [slug, setSlug] = useState('');
  const [title, setTitle] = useState('');
  
  const { presets, isLoading: presetsLoading } = usePresets();
  const { createWebsite, isCreating } = useCreateWebsiteFromPreset();
  const queryClient = useQueryClient();

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
      toast.error(t('dashboard:createSite.selectTemplate'));
      return;
    }
    
    if (!title.trim()) {
      toast.error(t('dashboard:createSite.enterName'));
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
      queryClient.invalidateQueries({ queryKey: queryKeys.websites.all });
      
      const displayUrl = getWebsiteDisplayUrl(slug.trim());
      
      toast.success(t('dashboard:websites.toast.created'), {
        description: t('dashboard:websites.toast.createdDescription', { url: displayUrl }),
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
      const message = err instanceof Error ? err.message : t('common:errors.generic');
      // Check for specific error messages from the API
      if (message.includes('slug') || message.includes('URL')) {
        toast.error(t('dashboard:createSite.urlTaken'), {
          description: t('dashboard:createSite.urlTakenDescription'),
        });
      } else {
        toast.error(t('dashboard:createSite.error'), {
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
    <ResponsiveDialog open={isOpen} onOpenChange={handleClose}>
      <ResponsiveDialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-hidden flex flex-col">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {step === 'preset' ? t('dashboard:websites.modal.chooseTemplate') : t('dashboard:websites.modal.configureYourSite')}
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription>
            {step === 'preset' 
              ? t('dashboard:websites.modal.selectTemplateToStart')
              : t('dashboard:websites.modal.customizeBasicInfo')
            }
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

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
                <p>{t('dashboard:websites.modal.noTemplates')}</p>
              </div>
            ) : (
              Object.entries(presetsByCategory).map(([category, categoryPresets]) => (
                <div key={category} className="space-y-3">
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(category)}
                    <h3 className="font-medium text-sm">
                      {t(`dashboard:websites.categories.${category}`, { defaultValue: category })}
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
                <p className="text-sm text-muted-foreground">{t('dashboard:websites.modal.selectedTemplate')}</p>
                <p className="font-medium">{selectedPreset.name}</p>
              </div>
            )}
            
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="title">{t('dashboard:websites.modal.siteName')}</FieldLabel>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder={t('dashboard:websites.modal.siteNamePlaceholder')}
                  autoFocus
                />
                <FieldDescription>
                  {t('dashboard:websites.modal.siteNameDescription')}
                </FieldDescription>
              </Field>
              
              <Field>
                <FieldLabel htmlFor="slug">{t('dashboard:websites.modal.siteUrl')}</FieldLabel>
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
                    placeholder={t('dashboard:websites.modal.siteUrlPlaceholder')}
                  />
                </div>
                <FieldDescription>
                  {t('dashboard:websites.modal.siteUrlDescription')}
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        )}

        <ResponsiveDialogFooter className="flex-row items-center justify-between pt-4 border-t sm:justify-between">
          {step === 'preset' ? (
            <>
              <Button variant="ghost" onClick={handleClose}>
                {t('common:actions.cancel')}
              </Button>
              <Button 
                onClick={handleNext} 
                disabled={!selectedPresetId}
                className="gap-2"
              >
                {t('common:actions.next')}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" onClick={handleBack} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                {t('common:actions.back')}
              </Button>
              <Button 
                onClick={handleSubmit}
                disabled={isCreating || !slug || !title}
                className="gap-2"
              >
                {isCreating ? (
                  <>
                    <Spinner className="h-4 w-4" />
                    {t('dashboard:websites.modal.creating')}
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4" />
                    {t('dashboard:websites.modal.createSite')}
                  </>
                )}
              </Button>
            </>
          )}
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
