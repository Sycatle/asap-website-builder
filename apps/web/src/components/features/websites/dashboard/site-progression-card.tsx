"use client"

import { 
  Sparkles, 
  CheckCircle2, 
  ChevronRight 
} from "lucide-react";
import { Link } from "@/components/app-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import type { SiteProgressionCardProps } from "./types";

/**
 * Site progression card showing setup steps completion
 */
export function SiteProgressionCard({ 
  websiteId, 
  pagesCount, 
  sectionsCount, 
  extensionsCount, 
  isPublished, 
  hasTheme, 
  hasSEO 
}: SiteProgressionCardProps) {
  const steps = [
    { id: 'pages', label: 'Ajouter une page', completed: pagesCount > 0, href: `/app/${websiteId}/pages` },
    { id: 'sections', label: 'Créer des sections', completed: sectionsCount > 0, href: `/app/${websiteId}/studio` },
    { id: 'theme', label: 'Personnaliser le thème', completed: hasTheme, href: `/app/${websiteId}/theme` },
    { id: 'seo', label: 'Configurer le SEO', completed: hasSEO, href: `/app/${websiteId}/settings` },
    { id: 'extensions', label: 'Activer une extension', completed: extensionsCount > 0, href: `/app/${websiteId}/extensions` },
    { id: 'publish', label: 'Publier le site', completed: isPublished, href: `/app/${websiteId}/settings` },
  ];

  const completedCount = steps.filter(s => s.completed).length;
  const progressPercentage = Math.round((completedCount / steps.length) * 100);

  return (
    <Card className="lg:col-span-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            Progression du site
          </CardTitle>
          <Badge 
            variant="outline" 
            className={progressPercentage === 100 ? 'bg-green-500/10 text-green-600 border-green-500/20' : ''}
          >
            {progressPercentage}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Progress value={progressPercentage} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1">
            {completedCount}/{steps.length} étapes complétées
          </p>
        </div>
        <div className="space-y-2">
          {steps.map((step) => (
            <Link
              key={step.id}
              href={step.href}
              className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
                step.completed 
                  ? 'bg-green-500/5 text-green-700' 
                  : 'hover:bg-accent'
              }`}
            >
              {step.completed ? (
                <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
              ) : (
                <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 shrink-0" />
              )}
              <span className={`text-sm ${step.completed ? 'line-through text-muted-foreground' : ''}`}>
                {step.label}
              </span>
              {!step.completed && <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground" />}
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
