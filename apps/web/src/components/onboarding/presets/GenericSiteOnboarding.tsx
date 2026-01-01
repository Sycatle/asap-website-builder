/**
 * Generic Site Onboarding
 * 
 * Simple onboarding flow for generic site templates (Landing pages, etc.)
 * Collects: Site name, slug, basic branding
 * 
 * Features:
 * - Mobile-first responsive design
 * - Accessible form fields
 * - Smooth step transitions
 * - Consistent with design system
 */

"use client"

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { websitesAPI, presetsAPI } from '@/lib/api';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  ArrowRight, 
  Globe,
  Palette,
  Rocket,
  Sparkles,
} from 'lucide-react';
import { 
  OnboardingNavigation,
  OnboardingStepHeader,
  TextField,
  TextareaField,
  ColorPickerField,
} from '../ui';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

type Step = 'basics' | 'branding' | 'publish';

interface GenericSiteOnboardingProps {
  presetId: string;
  onComplete: (websiteId: string) => void;
}

interface FormData {
  name: string;
  slug: string;
  description: string;
  primaryColor: string;
  tagline: string;
}

// ============================================
// Step Components
// ============================================

interface BasicsStepProps {
  data: FormData;
  onChange: (data: Partial<FormData>) => void;
  baseUrl: string;
}

function BasicsStep({ data, onChange, baseUrl }: BasicsStepProps) {
  const { t } = useTranslation(['onboarding']);
  
  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  const handleNameChange = (name: string) => {
    onChange({ 
      name, 
      slug: data.slug || generateSlug(name)
    });
  };

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
      <OnboardingStepHeader
        icon={<Globe className="h-6 w-6 sm:h-7 sm:w-7" />}
        title={t('generic.basics.title')}
        description={t('generic.basics.description')}
      />

      <div className="space-y-4 sm:space-y-5 max-w-md mx-auto">
        <TextField
          id="site-name"
          label={t('generic.basics.nameLabel')}
          value={data.name}
          onChange={handleNameChange}
          placeholder={t('generic.basics.namePlaceholder')}
          required
          autoFocus
        />

        <TextField
          id="site-slug"
          label={t('generic.basics.slugLabel')}
          value={data.slug}
          onChange={(slug) => onChange({ slug })}
          placeholder={t('generic.basics.slugPlaceholder')}
          transform={(value) => value.toLowerCase().replace(/[^a-z0-9-]/g, '')}
          required
          hint={
            <>
              {t('generic.basics.slugDescription')}{' '}
              <span className="font-mono text-foreground text-xs">
                {baseUrl}/{data.slug || 'your-site'}
              </span>
            </>
          }
        />

        <TextareaField
          id="site-description"
          label={t('generic.basics.descriptionLabel')}
          value={data.description}
          onChange={(description) => onChange({ description })}
          placeholder={t('generic.basics.descriptionPlaceholder')}
          rows={3}
        />
      </div>
    </div>
  );
}

interface BrandingStepProps {
  data: FormData;
  onChange: (data: Partial<FormData>) => void;
}

function BrandingStep({ data, onChange }: BrandingStepProps) {
  const { t } = useTranslation(['onboarding']);

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
      <OnboardingStepHeader
        icon={<Palette className="h-6 w-6 sm:h-7 sm:w-7" />}
        title={t('generic.branding.title')}
        description={t('generic.branding.description')}
      />

      <div className="space-y-5 sm:space-y-6 max-w-md mx-auto">
        <TextField
          id="site-tagline"
          label={t('generic.branding.taglineLabel')}
          value={data.tagline}
          onChange={(tagline) => onChange({ tagline })}
          placeholder={t('generic.branding.taglinePlaceholder')}
          hint={t('generic.branding.taglineHint')}
        />

        <ColorPickerField
          id="site-color"
          label={t('generic.branding.colorLabel')}
          value={data.primaryColor}
          onChange={(primaryColor) => onChange({ primaryColor })}
        />
      </div>
    </div>
  );
}

interface PublishStepProps {
  data: FormData;
  isPublishing: boolean;
  baseUrl: string;
}

