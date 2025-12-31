"use client"

import { Card, CardContent } from "@/components/ui/card";
import { getSeoScoreColor } from "../utils";
import type { SeoHealthBannerProps } from "../types";

/**
 * SEO Health Score banner showing overall score and issues breakdown
 */
export function SeoHealthBanner({ seoScore, seoIssues }: SeoHealthBannerProps) {
  const colors = getSeoScoreColor(seoScore);

  const scoreMessage = seoScore >= 80 
    ? 'Excellent ! Votre site est bien optimisé.'
    : seoScore >= 50 
    ? 'Correct. Quelques améliorations possibles.'
    : 'À améliorer. Plusieurs problèmes détectés.';

  return (
    <Card className={`border-2 ${colors.border} ${colors.background}`}>
      <CardContent className="py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className={`h-16 w-16 rounded-full flex items-center justify-center text-2xl font-bold ${
              seoScore >= 80 ? 'bg-green-500/20 text-green-600' :
              seoScore >= 50 ? 'bg-amber-500/20 text-amber-600' :
              'bg-red-500/20 text-red-600'
            }`}>
              {seoScore}
            </div>
            <div>
              <p className="font-semibold text-lg">Score SEO</p>
              <p className="text-sm text-muted-foreground">
                {scoreMessage}
              </p>
            </div>
          </div>
          <div className="flex gap-6">
            <div className="text-center">
              <p className="text-2xl font-bold text-red-600">{seoIssues.critical}</p>
              <p className="text-xs text-muted-foreground">Critiques</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-amber-600">{seoIssues.warnings}</p>
              <p className="text-xs text-muted-foreground">Avertissements</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">{seoIssues.passed}</p>
              <p className="text-xs text-muted-foreground">Réussis</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
