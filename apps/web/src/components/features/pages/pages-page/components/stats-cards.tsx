"use client"

import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Layers, CheckCircle2, Clock, Home } from "lucide-react";
import type { StatsCardsProps } from "../types";

/**
 * Statistics cards showing page counts
 */
export function StatsCards({ stats }: StatsCardsProps) {
  const { t } = useTranslation(['common', 'dashboard']);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <TooltipProvider>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('dashboard:pages.stats.total')}</CardTitle>
            <Tooltip>
              <TooltipTrigger asChild>
                <Layers className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('dashboard:pages.stats.totalTooltip')}</p>
              </TooltipContent>
            </Tooltip>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {t('dashboard:pages.stats.totalDescription')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('dashboard:pages.stats.published')}</CardTitle>
            <Tooltip>
              <TooltipTrigger asChild>
                <CheckCircle2 className="h-4 w-4 text-green-500 cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('dashboard:pages.stats.publishedTooltip')}</p>
              </TooltipContent>
            </Tooltip>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.published}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {t('dashboard:pages.stats.publishedDescription')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('dashboard:pages.stats.draft')}</CardTitle>
            <Tooltip>
              <TooltipTrigger asChild>
                <Clock className="h-4 w-4 text-amber-500 cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('dashboard:pages.stats.draftTooltip')}</p>
              </TooltipContent>
            </Tooltip>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.draft}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {t('dashboard:pages.stats.draftDescription')}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{t('dashboard:pages.stats.homepage')}</CardTitle>
            <Tooltip>
              <TooltipTrigger asChild>
                <Home className="h-4 w-4 text-primary cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('dashboard:pages.stats.homepageTooltip')}</p>
              </TooltipContent>
            </Tooltip>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.homepage}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {t('dashboard:pages.stats.homepageDescription')}
            </p>
          </CardContent>
        </Card>
      </TooltipProvider>
    </div>
  );
}
