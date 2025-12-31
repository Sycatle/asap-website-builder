"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { 
  Link as LinkIcon, 
  Globe, 
  Shield, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle 
} from "lucide-react";
import type { BacklinksTabProps } from "../types";

/**
 * Backlinks tab showing link metrics and recommendations
 */
export function BacklinksTab({ backlinks }: BacklinksTabProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Total Backlinks */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <LinkIcon className="h-4 w-4" />
              Total backlinks
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{backlinks.total}</div>
            <div className="flex items-center gap-4 mt-2 text-sm">
              <span className="text-green-600">+{backlinks.newThisMonth} ce mois</span>
              <span className="text-red-500">-{backlinks.lostThisMonth} perdus</span>
            </div>
          </CardContent>
        </Card>

        {/* Referring Domains */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Domaines référents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{backlinks.referringDomains}</div>
            <p className="text-sm text-muted-foreground mt-2">Sites uniques pointant vers vous</p>
          </CardContent>
        </Card>

        {/* Link Distribution */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Répartition liens
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Dofollow</span>
                  <span className="font-medium text-green-600">{backlinks.dofollow}</span>
                </div>
                <Progress value={(backlinks.dofollow / backlinks.total) * 100} className="h-2" />
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Nofollow</span>
                  <span className="font-medium text-muted-foreground">{backlinks.nofollow}</span>
                </div>
                <Progress value={(backlinks.nofollow / backlinks.total) * 100} className="h-2 bg-muted" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Conseils pour améliorer vos backlinks
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-4 rounded-lg border bg-gradient-to-br from-green-500/5 to-transparent">
              <h4 className="font-medium flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Points forts
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Bon ratio dofollow/nofollow</li>
                <li>• Diversité des domaines référents</li>
                <li>• Croissance positive ce mois-ci</li>
              </ul>
            </div>
            <div className="p-4 rounded-lg border bg-gradient-to-br from-amber-500/5 to-transparent">
              <h4 className="font-medium flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                À améliorer
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Créer du contenu partageable</li>
                <li>• Développer les partenariats</li>
                <li>• Publier des études de cas</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
