"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, MessageSquare, MousePointerClick, Download, Target } from "lucide-react";
import { ChangeIndicator } from "../utils";
import type { ConversionsCardsProps, ConversionFunnelProps } from "../types";

/**
 * Conversion metric cards
 */
export function ConversionsCards({ conversions }: ConversionsCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card className="border-green-500/20 bg-gradient-to-br from-green-500/5 to-transparent">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Inscriptions newsletter
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{conversions.newsletterSignups.total}</div>
          <div className="flex items-center justify-between mt-2">
            <ChangeIndicator value={conversions.newsletterSignups.change} />
            <Badge variant="secondary" className="text-xs">
              {conversions.newsletterSignups.rate}% taux
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Formulaires de contact
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-blue-600">{conversions.contactForms.total}</div>
          <div className="flex items-center justify-between mt-2">
            <ChangeIndicator value={conversions.contactForms.change} />
            <Badge variant="secondary" className="text-xs">
              {conversions.contactForms.rate}% taux
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-transparent">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <MousePointerClick className="h-4 w-4" />
            Clics CTA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-violet-600">{conversions.ctaClicks.total}</div>
          <div className="flex items-center justify-between mt-2">
            <ChangeIndicator value={conversions.ctaClicks.change} />
            <Badge variant="secondary" className="text-xs">
              {conversions.ctaClicks.rate}% taux
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
            <Download className="h-4 w-4" />
            Téléchargements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-amber-600">{conversions.downloads.total}</div>
          <div className="flex items-center justify-between mt-2">
            <ChangeIndicator value={conversions.downloads.change} />
            <Badge variant="secondary" className="text-xs">
              {conversions.downloads.rate}% taux
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Conversion funnel visualization
 */
export function ConversionFunnel({ totalVisits, totalPageViews, conversions }: ConversionFunnelProps) {
  const funnelSteps = [
    { label: 'Visiteurs totaux', value: totalVisits, percent: 100 },
    { label: 'Pages vues', value: totalPageViews, percent: Math.min(100, Math.round((totalPageViews / totalVisits) * 40)) },
    { label: 'Engagés (>30s)', value: Math.round(totalVisits * 0.45), percent: 45 },
    { label: 'Clics CTA', value: conversions.ctaClicks.total, percent: Math.round((conversions.ctaClicks.total / totalVisits) * 100) },
    { label: 'Conversions', value: conversions.newsletterSignups.total + conversions.contactForms.total, percent: Math.round(((conversions.newsletterSignups.total + conversions.contactForms.total) / totalVisits) * 100) },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          Entonnoir de conversion
        </CardTitle>
        <CardDescription>
          Parcours des visiteurs vers les objectifs
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {funnelSteps.map((step) => (
            <div key={step.label} className="flex items-center gap-4">
              <div className="w-32 text-sm font-medium">{step.label}</div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-8 bg-muted rounded-lg overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-primary to-primary/60 flex items-center justify-end px-2"
                      style={{ width: `${step.percent}%` }}
                    >
                      <span className="text-xs font-medium text-primary-foreground">{step.percent}%</span>
                    </div>
                  </div>
                  <span className="text-sm font-medium w-20 text-right">{step.value.toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
