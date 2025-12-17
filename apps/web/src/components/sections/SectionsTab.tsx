"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Layers, Info } from "lucide-react";

interface SectionsTabProps {
  websiteId: string | null;
}

/**
 * SectionsTab - V1 Simplified Version
 * 
 * In V1, we use a fixed FreelanceDevProfile structure instead of dynamic sections.
 * This tab is kept for backwards compatibility but displays a notice about V1 limitations.
 * 
 * Profile editing is done through the Onboarding flow and dedicated profile editor.
 */
export function SectionsTab({ websiteId }: SectionsTabProps) {
  return (
    <Card className="border-dashed">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Layers className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-lg">Sections</CardTitle>
          <Badge variant="secondary" className="ml-2">V1</Badge>
        </div>
        <CardDescription>
          Gestion des sections de votre portfolio
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="rounded-full bg-muted p-3 mb-4">
            <Info className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg mb-2">
            Sections fixes en V1
          </h3>
          <p className="text-muted-foreground max-w-md mb-4">
            En V1, votre portfolio utilise une structure fixe optimisée pour les développeurs freelances :
          </p>
          <ul className="text-sm text-muted-foreground space-y-1 text-left">
            <li>✓ <strong>Hero</strong> - Présentation et photo</li>
            <li>✓ <strong>À propos</strong> - Bio et compétences</li>
            <li>✓ <strong>Services</strong> - Vos prestations</li>
            <li>✓ <strong>Projets</strong> - Portfolio de réalisations</li>
            <li>✓ <strong>Contact</strong> - Formulaire et liens</li>
          </ul>
          <p className="text-xs text-muted-foreground mt-4">
            Les sections personnalisables seront disponibles en V2.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default SectionsTab;
