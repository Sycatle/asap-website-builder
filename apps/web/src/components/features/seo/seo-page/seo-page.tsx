"use client"

import React, { useState } from "react";
import { useWebsiteContext } from "@/contexts/WebsiteContext";
import { PageHeader } from "@/components/shared/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Search, 
  Globe, 
  FileText, 
  Shield, 
  Link as LinkIcon, 
  RefreshCw, 
  Calendar 
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
  const { currentWebsite, isLoading: isWebsiteLoading } = useWebsiteContext();
  const [timeRange, setTimeRange] = useState<TimeRange>("7d");
  const [activeTab, setActiveTab] = useState("performance");
  
  const seoData = useSeoData(currentWebsite?.id, timeRange);

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
          <h3 className="font-medium">Sélectionnez un site</h3>
          <p className="text-sm text-muted-foreground">
            Choisissez un site web pour voir ses statistiques SEO
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <PageHeader
          title="SEO"
          subtitle="Analysez vos performances de recherche et optimisez votre référencement"
        />
        
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={(val) => setTimeRange(val as TimeRange)}>
            <SelectTrigger className="w-[140px]">
              <Calendar className="mr-2 h-4 w-4" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">24 heures</SelectItem>
              <SelectItem value="7d">7 jours</SelectItem>
              <SelectItem value="28d">28 jours</SelectItem>
              <SelectItem value="3m">3 mois</SelectItem>
              <SelectItem value="6m">6 mois</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

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
            <span className="hidden sm:inline">Performance</span>
          </TabsTrigger>
          <TabsTrigger value="queries" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Requêtes</span>
          </TabsTrigger>
          <TabsTrigger value="pages" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Pages</span>
          </TabsTrigger>
          <TabsTrigger value="health" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Santé</span>
          </TabsTrigger>
          <TabsTrigger value="backlinks" className="flex items-center gap-2">
            <LinkIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Backlinks</span>
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
