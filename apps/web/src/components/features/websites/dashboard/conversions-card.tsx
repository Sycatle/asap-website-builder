"use client"

import { useTranslation } from 'react-i18next';
import { Target, Mail, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChangeIndicator, getChange } from "./utils";
import type { ConversionsCardProps } from "./types";

/**
 * Conversions card displaying newsletter subs and contact requests
 */
export function ConversionsCard({ realtimeData, prevData }: ConversionsCardProps) {
  const { t } = useTranslation(['common', 'dashboard']);

  return (
    <Card className="lg:col-span-5 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Target className="h-4 w-4 text-violet-500" />
          {t('dashboard:dashboard.conversions.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-green-500/10 to-green-500/5 border border-green-500/20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-green-500/20">
              <Mail className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-semibold">{t('dashboard:dashboard.conversions.newsletter')}</p>
              <p className="text-xs text-muted-foreground">{t('dashboard:dashboard.conversions.activeSubscribers')}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-green-600 tabular-nums">{realtimeData.newsletterSubs}</p>
            <ChangeIndicator value={getChange(realtimeData.newsletterSubs, prevData.newsletterSubs)} />
          </div>
        </div>
        
        <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-amber-500/10 to-amber-500/5 border border-amber-500/20">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20">
              <MessageSquare className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-semibold">{t('dashboard:dashboard.conversions.contact')}</p>
              <p className="text-xs text-muted-foreground">{t('dashboard:dashboard.conversions.requestsReceived')}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-amber-600 tabular-nums">{realtimeData.contactRequests}</p>
            <ChangeIndicator value={getChange(realtimeData.contactRequests, prevData.contactRequests)} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
