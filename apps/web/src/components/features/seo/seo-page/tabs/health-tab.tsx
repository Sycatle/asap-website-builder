"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Gauge, AlertTriangle, CheckCircle2, Award } from "lucide-react";
import { StatusBadge } from "../utils";
import type { HealthTabProps } from "../types";

/**
 * Health tab showing Core Web Vitals and SEO issues
 */
export function HealthTab({ coreWebVitals, issuesList, richResults }: HealthTabProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Core Web Vitals */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Gauge className="h-5 w-5 text-primary" />
              Core Web Vitals
            </CardTitle>
            <CardDescription>
              Métriques de performance essentielles pour le SEO
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* LCP */}
            <div className="p-4 rounded-lg border">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-medium">LCP (Largest Contentful Paint)</p>
                  <p className="text-xs text-muted-foreground">Temps de chargement du contenu principal</p>
                </div>
                <StatusBadge status={coreWebVitals.lcp.status} />
              </div>
              <p className="text-2xl font-bold">{coreWebVitals.lcp.value}s</p>
              <Progress 
                value={Math.min(100, (2.5 / parseFloat(String(coreWebVitals.lcp.value))) * 100)} 
                className="h-2 mt-2" 
              />
            </div>

            {/* FID */}
            <div className="p-4 rounded-lg border">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-medium">FID (First Input Delay)</p>
                  <p className="text-xs text-muted-foreground">Délai de première interaction</p>
                </div>
                <StatusBadge status={coreWebVitals.fid.status} />
              </div>
              <p className="text-2xl font-bold">{coreWebVitals.fid.value}ms</p>
              <Progress 
                value={Math.min(100, (100 / Number(coreWebVitals.fid.value)) * 100)} 
                className="h-2 mt-2" 
              />
            </div>

            {/* CLS */}
            <div className="p-4 rounded-lg border">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-medium">CLS (Cumulative Layout Shift)</p>
                  <p className="text-xs text-muted-foreground">Stabilité visuelle de la page</p>
                </div>
                <StatusBadge status={coreWebVitals.cls.status} />
              </div>
              <p className="text-2xl font-bold">{coreWebVitals.cls.value}</p>
              <Progress 
                value={Math.min(100, (0.1 / parseFloat(String(coreWebVitals.cls.value))) * 100)} 
                className="h-2 mt-2" 
              />
            </div>

            {/* TTFB */}
            <div className="p-4 rounded-lg border">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="font-medium">TTFB (Time to First Byte)</p>
                  <p className="text-xs text-muted-foreground">Temps de réponse du serveur</p>
                </div>
                <StatusBadge status={coreWebVitals.ttfb.status} />
              </div>
              <p className="text-2xl font-bold">{coreWebVitals.ttfb.value}ms</p>
              <Progress 
                value={Math.min(100, (400 / Number(coreWebVitals.ttfb.value)) * 100)} 
                className="h-2 mt-2" 
              />
            </div>
          </CardContent>
        </Card>

        {/* SEO Issues */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-primary" />
              Problèmes détectés
            </CardTitle>
            <CardDescription>
              Points à corriger pour améliorer votre référencement
            </CardDescription>
          </CardHeader>
          <CardContent>
            {issuesList.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
                <p className="font-medium">Aucun problème détecté !</p>
                <p className="text-sm text-muted-foreground">Votre site est bien optimisé.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {issuesList.map((issue, index) => {
                  const Icon = issue.icon;
                  return (
                    <div 
                      key={index}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        issue.type === 'critical' ? 'bg-red-500/10 border-red-500/20' :
                        issue.type === 'warning' ? 'bg-amber-500/10 border-amber-500/20' :
                        'bg-blue-500/10 border-blue-500/20'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={`h-5 w-5 ${
                          issue.type === 'critical' ? 'text-red-600' :
                          issue.type === 'warning' ? 'text-amber-600' :
                          'text-blue-600'
                        }`} />
                        <span className="text-sm">{issue.title}</span>
                      </div>
                      <Badge variant="secondary" className={
                        issue.type === 'critical' ? 'bg-red-500/20 text-red-700' :
                        issue.type === 'warning' ? 'bg-amber-500/20 text-amber-700' :
                        'bg-blue-500/20 text-blue-700'
                      }>
                        {issue.count}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Rich Results */}
            <div className="mt-6 pt-4 border-t">
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <Award className="h-4 w-4" />
                Rich Results
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Éligibles</span>
                  <span className="font-medium">{richResults.eligible}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Détectés</span>
                  <span className="font-medium text-green-600">{richResults.detected}</span>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {richResults.types.map((type) => (
                    <Badge key={type} variant="outline" className="text-xs">
                      {type}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