function PublishStep({ data, isPublishing, baseUrl }: PublishStepProps) {
  const { t } = useTranslation(['onboarding']);

  return (
    <div className="space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
      <OnboardingStepHeader
        icon={<Rocket className="h-6 w-6 sm:h-7 sm:w-7" />}
        title={t('generic.publish.title')}
        description={t('generic.publish.description')}
      />

      <Card className="max-w-md mx-auto overflow-hidden">
        <CardHeader className="bg-muted/50 pb-4">
          <CardTitle className="text-base sm:text-lg">
            {t('generic.publish.summaryTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-3 sm:space-y-4">
          {/* Site name */}
          <div className="flex justify-between items-start gap-4 text-sm">
            <span className="text-muted-foreground shrink-0">
              {t('generic.basics.nameLabel')}
            </span>
            <span className="font-medium text-right break-words">
              {data.name || '—'}
            </span>
          </div>
          
          {/* Site URL */}
          <div className="flex justify-between items-start gap-4 text-sm">
            <span className="text-muted-foreground shrink-0">
              {t('generic.basics.slugLabel')}
            </span>
            <span className="font-mono text-xs text-right break-all">
              {data.slug ? `${baseUrl}/${data.slug}` : '—'}
            </span>
          </div>
          
          {/* Tagline */}
          {data.tagline && (
            <div className="flex justify-between items-start gap-4 text-sm">
              <span className="text-muted-foreground shrink-0">
                {t('generic.branding.taglineLabel')}
              </span>
              <span className="text-right max-w-[200px] truncate">
                {data.tagline}
              </span>
            </div>
          )}
          
          {/* Primary color */}
          <div className="flex justify-between items-center gap-4 text-sm">
            <span className="text-muted-foreground">
              {t('generic.branding.colorLabel')}
            </span>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs">{data.primaryColor}</span>
              <div 
                className="w-6 h-6 rounded-md border shadow-sm"
                style={{ backgroundColor: data.primaryColor }}
                aria-label={`Color: ${data.primaryColor}`}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading indicator */}
      {isPublishing && (
        <div 
          className="flex items-center justify-center gap-3 text-muted-foreground py-4"
          role="status"
          aria-live="polite"
        >
          <span 
            className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" 
            aria-hidden="true"
          />
          <span className="text-sm">{t('generic.publish.creating')}</span>
        </div>
      )}
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function GenericSiteOnboarding({ presetId, onComplete }: GenericSiteOnboardingProps) {
  const { t } = useTranslation(['onboarding']);
  const [step, setStep] = React.useState<Step>('basics');
  const [isPublishing, setIsPublishing] = React.useState(false);
  const [formData, setFormData] = React.useState<FormData>({
    name: '',
    slug: '',
    description: '',
    primaryColor: '#3B82F6',
    tagline: '',
  });

  const baseUrl = React.useMemo(() => {
    if (typeof window === 'undefined') return 'https://asap.cool';
    // Remove 'app.' prefix if present
    return window.location.origin.replace(/^(https?:\/\/)app\./, '$1');
  }, []);

  const steps: Step[] = ['basics', 'branding', 'publish'];
  const currentStepIndex = steps.indexOf(step);

  const handleChange = (updates: Partial<FormData>) => {
    setFormData(prev => ({ ...prev, ...updates }));
  };

  const canContinue = (): boolean => {
    switch (step) {
      case 'basics':
        return formData.name.trim().length >= 2 && formData.slug.trim().length >= 2;
      case 'branding':
        return true; // Optional step
      case 'publish':
        return !isPublishing;
      default:
        return false;
    }
  };

  const handleNext = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setStep(steps[nextIndex]);
    }
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setStep(steps[prevIndex]);
    }
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    
    try {
      // Create the website from preset
      const response = await presetsAPI.createWebsiteFromPreset({
        preset_id: presetId,
        slug: formData.slug.trim(),
        title: formData.name.trim(),
      });

      const websiteId = response.website.id;

      // Update website data with branding and description
      const currentData = await websitesAPI.getData(websiteId);
      
      // Build the updated profile
      const currentProfile = currentData?.profile ?? {};
      const currentIdentity = typeof currentProfile === 'object' && 'identity' in currentProfile 
        ? (currentProfile as { identity?: Record<string, unknown> }).identity ?? {}
        : {};

      await websitesAPI.patchData(websiteId, {
        ...currentData,
        profile: {
          ...currentProfile,
          version: 1,
          identity: {
            ...currentIdentity,
            name: formData.name,
            tagline: formData.tagline,
          },
        },
        branding: {
          primaryColor: formData.primaryColor,
        },
        meta: {
          description: formData.description,
        },
      });

      toast.success(t('generic.publish.success'));
      onComplete(websiteId);
    } catch (error: any) {
      console.error('Error creating website:', error);
      // Handle slug taken error
      if (error?.status === 409 || error?.data?.error === 'slug_taken') {
        toast.error(t('toasts.errors.slugTaken'));
        // Go back to basics step to fix slug
        setStep('basics');
      } else {
        toast.error(error.message || t('generic.publish.error'));
      }
      setIsPublishing(false);
    }
  };

  // Get primary action config
  const getPrimaryAction = () => {
    if (step === 'publish') {
      return {
        label: t('generic.publish.button'),
        loadingLabel: t('generic.publish.creating'),
        onClick: handlePublish,
        icon: <Sparkles className="h-4 w-4" aria-hidden="true" />,
      };
    }
    return {
      label: t('navigation.continue'),
      onClick: handleNext,
      icon: <ArrowRight className="h-4 w-4" aria-hidden="true" />,
    };
  };

  const primaryAction = getPrimaryAction();

  return (
    <div className="space-y-6 sm:space-y-8 pb-24 sm:pb-8">
      {/* Step content */}
      <div className="min-h-[350px] sm:min-h-[400px]">
        {step === 'basics' && (
          <BasicsStep 
            data={formData} 
            onChange={handleChange}
            baseUrl={baseUrl}
          />
        )}
        {step === 'branding' && (
          <BrandingStep 
            data={formData} 
            onChange={handleChange}
          />
        )}
        {step === 'publish' && (
          <PublishStep 
            data={formData}
            isPublishing={isPublishing}
            baseUrl={baseUrl}
          />
        )}
      </div>

      {/* Navigation */}
      <OnboardingNavigation
        showBack={currentStepIndex > 0}
        onBack={handleBack}
        backLabel={t('navigation.back')}
        primaryLabel={primaryAction.label}
        onPrimary={primaryAction.onClick}
        primaryDisabled={!canContinue()}
        primaryLoading={isPublishing}
        primaryLoadingLabel={primaryAction.loadingLabel}
        primaryIcon={primaryAction.icon}
      />
    </div>
  );
}

export default GenericSiteOnboarding;
