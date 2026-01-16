"use client"

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Layers, ArrowLeft } from "lucide-react";
import { StudioLoadingSkeleton } from "./studio-skeletons";

/**
 * LoadingState - Shown while website data is loading
 * Uses skeleton layout that matches the actual studio structure
 */
export function LoadingState() {
  return <StudioLoadingSkeleton />;
}

/**
 * NoWebsiteState - Shown when no website is selected
 */
export function NoWebsiteState({ onBack }: { onBack?: () => void }) {
  const { t } = useTranslation(['common', 'editor']);
  return (
    <div className="h-full flex items-center justify-center p-4" role="alert">
      <div className="text-center space-y-4">
        <Layers className="h-12 w-12 mx-auto text-muted-foreground" aria-hidden="true" />
        <h2 className="text-xl font-semibold">{t('editor:states.noWebsite')}</h2>
        <p className="text-muted-foreground text-sm">{t('editor:states.selectToPreview')}</p>
        {onBack && (
          <Button onClick={onBack} variant="outline" aria-label={t('editor:states.backToDashboard')}>
            <ArrowLeft className="h-4 w-4 mr-2" aria-hidden="true" />
            {t('editor:states.backToDashboard')}
          </Button>
        )}
      </div>
    </div>
  );
}

export default { LoadingState, NoWebsiteState };
