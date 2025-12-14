"use client"

import { useEffect, useState } from 'react';
import { websitesAPI, authAPI, type Website, type UpdateWebsiteRequest } from '../lib/api';
import { useDashboardData, useCacheActions } from '../hooks/useCache';
import { formatBytes } from '../lib/utils/formatters';
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
} from "@/components/ui/chart";
import type { ChartConfig } from "@/components/ui/chart";
import { 
  Label,
  PolarGrid,
  PolarRadiusAxis,
  RadialBar,
  RadialBarChart,
} from "recharts";
import { 
  Globe, 
  Edit, 
  Upload, 
  ExternalLink, 
  Puzzle, 
  HardDrive,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  Clock,
  Sparkles,
  Rocket,
  Save,
  Github,
  Link2,
  Type,
  MessageSquare,
  AlertCircle,
  Loader2,
  Settings,
  LayoutDashboard,
  RefreshCw
} from "lucide-react";

export default function Dashboard() {
  // Use cached data
  const { website, quota, modules, isLoading, refetchAll } = useDashboardData();
  const { updateWebsiteCache } = useCacheActions();
  
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Form state for website editing
  const [title, setTitle] = useState('');
  const [tagline, setTagline] = useState('');
  const [githubUsername, setGithubUsername] = useState('');

  // Sync form state when website changes
  useEffect(() => {
    if (website) {
      setTitle(website.title || '');
      setTagline(website.tagline || '');
    }
  }, [website]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!website) return;

    setIsSaving(true);

    const savePromise = async () => {
      const data: UpdateWebsiteRequest = { title, tagline };
      const updatedWebsite = await websitesAPI.update(website.id, data);
      // Update cache immediately
      updateWebsiteCache(updatedWebsite);
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

  const enabledModulesCount = modules.filter(m => m.enabled).length;

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

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header with site info */}
      <div className="flex flex-col gap-3 sm:gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {website?.title || 'Mon Dashboard'}
            </h1>
            {website?.status === 'published' ? (
              <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-500/20">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                En ligne
              </Badge>
            ) : (
              <Badge variant="secondary">
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
            <Button onClick={handlePublish} disabled={isSaving} className="bg-green-600 hover:bg-green-700 w-full sm:w-auto">
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Rocket className="h-4 w-4 mr-2" />
              )}
              Publier
            </Button>
          )}
          {website && (
            <Button variant="outline" asChild className="w-full sm:w-auto">
              <a href={`/${website.slug}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Voir le site
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Tabs for Overview / Site Settings */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
        <TabsList className="grid w-full grid-cols-2 h-auto">
          <TabsTrigger value="overview" className="flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm py-2 sm:py-2.5">
            <LayoutDashboard className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline">Vue d'ensemble</span>
            <span className="xs:hidden">Accueil</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center justify-center gap-1.5 sm:gap-2 text-xs sm:text-sm py-2 sm:py-2.5">
            <Settings className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
            Mon Site
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 sm:space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
            {/* Site Status */}
            <Card className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Statut</CardTitle>
                <Globe className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  {website?.status === 'published' ? (
                    <>
                      <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-lg sm:text-2xl font-bold">Publié</span>
                    </>
                  ) : (
                    <>
                      <div className="h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full bg-amber-500" />
                      <span className="text-lg sm:text-2xl font-bold">Brouillon</span>
                    </>
                  )}
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 truncate">
                  {website?.slug ? `${website.slug}.asap.cool` : 'Configurez votre site'}
                </p>
              </CardContent>
              <div className="absolute right-0 bottom-0 opacity-5">
                <Globe className="h-16 w-16 sm:h-24 sm:w-24 -mr-4 sm:-mr-6 -mb-4 sm:-mb-6" />
              </div>
            </Card>

            {/* Storage */}
            <Card className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Stockage</CardTitle>
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
              <div className="absolute right-0 bottom-0 opacity-5">
                <HardDrive className="h-16 w-16 sm:h-24 sm:w-24 -mr-4 sm:-mr-6 -mb-4 sm:-mb-6" />
              </div>
            </Card>

            {/* Modules */}
            <Card className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Modules</CardTitle>
                <Puzzle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                <div className="text-lg sm:text-2xl font-bold">{enabledModulesCount}</div>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                  sur {modules.length} disponibles
                </p>
                <div className="flex gap-0.5 sm:gap-1 mt-1.5 sm:mt-2">
                  {modules.slice(0, 4).map((m) => (
                    <div
                      key={m.module_id}
                      className={`h-1.5 w-1.5 sm:h-2 sm:w-2 rounded-full ${m.enabled ? 'bg-primary' : 'bg-muted'}`}
                      title={m.module_slug}
                    />
                  ))}
                  {modules.length > 4 && (
                    <span className="text-[10px] sm:text-xs text-muted-foreground">+{modules.length - 4}</span>
                  )}
                </div>
              </CardContent>
              <div className="absolute right-0 bottom-0 opacity-5">
                <Puzzle className="h-16 w-16 sm:h-24 sm:w-24 -mr-4 sm:-mr-6 -mb-4 sm:-mb-6" />
              </div>
            </Card>

            {/* Files */}
            <Card className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-1 sm:pb-2 px-3 sm:px-6 pt-3 sm:pt-6">
                <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground">Fichiers</CardTitle>
                <Upload className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="px-3 sm:px-6 pb-3 sm:pb-6">
                <div className="text-lg sm:text-2xl font-bold">
                  {quota ? formatBytes(quota.total_size_used) : '0 B'}
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                  uploadés
                </p>
                <div className="flex items-center gap-1 mt-1.5 sm:mt-2 text-[10px] sm:text-xs text-green-600">
                  <TrendingUp className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  <span>OK</span>
                </div>
              </CardContent>
              <div className="absolute right-0 bottom-0 opacity-5">
                <Upload className="h-16 w-16 sm:h-24 sm:w-24 -mr-4 sm:-mr-6 -mb-4 sm:-mb-6" />
              </div>
            </Card>
          </div>

          {/* Main Content Grid */}
          <div className="grid gap-3 sm:gap-4 lg:grid-cols-7">
            {/* Storage Chart */}
            <Card className="lg:col-span-3">
              <CardHeader className="px-4 sm:px-6">
                <CardTitle className="text-sm sm:text-base">Utilisation du stockage</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Espace disque utilisé
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-center pb-0 px-4 sm:px-6">
                <ChartContainer
                  config={storageChartConfig}
                  className="mx-auto aspect-square max-h-[160px] sm:max-h-[200px]"
                >
                  <RadialBarChart
                    data={storageChartData}
                    startAngle={90}
                    endAngle={90 - (storagePercentage / 100) * 360}
                    innerRadius={60}
                    outerRadius={85}
                  >
                    <PolarGrid
                      gridType="circle"
                      radialLines={false}
                      stroke="none"
                      className="first:fill-muted last:fill-background"
                      polarRadius={[66, 54]}
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
                                  className="fill-foreground text-3xl font-bold"
                                >
                                  {storagePercentage.toFixed(0)}%
                                </tspan>
                                <tspan
                                  x={viewBox.cx}
                                  y={(viewBox.cy || 0) + 20}
                                  className="fill-muted-foreground text-sm"
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
              <CardFooter className="flex-col gap-2 text-sm pt-4">
                <div className="flex items-center justify-between w-full">
                  <span className="text-muted-foreground">Utilisé</span>
                  <span className="font-medium">{quota ? formatBytes(quota.total_size_used) : '0 B'}</span>
                </div>
                <div className="flex items-center justify-between w-full">
                  <span className="text-muted-foreground">Disponible</span>
                  <span className="font-medium">
                    {quota ? formatBytes(quota.quota_limit - quota.total_size_used) : '50 MB'}
                  </span>
                </div>
              </CardFooter>
            </Card>

            {/* Quick Actions */}
            <Card className="lg:col-span-4">
              <CardHeader className="px-4 sm:px-6">
                <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
                  <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  Actions rapides
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Accédez rapidement aux fonctionnalités
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2 sm:gap-3 px-4 sm:px-6">
                <button
                  onClick={() => setActiveTab('settings')}
                  className="group flex items-center justify-between p-3 sm:p-4 rounded-lg border bg-card hover:bg-accent/50 transition-all duration-200 hover:border-primary/50 text-left w-full"
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <Edit className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm sm:text-base">Éditer mon site</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground hidden sm:block">
                        Modifier le contenu et le design
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </button>

                <a
                  href="/app/modules"
                  className="group flex items-center justify-between p-3 sm:p-4 rounded-lg border bg-card hover:bg-accent/50 transition-all duration-200 hover:border-primary/50"
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 group-hover:bg-violet-500 group-hover:text-white transition-colors">
                      <Puzzle className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm sm:text-base">Gérer les modules</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {enabledModulesCount} module{enabledModulesCount > 1 ? 's' : ''} actif{enabledModulesCount > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground group-hover:text-violet-600 transition-colors" />
                </a>

                <a
                  href="/app/cloud"
                  className="group flex items-center justify-between p-3 sm:p-4 rounded-lg border bg-card hover:bg-accent/50 transition-all duration-200 hover:border-primary/50"
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                      <Upload className="h-4 w-4 sm:h-5 sm:w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-sm sm:text-base">Mes fichiers</h3>
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        {quota ? formatBytes(quota.total_size_used) : '0 B'} utilisés
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground group-hover:text-emerald-600 transition-colors" />
                </a>

                {website && (
                  <a
                    href={`/${website.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center justify-between p-3 sm:p-4 rounded-lg border bg-card hover:bg-accent/50 transition-all duration-200 hover:border-primary/50"
                  >
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                        <ExternalLink className="h-4 w-4 sm:h-5 sm:w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-sm sm:text-base">Voir mon site</h3>
                        <p className="text-xs sm:text-sm text-muted-foreground truncate max-w-[150px] sm:max-w-none">
                          {website.slug}.asap.cool
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground group-hover:text-amber-600 transition-colors" />
                  </a>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Site Settings Tab */}
        <TabsContent value="settings" className="space-y-4 sm:space-y-6">
          <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
            {/* Website Info Form */}
            <Card>
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

                  <div className="flex justify-end">
                    <Button type="submit" disabled={isSaving}>
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4 mr-2" />
                      )}
                      Enregistrer
                    </Button>
                  </div>
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
    </div>
  );
}
