"use client"

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { websitesAPI, type UpdateWebsiteRequest } from '@/lib/api';
import { queryKeys } from '@/lib/query';
import { useQueryClient } from '@tanstack/react-query';
import { useWebsiteContext } from '@/contexts/WebsiteContext';
import { Link } from '@/components/app-router';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { PageIcon } from "@/lib/navigation-config";
import { Spinner } from "@/components/ui/spinner";
import { 
  Edit, 
  ExternalLink, 
  CheckCircle2,
  Clock,
  Rocket,
  Activity,
  Target,
} from "lucide-react";
import { PresetOnboardingRouter } from "@/components/onboarding/presets";

// Dashboard components
import { StatsCards } from './stats-cards';
import { TrendChart } from './trend-chart';
import { ConversionsCard } from './conversions-card';
import { QuickActions } from './quick-actions';
import { CloudPreviewCard } from './cloud-preview-card';
import { TeamCard } from './team-card';
import { RecentEventsCard } from './recent-events-card';
import { SiteProgressionCard } from './site-progression-card';
import { WeeklyGoalsCard } from './weekly-goals-card';
import { AchievementsCard } from './achievements-card';
import { getSeededValue } from './utils';
import type { RealtimeData } from './types';

/**
 * Main Dashboard component
 * Orchestrates all dashboard sub-components and manages real-time data
 */
