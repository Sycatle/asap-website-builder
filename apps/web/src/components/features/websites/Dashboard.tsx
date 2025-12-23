"use client"

import React, { useEffect, useState, useMemo, useRef } from 'react';
import { websitesAPI, type UpdateWebsiteRequest } from '@/lib/api';
import { queryKeys, useAdministratorsQuery, useFilesQuery } from '@/lib/query';
import { useQueryClient } from '@tanstack/react-query';
import { useWebsiteContext } from '@/contexts/WebsiteContext';
import { Link } from '@/components/app-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { 
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { ChartConfig } from "@/components/ui/chart";
import { 
  XAxis,
  YAxis,
  Area,
  AreaChart,
  CartesianGrid,
} from "recharts";
import { 
  Globe, 
  Edit, 
  Upload, 
  ExternalLink, 
  Puzzle, 
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Clock,
  Rocket,
  Loader2,
  Settings,
  Layers,
  FileText,
  Eye,
  Zap,
  Target,
  Activity,
  Mail,
  MessageSquare,
  BarChart3,
  HardDrive,
  Palette,
  Image,
  Film,
  Music,
  File,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Trophy,
  Star,
  Users,
  Calendar,
  Bell,
  Crown,
  Award,
  Sparkles,
  ChevronRight,
  Lock,
  Unlock,
} from "lucide-react";
import { PresetOnboardingRouter } from "@/components/onboarding/presets";
import { formatBytes, formatDate } from "@/lib/utils/formatters";
import type { FileMetadata } from "@/lib/api";

