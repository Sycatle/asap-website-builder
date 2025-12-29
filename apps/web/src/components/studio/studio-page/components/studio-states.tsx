"use client"

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { RefreshCw, Layers, ArrowLeft } from "lucide-react";

/**
 * LoadingState - Shown while website data is loading
 */
export function LoadingState() {
  const { t } = useTranslation(['common', 'editor']);
  return (
    <div className="h-full flex items-center justify-center" role="status" aria-live="polite">
      <div className="text-center space-y-4">
        <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" aria-hidden="true" />
        <p className="text-muted-foreground">{t('common:status.loading')}</p>
        <span className="sr-only">{t('editor:states.loadingSite')}</span>
      </div>
    </div>
  );
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
