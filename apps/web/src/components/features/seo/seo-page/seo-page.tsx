"use client"

import React, { useState } from "react";
import { useTranslation } from 'react-i18next';
import { useWebsiteContext } from "@/contexts/WebsiteContext";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  Search, 
  Globe, 
  FileText, 
  Shield, 
  Link as LinkIcon, 
  Calendar,
  Download,
} from "lucide-react";

import type { TimeRange } from "./types";
import { useSeoData } from "./hooks";
import { SeoHealthBanner } from "./components/seo-health-banner";
import { SeoKpiCards } from "./components/seo-kpi-cards";
import { PerformanceTab } from "./tabs/performance-tab";
import { QueriesTab } from "./tabs/queries-tab";
import { PagesTab } from "./tabs/pages-tab";
import { HealthTab } from "./tabs/health-tab";
import { BacklinksTab } from "./tabs/backlinks-tab";

/**
 * SeoPage - Main SEO analytics dashboard
 * 
 * Displays comprehensive SEO metrics including:
 * - Performance overview (impressions, clicks, CTR, position)
 * - Search queries analysis
 * - Pages indexation status
 * - Technical SEO health (Core Web Vitals, issues)
 * - Backlinks monitoring
 */
export function SeoPage() {
  const { t } = useTranslation(['dashboard', 'common']);
  const { currentWebsite, currentWebsiteId, isLoading: isWebsiteLoading } = useWebsiteContext();
  const [timeRange, setTimeRange] = useState<TimeRange>("28d");
  const [activeTab, setActiveTab] = useState("performance");
  
  const seoData = useSeoData(currentWebsiteId ?? undefined, timeRange);

  // Loading state
  if (isWebsiteLoading) {
    return (
      <div className="space-y-6 p-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  // No website selected
  if (!currentWebsite) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="text-center space-y-2">
          <Search className="h-12 w-12 mx-auto text-muted-foreground" />
          <h3 className="font-medium">{t('dashboard:seo.selectSite')}</h3>
          <p className="text-sm text-muted-foreground">
            {t('dashboard:seo.selectSiteDescription')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 sm:gap-8 animate-fade-in">
      {/* Page Header */}
      <PageHeader
        title={t('dashboard:seo.title')}
        subtitle={t('dashboard:seo.subtitle')}
        icon={
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg">
            <Search className="h-5 w-5 text-white" />
          </div>
        }
        badge={{
          label: `Score ${seoData.seoScore}`,
          className: seoData.seoScore >= 80 ? 'bg-green-500/10 text-green-600 border-green-500/20' :
                     seoData.seoScore >= 50 ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                     'bg-red-500/10 text-red-600 border-red-500/20',
        }}
        backHref={currentWebsiteId ? `/app/${currentWebsiteId}` : '/app'}
        actions={[
          {
            label: t('dashboard:seo.export'),
            icon: <Download className="h-4 w-4" />,
            variant: 'outline',
          }
        ]}
        stickyContent={
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center">
                <Search className="h-4 w-4 text-white" />
              </div>
              <div className="hidden sm:flex items-center gap-3">
                <p className="text-sm font-semibold">SEO</p>
                <Badge className={seoData.seoScore >= 80 ? 'bg-green-500/10 text-green-600 border-green-500/20 text-[10px] h-5' :
                                 seoData.seoScore >= 50 ? 'bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] h-5' :
                                 'bg-red-500/10 text-red-600 border-red-500/20 text-[10px] h-5'}>
                  Score {seoData.seoScore}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select value={timeRange} onValueChange={(val) => setTimeRange(val as TimeRange)}>
                <SelectTrigger className="w-[130px] h-8 text-xs">
                  <Calendar className="h-3.5 w-3.5 mr-1.5" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">{t('dashboard:seo.timeRange.7d')}</SelectItem>
                  <SelectItem value="28d">{t('dashboard:seo.timeRange.28d')}</SelectItem>
                  <SelectItem value="90d">{t('dashboard:seo.timeRange.90d')}</SelectItem>
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
                    <p>{t('dashboard:seo.exportTooltip')}</p>
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
            <SelectTrigger className="w-[160px]">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">{t('dashboard:seo.timeRange.7d')}</SelectItem>
              <SelectItem value="28d">{t('dashboard:seo.timeRange.28d')}</SelectItem>
              <SelectItem value="90d">{t('dashboard:seo.timeRange.90d')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </PageHeader>

      {/* SEO Health Banner */}
      <SeoHealthBanner 
        seoScore={seoData.seoScore}
        seoIssues={seoData.seoIssues}
      />

      {/* KPI Cards */}
      <SeoKpiCards data={seoData} />

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="performance" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            <span className="hidden sm:inline">{t('dashboard:seo.tabs.performance')}</span>
          </TabsTrigger>
          <TabsTrigger value="queries" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">{t('dashboard:seo.tabs.queries')}</span>
          </TabsTrigger>
          <TabsTrigger value="pages" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">{t('dashboard:seo.tabs.pages')}</span>
          </TabsTrigger>
          <TabsTrigger value="health" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">{t('dashboard:seo.tabs.health')}</span>
          </TabsTrigger>
          <TabsTrigger value="backlinks" className="flex items-center gap-2">
            <LinkIcon className="h-4 w-4" />
            <span className="hidden sm:inline">{t('dashboard:seo.tabs.backlinks')}</span>
          </TabsTrigger>
        </TabsList>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <PerformanceTab data={seoData} />
        </TabsContent>

        {/* Queries Tab */}
        <TabsContent value="queries" className="space-y-4">
          <QueriesTab queries={seoData.queries} />
        </TabsContent>

        {/* Pages Tab */}
        <TabsContent value="pages" className="space-y-4">
          <PagesTab 
            pages={seoData.pages}
            indexingStatus={seoData.indexingStatus}
            sitemapStatus={seoData.sitemapStatus}
          />
        </TabsContent>

        {/* Health Tab */}
        <TabsContent value="health" className="space-y-4">
          <HealthTab
            coreWebVitals={seoData.coreWebVitals}
            issuesList={seoData.issuesList}
            richResults={seoData.richResults}
          />
        </TabsContent>

        {/* Backlinks Tab */}
        <TabsContent value="backlinks" className="space-y-4">
          <BacklinksTab backlinks={seoData.backlinks} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default SeoPage;
