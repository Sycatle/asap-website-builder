"use client"

import { useTranslation } from 'react-i18next';
import { 
  Activity, 
  Eye, 
  Target, 
  ArrowUpRight, 
  ArrowDownRight,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { ChangeIndicator, getChange } from "./utils";
import type { StatsCardsProps } from "./types";

/**
 * Real-time statistics cards displaying live visitor data
 */
export function StatsCards({ realtimeData, prevData }: StatsCardsProps) {
  const { t } = useTranslation(['common', 'dashboard']);

  return (
    <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
      <TooltipProvider>
        {/* Active Visitors - Hero stat */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Card className="relative overflow-hidden border-green-500/30 bg-gradient-to-br from-green-500/10 via-green-500/5 to-transparent shadow-lg shadow-green-500/5 cursor-help">
              <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/10 rounded-full blur-2xl" />
              <CardContent className="p-4 relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                      <div className="absolute inset-0 h-2 w-2 rounded-full bg-green-500 animate-ping" />
                    </div>
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-green-600">{t('dashboard:dashboard.stats.live')}</span>
                  </div>
                  <ChangeIndicator value={getChange(realtimeData.activeVisitors, prevData.activeVisitors)} />
                </div>
                <p className="text-4xl font-bold text-green-600 tabular-nums">{realtimeData.activeVisitors}</p>
                <p className="text-xs text-muted-foreground mt-1">{t('dashboard:dashboard.stats.activeVisitors')}</p>
              </CardContent>
            </Card>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t('dashboard:dashboard.stats.activeVisitorsTooltip')}</p>
          </TooltipContent>
        </Tooltip>

        {/* Today's Visits */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Card className="shadow-sm hover:shadow-md transition-shadow cursor-help">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-1.5 rounded-lg bg-primary/10">
                    <Activity className="h-4 w-4 text-primary" />
                  </div>
                  <ChangeIndicator value={getChange(realtimeData.todayVisits, prevData.todayVisits)} />
                </div>
                <p className="text-3xl font-bold tabular-nums">{realtimeData.todayVisits.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">{t('dashboard:dashboard.stats.todayVisits')}</p>
              </CardContent>
            </Card>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t('dashboard:dashboard.stats.todayVisitsTooltip')}</p>
          </TooltipContent>
        </Tooltip>

        {/* Page Views */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Card className="shadow-sm hover:shadow-md transition-shadow cursor-help">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-1.5 rounded-lg bg-blue-500/10">
                    <Eye className="h-4 w-4 text-blue-500" />
                  </div>
                  <ChangeIndicator value={getChange(realtimeData.todayPageViews, prevData.todayPageViews)} />
                </div>
                <p className="text-3xl font-bold tabular-nums">{realtimeData.todayPageViews.toLocaleString()}</p>
                <p className="text-xs text-muted-foreground mt-1">{t('dashboard:dashboard.stats.pageViews')}</p>
              </CardContent>
            </Card>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t('dashboard:dashboard.stats.pageViewsTooltip')}</p>
          </TooltipContent>
        </Tooltip>

        {/* Conversion Rate */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Card className="relative overflow-hidden border-violet-500/30 bg-gradient-to-br from-violet-500/10 via-violet-500/5 to-transparent shadow-lg shadow-violet-500/5 cursor-help">
              <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/10 rounded-full blur-2xl" />
              <CardContent className="p-4 relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="p-1.5 rounded-lg bg-violet-500/10">
                    <Target className="h-4 w-4 text-violet-500" />
                  </div>
                  {realtimeData.conversionRate > prevData.conversionRate ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : realtimeData.conversionRate < prevData.conversionRate ? (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  ) : null}
                </div>
                <p className="text-4xl font-bold text-violet-600 tabular-nums">{realtimeData.conversionRate}%</p>
                <p className="text-xs text-muted-foreground mt-1">{t('dashboard:dashboard.stats.conversionRate')}</p>
              </CardContent>
            </Card>
          </TooltipTrigger>
          <TooltipContent>
            <p>{t('dashboard:dashboard.stats.conversionRateTooltip')}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