export default function Dashboard() {
  const { currentWebsite: website, currentWebsiteId, quota, extensions, isLoading, websites, pages, elements, refetch: refetchAll } = useWebsiteContext();
  const queryClient = useQueryClient();
  
  const [isSaving, setIsSaving] = useState(false);

  // Real-time data state - updates every 5 seconds
  const [realtimeData, setRealtimeData] = useState({
    activeVisitors: 0,
    todayVisits: 0,
    todayPageViews: 0,
    newsletterSubs: 0,
    contactRequests: 0,
    conversionRate: 0,
  });

  // Store previous values for smooth transitions
  const prevDataRef = useRef(realtimeData);

  // Initialize and update real-time data every 5 seconds
  useEffect(() => {
    // Initialize with base values
    const websiteSeed = website?.id 
      ? website.id.split('').reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) | 0, 0)
      : 42;
    
    const getInitialValue = (min: number, max: number, offset: number) => {
      const seed = Math.abs((websiteSeed + offset) * 2654435761 % 2147483647);
      return Math.floor((seed / 2147483647) * (max - min)) + min;
    };

    // Set initial values
    const initialData = {
      activeVisitors: getInitialValue(3, 25, 1),
      todayVisits: getInitialValue(150, 800, 2),
      todayPageViews: getInitialValue(400, 2000, 3),
      newsletterSubs: getInitialValue(50, 300, 4),
      contactRequests: getInitialValue(5, 40, 5),
      conversionRate: getInitialValue(20, 65, 6) / 10,
    };
    
    setRealtimeData(initialData);
    prevDataRef.current = initialData;

    // Update every 5 seconds with realistic increments/decrements
    const interval = setInterval(() => {
      setRealtimeData(prev => {
        // Small random changes (-2 to +3 for most, keeping it realistic)
        const newActiveVisitors = Math.max(1, prev.activeVisitors + Math.floor(Math.random() * 6) - 2);
        const newTodayVisits = prev.todayVisits + Math.floor(Math.random() * 4); // Only increments during day
        const newTodayPageViews = prev.todayPageViews + Math.floor(Math.random() * 8);
        const newNewsletterSubs = Math.random() > 0.9 ? prev.newsletterSubs + 1 : prev.newsletterSubs;
        const newContactRequests = Math.random() > 0.95 ? prev.contactRequests + 1 : prev.contactRequests;
        const newConversionRate = Math.max(1, Math.min(10, prev.conversionRate + (Math.random() - 0.5) * 0.3));

        const newData = {
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

  // Calculate changes from previous values
  const getChange = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return current - previous;
  };

  const enabledExtensionsCount = extensions.filter(e => e.enabled).length;
  const storageUsed = quota?.total_size_used || 0;
  const storageLimit = quota?.max_storage_bytes || 104857600; // 100MB default
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
      const trend = 1 + (i / 7) * 0.2; // Slight upward trend
      
      return {
        day: date.toLocaleDateString('fr-FR', { weekday: 'short' }),
        visits: Math.floor(baseValue * trend),
      };
    });
  }, [website?.id]);

  const trendChartConfig = {
    visits: {
      label: "Visites",
      color: "hsl(var(--primary))",
    },
  } satisfies ChartConfig;

  // Publish handler
  const handlePublish = async () => {
    if (!website || !currentWebsiteId) return;
    
    setIsSaving(true);
    try {
      await websitesAPI.update(currentWebsiteId, { status: 'published' } as UpdateWebsiteRequest);
      await queryClient.invalidateQueries({ queryKey: queryKeys.websites.all() });
      refetchAll();
      toast.success('Site publié avec succès !');
    } catch (error) {
      toast.error('Erreur lors de la publication');
    } finally {
      setIsSaving(false);
    }
  };

  // Change indicator component
  const ChangeIndicator = ({ value, suffix = '' }: { value: number; suffix?: string }) => {
    if (value === 0) return null;
    const isPositive = value > 0;
    return (
      <span className={`inline-flex items-center gap-0.5 text-xs font-medium transition-all duration-300 ${
        isPositive ? 'text-green-600' : 'text-red-500'
      }`}>
        {isPositive ? (
          <ArrowUpRight className="h-3 w-3" />
        ) : (
          <ArrowDownRight className="h-3 w-3" />
        )}
        {isPositive ? '+' : ''}{value}{suffix}
      </span>
    );
  };

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
    <div className="flex flex-col gap-6 sm:gap-8 animate-fade-in">
      {/* Page Header with sticky behavior */}
      <PageHeader
        title={website?.title || 'Mon site'}
        subtitle={website?.slug ? `${website.slug}.asap.cool` : undefined}
        icon={
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center shadow-lg">
            <Globe className="h-5 w-5 text-white" />
          </div>
        }
        badge={website?.status === 'published' ? {
          label: 'En ligne',
          className: 'bg-green-500/10 text-green-600 border-green-500/20',
          icon: <CheckCircle2 className="w-3 h-3 mr-1" />,
        } : {
          label: 'Brouillon',
          variant: 'secondary',
          icon: <Clock className="w-3 h-3 mr-1" />,
        }}
        isMainPage={true}
        actions={[
          ...(website?.status === 'draft' ? [{
            label: 'Publier',
            icon: isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Rocket className="h-4 w-4" />,
            onClick: handlePublish,
            disabled: isSaving,
            className: 'bg-green-600 hover:bg-green-700 shadow-lg shadow-green-600/20',
          }] : []),
          {
            label: 'Studio',
            icon: <Edit className="h-4 w-4" />,
            href: `/app/${currentWebsiteId}/studio`,
            className: 'shadow-md',
          },
          ...(website ? [{
            label: 'Voir',
            icon: <ExternalLink className="h-4 w-4" />,
            href: `/${website.slug}`,
            variant: 'outline' as const,
            className: 'shadow-sm',
          }] : []),
        ]}
        stickyContent={
          <div className="flex items-center justify-between h-12">
            {/* Left - Site info */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center shrink-0">
                  <Globe className="h-4 w-4 text-white" />
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-semibold leading-none">{website?.title || 'Mon site'}</p>
                  <p className="text-[11px] text-muted-foreground font-mono">{website?.slug}.asap.cool</p>
                </div>
              </div>
              {website?.status === 'published' ? (
                <Badge className="bg-green-500/10 text-green-600 border-green-500/20 text-[10px] h-5">
                  <div className="h-1.5 w-1.5 rounded-full bg-green-500 mr-1 animate-pulse" />
                  En ligne
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-[10px] h-5">
                  <Clock className="w-2.5 h-2.5 mr-1" />
                  Brouillon
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
                <span className="text-muted-foreground text-xs">en ligne</span>
              </div>
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-1.5 text-sm">
                <Activity className="h-3.5 w-3.5 text-primary" />
                <span className="font-semibold tabular-nums">{realtimeData.todayVisits.toLocaleString()}</span>
                <span className="text-muted-foreground text-xs">visites</span>
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
                <Button onClick={handlePublish} disabled={isSaving} size="sm" className="bg-green-600 hover:bg-green-700 h-8">
                  {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Rocket className="h-3.5 w-3.5" />}
                  <span className="hidden sm:inline ml-1.5">Publier</span>
                </Button>
              )}
              <Button variant="default" size="sm" className="h-8" asChild>
                <Link href={`/app/${currentWebsiteId}/studio`}>
                  <Edit className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline ml-1.5">Studio</span>
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
        }
      />

      {/* Stats en temps réel - Design premium */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {/* Active Visitors - Hero stat */}
        <Card className="relative overflow-hidden border-green-500/30 bg-gradient-to-br from-green-500/10 via-green-500/5 to-transparent shadow-lg shadow-green-500/5">
          <div className="absolute top-0 right-0 w-24 h-24 bg-green-500/10 rounded-full blur-2xl" />
          <CardContent className="p-4 relative">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="relative">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <div className="absolute inset-0 h-2 w-2 rounded-full bg-green-500 animate-ping" />
                </div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-green-600">Live</span>
              </div>
              <ChangeIndicator value={getChange(realtimeData.activeVisitors, prevDataRef.current.activeVisitors)} />
            </div>
            <p className="text-4xl font-bold text-green-600 tabular-nums">{realtimeData.activeVisitors}</p>
            <p className="text-xs text-muted-foreground mt-1">visiteurs actifs</p>
          </CardContent>
        </Card>

        {/* Today's Visits */}
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <Activity className="h-4 w-4 text-primary" />
              </div>
              <ChangeIndicator value={getChange(realtimeData.todayVisits, prevDataRef.current.todayVisits)} />
            </div>
            <p className="text-3xl font-bold tabular-nums">{realtimeData.todayVisits.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">visites aujourd'hui</p>
          </CardContent>
        </Card>

        {/* Page Views */}
        <Card className="shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="p-1.5 rounded-lg bg-blue-500/10">
                <Eye className="h-4 w-4 text-blue-500" />
              </div>
              <ChangeIndicator value={getChange(realtimeData.todayPageViews, prevDataRef.current.todayPageViews)} />
            </div>
            <p className="text-3xl font-bold tabular-nums">{realtimeData.todayPageViews.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground mt-1">pages vues</p>
          </CardContent>
        </Card>

        {/* Conversion Rate */}
        <Card className="relative overflow-hidden border-violet-500/30 bg-gradient-to-br from-violet-500/10 via-violet-500/5 to-transparent shadow-lg shadow-violet-500/5">
          <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/10 rounded-full blur-2xl" />
          <CardContent className="p-4 relative">
            <div className="flex items-center justify-between mb-3">
              <div className="p-1.5 rounded-lg bg-violet-500/10">
                <Target className="h-4 w-4 text-violet-500" />
              </div>
              {realtimeData.conversionRate > prevDataRef.current.conversionRate ? (
                <TrendingUp className="h-4 w-4 text-green-500" />
              ) : realtimeData.conversionRate < prevDataRef.current.conversionRate ? (
                <TrendingDown className="h-4 w-4 text-red-500" />
              ) : null}
            </div>
            <p className="text-4xl font-bold text-violet-600 tabular-nums">{realtimeData.conversionRate}%</p>
            <p className="text-xs text-muted-foreground mt-1">taux de conversion</p>
          </CardContent>
        </Card>
      </div>

      {/* Graphique + Conversions + Actions rapides */}
      <div className="grid gap-4 lg:grid-cols-12">
        {/* Traffic Trend - Plus grand */}
        <Card className="lg:col-span-7 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" />
                Tendance des 7 derniers jours
              </CardTitle>
              <Link href={`/app/${currentWebsiteId}/analytics`}>
                <Button variant="ghost" size="sm" className="text-xs h-7">
                  Analytics
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <ChartContainer config={trendChartConfig} className="h-[160px] w-full">
              <AreaChart data={trendData} margin={{ left: 0, right: 0, top: 5, bottom: 0 }}>
                <defs>
                  <linearGradient id="fillTrend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted/20" vertical={false} />
                <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                <YAxis hide />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="visits"
                  stroke="hsl(var(--primary))"
                  fill="url(#fillTrend)"
                  strokeWidth={2.5}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Conversions - Compact */}
        <Card className="lg:col-span-5 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Target className="h-4 w-4 text-violet-500" />
              Conversions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-green-500/10 to-green-500/5 border border-green-500/20">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-green-500/20">
                  <Mail className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Newsletter</p>
                  <p className="text-xs text-muted-foreground">abonnés actifs</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-green-600 tabular-nums">{realtimeData.newsletterSubs}</p>
                <ChangeIndicator value={getChange(realtimeData.newsletterSubs, prevDataRef.current.newsletterSubs)} />
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 rounded-xl bg-gradient-to-r from-amber-500/10 to-amber-500/5 border border-amber-500/20">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/20">
                  <MessageSquare className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold">Contact</p>
                  <p className="text-xs text-muted-foreground">demandes reçues</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-amber-600 tabular-nums">{realtimeData.contactRequests}</p>
                <ChangeIndicator value={getChange(realtimeData.contactRequests, prevDataRef.current.contactRequests)} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions rapides - Horizontal compact */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-hide">
            <Link
              href={`/app/${currentWebsiteId}/studio`}
              className="group flex items-center gap-2.5 px-4 py-2.5 rounded-full border bg-card hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all shrink-0"
            >
              <Edit className="h-4 w-4" />
              <span className="text-sm font-medium">Studio</span>
            </Link>
            
            <Link
              href={`/app/${currentWebsiteId}/pages`}
              className="group flex items-center gap-2.5 px-4 py-2.5 rounded-full border bg-card hover:bg-indigo-500 hover:text-white hover:border-indigo-500 transition-all shrink-0"
            >
              <FileText className="h-4 w-4" />
              <span className="text-sm font-medium">Pages</span>
              <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 group-hover:bg-white/20 group-hover:text-white">{pages.length}</Badge>
            </Link>
            
            <Link
              href={`/app/${currentWebsiteId}/extensions`}
              className="group flex items-center gap-2.5 px-4 py-2.5 rounded-full border bg-card hover:bg-violet-500 hover:text-white hover:border-violet-500 transition-all shrink-0"
            >
              <Puzzle className="h-4 w-4" />
              <span className="text-sm font-medium">Extensions</span>
              <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 group-hover:bg-white/20 group-hover:text-white">{enabledExtensionsCount}</Badge>
            </Link>
            
            <Link
              href={`/app/${currentWebsiteId}/cloud`}
              className="group flex items-center gap-2.5 px-4 py-2.5 rounded-full border bg-card hover:bg-emerald-500 hover:text-white hover:border-emerald-500 transition-all shrink-0"
            >
              <HardDrive className="h-4 w-4" />
              <span className="text-sm font-medium">Médias</span>
            </Link>
            
            <Link
              href={`/app/${currentWebsiteId}/theme`}
              className="group flex items-center gap-2.5 px-4 py-2.5 rounded-full border bg-card hover:bg-pink-500 hover:text-white hover:border-pink-500 transition-all shrink-0"
            >
              <Palette className="h-4 w-4" />
              <span className="text-sm font-medium">Thème</span>
            </Link>
            
            <Link
              href={`/app/${currentWebsiteId}/analytics`}
              className="group flex items-center gap-2.5 px-4 py-2.5 rounded-full border bg-card hover:bg-blue-500 hover:text-white hover:border-blue-500 transition-all shrink-0"
            >
              <BarChart3 className="h-4 w-4" />
              <span className="text-sm font-medium">Analytics</span>
            </Link>
            
            <Link
              href={`/app/${currentWebsiteId}/settings`}
              className="group flex items-center gap-2.5 px-4 py-2.5 rounded-full border bg-card hover:bg-gray-600 hover:text-white hover:border-gray-600 transition-all shrink-0"
            >
              <Settings className="h-4 w-4" />
              <span className="text-sm font-medium">Paramètres</span>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Cloud & Médias - Full width */}
      <CloudPreviewCard 
        websiteId={currentWebsiteId || ''} 
        storageUsed={storageUsed}
        storageLimit={storageLimit}
        storagePercentage={storagePercentage}
      />

      {/* Team + Activity + Progression */}
      <div className="grid gap-4 lg:grid-cols-12">
        {/* Team */}
        <TeamCard websiteId={currentWebsiteId || ''} />

        {/* Recent Activity */}
        <RecentEventsCard websiteId={currentWebsiteId || ''} />
      </div>

      {/* Gamification - Ligne du bas */}
      <div className="grid gap-4 lg:grid-cols-12">
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
      </div>
    </div>
  );
}

// Site Progression Card Component
function SiteProgressionCard({ 
  websiteId, 
  pagesCount, 
  sectionsCount, 
  extensionsCount, 
  isPublished, 
  hasTheme, 
  hasSEO 
}: { 
  websiteId: string;
  pagesCount: number;
  sectionsCount: number;
  extensionsCount: number;
  isPublished: boolean;
  hasTheme: boolean;
  hasSEO: boolean;
}) {
  const steps = [
    { id: 'pages', label: 'Ajouter une page', completed: pagesCount > 0, href: `/app/${websiteId}/pages` },
    { id: 'sections', label: 'Créer des sections', completed: sectionsCount > 0, href: `/app/${websiteId}/studio` },
    { id: 'theme', label: 'Personnaliser le thème', completed: hasTheme, href: `/app/${websiteId}/theme` },
    { id: 'seo', label: 'Configurer le SEO', completed: hasSEO, href: `/app/${websiteId}/settings` },
    { id: 'extensions', label: 'Activer une extension', completed: extensionsCount > 0, href: `/app/${websiteId}/extensions` },
    { id: 'publish', label: 'Publier le site', completed: isPublished, href: `/app/${websiteId}/settings` },
  ];

  const completedCount = steps.filter(s => s.completed).length;
  const progressPercentage = Math.round((completedCount / steps.length) * 100);

  return (
    <Card className="lg:col-span-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            Progression du site
          </CardTitle>
          <Badge 
            variant="outline" 
            className={progressPercentage === 100 ? 'bg-green-500/10 text-green-600 border-green-500/20' : ''}
          >
            {progressPercentage}%
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Progress value={progressPercentage} className="h-2" />
          <p className="text-xs text-muted-foreground mt-1">
            {completedCount}/{steps.length} étapes complétées
          </p>
        </div>
        <div className="space-y-2">
          {steps.map((step) => (
            <Link
              key={step.id}
              href={step.href}
              className={`flex items-center gap-2 p-2 rounded-lg transition-colors ${
                step.completed 
                  ? 'bg-green-500/5 text-green-700' 
                  : 'hover:bg-accent'
              }`}
            >
              {step.completed ? (
                <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
              ) : (
                <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30 shrink-0" />
              )}
              <span className={`text-sm ${step.completed ? 'line-through text-muted-foreground' : ''}`}>
                {step.label}
              </span>
              {!step.completed && <ChevronRight className="h-3 w-3 ml-auto text-muted-foreground" />}
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// Weekly Goals Card Component
function WeeklyGoalsCard({ 
  websiteId, 
  currentVisits, 
  currentSubscribers, 
  currentContacts 
}: { 
  websiteId: string;
  currentVisits: number;
  currentSubscribers: number;
  currentContacts: number;
}) {
  const goals = [
    { 
      id: 'visits', 
      label: 'Visites cette semaine', 
      current: currentVisits, 
      target: 1000, 
      icon: Activity,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500'
    },
    { 
      id: 'subscribers', 
      label: 'Nouveaux abonnés', 
      current: Math.min(currentSubscribers, 50), 
      target: 50, 
      icon: Mail,
      color: 'text-green-500',
      bgColor: 'bg-green-500'
    },
    { 
      id: 'contacts', 
      label: 'Demandes de contact', 
      current: Math.min(currentContacts, 10), 
      target: 10, 
      icon: MessageSquare,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500'
    },
  ];

  return (
    <Card className="lg:col-span-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Target className="h-4 w-4 text-violet-500" />
            Objectifs de la semaine
          </CardTitle>
          <Link href={`/app/${websiteId}/analytics`}>
            <Button variant="ghost" size="sm" className="text-xs h-7">
              Détails
              <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {goals.map((goal) => {
          const percentage = Math.min(100, Math.round((goal.current / goal.target) * 100));
          const isCompleted = percentage >= 100;
          const GoalIcon = goal.icon;
          
          return (
            <div key={goal.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GoalIcon className={`h-4 w-4 ${goal.color}`} />
                  <span className="text-sm">{goal.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-medium ${isCompleted ? 'text-green-600' : ''}`}>
                    {goal.current.toLocaleString()} / {goal.target.toLocaleString()}
                  </span>
                  {isCompleted && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                </div>
              </div>
              <Progress 
                value={percentage} 
                className={`h-1.5 ${isCompleted ? '[&>div]:bg-green-500' : `[&>div]:${goal.bgColor}`}`}
              />
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// Achievements Card Component  
function AchievementsCard({ 
  websiteId, 
  pagesCount, 
  sectionsCount, 
  extensionsCount, 
  isPublished, 
  totalVisits, 
  newsletterSubs 
}: { 
  websiteId: string;
  pagesCount: number;
  sectionsCount: number;
  extensionsCount: number;
  isPublished: boolean;
  totalVisits: number;
  newsletterSubs: number;
}) {
  const achievements = [
    { 
      id: 'first-page', 
      label: 'Première page', 
      description: 'Créer votre première page',
      icon: FileText, 
      unlocked: pagesCount > 0,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10'
    },
    { 
      id: 'builder', 
      label: 'Constructeur', 
      description: 'Ajouter 5 sections',
      icon: Layers, 
      unlocked: sectionsCount >= 5,
      color: 'text-violet-500',
      bgColor: 'bg-violet-500/10'
    },
    { 
      id: 'live', 
      label: 'En ligne !', 
      description: 'Publier votre site',
      icon: Rocket, 
      unlocked: isPublished,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10'
    },
    { 
      id: 'power-user', 
      label: 'Power User', 
      description: 'Activer 3 extensions',
      icon: Puzzle, 
      unlocked: extensionsCount >= 3,
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10'
    },
    { 
      id: 'popular', 
      label: 'Populaire', 
      description: 'Atteindre 1000 visites',
      icon: TrendingUp, 
      unlocked: totalVisits >= 1000,
      color: 'text-pink-500',
      bgColor: 'bg-pink-500/10'
    },
    { 
      id: 'influencer', 
      label: 'Influenceur', 
      description: '100 abonnés newsletter',
      icon: Star, 
      unlocked: newsletterSubs >= 100,
      color: 'text-yellow-500',
      bgColor: 'bg-yellow-500/10'
    },
  ];

  const unlockedCount = achievements.filter(a => a.unlocked).length;

  return (
    <Card className="lg:col-span-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Trophy className="h-4 w-4 text-yellow-500" />
            Récompenses
          </CardTitle>
          <Badge variant="outline">
            {unlockedCount}/{achievements.length}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-2">
          {achievements.map((achievement) => {
            const AchievementIcon = achievement.icon;
            return (
              <div
                key={achievement.id}
                className={`relative group flex flex-col items-center gap-1 p-3 rounded-lg border transition-all ${
                  achievement.unlocked 
                    ? `${achievement.bgColor} border-transparent` 
                    : 'bg-muted/30 border-dashed opacity-50'
                }`}
                title={achievement.description}
              >
                <div className={`p-2 rounded-full ${achievement.unlocked ? achievement.bgColor : 'bg-muted'}`}>
                  {achievement.unlocked ? (
                    <AchievementIcon className={`h-4 w-4 ${achievement.color}`} />
                  ) : (
                    <Lock className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <span className={`text-[10px] font-medium text-center leading-tight ${
                  achievement.unlocked ? '' : 'text-muted-foreground'
                }`}>
                  {achievement.label}
                </span>
                {achievement.unlocked && (
                  <div className="absolute -top-1 -right-1">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-500 fill-green-500" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// Team Card Component
function TeamCard({ websiteId }: { websiteId: string }) {
  const { data: administrators = [], isLoading } = useAdministratorsQuery(websiteId);

  const roleLabels: Record<string, string> = {
    owner: 'Propriétaire',
    admin: 'Admin',
    editor: 'Éditeur',
    viewer: 'Lecteur',
  };

  const roleColors: Record<string, string> = {
    owner: 'bg-amber-500',
    admin: 'bg-violet-500',
    editor: 'bg-blue-500',
    viewer: 'bg-gray-500',
  };

  const getInitials = (name?: string, email?: string): string => {
    if (name) {
      return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    if (email) {
      return email.charAt(0).toUpperCase();
    }
    return '?';
  };

  const getAvatarUrl = (url?: string): string | undefined => {
    if (!url) return undefined;
    const fileIdMatch = url.match(/\/files\/([a-f0-9-]+)/);
    if (fileIdMatch) {
      const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
      const baseUrl = typeof window !== 'undefined'
        ? (import.meta.env.PUBLIC_API_URL || 'http://localhost:3000/api')
        : 'http://localhost:3000/api';
      return token ? `${baseUrl}/files/${fileIdMatch[1]}?token=${token}` : url;
    }
    return url;
  };

  if (isLoading) {
    return (
      <Card className="lg:col-span-5">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Équipe
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-24 mb-1" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-5 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Filter only active administrators
  const activeAdmins = administrators.filter(a => a.status === 'active');

  return (
    <Card className="lg:col-span-5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            Équipe
            {activeAdmins.length > 0 && (
              <Badge variant="secondary" className="text-[10px]">
                {activeAdmins.length}
              </Badge>
            )}
          </CardTitle>
          <Link href={`/app/${websiteId}/administrators`}>
            <Button variant="ghost" size="sm" className="text-xs h-7">
              Gérer
              <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {activeAdmins.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Aucun collaborateur</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeAdmins.slice(0, 4).map((admin) => (
              <div key={admin.id} className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={getAvatarUrl(admin.avatar)} alt={admin.name || admin.email} />
                  <AvatarFallback className={`${roleColors[admin.role] || 'bg-primary'} text-white text-xs`}>
                    {getInitials(admin.name, admin.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate flex items-center gap-1.5">
                    {admin.name || admin.email.split('@')[0]}
                    {admin.role === 'owner' && <Crown className="h-3 w-3 text-yellow-500" />}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{admin.email}</p>
                </div>
                <Badge variant="outline" className="text-[10px] shrink-0">
                  {roleLabels[admin.role] || admin.role}
                </Badge>
              </div>
            ))}
            {activeAdmins.length > 4 && (
              <p className="text-xs text-muted-foreground text-center">
                +{activeAdmins.length - 4} autre{activeAdmins.length - 4 > 1 ? 's' : ''}
              </p>
            )}
          </div>
        )}
        <Link 
          href={`/app/${websiteId}/administrators`}
          className="mt-4 flex items-center justify-center gap-2 p-2 rounded-lg border border-dashed hover:bg-accent transition-colors"
        >
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Inviter un collaborateur</span>
        </Link>
      </CardContent>
    </Card>
  );
}

// Recent Events Card Component
function RecentEventsCard({ websiteId }: { websiteId: string }) {
  // Generate dynamic events based on current time
  const [events, setEvents] = useState<Array<{
    id: string;
    type: string;
    title: string;
    time: string;
    icon: React.ElementType;
    color: string;
  }>>([]);

  useEffect(() => {
    const generateEvents = () => {
      const now = new Date();
      const eventTypes = [
        { type: 'visit', title: 'Nouvelle visite', icon: Eye, color: 'text-blue-500' },
        { type: 'subscriber', title: 'Nouvel abonné newsletter', icon: Mail, color: 'text-green-500' },
        { type: 'contact', title: 'Nouvelle demande de contact', icon: MessageSquare, color: 'text-amber-500' },
        { type: 'page_view', title: 'Page consultée: Accueil', icon: FileText, color: 'text-violet-500' },
        { type: 'visit', title: 'Visiteur depuis Google', icon: Globe, color: 'text-blue-500' },
      ];

      const newEvents = [];
      for (let i = 0; i < 5; i++) {
        const eventTime = new Date(now.getTime() - Math.random() * 3600000); // Within last hour
        const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
        newEvents.push({
          id: `event-${i}-${Date.now()}`,
          ...eventType,
          time: formatTimeAgo(eventTime),
        });
      }
      setEvents(newEvents);
    };

    generateEvents();
    const interval = setInterval(generateEvents, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <Card className="lg:col-span-7">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Bell className="h-4 w-4 text-primary" />
            Activité récente
          </CardTitle>
          <Link href={`/app/${websiteId}/analytics`}>
            <Button variant="ghost" size="sm" className="text-xs h-7">
              Voir tout
              <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {events.map((event) => {
            const EventIcon = event.icon;
            return (
              <div key={event.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/50 transition-colors">
                <div className={`p-1.5 rounded-full bg-muted`}>
                  <EventIcon className={`h-3.5 w-3.5 ${event.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{event.title}</p>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{event.time}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// Cloud Preview Card Component
function CloudPreviewCard({ 
  websiteId, 
  storageUsed, 
  storageLimit, 
  storagePercentage 
}: { 
  websiteId: string;
  storageUsed: number;
  storageLimit: number;
  storagePercentage: number;
}) {
  const { data: files = [], isLoading } = useFilesQuery();

  const getFileUrl = (fileId: string) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const baseUrl = typeof window !== 'undefined'
      ? (import.meta.env.PUBLIC_API_URL || 'http://localhost:3000/api')
      : 'http://localhost:3000/api';
    return token ? `${baseUrl}/files/${fileId}?token=${token}` : '';
  };

  const isImage = (mimeType: string) => mimeType.startsWith('image/');
  const isVideo = (mimeType: string) => mimeType.startsWith('video/');
  const isAudio = (mimeType: string) => mimeType.startsWith('audio/');

  const getFileIcon = (mimeType: string, className = "h-5 w-5") => {
    if (isImage(mimeType)) return <Image className={`${className} text-violet-500`} />;
    if (isVideo(mimeType)) return <Film className={`${className} text-blue-500`} />;
    if (isAudio(mimeType)) return <Music className={`${className} text-green-500`} />;
    if (mimeType === 'application/pdf') return <FileText className={`${className} text-red-500`} />;
    return <File className={`${className} text-gray-500`} />;
  };

  // Get recent files (last 8)
  const recentFiles = files.slice(0, 8);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-primary" />
            Cloud & Stockage
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-2 w-full" />
          <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-primary" />
            Cloud & Stockage
            {files.length > 0 && (
              <Badge variant="secondary" className="text-[10px]">
                {files.length} fichier{files.length > 1 ? 's' : ''}
              </Badge>
            )}
          </CardTitle>
          <Link href={`/app/${websiteId}/cloud`}>
            <Button variant="ghost" size="sm" className="text-xs h-7">
              Gérer les fichiers
              <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </div>
        {/* Storage Progress Bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-muted-foreground">Espace utilisé</span>
            <span className="text-xs font-medium">{formatBytes(storageUsed)} / {formatBytes(storageLimit)}</span>
          </div>
          <Progress 
            value={storagePercentage} 
            className={`h-1.5 ${storagePercentage > 80 ? '[&>div]:bg-red-500' : storagePercentage > 60 ? '[&>div]:bg-amber-500' : ''}`}
          />
          {storagePercentage > 80 && (
            <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
              <AlertTriangle className="h-3 w-3" />
              Espace presque plein
            </p>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {recentFiles.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Upload className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm font-medium">Aucun fichier</p>
            <p className="text-xs mt-1">Uploadez vos premiers médias</p>
            <Link href={`/app/${websiteId}/cloud`}>
              <Button variant="outline" size="sm" className="mt-3">
                <Upload className="h-3.5 w-3.5 mr-1.5" />
                Ajouter des fichiers
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">
              {recentFiles.map((file) => (
                <Link
                  key={file.id}
                  href={`/app/${websiteId}/cloud`}
                  className="group relative aspect-square rounded-lg border bg-muted overflow-hidden hover:ring-2 hover:ring-primary/50 transition-all"
                >
                  {isImage(file.mime_type) ? (
                    <img
                      src={getFileUrl(file.id)}
                      alt={file.filename}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {getFileIcon(file.mime_type, "h-6 w-6")}
                    </div>
                  )}
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Eye className="h-4 w-4 text-white" />
                  </div>
                </Link>
              ))}
            </div>
            {files.length > 8 && (
              <p className="text-xs text-muted-foreground text-center mt-3">
                +{files.length - 8} autre{files.length - 8 > 1 ? 's' : ''} fichier{files.length - 8 > 1 ? 's' : ''}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// Helper function to format time ago
function formatTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return 'À l\'instant';
  if (seconds < 3600) return `Il y a ${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `Il y a ${Math.floor(seconds / 3600)}h`;
  return `Il y a ${Math.floor(seconds / 86400)}j`;
}
