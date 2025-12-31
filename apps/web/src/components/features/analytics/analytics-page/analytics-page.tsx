"use client"

import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useWebsiteContext } from '@/contexts/WebsiteContext';
import { PageHeader } from '@/components/shared/page-header';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  BarChart3,
  Calendar,
  Download,
} from "lucide-react";

import type { TimeRange } from "./types";
import { useAnalyticsData } from "./hooks";
import { AnalyticsPageSkeleton } from "./components/analytics-page-skeleton";
import { KpiCards } from "./components/kpi-cards";
import { RealtimeBanner } from "./components/realtime-banner";
import { 
  TrafficChart, 
  TrafficSourcesCard, 
  EngagementCards,
  DevicesCard,
  CountriesCard,
  HourlyChart,
  TrafficSourcesDetailCard,
} from "./components/overview-components";
import { TopPagesTable } from "./components/top-pages-table";
import { ConversionsCards, ConversionFunnel } from "./components/conversions-components";

/**
 * AnalyticsPage - Main analytics dashboard
 * 
 * Displays comprehensive website analytics including:
 * - Real-time visitor tracking
 * - Traffic trends and sources
 * - Device and geographic breakdown
 * - Top content performance
 * - Conversion metrics and funnel
 */
export function AnalyticsPage() {
  const { t } = useTranslation(['common', 'dashboard']);
  const { currentWebsiteId, isLoading } = useWebsiteContext();
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [activeTab, setActiveTab] = useState('overview');
  
  const data = useAnalyticsData(currentWebsiteId, timeRange);

  if (isLoading) {
    return <AnalyticsPageSkeleton />;
  }

  return (
    <div className="flex flex-col gap-6 sm:gap-8 animate-fade-in">
      {/* Page Header */}
      <PageHeader
        title={t('dashboard:analytics.title')}
        subtitle={t('dashboard:analytics.subtitle')}
        icon={
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center shadow-lg">
            <BarChart3 className="h-5 w-5 text-white" />
          </div>
        }
        backHref={currentWebsiteId ? `/app/${currentWebsiteId}` : '/app'}
        actions={[
          {
            label: t('dashboard:analytics.export'),
            icon: <Download className="h-4 w-4" />,
            variant: 'outline',
          }
        ]}
        stickyContent={
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-500 flex items-center justify-center">
                <BarChart3 className="h-4 w-4 text-white" />
              </div>
              <div className="hidden sm:flex items-center gap-3">
                <p className="text-sm font-semibold">{t('dashboard:analytics.title')}</p>
                <div className="flex items-center gap-1.5 text-green-600">
                  <div className="relative">
                    <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                    <div className="absolute inset-0 h-2 w-2 rounded-full bg-green-500 animate-ping opacity-75" />
                  </div>
                  <span className="text-xs font-medium">{data.realtime.activeUsers} {t('dashboard:analytics.online')}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select value={timeRange} onValueChange={(val) => setTimeRange(val as TimeRange)}>
                <SelectTrigger className="w-[130px] h-8 text-xs">
                  <Calendar className="h-3.5 w-3.5 mr-1.5" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">{t('dashboard:analytics.timeRange.7d')}</SelectItem>
                  <SelectItem value="30d">{t('dashboard:analytics.timeRange.30d')}</SelectItem>
                  <SelectItem value="90d">{t('dashboard:analytics.timeRange.90d')}</SelectItem>
                </SelectContent>
              </Select>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                      <Download className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t('dashboard:analytics.exportTooltip')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        }
      >
        {/* Time range selector in header */}
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={(val) => setTimeRange(val as TimeRange)}>
            <SelectTrigger className="w-[140px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">{t('dashboard:analytics.timeRange.7d')}</SelectItem>
              <SelectItem value="30d">{t('dashboard:analytics.timeRange.30d')}</SelectItem>
              <SelectItem value="90d">{t('dashboard:analytics.timeRange.90d')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </PageHeader>

      {/* Real-time banner */}
      <RealtimeBanner realtime={data.realtime} />

      {/* Main KPIs */}
      <KpiCards data={data} />

      {/* Tabs for different views */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">{t('dashboard:analytics.tabs.overview')}</TabsTrigger>
          <TabsTrigger value="traffic">{t('dashboard:analytics.tabs.traffic')}</TabsTrigger>
          <TabsTrigger value="content">{t('dashboard:analytics.tabs.content')}</TabsTrigger>
          <TabsTrigger value="conversions">{t('dashboard:analytics.tabs.conversions')}</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-12">
            <TrafficChart data={data.trafficData} />
            <TrafficSourcesCard sources={data.trafficSources} />
          </div>
          
          <EngagementCards engagement={data.engagement} />
          
          <div className="grid gap-4 lg:grid-cols-2">
            <DevicesCard devices={data.devices} />
            <CountriesCard countries={data.countries} />
          </div>
        </TabsContent>

        {/* Traffic Tab */}
        <TabsContent value="traffic" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <HourlyChart data={data.hourlyData} />
            <TrafficSourcesDetailCard sources={data.trafficSources} />
          </div>
        </TabsContent>

        {/* Content Tab */}
        <TabsContent value="content" className="space-y-4">
          <TopPagesTable pages={data.topPages} />
        </TabsContent>

        {/* Conversions Tab */}
        <TabsContent value="conversions" className="space-y-4">
          <ConversionsCards conversions={data.conversions} />
          <ConversionFunnel 
            totalVisits={data.totalVisits}
            totalPageViews={data.totalPageViews}
            conversions={data.conversions}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default AnalyticsPage;
