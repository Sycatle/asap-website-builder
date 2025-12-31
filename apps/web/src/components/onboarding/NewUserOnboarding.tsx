/**
 * New User Onboarding
 * 
 * Full-page onboarding experience for users without any websites.
 * Multi-step flow: Template Selection → Preset-specific Onboarding
 * 
 * Features:
 * - Mobile-first responsive design
 * - Accessible (ARIA, keyboard navigation)
 * - Smooth transitions
 * - Component-based architecture
 */

"use client"

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { presetsAPI, type Preset } from '@/lib/api';
import { trackEvent } from '@/lib/api/metrics';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import { ArrowRight, Layout } from 'lucide-react';
import { PresetOnboardingRouter, PRESET_IDS } from './presets';
import { 
  OnboardingShell, 
  OnboardingHeader, 
  OnboardingContainer,
  OnboardingStepHeader,
  TemplateCard,
  getCategoryIcon,
} from './ui';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

type OnboardingPhase = 'template' | 'onboarding';

interface NewUserOnboardingProps {
  onComplete: (websiteId: string) => void;
}

// ============================================
// Template Selection Step
// ============================================

interface TemplateSelectionStepProps {
  presets: Preset[];
  selectedPresetId: string | null;
  onSelect: (presetId: string) => void;
  onContinue: () => void;
  isLoading: boolean;
}

