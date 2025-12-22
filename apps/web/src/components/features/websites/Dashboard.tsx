"use client"

import React, { useEffect, useState, useMemo } from 'react';
import { websitesAPI, authAPI, type UpdateWebsiteRequest, type Website } from '@/lib/api';
import { queryKeys } from '@/lib/query';
import { useQueryClient } from '@tanstack/react-query';
import { useWebsiteContext } from '@/contexts/WebsiteContext';
import { Link } from '@/components/app-router';
import { formatBytes, formatDate } from '@/lib/utils/formatters';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
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
  Label,
  PolarGrid,
  PolarRadiusAxis,
  RadialBar,
  RadialBarChart,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
} from "recharts";
import { 
  Globe, 
  Edit, 
  Upload, 
  ExternalLink, 
  Puzzle, 
  HardDrive,
  ArrowRight,
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
  Palette,
  Zap,
  Target,
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

  // Calculate site completion/activation score
  const activationChecklist = useMemo(() => {
    const items = [
      {
        id: 'published',
        label: 'Site publié',
        description: 'Publiez votre site pour le rendre accessible',
        completed: website?.status === 'published',
        href: null, // Handled by publish button
        icon: Globe,
      },
      {
        id: 'title',
        label: 'Titre configuré',
        description: 'Définissez un titre pour votre site',
        completed: !!website?.title && website.title.length > 0,
        href: null, // Handled in settings tab
        icon: Type,
      },
      {
        id: 'extensions',
        label: 'Extensions activées',
        description: 'Activez au moins une extension pour enrichir votre site',
        completed: enabledExtensionsCount > 0,
        href: `/app/${currentWebsiteId}/extensions`,
        icon: Puzzle,
      },
      {
        id: 'files',
        label: 'Médias uploadés',
        description: 'Ajoutez des images ou fichiers à votre site',
        completed: (quota?.total_size_used || 0) > 0,
        href: `/app/${currentWebsiteId}/cloud`,
        icon: Upload,
      },
    ];
    
    const completedCount = items.filter(i => i.completed).length;
    const score = Math.round((completedCount / items.length) * 100);
    
    return { items, completedCount, total: items.length, score };
  }, [website, enabledExtensionsCount, quota, currentWebsiteId]);

  // Site resources data for bar chart
  const siteResourcesData = useMemo(() => [
    {
      name: 'Pages',
      value: pages.length,
      fill: 'hsl(var(--primary))',
    },
    {
      name: 'Sections',
      value: elements.length,
      fill: 'hsl(221.2 83.2% 53.3%)',
    },
    {
      name: 'Extensions',
      value: enabledExtensionsCount,
      fill: 'hsl(262.1 83.3% 57.8%)',
    },
  ], [pages.length, elements.length, enabledExtensionsCount]);

  const resourcesChartConfig = {
    value: {
      label: "Nombre",
    },
    Pages: {
      label: "Pages",
      color: "hsl(var(--primary))",
    },
    Sections: {
      label: "Sections",
      color: "hsl(221.2 83.2% 53.3%)",
    },
    Extensions: {
      label: "Extensions",
      color: "hsl(262.1 83.3% 57.8%)",
    },
  } satisfies ChartConfig;

  // Chart configuration for storage
  const storageChartConfig = {
    used: {
      label: "Utilisé",
      color: "hsl(var(--primary))",
    },
  } satisfies ChartConfig;

  const storagePercentage = quota?.usage_percentage || 0;
  const storageChartData = [
    { 
      name: "storage", 
      value: storagePercentage, 
      fill: storagePercentage > 80 ? "hsl(var(--destructive))" : "hsl(var(--primary))" 
    }
  ];

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

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 sm:space-y-6 animate-fade-in">
          {/* Site Completion Banner - Only shown if not fully completed */}
          {activationChecklist.score < 100 && (
            <Card className="bg-gradient-to-r from-primary/5 via-violet-500/5 to-primary/5 border-primary/20 animate-fade-in-up" style={{ animationDelay: '0.02s', animationFillMode: 'both' }}>
              <CardContent className="py-4 px-4 sm:px-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-primary/10">
                      <Target className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm sm:text-base">Complétez votre site</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {activationChecklist.completedCount}/{activationChecklist.total} étapes • {activationChecklist.score}% terminé
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <Progress value={activationChecklist.score} className="flex-1 sm:w-32 h-2" />
                    <span className="text-xs font-medium whitespace-nowrap">{activationChecklist.score}%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Clickable Stats Cards */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {/* Site Status - Clickable to view site */}
            <Link
              href={website?.status === 'published' ? `/${website.slug}` : `#`}
              className="block"
              target={website?.status === 'published' ? '_blank' : undefined}
              onClick={(e) => {
                if (website?.status !== 'published') {
                  e.preventDefault();
                  toast.info('Publiez votre site pour le voir en ligne');
                }
              }}
            >
              <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 animate-fade-in-up cursor-pointer h-full" style={{ animationDelay: '0.05s', animationFillMode: 'both' }}>
                <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                  <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Statut</CardTitle>
                  <Globe className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground transition-transform group-hover:rotate-12" />
                </CardHeader>
                <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    {website?.status === 'published' ? (
                      <>
                        <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-lg sm:text-2xl font-bold">En ligne</span>
                      </>
                    ) : (
                      <>
                        <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-amber-500 animate-pulse" />
                        <span className="text-lg sm:text-2xl font-bold">Brouillon</span>
                      </>
                    )}
                  </div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 truncate">
                    {website?.slug ? `${website.slug}.asap.cool` : 'Configurez votre site'}
                  </p>
                  <div className="flex items-center gap-1 mt-1.5 sm:mt-2 text-[10px] sm:text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    <Eye className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                    <span>{website?.status === 'published' ? 'Voir le site' : 'Publier pour voir'}</span>
                  </div>
                </CardContent>
                <div className="absolute right-0 bottom-0 opacity-5 transition-transform duration-300 group-hover:scale-110">
                  <Globe className="h-16 w-16 sm:h-24 sm:w-24 -mr-4 sm:-mr-6 -mb-4 sm:-mb-6" />
                </div>
              </Card>
            </Link>

            {/* Pages Card - Clickable */}
            <Link href={`/app/${currentWebsiteId}/pages`} className="block">
              <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 animate-fade-in-up cursor-pointer h-full" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
                <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                  <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Pages</CardTitle>
                  <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                  <div className="text-lg sm:text-2xl font-bold">{pages.length}</div>
                  {(() => {
                    const visibleCount = pages.filter(p => p.visible).length;
                    return (
                      <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                        {visibleCount} visible{visibleCount > 1 ? 's' : ''}
                      </p>
                    );
                  })()}
                  <div className="flex items-center gap-1 mt-1.5 sm:mt-2 text-[10px] sm:text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                    <ArrowRight className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                    <span>Gérer les pages</span>
                  </div>
                </CardContent>
                <div className="absolute right-0 bottom-0 opacity-5 transition-transform duration-300 group-hover:scale-110">
                  <FileText className="h-16 w-16 sm:h-24 sm:w-24 -mr-4 sm:-mr-6 -mb-4 sm:-mb-6" />
                </div>
              </Card>
            </Link>

            {/* Extensions - Clickable */}
            <Link href={`/app/${currentWebsiteId}/extensions`} className="block">
              <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 animate-fade-in-up cursor-pointer h-full" style={{ animationDelay: '0.15s', animationFillMode: 'both' }}>
                <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                  <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Extensions</CardTitle>
                  <Puzzle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground transition-transform group-hover:rotate-12" />
                </CardHeader>
                <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                  <div className="text-lg sm:text-2xl font-bold">{enabledExtensionsCount}</div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                    {enabledExtensionsCount > 1 ? 'activées' : 'activée'}
                  </p>
                  <div className="flex gap-0.5 sm:gap-1 mt-1.5 sm:mt-2">
                    {extensions.slice(0, 4).map((e, index) => (
                      <div
                        key={e.extension_id}
                        className={`h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full transition-all duration-300 ${e.enabled ? 'bg-primary scale-100' : 'bg-muted scale-90'}`}
                        style={{ animationDelay: `${index * 0.05}s` }}
                        title={e.extension_slug}
                      />
                    ))}
                    {extensions.length > 4 && (
                      <span className="text-[10px] sm:text-xs text-muted-foreground">+{extensions.length - 4}</span>
                    )}
                  </div>
                </CardContent>
                <div className="absolute right-0 bottom-0 opacity-5 transition-transform duration-300 group-hover:scale-110">
                  <Puzzle className="h-16 w-16 sm:h-24 sm:w-24 -mr-4 sm:-mr-6 -mb-4 sm:-mb-6" />
                </div>
              </Card>
            </Link>

            {/* Cloud/Files - Clickable */}
            <Link href={`/app/${currentWebsiteId}/cloud`} className="block">
              <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300 animate-fade-in-up cursor-pointer h-full" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
                <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                  <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Médias</CardTitle>
                  <HardDrive className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                  <div className="text-lg sm:text-2xl font-bold">
                    {quota ? formatBytes(quota.total_size_used) : '0 B'}
                  </div>
                  <div className="flex items-center gap-1.5 sm:gap-2 mt-1.5 sm:mt-2">
                    <Progress 
                      value={storagePercentage} 
                      className="h-1.5 sm:h-2 flex-1"
                    />
                    <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">
                      {storagePercentage.toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 truncate">
                    sur {quota ? formatBytes(quota.quota_limit) : '50 MB'}
                  </p>
                </CardContent>
                <div className="absolute right-0 bottom-0 opacity-5 transition-transform duration-300 group-hover:scale-110">
                  <HardDrive className="h-16 w-16 sm:h-24 sm:w-24 -mr-4 sm:-mr-6 -mb-4 sm:-mb-6" />
                </div>
              </Card>
            </Link>
          </div>

          {/* Main Content Grid - 3 columns */}
          <div className="grid gap-3 sm:gap-4 lg:grid-cols-12">
            {/* Site Completion Checklist */}
            <Card className="lg:col-span-4 animate-fade-in-up" style={{ animationDelay: '0.25s', animationFillMode: 'both' }}>
              <CardHeader className="px-4 sm:px-6">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                  <Target className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  Configuration du site
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Étapes pour un site complet
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4 sm:px-6 space-y-3">
                {activationChecklist.items.map((item, index) => {
                  const IconComponent = item.icon;
                  return (
                    <div
                      key={item.id}
                      className={`flex items-start gap-3 p-2.5 sm:p-3 rounded-lg border transition-all duration-200 ${
                        item.completed 
                          ? 'bg-green-500/5 border-green-500/20' 
                          : 'bg-muted/50 border-border hover:border-primary/50 hover:bg-accent/50'
                      }`}
                      style={{ animationDelay: `${(index + 1) * 0.05}s` }}
                    >
                      <div className={`flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full ${
                        item.completed 
                          ? 'bg-green-500/20 text-green-600' 
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {item.completed ? (
                          <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        ) : (
                          <IconComponent className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-xs sm:text-sm font-medium ${item.completed ? 'text-green-600' : ''}`}>
                            {item.label}
                          </p>
                          {!item.completed && item.href && (
                            <Link
                              href={item.href}
                              className="text-[10px] sm:text-xs text-primary hover:underline whitespace-nowrap"
                            >
                              Configurer →
                            </Link>
                          )}
                        </div>
                        <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5 line-clamp-1">
                          {item.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Site Resources Chart */}
            <Card className="lg:col-span-4 animate-fade-in-up" style={{ animationDelay: '0.3s', animationFillMode: 'both' }}>
              <CardHeader className="px-4 sm:px-6">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                  <Layers className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  Ressources du site
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Aperçu de votre contenu
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4 sm:px-6">
                <ChartContainer
                  config={resourcesChartConfig}
                  className="mx-auto h-[180px] sm:h-[200px]"
                >
                  <BarChart
                    data={siteResourcesData}
                    layout="vertical"
                    margin={{ left: 0, right: 20 }}
                  >
                    <YAxis
                      dataKey="name"
                      type="category"
                      tickLine={false}
                      axisLine={false}
                      tickMargin={10}
                      width={70}
                      tick={{ fontSize: 11 }}
                    />
                    <XAxis type="number" hide />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent hideLabel />}
                    />
                    <Bar
                      dataKey="value"
                      radius={[0, 4, 4, 0]}
                      barSize={24}
                    >
                      {siteResourcesData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ChartContainer>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  {siteResourcesData.map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <div 
                        className="h-2 w-2 rounded-full" 
                        style={{ backgroundColor: item.fill }}
                      />
                      <span className="text-muted-foreground">{item.name}:</span>
                      <span className="font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="lg:col-span-4 animate-fade-in-up" style={{ animationDelay: '0.35s', animationFillMode: 'both' }}>
              <CardHeader className="px-4 sm:px-6">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                  <Zap className="h-4 w-4 sm:h-5 sm:w-5 text-amber-500" />
                  Actions rapides
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Accès direct aux fonctionnalités
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2 px-4 sm:px-6">
                <Link
                  href={`/app/${currentWebsiteId}/studio`}
                  className="group flex items-center justify-between p-2.5 sm:p-3 rounded-lg border bg-card hover:bg-accent/50 transition-all duration-200 hover:border-primary/50 hover:shadow-sm active:scale-[0.99]"
                >
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-200">
                      <Edit className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </div>
                    <span className="font-medium text-xs sm:text-sm">Ouvrir le Studio</span>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all duration-200" />
                </Link>

                <Link
                  href={`/app/${currentWebsiteId}/theme`}
                  className="group flex items-center justify-between p-2.5 sm:p-3 rounded-lg border bg-card hover:bg-accent/50 transition-all duration-200 hover:border-primary/50 hover:shadow-sm active:scale-[0.99]"
                >
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 group-hover:bg-violet-500 group-hover:text-white transition-all duration-200">
                      <Palette className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </div>
                    <span className="font-medium text-xs sm:text-sm">Personnaliser le thème</span>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground group-hover:text-violet-600 group-hover:translate-x-0.5 transition-all duration-200" />
                </Link>

                <Link
                  href={`/app/${currentWebsiteId}/cloud`}
                  className="group flex items-center justify-between p-2.5 sm:p-3 rounded-lg border bg-card hover:bg-accent/50 transition-all duration-200 hover:border-primary/50 hover:shadow-sm active:scale-[0.99]"
                >
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-all duration-200">
                      <Upload className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    </div>
                    <span className="font-medium text-xs sm:text-sm">Uploader des médias</span>
                  </div>
                  <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground group-hover:text-emerald-600 group-hover:translate-x-0.5 transition-all duration-200" />
                </Link>

                {website && (
                  <a
                    href={`/${website.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center justify-between p-2.5 sm:p-3 rounded-lg border bg-card hover:bg-accent/50 transition-all duration-200 hover:border-primary/50 hover:shadow-sm active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-2.5 sm:gap-3">
                      <div className="flex h-7 w-7 sm:h-8 sm:w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-all duration-200">
                        <ExternalLink className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </div>
                      <span className="font-medium text-xs sm:text-sm">Voir mon site</span>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground group-hover:text-amber-600 group-hover:translate-x-0.5 transition-all duration-200" />
                  </a>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Bottom Row - Storage Chart */}
          <div className="grid gap-3 sm:gap-4 lg:grid-cols-12">
            {/* Storage Usage */}
            <Card className="lg:col-span-5 animate-fade-in-up" style={{ animationDelay: '0.4s', animationFillMode: 'both' }}>
              <CardHeader className="px-4 sm:px-6">
                <CardTitle className="text-sm sm:text-base">Utilisation du stockage</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Espace disque utilisé
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-center pb-0 px-4 sm:px-6">
                <ChartContainer
                  config={storageChartConfig}
                  className="mx-auto aspect-square max-h-[140px] sm:max-h-[160px]"
                >
                  <RadialBarChart
                    data={storageChartData}
                    startAngle={90}
                    endAngle={90 - (storagePercentage / 100) * 360}
                    innerRadius={50}
                    outerRadius={70}
                  >
                    <PolarGrid
                      gridType="circle"
                      radialLines={false}
                      stroke="none"
                      className="first:fill-muted last:fill-background"
                      polarRadius={[55, 45]}
                    />
                    <RadialBar 
                      dataKey="value" 
                      background 
                      cornerRadius={10}
                      fill={storageChartData[0].fill}
                    />
                    <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
                      <Label
                        content={({ viewBox }) => {
                          if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                            return (
                              <text
                                x={viewBox.cx}
                                y={viewBox.cy}
                                textAnchor="middle"
                                dominantBaseline="middle"
                              >
                                <tspan
                                  x={viewBox.cx}
                                  y={viewBox.cy}
                                  className="fill-foreground text-2xl font-bold"
                                >
                                  {storagePercentage.toFixed(0)}%
                                </tspan>
                                <tspan
                                  x={viewBox.cx}
                                  y={(viewBox.cy || 0) + 16}
                                  className="fill-muted-foreground text-xs"
                                >
                                  utilisé
                                </tspan>
                              </text>
                            )
                          }
                        }}
                      />
                    </PolarRadiusAxis>
                  </RadialBarChart>
                </ChartContainer>
              </CardContent>
              <CardFooter className="flex-col gap-2 text-sm pt-4 px-4 sm:px-6">
                <div className="flex items-center justify-between w-full text-xs sm:text-sm">
                  <span className="text-muted-foreground">Utilisé</span>
                  <span className="font-medium">{quota ? formatBytes(quota.total_size_used) : '0 B'}</span>
                </div>
                <div className="flex items-center justify-between w-full text-xs sm:text-sm">
                  <span className="text-muted-foreground">Disponible</span>
                  <span className="font-medium">
                    {quota ? formatBytes(quota.quota_limit - quota.total_size_used) : '50 MB'}
                  </span>
                </div>
              </CardFooter>
            </Card>

            {/* Site Info Summary */}
            <Card className="lg:col-span-7 animate-fade-in-up" style={{ animationDelay: '0.45s', animationFillMode: 'both' }}>
              <CardHeader className="px-4 sm:px-6">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                  <Globe className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  Informations du site
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Détails et configuration actuelle
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4 sm:px-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                        <Link2 className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">URL du site</p>
                        <p className="text-sm font-medium truncate">
                          {website?.slug ? `${website.slug}.asap.cool` : '—'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                        <Type className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">Titre</p>
                        <p className="text-sm font-medium truncate">
                          {website?.title || '—'}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                        <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">Tagline</p>
                        <p className="text-sm font-medium truncate">
                          {website?.tagline || '—'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">Dernière modification</p>
                        <p className="text-sm font-medium">
                          {website?.updated_at ? formatDate(new Date(website.updated_at)) : '—'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <Separator className="my-4" />
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button variant="outline" size="sm" asChild className="flex-1">
                    <Link href={`/app/${currentWebsiteId}/settings`}>
                      <Settings className="h-3.5 w-3.5 mr-1.5" />
                      Paramètres
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild className="flex-1">
                    <Link href={`/app/${currentWebsiteId}/studio`}>
                      <Edit className="h-3.5 w-3.5 mr-1.5" />
                      Modifier le contenu
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
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