export default function Dashboard() {
  const { t } = useTranslation(['common', 'dashboard']);
  const { 
    currentWebsite: website, 
    currentWebsiteId, 
    quota, 
    extensions, 
    isLoading, 
    websites, 
    pages, 
    elements, 
    refetch: refetchAll 
  } = useWebsiteContext();
  const queryClient = useQueryClient();
  
  const [isSaving, setIsSaving] = useState(false);

  // Real-time data state - updates every 5 seconds
  const [realtimeData, setRealtimeData] = useState<RealtimeData>({
    activeVisitors: 0,
    todayVisits: 0,
    todayPageViews: 0,
    newsletterSubs: 0,
    contactRequests: 0,
    conversionRate: 0,
  });

  // Store previous values for smooth transitions
  const prevDataRef = useRef<RealtimeData>(realtimeData);

  // Initialize and update real-time data every 5 seconds
  useEffect(() => {
    // Set initial values using seeded random for consistency
    const initialData: RealtimeData = {
      activeVisitors: getSeededValue(website?.id, 3, 25, 1),
      todayVisits: getSeededValue(website?.id, 150, 800, 2),
      todayPageViews: getSeededValue(website?.id, 400, 2000, 3),
      newsletterSubs: getSeededValue(website?.id, 50, 300, 4),
      contactRequests: getSeededValue(website?.id, 5, 40, 5),
      conversionRate: getSeededValue(website?.id, 20, 65, 6) / 10,
    };
    
    setRealtimeData(initialData);
    prevDataRef.current = initialData;

    // Update every 5 seconds with realistic increments/decrements
    const interval = setInterval(() => {
      setRealtimeData(prev => {
        const newActiveVisitors = Math.max(1, prev.activeVisitors + Math.floor(Math.random() * 6) - 2);
        const newTodayVisits = prev.todayVisits + Math.floor(Math.random() * 4);
        const newTodayPageViews = prev.todayPageViews + Math.floor(Math.random() * 8);
        const newNewsletterSubs = Math.random() > 0.9 ? prev.newsletterSubs + 1 : prev.newsletterSubs;
        const newContactRequests = Math.random() > 0.95 ? prev.contactRequests + 1 : prev.contactRequests;
        const newConversionRate = Math.max(1, Math.min(10, prev.conversionRate + (Math.random() - 0.5) * 0.3));

        const newData: RealtimeData = {
          activeVisitors: newActiveVisitors,
          todayVisits: newTodayVisits,
          todayPageViews: newTodayPageViews,
          newsletterSubs: newNewsletterSubs,
          contactRequests: newContactRequests,
          conversionRate: Math.round(newConversionRate * 10) / 10,
        };

        prevDataRef.current = prev;
        return newData;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [website?.id]);

  // Calculated values
  const enabledExtensionsCount = extensions.filter(e => e.enabled).length;
  const storageUsed = quota?.total_size_used || 0;
  const storageLimit = quota?.quota_limit || 104857600; // 100MB default
  const storagePercentage = (storageUsed / storageLimit) * 100;

  // 7-day trend data for mini chart
  const trendData = useMemo(() => {
    const websiteSeed = website?.id 
      ? website.id.split('').reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) | 0, 0)
      : 42;
    
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      const seed = Math.abs((websiteSeed + i * 100) * 2654435761 % 2147483647);
      const baseValue = Math.floor((seed / 2147483647) * 100) + 50;
      const trend = 1 + (i / 7) * 0.2;
      
      return {
        day: date.toLocaleDateString('fr-FR', { weekday: 'short' }),
        visits: Math.floor(baseValue * trend),
      };
    });
  }, [website?.id]);

  // Publish handler
  const handlePublish = async () => {
    if (!website || !currentWebsiteId) return;
    
    setIsSaving(true);
    try {
      await websitesAPI.update(currentWebsiteId, { status: 'published' } as UpdateWebsiteRequest);
      await queryClient.invalidateQueries({ queryKey: queryKeys.websites.all });
      refetchAll();
      toast.success(t('dashboard:websites.toast.published'));
    } catch (error) {
      toast.error(t('dashboard:websites.toast.publishError'));
    } finally {
      setIsSaving(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-5 w-40" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-64 lg:col-span-2" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  // Show onboarding for new users
  if (!isLoading && websites.length === 0) {
    return (
      <PresetOnboardingRouter 
        onComplete={() => {
          refetchAll();
        }} 
      />
    );
  }

  return (
    <div className="flex flex-col gap-8 animate-fade-in">
      {/* Page Header with sticky behavior */}
      <PageHeader
        title={website?.title || t('dashboard:dashboard.mySite')}
        subtitle={website?.slug ? `${website.slug}.asap.cool` : undefined}
        icon={<PageIcon page="home" />}
        badge={website?.status === 'published' ? {
          label: t('dashboard:websites.status.online'),
          className: 'bg-green-500/10 text-green-600 border-green-500/20',
          icon: <CheckCircle2 className="w-3 h-3 mr-1" />,
        } : {
          label: t('dashboard:websites.status.draft'),
          variant: 'secondary',
          icon: <Clock className="w-3 h-3 mr-1" />,
        }}
        isMainPage={true}
        actions={[
          ...(website?.status === 'draft' ? [{
            label: t('dashboard:dashboard.publish'),
            icon: isSaving ? <Spinner className="h-4 w-4" /> : <Rocket className="h-4 w-4" />,
            onClick: handlePublish,
            disabled: isSaving,
            className: 'bg-green-600 hover:bg-green-700 shadow-lg shadow-green-600/20',
          }] : []),
          {
            label: t('dashboard:dashboard.studio'),
            icon: <Edit className="h-4 w-4" />,
            href: `/${currentWebsiteId}/studio`,
            className: 'shadow-md',
          },
          ...(website ? [{
            label: t('dashboard:dashboard.view'),
            icon: <ExternalLink className="h-4 w-4" />,
            href: `/${website.slug}`,
            variant: 'outline' as const,
            className: 'shadow-sm',
          }] : []),
        ]}
        stickyContent={
          <StickyHeaderContent 
            website={website}
            currentWebsiteId={currentWebsiteId}
            realtimeData={realtimeData}
            isSaving={isSaving}
            onPublish={handlePublish}
          />
        }
      />

      {/* Section 1: Stats en temps réel + Graphique + Conversions */}
      <section className="space-y-4">
        <StatsCards 
          realtimeData={realtimeData} 
          prevData={prevDataRef.current} 
        />
        
        <div className="grid gap-4 lg:grid-cols-12">
          <TrendChart 
            websiteId={currentWebsiteId || ''} 
            trendData={trendData} 
          />
          <ConversionsCard 
            realtimeData={realtimeData} 
            prevData={prevDataRef.current} 
          />
        </div>
      </section>

      {/* Section 2: Actions rapides */}
      <QuickActions 
        websiteId={currentWebsiteId || ''} 
        pagesCount={pages.length} 
        enabledExtensionsCount={enabledExtensionsCount} 
      />

      {/* Section 3: Grid principal - Cloud + Team + Activity */}
      <section className="grid gap-4 lg:grid-cols-12">
        {/* Cloud - Takes more space */}
        <div className="lg:col-span-5">
          <CloudPreviewCard 
            websiteId={currentWebsiteId || ''} 
            storageUsed={storageUsed}
            storageLimit={storageLimit}
            storagePercentage={storagePercentage}
          />
        </div>
        
        {/* Team + Activity side by side on large screens */}
        <div className="lg:col-span-7 grid gap-4 md:grid-cols-2 lg:grid-cols-12">
          <TeamCard websiteId={currentWebsiteId || ''} />
          <RecentEventsCard websiteId={currentWebsiteId || ''} />
        </div>
      </section>

      {/* Section 4: Gamification - Progression + Goals + Achievements */}
      <section className="grid gap-4 lg:grid-cols-12">
        <SiteProgressionCard 
          websiteId={currentWebsiteId || ''} 
          pagesCount={pages.length}
          sectionsCount={elements.length}
          extensionsCount={enabledExtensionsCount}
          isPublished={website?.status === 'published'}
          hasTheme={true}
          hasSEO={!!website?.title}
        />

        <WeeklyGoalsCard 
          websiteId={currentWebsiteId || ''}
          currentVisits={realtimeData.todayVisits * 7}
          currentSubscribers={realtimeData.newsletterSubs}
          currentContacts={realtimeData.contactRequests}
        />

        <AchievementsCard 
          websiteId={currentWebsiteId || ''}
          pagesCount={pages.length}
          sectionsCount={elements.length}
          extensionsCount={enabledExtensionsCount}
          isPublished={website?.status === 'published'}
          totalVisits={realtimeData.todayVisits * 30}
          newsletterSubs={realtimeData.newsletterSubs}
        />
      </section>
    </div>
  );
}

/**
 * Sticky header content showing live stats and quick actions
 */
function StickyHeaderContent({ 
  website, 
  currentWebsiteId, 
  realtimeData, 
  isSaving, 
  onPublish 
}: { 
  website: any;
  currentWebsiteId: string | null;
  realtimeData: RealtimeData;
  isSaving: boolean;
  onPublish: () => void;
}) {
  const { t } = useTranslation(['common', 'dashboard']);

  return (
    <div className="flex items-center justify-between h-12">
      {/* Left - Site info */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <PageIcon page="home" size="md" />
          <div className="hidden sm:block">
            <p className="text-sm font-semibold leading-none">{website?.title || t('dashboard:dashboard.mySite')}</p>
            <p className="text-[11px] text-muted-foreground font-mono">{website?.slug}.asap.cool</p>
          </div>
        </div>
        {website?.status === 'published' ? (
          <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-[10px] h-5">
            <div className="h-1.5 w-1.5 rounded-full bg-green-500 mr-1 animate-pulse" />
            {t('dashboard:websites.status.online')}
          </Badge>
        ) : (
          <Badge variant="secondary" className="text-[10px] h-5">
            <Clock className="w-2.5 h-2.5 mr-1" />
            {t('dashboard:websites.status.draft')}
          </Badge>
        )}
      </div>

      {/* Center - Live stats */}
      <div className="hidden md:flex items-center gap-4">
        <div className="flex items-center gap-1.5 text-sm">
          <div className="relative">
            <div className="h-1.5 w-1.5 rounded-full bg-green-500" />
            <div className="absolute inset-0 h-1.5 w-1.5 rounded-full bg-green-500 animate-ping" />
          </div>
          <span className="text-green-600 font-semibold tabular-nums">{realtimeData.activeVisitors}</span>
          <span className="text-muted-foreground text-xs">{t('dashboard:dashboard.liveVisitors', { count: realtimeData.activeVisitors }).replace(`${realtimeData.activeVisitors} `, '')}</span>
        </div>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-1.5 text-sm">
          <Activity className="h-3.5 w-3.5 text-primary" />
          <span className="font-semibold tabular-nums">{realtimeData.todayVisits.toLocaleString()}</span>
          <span className="text-muted-foreground text-xs">{t('dashboard:dashboard.visits')}</span>
        </div>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-1.5 text-sm">
          <Target className="h-3.5 w-3.5 text-violet-500" />
          <span className="font-semibold text-violet-600 tabular-nums">{realtimeData.conversionRate}%</span>
        </div>
      </div>

      {/* Right - Actions */}
      <div className="flex items-center gap-2">
        {website?.status === 'draft' && (
          <Button onClick={onPublish} disabled={isSaving} size="sm" className="bg-green-600 hover:bg-green-700 h-8">
            {isSaving ? <Spinner className="h-3.5 w-3.5" /> : <Rocket className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline ml-1.5">{t('dashboard:dashboard.publish')}</span>
          </Button>
        )}
        <Button variant="default" size="sm" className="h-8" asChild>
          <Link href={`/${currentWebsiteId}/studio`}>
            <Edit className="h-3.5 w-3.5" />
            <span className="hidden sm:inline ml-1.5">{t('dashboard:dashboard.studio')}</span>
          </Link>
        </Button>
        {website && (
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" asChild>
            <a href={`/${website.slug}`} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
        )}
      </div>
    </div>
  );
}
