"use client"

import React, { useEffect, useState, useMemo } from 'react';
import { websitesAPI, authAPI, type UpdateWebsiteRequest, type Website } from '@/lib/api';
import { queryKeys } from '@/lib/query';
import { useQueryClient } from '@tanstack/react-query';
import { useWebsiteContext } from '@/contexts/WebsiteContext';
import { Link } from '@/components/app-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label as FormLabel } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  Github,
  Link2,
  Type,
  MessageSquare,
  Loader2,
  Settings,
  LayoutDashboard,
  Layers,
  FileText,
  Eye,
  Zap,
  Target,
  Users,
  Activity,
  Mail,
  Star,
  Trophy,
  Share2,
  BarChart3,
  PieChart as PieChartIcon,
  AlertTriangle,
  Info,
} from "lucide-react";
import { FormActions } from "@/components/ui/form-actions";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { SectionsTab } from "@/components/sections/SectionsTab";
import { PresetOnboardingRouter } from "@/components/onboarding/presets";

export default function Dashboard() {
  // Use website context for synchronized data
  const { currentWebsite: website, currentWebsiteId, quota, extensions, isLoading, websites, pages, elements, refetch: refetchAll } = useWebsiteContext();
  const queryClient = useQueryClient();
  
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Form state for website editing
  const [title, setTitle] = useState('');
  const [tagline, setTagline] = useState('');
  const [githubUsername, setGithubUsername] = useState('');
  
  // Track initial values for dirty state
  const [initialValues, setInitialValues] = useState({ title: '', tagline: '' });

  // Sync form state when website changes
  useEffect(() => {
    if (website) {
      setTitle(website.title || '');
      setTagline(website.tagline || '');
      setInitialValues({ title: website.title || '', tagline: website.tagline || '' });
    }
  }, [website]);

  // Check if form is dirty
  const isFormDirty = title !== initialValues.title || tagline !== initialValues.tagline;

  // Cancel changes handler
  const handleCancel = () => {
    setTitle(initialValues.title);
    setTagline(initialValues.tagline);
  };

  // Keyboard shortcuts
  const shortcuts = useMemo(() => [
    {
      key: 's',
      ctrl: true,
      action: () => {
        if (isFormDirty && !isSaving) {
          handleSave();
        }
      },
      description: 'Sauvegarder',
      enabled: isFormDirty,
    },
    {
      key: 'Escape',
      action: () => {
        if (isFormDirty) {
          handleCancel();
          toast.info('Modifications annulées');
        }
      },
      description: 'Annuler les modifications',
      enabled: isFormDirty,
    },
    {
      key: 'r',
      ctrl: true,
      shift: true,
      action: () => {
        refetchAll();
        toast.info('Actualisation des données...');
      },
      description: 'Actualiser',
    },
  ], [isFormDirty, isSaving, initialValues]);

  useKeyboardShortcuts(shortcuts);

  const handleSave = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!website) return;

    setIsSaving(true);

    const savePromise = async () => {
      const data: UpdateWebsiteRequest = { title, tagline };
      const updatedWebsite = await websitesAPI.update(website.id, data);
      // Update cache immediately via React Query
      queryClient.setQueryData<Website[]>(queryKeys.websites.all, (old) => {
        if (!old) return [updatedWebsite];
        return old.map(w => w.id === updatedWebsite.id ? updatedWebsite : w);
      });
      // Update initial values after save
      setInitialValues({ title, tagline });
    };

    toast.promise(savePromise(), {
      loading: 'Sauvegarde en cours...',
      success: 'Site mis à jour avec succès !',
      error: 'Erreur lors de la sauvegarde',
    });

    try {
      await savePromise();
    } catch (error) {
      console.error('Failed to save website:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!website) return;

    setIsSaving(true);

    const publishPromise = async () => {
      await websitesAPI.publish(website.id);
      // Refetch to get updated status
      await refetchAll();
    };

    toast.promise(publishPromise(), {
      loading: 'Publication en cours...',
      success: 'Site publié ! Votre site est maintenant en ligne.',
      error: 'Erreur lors de la publication',
    });

    try {
      await publishPromise();
    } catch (error) {
      console.error('Failed to publish website:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleGitHubConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!website || !githubUsername.trim()) return;

    setIsSaving(true);

    const connectPromise = async () => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        await authAPI.updateGitHubIntegration(payload.sub, {
          github_username: githubUsername.trim(),
        });
      }
    };

    toast.promise(connectPromise(), {
      loading: 'Connexion à GitHub...',
      success: 'GitHub connecté ! Vos projets seront synchronisés.',
      error: 'Erreur lors de la connexion GitHub',
    });

    try {
      await connectPromise();
    } catch (error) {
      console.error('Failed to connect GitHub:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const enabledExtensionsCount = extensions.filter(e => e.enabled).length;
  const storagePercentage = quota?.usage_percentage || 0;

  // GAMIFIED Analytics data - comprehensive KPIs like YouTube Studio / Google Analytics / Shopify
  const analyticsData = useMemo(() => {
    // Linear Congruential Generator (LCG) for stable pseudo-random numbers
    const LCG_MULTIPLIER = 9301;
    const LCG_INCREMENT = 49297;
    const LCG_MODULUS = 233280;
    
    const seedFromId = website?.id 
      ? (website.id.charCodeAt(0) || 0) + (website.id.length > 1 ? website.id.charCodeAt(1) : 0)
      : 42;
    
    const random = (min: number, max: number, offset = 0) => 
      Math.floor((((seedFromId + offset) * LCG_MULTIPLIER + LCG_INCREMENT) % LCG_MODULUS) / LCG_MODULUS * (max - min)) + min;

    // 30-day trend data for main chart
    const last30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (29 - i));
      const dayNum = date.getDate();
      return {
        date: `${dayNum}`,
        fullDate: date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
        visits: random(50, 200, i * 3) + Math.floor(i * 2.5), // Upward trend
        pageViews: random(100, 400, i * 5) + Math.floor(i * 4),
        uniqueVisitors: random(30, 150, i * 7) + Math.floor(i * 1.8),
      };
    });

    // 7-day sparkline data
    const last7Days = last30Days.slice(-7);

    // Real-time visitors (simulated)
    const realtimeVisitors = random(3, 25, 100);

    // Main KPIs with changes
    const kpis = {
      // Traffic metrics
      totalVisits: {
        value: random(2500, 8500, 1),
        change: random(-8, 35, 2),
        previousValue: random(2000, 7000, 3),
      },
      uniqueVisitors: {
        value: random(1500, 5000, 4),
        change: random(-5, 28, 5),
        previousValue: random(1200, 4500, 6),
      },
      pageViews: {
        value: random(8000, 25000, 7),
        change: random(-3, 42, 8),
        previousValue: random(7000, 22000, 9),
      },
      avgSessionDuration: {
        value: `${random(2, 6, 10)}:${String(random(10, 59, 11)).padStart(2, '0')}`,
        seconds: random(120, 360, 12),
        change: random(-12, 25, 13),
      },
      bounceRate: {
        value: random(25, 55, 14),
        change: random(-15, 10, 15), // Negative is good for bounce rate
      },
      pagesPerSession: {
        value: (random(20, 45, 16) / 10).toFixed(1),
        change: random(-8, 22, 17),
      },

      // Conversion metrics
      conversionRate: {
        value: (random(15, 65, 18) / 10).toFixed(1),
        change: random(-5, 35, 19),
      },
      goalCompletions: {
        value: random(50, 350, 20),
        change: random(-10, 45, 21),
      },
      
      // Engagement metrics
      newsletterSubscribers: {
        value: random(150, 800, 22),
        change: random(5, 45, 23), // Always positive growth
        newThisWeek: random(8, 45, 24),
      },
      contactRequests: {
        value: random(15, 85, 25),
        change: random(-5, 55, 26),
        pending: random(2, 12, 27),
      },
      socialShares: {
        value: random(80, 450, 28),
        change: random(-8, 65, 29),
      },
      
      // Content metrics
      topPageViews: random(500, 2500, 30),
      avgTimeOnPage: `${random(1, 4, 31)}:${String(random(15, 55, 32)).padStart(2, '0')}`,
      scrollDepth: random(55, 85, 33),
      
      // CTA Performance
      ctaClicks: {
        value: random(120, 650, 34),
        change: random(-5, 40, 35),
        rate: (random(25, 85, 36) / 10).toFixed(1),
      },
    };

    // Traffic sources breakdown
    const trafficSources = [
      { name: 'Direct', value: random(30, 45, 40), color: '#6366f1', visitors: random(500, 2000, 41), change: random(-5, 25, 42) },
      { name: 'Réseaux sociaux', value: random(20, 35, 43), color: '#8b5cf6', visitors: random(300, 1500, 44), change: random(5, 45, 45) },
      { name: 'Recherche organique', value: random(15, 30, 46), color: '#22c55e', visitors: random(250, 1200, 47), change: random(-3, 30, 48) },
      { name: 'Référents', value: random(5, 15, 49), color: '#f59e0b', visitors: random(100, 600, 50), change: random(-10, 35, 51) },
      { name: 'Email', value: random(3, 12, 52), color: '#ec4899', visitors: random(50, 400, 53), change: random(0, 50, 54) },
    ];

    // Device breakdown
    const devices = [
      { name: 'Mobile', value: random(55, 70, 55), color: '#6366f1' },
      { name: 'Desktop', value: random(25, 40, 56), color: '#8b5cf6' },
      { name: 'Tablet', value: random(3, 10, 57), color: '#22c55e' },
    ];

    // Top pages
    const topPages = [
      { path: '/', name: 'Accueil', views: random(1500, 5000, 58), change: random(-5, 35, 59) },
      { path: '/projets', name: 'Projets', views: random(800, 2500, 60), change: random(5, 45, 61) },
      { path: '/about', name: 'À propos', views: random(400, 1500, 62), change: random(-8, 28, 63) },
      { path: '/contact', name: 'Contact', views: random(200, 800, 64), change: random(10, 55, 65) },
    ];

    // Goals/Achievements
    const achievements = [
      { id: 'first100', name: '100 visiteurs', description: 'Atteindre 100 visiteurs', progress: Math.min(100, (kpis.totalVisits.value / 100) * 100), unlocked: kpis.totalVisits.value >= 100, icon: Users },
      { id: 'first500', name: '500 visiteurs', description: 'Atteindre 500 visiteurs', progress: Math.min(100, (kpis.totalVisits.value / 500) * 100), unlocked: kpis.totalVisits.value >= 500, icon: Users },
      { id: 'newsletter50', name: '50 abonnés', description: '50 abonnés newsletter', progress: Math.min(100, (kpis.newsletterSubscribers.value / 50) * 100), unlocked: kpis.newsletterSubscribers.value >= 50, icon: Mail },
      { id: 'contact10', name: '10 contacts', description: '10 demandes de contact', progress: Math.min(100, (kpis.contactRequests.value / 10) * 100), unlocked: kpis.contactRequests.value >= 10, icon: MessageSquare },
      { id: 'shares100', name: '100 partages', description: '100 partages sociaux', progress: Math.min(100, (kpis.socialShares.value / 100) * 100), unlocked: kpis.socialShares.value >= 100, icon: Share2 },
      { id: 'conversion5', name: '5% conversion', description: 'Taux de conversion 5%', progress: Math.min(100, (parseFloat(kpis.conversionRate.value) / 5) * 100), unlocked: parseFloat(kpis.conversionRate.value) >= 5, icon: Target },
    ];

    // Weekly goals
    const weeklyGoals = {
      visits: { target: 1000, current: random(600, 1200, 70), label: 'Visites cette semaine' },
      subscribers: { target: 20, current: kpis.newsletterSubscribers.newThisWeek, label: 'Nouveaux abonnés' },
      contacts: { target: 5, current: kpis.contactRequests.pending + random(1, 5, 71), label: 'Demandes de contact' },
    };

    // Site health score (gamified)
    const healthScore = Math.min(100, Math.round(
      (website?.status === 'published' ? 25 : 0) +
      (website?.title ? 15 : 0) +
      (enabledExtensionsCount > 0 ? 15 : 0) +
      (pages.length > 1 ? 15 : 0) +
      (elements.length > 3 ? 15 : 0) +
      (storagePercentage > 0 ? 15 : 0)
    ));

    return {
      last30Days,
      last7Days,
      realtimeVisitors,
      kpis,
      trafficSources,
      devices,
      topPages,
      achievements,
      weeklyGoals,
      healthScore,
    };
  }, [website?.id, website?.status, website?.title, enabledExtensionsCount, pages.length, elements.length, storagePercentage]);

  // Chart config for main analytics
  const analyticsChartConfig = {
    visits: {
      label: "Visites",
      color: "hsl(var(--primary))",
    },
    pageViews: {
      label: "Pages vues",
      color: "hsl(221.2 83.2% 53.3%)",
    },
    uniqueVisitors: {
      label: "Visiteurs uniques",
      color: "hsl(142.1 76.2% 36.3%)",
    },
  } satisfies ChartConfig;

  // Helper component for KPI change indicator
  const ChangeIndicator = ({ value, inverted = false }: { value: number; inverted?: boolean }) => {
    const isPositive = inverted ? value < 0 : value > 0;
    const isNegative = inverted ? value > 0 : value < 0;
    return (
      <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${
        isPositive ? 'text-green-600' : isNegative ? 'text-red-500' : 'text-muted-foreground'
      }`}>
        {value > 0 ? (
          <ArrowUpRight className="h-3 w-3" />
        ) : value < 0 ? (
          <ArrowDownRight className="h-3 w-3" />
        ) : null}
        {value > 0 ? '+' : ''}{value}%
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        {/* Header Skeleton */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <Skeleton className="h-9 w-48" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-5 w-40" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>

        {/* Stats Cards Skeleton */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent className="space-y-2">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs Skeleton */}
        <div className="space-y-4">
          <div className="flex gap-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-9 w-24 rounded-md" />
            ))}
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-64 w-full rounded-lg" />
              </CardContent>
            </Card>
            <Card className="col-span-3">
              <CardHeader>
                <Skeleton className="h-5 w-32" />
              </CardHeader>
              <CardContent className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-lg" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-8 w-8 rounded" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Show onboarding flow for users without any websites
  if (!isLoading && websites.length === 0) {
    return (
      <PresetOnboardingRouter 
        onComplete={(_newWebsiteId: string) => {
          // Refetch websites to get the new one
          refetchAll();
        }} 
      />
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in">
      {/* Header with site info */}
      <div className="flex flex-col gap-3 sm:gap-4 animate-fade-in-down">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {website?.title || 'Mon Dashboard'}
            </h1>
            {website?.status === 'published' ? (
              <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-500/20 transition-all duration-200">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                En ligne
              </Badge>
            ) : (
              <Badge variant="secondary" className="transition-all duration-200">
                <Clock className="w-3 h-3 mr-1" />
                Brouillon
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground text-sm sm:text-base">
            {website?.slug ? (
              <span className="font-mono text-xs sm:text-sm">{website.slug}.asap.cool</span>
            ) : (
              'Configurez votre site pour commencer'
            )}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {website?.status === 'draft' && (
            <Button onClick={handlePublish} disabled={isSaving} className="bg-green-600 hover:bg-green-700 w-full sm:w-auto group">
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Rocket className="h-4 w-4 mr-2 transition-transform group-hover:-translate-y-0.5 group-hover:rotate-12" />
              )}
              Publier
            </Button>
          )}
          {website && (
            <>
              <Button variant="default" asChild className="w-full sm:w-auto group">
                <Link href={`/app/${currentWebsiteId}/studio`}>
                  <Edit className="h-4 w-4 mr-2" />
                  Ouvrir le Studio
                </Link>
              </Button>
              <Button variant="outline" asChild className="w-full sm:w-auto group">
                <a href={`/${website.slug}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  Voir le site
                </a>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Tabs for Overview / Sections / Site Settings */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
        <TabsList className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger value="overview" className="flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm py-2 sm:py-2.5 transition-all duration-200 data-[state=active]:scale-[1.02]">
            <LayoutDashboard className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Vue d'ensemble</span>
            <span className="sm:hidden">Accueil</span>
          </TabsTrigger>
          <TabsTrigger value="sections" className="flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm py-2 sm:py-2.5 transition-all duration-200 data-[state=active]:scale-[1.02]">
            <Layers className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Sections
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm py-2 sm:py-2.5 transition-all duration-200 data-[state=active]:scale-[1.02]">
            <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Paramètres</span>
            <span className="sm:hidden">Config</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab - GAMIFIED Analytics Dashboard */}
        <TabsContent value="overview" className="space-y-4 sm:space-y-6 animate-fade-in">
          
          {/* Real-time Banner & Site Health */}
          <div className="grid gap-3 sm:gap-4 lg:grid-cols-4">
            {/* Real-time Visitors */}
            <Card className="bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-transparent border-green-500/20 animate-fade-in-up" style={{ animationDelay: '0.02s', animationFillMode: 'both' }}>
              <CardContent className="py-3 px-4 sm:py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
                      <div className="absolute inset-0 h-3 w-3 rounded-full bg-green-500 animate-ping opacity-75" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">En ce moment</p>
                      <p className="text-xl sm:text-2xl font-bold text-green-600">{analyticsData.realtimeVisitors}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">visiteurs</p>
                    <p className="text-xs text-green-600 font-medium">en ligne</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Site Health Score */}
            <Card className="lg:col-span-2 animate-fade-in-up" style={{ animationDelay: '0.04s', animationFillMode: 'both' }}>
              <CardContent className="py-3 px-4 sm:py-4 sm:px-6">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg ${
                      analyticsData.healthScore >= 80 ? 'bg-green-500/10 text-green-600' :
                      analyticsData.healthScore >= 50 ? 'bg-amber-500/10 text-amber-600' :
                      'bg-red-500/10 text-red-500'
                    }`}>
                      {analyticsData.healthScore >= 80 ? <CheckCircle2 className="h-4 w-4" /> :
                       analyticsData.healthScore >= 50 ? <AlertTriangle className="h-4 w-4" /> :
                       <Info className="h-4 w-4" />}
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Santé du site</p>
                      <p className="text-sm font-semibold">{analyticsData.healthScore}% optimisé</p>
                    </div>
                  </div>
                  <div className={`text-2xl font-bold ${
                    analyticsData.healthScore >= 80 ? 'text-green-600' :
                    analyticsData.healthScore >= 50 ? 'text-amber-600' :
                    'text-red-500'
                  }`}>
                    {analyticsData.healthScore >= 80 ? 'A' :
                     analyticsData.healthScore >= 60 ? 'B' :
                     analyticsData.healthScore >= 40 ? 'C' : 'D'}
                  </div>
                </div>
                <Progress 
                  value={analyticsData.healthScore} 
                  className={`h-2 ${
                    analyticsData.healthScore >= 80 ? '[&>div]:bg-green-500' :
                    analyticsData.healthScore >= 50 ? '[&>div]:bg-amber-500' :
                    '[&>div]:bg-red-500'
                  }`}
                />
              </CardContent>
            </Card>

            {/* Quick Status */}
            <Card className="animate-fade-in-up" style={{ animationDelay: '0.06s', animationFillMode: 'both' }}>
              <CardContent className="py-3 px-4 sm:py-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">Statut</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <div className={`h-2 w-2 rounded-full ${website?.status === 'published' ? 'bg-green-500' : 'bg-amber-500'}`} />
                      <span className="text-sm font-medium">{website?.status === 'published' ? 'En ligne' : 'Brouillon'}</span>
                    </div>
                  </div>
                  {website?.status === 'published' ? (
                    <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">
                      <Globe className="h-3 w-3 mr-1" />
                      Public
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                      <Eye className="h-3 w-3 mr-1" />
                      Privé
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main KPI Cards - 6 columns */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-6">
            {/* Total Visits */}
            <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 animate-fade-in-up" style={{ animationDelay: '0.08s', animationFillMode: 'both' }}>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between mb-1">
                  <Activity className="h-4 w-4 text-primary" />
                  <ChangeIndicator value={analyticsData.kpis.totalVisits.change} />
                </div>
                <p className="text-lg sm:text-xl font-bold">{analyticsData.kpis.totalVisits.value.toLocaleString()}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Visites (30j)</p>
              </CardContent>
            </Card>

            {/* Unique Visitors */}
            <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 animate-fade-in-up" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between mb-1">
                  <Users className="h-4 w-4 text-violet-500" />
                  <ChangeIndicator value={analyticsData.kpis.uniqueVisitors.change} />
                </div>
                <p className="text-lg sm:text-xl font-bold">{analyticsData.kpis.uniqueVisitors.value.toLocaleString()}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Visiteurs uniques</p>
              </CardContent>
            </Card>

            {/* Page Views */}
            <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 animate-fade-in-up" style={{ animationDelay: '0.12s', animationFillMode: 'both' }}>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between mb-1">
                  <Eye className="h-4 w-4 text-blue-500" />
                  <ChangeIndicator value={analyticsData.kpis.pageViews.change} />
                </div>
                <p className="text-lg sm:text-xl font-bold">{analyticsData.kpis.pageViews.value.toLocaleString()}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Pages vues</p>
              </CardContent>
            </Card>

            {/* Conversion Rate */}
            <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 animate-fade-in-up border-green-500/20 bg-gradient-to-br from-green-500/5 to-transparent" style={{ animationDelay: '0.14s', animationFillMode: 'both' }}>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between mb-1">
                  <Target className="h-4 w-4 text-green-500" />
                  <ChangeIndicator value={analyticsData.kpis.conversionRate.change} />
                </div>
                <p className="text-lg sm:text-xl font-bold text-green-600">{analyticsData.kpis.conversionRate.value}%</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Taux conversion</p>
              </CardContent>
            </Card>

            {/* Newsletter Subscribers */}
            <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 animate-fade-in-up" style={{ animationDelay: '0.16s', animationFillMode: 'both' }}>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between mb-1">
                  <Mail className="h-4 w-4 text-pink-500" />
                  <ChangeIndicator value={analyticsData.kpis.newsletterSubscribers.change} />
                </div>
                <p className="text-lg sm:text-xl font-bold">{analyticsData.kpis.newsletterSubscribers.value}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Abonnés newsletter</p>
                <Badge variant="secondary" className="mt-1 text-[9px] px-1.5 py-0 bg-green-500/10 text-green-600">
                  +{analyticsData.kpis.newsletterSubscribers.newThisWeek} cette semaine
                </Badge>
              </CardContent>
            </Card>

            {/* Contact Requests */}
            <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 animate-fade-in-up" style={{ animationDelay: '0.18s', animationFillMode: 'both' }}>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between mb-1">
                  <MessageSquare className="h-4 w-4 text-amber-500" />
                  <ChangeIndicator value={analyticsData.kpis.contactRequests.change} />
                </div>
                <p className="text-lg sm:text-xl font-bold">{analyticsData.kpis.contactRequests.value}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground">Demandes contact</p>
                {analyticsData.kpis.contactRequests.pending > 0 && (
                  <Badge variant="destructive" className="mt-1 text-[9px] px-1.5 py-0">
                    {analyticsData.kpis.contactRequests.pending} en attente
                  </Badge>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Charts Row */}
          <div className="grid gap-3 sm:gap-4 lg:grid-cols-12">
            {/* Main Traffic Chart */}
            <Card className="lg:col-span-8 animate-fade-in-up" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
              <CardHeader className="pb-2 px-4 sm:px-6">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                      Trafic des 30 derniers jours
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm">
                      Visites et pages vues quotidiennes
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-4 text-xs">
                    <div className="flex items-center gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                      <span className="text-muted-foreground">Visites</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="h-2.5 w-2.5 rounded-full bg-blue-500" />
                      <span className="text-muted-foreground">Pages vues</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-2 sm:px-6 pb-4">
                <ChartContainer config={analyticsChartConfig} className="h-[200px] sm:h-[250px] w-full">
                  <AreaChart data={analyticsData.last30Days} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="fillVisitsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="fillPageViewsGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      tickLine={false} 
                      axisLine={false} 
                      tick={{ fontSize: 10 }}
                      interval="preserveStartEnd"
                    />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10 }} width={35} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area
                      type="monotone"
                      dataKey="pageViews"
                      stroke="#3b82f6"
                      fill="url(#fillPageViewsGrad)"
                      strokeWidth={2}
                    />
                    <Area
                      type="monotone"
                      dataKey="visits"
                      stroke="hsl(var(--primary))"
                      fill="url(#fillVisitsGrad)"
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Traffic Sources */}
            <Card className="lg:col-span-4 animate-fade-in-up" style={{ animationDelay: '0.22s', animationFillMode: 'both' }}>
              <CardHeader className="pb-2 px-4 sm:px-6">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                  <PieChartIcon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  Sources de trafic
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 pb-4">
                <div className="space-y-3">
                  {analyticsData.trafficSources.map((source) => (
                    <div key={source.name} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: source.color }} />
                          <span className="text-xs sm:text-sm">{source.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-xs sm:text-sm">{source.value}%</span>
                          <ChangeIndicator value={source.change} />
                        </div>
                      </div>
                      <Progress value={source.value} className="h-1.5" style={{ '--progress-color': source.color } as React.CSSProperties} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Engagement & Goals Row */}
          <div className="grid gap-3 sm:gap-4 lg:grid-cols-12">
            {/* Weekly Goals Progress */}
            <Card className="lg:col-span-4 animate-fade-in-up" style={{ animationDelay: '0.24s', animationFillMode: 'both' }}>
              <CardHeader className="pb-2 px-4 sm:px-6">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                  <Target className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  Objectifs de la semaine
                </CardTitle>
                <CardDescription className="text-xs">Progression vers vos objectifs</CardDescription>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 space-y-4">
                {Object.entries(analyticsData.weeklyGoals).map(([key, goal]) => {
                  const progress = Math.min(100, (goal.current / goal.target) * 100);
                  const isComplete = progress >= 100;
                  return (
                    <div key={key} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-xs sm:text-sm">{goal.label}</span>
                        <div className="flex items-center gap-1.5">
                          <span className={`font-medium ${isComplete ? 'text-green-600' : ''}`}>
                            {goal.current}/{goal.target}
                          </span>
                          {isComplete && <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />}
                        </div>
                      </div>
                      <Progress 
                        value={progress} 
                        className={`h-2 ${isComplete ? '[&>div]:bg-green-500' : ''}`}
                      />
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Achievements */}
            <Card className="lg:col-span-4 animate-fade-in-up" style={{ animationDelay: '0.26s', animationFillMode: 'both' }}>
              <CardHeader className="pb-2 px-4 sm:px-6">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                  <Trophy className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500" />
                  Succès
                </CardTitle>
                <CardDescription className="text-xs">
                  {analyticsData.achievements.filter(a => a.unlocked).length}/{analyticsData.achievements.length} débloqués
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4 sm:px-6">
                <div className="grid grid-cols-3 gap-2">
                  {analyticsData.achievements.map((achievement) => {
                    const IconComp = achievement.icon;
                    return (
                      <div
                        key={achievement.id}
                        className={`relative p-2 rounded-lg border text-center transition-all ${
                          achievement.unlocked 
                            ? 'bg-gradient-to-br from-amber-500/10 to-yellow-500/5 border-amber-500/30' 
                            : 'bg-muted/30 border-border opacity-60'
                        }`}
                        title={`${achievement.name}: ${achievement.description}`}
                      >
                        <div className={`mx-auto mb-1 p-1.5 rounded-full w-fit ${
                          achievement.unlocked ? 'bg-amber-500/20 text-amber-600' : 'bg-muted text-muted-foreground'
                        }`}>
                          {achievement.unlocked ? (
                            <Star className="h-3.5 w-3.5 fill-current" />
                          ) : (
                            <IconComp className="h-3.5 w-3.5" />
                          )}
                        </div>
                        <p className="text-[9px] sm:text-[10px] font-medium truncate">{achievement.name}</p>
                        {!achievement.unlocked && (
                          <div className="mt-1">
                            <Progress value={achievement.progress} className="h-1" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Top Pages */}
            <Card className="lg:col-span-4 animate-fade-in-up" style={{ animationDelay: '0.28s', animationFillMode: 'both' }}>
              <CardHeader className="pb-2 px-4 sm:px-6">
                <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  Pages populaires
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 sm:px-6">
                <div className="space-y-2">
                  {analyticsData.topPages.map((page, index) => (
                    <div key={page.path} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-bold w-5 h-5 rounded flex items-center justify-center ${
                          index === 0 ? 'bg-amber-500/20 text-amber-600' :
                          index === 1 ? 'bg-gray-300/30 text-gray-600' :
                          index === 2 ? 'bg-orange-500/20 text-orange-600' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {index + 1}
                        </span>
                        <span className="text-xs sm:text-sm truncate max-w-[100px]">{page.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-medium">{page.views.toLocaleString()}</span>
                        <ChangeIndicator value={page.change} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Additional Metrics Row */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
            {/* Bounce Rate */}
            <Card className="animate-fade-in-up" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Taux de rebond</span>
                  <ChangeIndicator value={analyticsData.kpis.bounceRate.change} inverted />
                </div>
                <p className="text-lg sm:text-xl font-bold">{analyticsData.kpis.bounceRate.value}%</p>
                <p className={`text-[10px] ${analyticsData.kpis.bounceRate.value < 40 ? 'text-green-600' : analyticsData.kpis.bounceRate.value < 60 ? 'text-amber-600' : 'text-red-500'}`}>
                  {analyticsData.kpis.bounceRate.value < 40 ? '✓ Excellent' : analyticsData.kpis.bounceRate.value < 60 ? '⚠ Moyen' : '✗ À améliorer'}
                </p>
              </CardContent>
            </Card>

            {/* Session Duration */}
            <Card className="animate-fade-in-up" style={{ animationDelay: '0.32s', animationFillMode: 'both' }}>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Durée moyenne</span>
                  <ChangeIndicator value={analyticsData.kpis.avgSessionDuration.change} />
                </div>
                <p className="text-lg sm:text-xl font-bold">{analyticsData.kpis.avgSessionDuration.value}</p>
                <p className="text-[10px] text-muted-foreground">minutes par session</p>
              </CardContent>
            </Card>

            {/* Pages per Session */}
            <Card className="animate-fade-in-up" style={{ animationDelay: '0.34s', animationFillMode: 'both' }}>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Pages/session</span>
                  <ChangeIndicator value={analyticsData.kpis.pagesPerSession.change} />
                </div>
                <p className="text-lg sm:text-xl font-bold">{analyticsData.kpis.pagesPerSession.value}</p>
                <p className="text-[10px] text-muted-foreground">pages consultées</p>
              </CardContent>
            </Card>

            {/* Social Shares */}
            <Card className="animate-fade-in-up" style={{ animationDelay: '0.36s', animationFillMode: 'both' }}>
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-muted-foreground">Partages sociaux</span>
                  <ChangeIndicator value={analyticsData.kpis.socialShares.change} />
                </div>
                <p className="text-lg sm:text-xl font-bold">{analyticsData.kpis.socialShares.value}</p>
                <p className="text-[10px] text-muted-foreground">sur les réseaux</p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card className="animate-fade-in-up" style={{ animationDelay: '0.38s', animationFillMode: 'both' }}>
            <CardHeader className="pb-2 px-4 sm:px-6">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500" />
                Actions rapides
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 sm:px-6 pb-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <Link
                  href={`/app/${currentWebsiteId}/studio`}
                  className="group flex flex-col items-center gap-1.5 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-all hover:border-primary/50"
                >
                  <div className="p-2 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Edit className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-medium">Studio</span>
                </Link>
                <Link
                  href={`/app/${currentWebsiteId}/extensions`}
                  className="group flex flex-col items-center gap-1.5 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-all hover:border-violet-500/50"
                >
                  <div className="p-2 rounded-lg bg-violet-500/10 text-violet-600 group-hover:bg-violet-500 group-hover:text-white transition-colors">
                    <Puzzle className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-medium">Extensions</span>
                </Link>
                <Link
                  href={`/app/${currentWebsiteId}/cloud`}
                  className="group flex flex-col items-center gap-1.5 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-all hover:border-emerald-500/50"
                >
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                    <Upload className="h-4 w-4" />
                  </div>
                  <span className="text-xs font-medium">Médias</span>
                </Link>
                {website && (
                  <a
                    href={`/${website.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex flex-col items-center gap-1.5 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-all hover:border-amber-500/50"
                  >
                    <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                      <ExternalLink className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-medium">Voir le site</span>
                  </a>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sections Tab */}
        <TabsContent value="sections" className="animate-fade-in">
          <SectionsTab websiteId={website?.id ?? null} />
        </TabsContent>

        {/* Site Settings Tab */}
        <TabsContent value="settings" className="space-y-4 sm:space-y-6 animate-fade-in">
          <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
            {/* Website Info Form */}
            <Card className="animate-fade-in-up" style={{ animationDelay: '0.05s', animationFillMode: 'both' }}>
              <CardHeader className="px-4 sm:px-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Globe className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  Informations générales
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Les informations de base de votre site
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4 sm:px-6">
                <form onSubmit={handleSave} className="space-y-4 sm:space-y-6">
                  <div className="space-y-1.5 sm:space-y-2">
                    <FormLabel htmlFor="slug" className="flex items-center gap-2 text-sm">
                      <Link2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                      URL du site
                    </FormLabel>
                    <div className="flex items-center">
                      <span className="flex h-9 sm:h-10 items-center rounded-l-md border border-r-0 bg-muted px-2 sm:px-3 text-xs sm:text-sm text-muted-foreground">
                        asap.cool/
                      </span>
                      <Input
                        id="slug"
                        value={website?.slug || ''}
                        disabled
                        className="rounded-l-none bg-muted h-9 sm:h-10 text-sm"
                      />
                    </div>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">L'URL ne peut pas être modifiée</p>
                  </div>

                  <div className="space-y-1.5 sm:space-y-2">
                    <FormLabel htmlFor="title" className="flex items-center gap-2 text-sm">
                      <Type className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                      Titre
                    </FormLabel>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Votre nom ou titre"
                      className="h-9 sm:h-10 text-sm"
                    />
                  </div>

                  <div className="space-y-1.5 sm:space-y-2">
                    <FormLabel htmlFor="tagline" className="flex items-center gap-2 text-sm">
                      <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                      Tagline
                    </FormLabel>
                    <Input
                      id="tagline"
                      value={tagline}
                      onChange={(e) => setTagline(e.target.value)}
                      placeholder="Développeur | Designer | ..."
                      className="h-9 sm:h-10 text-sm"
                    />
                  </div>

                  <Separator />
                </form>
              </CardContent>
            </Card>

            {/* GitHub Integration */}
            <Card>
              <CardHeader className="px-4 sm:px-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Github className="h-4 w-4 sm:h-5 sm:w-5" />
                  Intégration GitHub
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Connectez GitHub pour afficher vos projets
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4 sm:px-6">
                <form onSubmit={handleGitHubConnect} className="space-y-3 sm:space-y-4">
                  <div className="space-y-1.5 sm:space-y-2">
                    <FormLabel htmlFor="github" className="text-sm">Nom d'utilisateur GitHub</FormLabel>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Input
                        id="github"
                        value={githubUsername}
                        onChange={(e) => setGithubUsername(e.target.value)}
                        placeholder="votre-username"
                        className="flex-1 h-9 sm:h-10 text-sm"
                      />
                      <Button 
                        type="submit" 
                        variant="secondary"
                        disabled={isSaving || !githubUsername.trim()}
                        className="h-9 sm:h-10 w-full sm:w-auto"
                      >
                        {isSaving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Connecter'
                        )}
                      </Button>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Preview Card */}
          <Card className="bg-gradient-to-br from-primary/5 via-violet-500/5 to-primary/5 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ExternalLink className="h-5 w-5 text-primary" />
                Prévisualiser votre site
              </CardTitle>
              <CardDescription>
                Voyez à quoi ressemble votre site pour les visiteurs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground mb-2">
                    Votre site est accessible à l'adresse :
                  </p>
                  <code className="text-sm bg-muted px-2 py-1 rounded font-mono">
                    {website?.slug}.asap.cool
                  </code>
                </div>
                {website && (
                  <Button asChild>
                    <a href={`/${website.slug}`} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Ouvrir
                    </a>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      
      {/* Sticky form actions */}
      <FormActions
        isDirty={isFormDirty}
        isSaving={isSaving}
        onSave={() => handleSave()}
        onCancel={handleCancel}
      />
    </div>
  );
}
