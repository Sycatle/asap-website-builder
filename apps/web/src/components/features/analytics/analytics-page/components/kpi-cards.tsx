"use client"

import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Activity, Users, Eye, Percent } from "lucide-react";
import { ChangeIndicator } from "../utils";
import type { KpiCardsProps } from "../types";

/**
 * Main KPI cards showing key metrics
 */
export function KpiCards({ data }: KpiCardsProps) {
  const { t } = useTranslation(['common', 'dashboard']);
  
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <TooltipProvider>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('dashboard:analytics.kpi.totalVisits')}</CardTitle>
            <Tooltip>
              <TooltipTrigger asChild>
                <Activity className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('dashboard:analytics.kpi.totalVisitsTooltip')}</p>
              </TooltipContent>
            </Tooltip>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalVisits.toLocaleString()}</div>
            <div className="flex items-center gap-2 mt-1">
              <ChangeIndicator value={data.changes.visits} />
              <span className="text-xs text-muted-foreground">{t('dashboard:analytics.kpi.vsPreviousPeriod')}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('dashboard:analytics.kpi.uniqueVisitors')}</CardTitle>
            <Tooltip>
              <TooltipTrigger asChild>
                <Users className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('dashboard:analytics.kpi.uniqueVisitorsTooltip')}</p>
              </TooltipContent>
            </Tooltip>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalUniqueVisitors.toLocaleString()}</div>
            <div className="flex items-center gap-2 mt-1">
              <ChangeIndicator value={data.changes.uniqueVisitors} />
              <span className="text-xs text-muted-foreground">{t('dashboard:analytics.kpi.vsPreviousPeriod')}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('dashboard:analytics.kpi.pageViews')}</CardTitle>
            <Tooltip>
              <TooltipTrigger asChild>
                <Eye className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('dashboard:analytics.kpi.pageViewsTooltip')}</p>
              </TooltipContent>
            </Tooltip>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalPageViews.toLocaleString()}</div>
            <div className="flex items-center gap-2 mt-1">
              <ChangeIndicator value={data.changes.pageViews} />
              <span className="text-xs text-muted-foreground">{t('dashboard:analytics.kpi.vsPreviousPeriod')}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('dashboard:analytics.kpi.bounceRate')}</CardTitle>
            <Tooltip>
              <TooltipTrigger asChild>
                <Percent className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('dashboard:analytics.kpi.bounceRateTooltip')}</p>
              </TooltipContent>
            </Tooltip>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.avgBounceRate}%</div>
            <div className="flex items-center gap-2 mt-1">
              <ChangeIndicator value={data.changes.bounceRate} inverted />
              <span className={`text-xs ${data.avgBounceRate < 40 ? 'text-green-600' : data.avgBounceRate < 60 ? 'text-amber-600' : 'text-red-500'}`}>
                {data.avgBounceRate < 40 ? t('dashboard:analytics.kpi.excellent') : data.avgBounceRate < 60 ? t('dashboard:analytics.kpi.average') : t('dashboard:analytics.kpi.needsImprovement')}
              </span>
            </div>
          </CardContent>
        </Card>
      </TooltipProvider>
    </div>
  );
}