function TemplateSelectionStep({ 
  presets, 
  selectedPresetId, 
  onSelect, 
  onContinue,
  isLoading 
}: TemplateSelectionStepProps) {
  const { t } = useTranslation(['onboarding']);
  
  // Group presets by category
  const groupedPresets = React.useMemo(() => {
    const groups: Record<string, Preset[]> = {};
    presets.forEach(preset => {
      const category = preset.category || 'general';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(preset);
    });
    return groups;
  }, [presets]);

  // Get categories in order (freelance first for developers)
  const orderedCategories = React.useMemo(() => {
    const priority = ['freelance', 'professional', 'marketing', 'creative', 'business', 'blog'];
    const allCategories = Object.keys(groupedPresets);
    return [
      ...priority.filter(c => allCategories.includes(c)),
      ...allCategories.filter(c => !priority.includes(c))
    ];
  }, [groupedPresets]);

  return (
    <div className="space-y-6 sm:space-y-8 pb-24 sm:pb-8">
      {/* Header */}
      <OnboardingStepHeader
        icon={<Layout className="h-6 w-6 sm:h-7 sm:w-7" />}
        title={t('newUser.template.title')}
        description={t('newUser.template.subtitle')}
      />

      {/* Loading state */}
      {isLoading ? (
        <div 
          className="flex flex-col items-center justify-center py-12 sm:py-16 gap-4"
          role="status"
          aria-label="Loading templates"
        >
          <Spinner className="h-8 w-8" />
          <p className="text-sm text-muted-foreground animate-pulse">
            {t('newUser.template.loading', 'Loading templates...')}
          </p>
        </div>
      ) : presets.length === 0 ? (
        <div className="text-center py-12 sm:py-16">
          <p className="text-muted-foreground">{t('newUser.template.noTemplates')}</p>
        </div>
      ) : (
        <>
          {/* Templates by category */}
          <div className="space-y-6 sm:space-y-8">
            {orderedCategories.map(category => {
              const CategoryIcon = getCategoryIcon(category);
              return (
                <section key={category} aria-labelledby={`category-${category}`}>
                  <h3 
                    id={`category-${category}`}
                    className="text-base sm:text-lg font-semibold flex items-center gap-2 mb-3 sm:mb-4"
                  >
                    <CategoryIcon className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" aria-hidden="true" />
                    {t(`categories.${category}`, category)}
                  </h3>
                  <div 
                    className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4"
                    role="listbox"
                    aria-label={t(`categories.${category}`, category)}
                  >
                    {groupedPresets[category].map(preset => {
                      const meta = preset.config?.meta || {};
                      return (
                        <TemplateCard
                          key={preset.id}
                          name={preset.name}
                          description={preset.description}
                          category={preset.category}
                          categoryLabel={t(`categories.${preset.category}`, preset.category)}
                          thumbnailUrl={preset.thumbnail_url}
                          estimatedTime={meta.estimated_setup_time || '15min'}
                          difficulty={meta.difficulty || 'beginner'}
                          difficultyLabel={String(t(`difficulty.${meta.difficulty || 'beginner'}`, meta.difficulty || 'beginner'))}
                          isSelected={selectedPresetId === preset.id}
                          onSelect={() => onSelect(preset.id)}
                        />
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>

          {/* Sticky continue button on mobile */}
          <div className={cn(
            'fixed bottom-0 left-0 right-0 p-4 z-40',
            'bg-gradient-to-t from-background via-background/95 to-transparent',
            'border-t border-border/50 backdrop-blur-sm',
            'sm:static sm:p-0 sm:bg-transparent sm:border-0 sm:backdrop-blur-none',
            'sm:flex sm:justify-center sm:pt-4'
          )}>
            <Button 
              size="lg" 
              onClick={onContinue}
              disabled={!selectedPresetId}
              className="w-full sm:w-auto sm:min-w-[200px] h-12 text-base gap-2"
            >
              {t('newUser.template.continue')}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function NewUserOnboarding({ onComplete }: NewUserOnboardingProps) {
  const { t } = useTranslation(['onboarding']);
  const [phase, setPhase] = React.useState<OnboardingPhase>('template');
  const [isLoadingPresets, setIsLoadingPresets] = React.useState(true);
  const [presets, setPresets] = React.useState<Preset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = React.useState<string | null>(null);

  // Load presets on mount
  React.useEffect(() => {
    loadPresets();
  }, []);

  const loadPresets = async () => {
    setIsLoadingPresets(true);
    try {
      const data = await presetsAPI.list();
      // Filter to only show enabled presets
      const enabledPresets = data.filter(p => p.config && !p.name.includes('[LEGACY]'));
      setPresets(enabledPresets);
      
      // Pre-select the first preset (Dev Freelance Classic)
      if (enabledPresets.length > 0) {
        const defaultPreset = enabledPresets.find(p => p.id === PRESET_IDS.DEV_FREELANCE_CLASSIC);
        setSelectedPresetId(defaultPreset?.id || enabledPresets[0].id);
      }
      
      trackEvent('onboarding_presets_loaded', 'new', { count: enabledPresets.length });
    } catch (error) {
      console.error('Error loading presets:', error);
      toast.error(t('newUser.template.loadError'));
    } finally {
      setIsLoadingPresets(false);
    }
  };

  const handleSelectPreset = (presetId: string) => {
    setSelectedPresetId(presetId);
    trackEvent('onboarding_preset_selected', 'new', { presetId });
  };

  const handleContinueToOnboarding = () => {
    if (!selectedPresetId) return;
    trackEvent('onboarding_template_confirmed', 'new', { presetId: selectedPresetId });
    setPhase('onboarding');
    // Scroll to top on phase change
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleGoBackToTemplates = () => {
    setPhase('template');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleComplete = (websiteId: string) => {
    trackEvent('onboarding_completed', websiteId, { presetId: selectedPresetId });
    onComplete(websiteId);
  };

  // Step configuration
  const totalSteps = 2;
  const currentStep = phase === 'template' ? 1 : 2;
  const stepLabels = [
    t('newUser.steps.template'),
    t('newUser.steps.customize'),
  ];

  return (
    <OnboardingShell>
      <OnboardingHeader
        currentStep={currentStep}
        totalSteps={totalSteps}
        stepLabels={stepLabels}
        showBack={phase === 'onboarding'}
        onBack={handleGoBackToTemplates}
        backLabel={t('newUser.back')}
      />

      <OnboardingContainer size={phase === 'template' ? 'xl' : 'lg'}>
        {phase === 'template' && (
          <TemplateSelectionStep
            presets={presets}
            selectedPresetId={selectedPresetId}
            onSelect={handleSelectPreset}
            onContinue={handleContinueToOnboarding}
            isLoading={isLoadingPresets}
          />
        )}

        {phase === 'onboarding' && selectedPresetId && (
          <PresetOnboardingRouter 
            presetId={selectedPresetId} 
            onComplete={handleComplete}
          />
        )}
      </OnboardingContainer>
    </OnboardingShell>
  );
}

export default NewUserOnboarding;
