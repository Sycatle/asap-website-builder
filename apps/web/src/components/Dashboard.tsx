"use client"

import { useEffect, useState } from 'react';
import { websitesAPI, filesAPI, modulesAPI, authAPI, type Website, type QuotaUsage, type WebsiteModule, type UpdateWebsiteRequest } from '../lib/api';
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
  LayoutDashboard
} from "lucide-react";

export default function Dashboard() {
  const [website, setWebsite] = useState<Website | null>(null);
  const [quota, setQuota] = useState<QuotaUsage | null>(null);
  const [modules, setModules] = useState<WebsiteModule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Form state for website editing
  const [title, setTitle] = useState('');
  const [tagline, setTagline] = useState('');
  const [githubUsername, setGithubUsername] = useState('');

  useEffect(() => {
    const loadData = async () => {
      try {
        // Load websites and quota in parallel
        const [websites, quotaData] = await Promise.all([
          websitesAPI.list(),
          filesAPI.getQuota(),
        ]);
        
        setQuota(quotaData);
        
        if (websites.length > 0) {
          const w = websites[0];
          setWebsite(w);
          setTitle(w.title || '');
          setTagline(w.tagline || '');
          
          // Load modules for this website
          try {
            const modulesData = await modulesAPI.listForWebsite(w.id);
            setModules(modulesData);
          } catch (error) {
            console.error('Failed to load website modules:', error);
            setModules([]);
          }
        }
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!website) return;

    setIsSaving(true);

    const savePromise = async () => {
      const data: UpdateWebsiteRequest = { title, tagline };
      await websitesAPI.update(website.id, data);
      const websites = await websitesAPI.list();
      if (websites.length > 0) {
        setWebsite(websites[0]);
      }
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
      const websites = await websitesAPI.list();
      if (websites.length > 0) {
        setWebsite(websites[0]);
      }
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
    <div className="space-y-6">
      {/* Header with site info */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">
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
          <p className="text-muted-foreground">
            {website?.slug ? (
              <span className="font-mono text-sm">{website.slug}.asap.cool</span>
            ) : (
              'Configurez votre site pour commencer'
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {website?.status === 'draft' && (
            <Button onClick={handlePublish} disabled={isSaving} className="bg-green-600 hover:bg-green-700">
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Rocket className="h-4 w-4 mr-2" />
              )}
              Publier
            </Button>
          )}
          {website && (
            <Button variant="outline" asChild>
              <a href={`/${website.slug}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Voir le site
              </a>
            </Button>
          )}
        </div>
      </div>

      {/* Tabs for Overview / Site Settings */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <LayoutDashboard className="h-4 w-4" />
            Vue d'ensemble
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Mon Site
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Site Status */}
            <Card className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Statut du site</CardTitle>
                <Globe className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  {website?.status === 'published' ? (
                    <>
                      <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-2xl font-bold">Publié</span>
                    </>
                  ) : (
                    <>
                      <div className="h-2 w-2 rounded-full bg-amber-500" />
                      <span className="text-2xl font-bold">Brouillon</span>
                    </>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {website?.slug ? `${website.slug}.asap.cool` : 'Configurez votre site'}
                </p>
              </CardContent>
              <div className="absolute right-0 bottom-0 opacity-5">
                <Globe className="h-24 w-24 -mr-6 -mb-6" />
              </div>
            </Card>

            {/* Storage */}
            <Card className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Stockage</CardTitle>
                <HardDrive className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {quota ? formatBytes(quota.total_size_used) : '0 B'}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <Progress 
                    value={storagePercentage} 
                    className="h-2 flex-1"
                  />
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {storagePercentage.toFixed(0)}%
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  sur {quota ? formatBytes(quota.quota_limit) : '50 MB'} disponibles
                </p>
              </CardContent>
              <div className="absolute right-0 bottom-0 opacity-5">
                <HardDrive className="h-24 w-24 -mr-6 -mb-6" />
              </div>
            </Card>

            {/* Modules */}
            <Card className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Modules actifs</CardTitle>
                <Puzzle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{enabledModulesCount}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  sur {modules.length} modules disponibles
                </p>
                <div className="flex gap-1 mt-2">
                  {modules.slice(0, 5).map((m) => (
                    <div
                      key={m.module_id}
                      className={`h-2 w-2 rounded-full ${m.enabled ? 'bg-primary' : 'bg-muted'}`}
                      title={m.module_slug}
                    />
                  ))}
                  {modules.length > 5 && (
                    <span className="text-xs text-muted-foreground">+{modules.length - 5}</span>
                  )}
                </div>
              </CardContent>
              <div className="absolute right-0 bottom-0 opacity-5">
                <Puzzle className="h-24 w-24 -mr-6 -mb-6" />
              </div>
            </Card>

            {/* Files */}
            <Card className="relative overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Fichiers</CardTitle>
                <Upload className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {quota ? formatBytes(quota.total_size_used) : '0 B'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  de fichiers uploadés
                </p>
                <div className="flex items-center gap-1 mt-2 text-xs text-green-600">
                  <TrendingUp className="h-3 w-3" />
                  <span>Prêt pour plus</span>
                </div>
              </CardContent>
              <div className="absolute right-0 bottom-0 opacity-5">
                <Upload className="h-24 w-24 -mr-6 -mb-6" />
              </div>
            </Card>
          </div>

          {/* Main Content Grid */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            {/* Storage Chart */}
            <Card className="col-span-4 lg:col-span-3">
              <CardHeader>
                <CardTitle>Utilisation du stockage</CardTitle>
                <CardDescription>
                  Espace disque utilisé par vos fichiers
                </CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-center pb-0">
                <ChartContainer
                  config={storageChartConfig}
                  className="mx-auto aspect-square max-h-[200px]"
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
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  Actions rapides
                </CardTitle>
                <CardDescription>
                  Accédez rapidement aux fonctionnalités principales
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                <button
                  onClick={() => setActiveTab('settings')}
                  className="group flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-all duration-200 hover:border-primary/50 text-left w-full"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <Edit className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Éditer mon site</h3>
                      <p className="text-sm text-muted-foreground">
                        Modifier le contenu et le design
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                </button>

                <a
                  href="/app/modules"
                  className="group flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-all duration-200 hover:border-primary/50"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10 text-violet-600 group-hover:bg-violet-500 group-hover:text-white transition-colors">
                      <Puzzle className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Gérer les modules</h3>
                      <p className="text-sm text-muted-foreground">
                        {enabledModulesCount} module{enabledModulesCount > 1 ? 's' : ''} actif{enabledModulesCount > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-violet-600 transition-colors" />
                </a>

                <a
                  href="/app/cloud"
                  className="group flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-all duration-200 hover:border-primary/50"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                      <Upload className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold">Mes fichiers</h3>
                      <p className="text-sm text-muted-foreground">
                        {quota ? formatBytes(quota.total_size_used) : '0 B'} utilisés
                      </p>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-emerald-600 transition-colors" />
                </a>

                {website && (
                  <a
                    href={`/${website.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-all duration-200 hover:border-primary/50"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                        <ExternalLink className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold">Voir mon site</h3>
                        <p className="text-sm text-muted-foreground">
                          {website.slug}.asap.cool
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-amber-600 transition-colors" />
                  </a>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Site Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Website Info Form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
                  Informations générales
                </CardTitle>
                <CardDescription>
                  Les informations de base de votre site
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSave} className="space-y-6">
                  <div className="space-y-2">
                    <FormLabel htmlFor="slug" className="flex items-center gap-2">
                      <Link2 className="h-4 w-4 text-muted-foreground" />
                      URL du site
                    </FormLabel>
                    <div className="flex items-center">
                      <span className="flex h-10 items-center rounded-l-md border border-r-0 bg-muted px-3 text-sm text-muted-foreground">
                        asap.cool/
                      </span>
                      <Input
                        id="slug"
                        value={website?.slug || ''}
                        disabled
                        className="rounded-l-none bg-muted"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">L'URL ne peut pas être modifiée après la création</p>
                  </div>

                  <div className="space-y-2">
                    <FormLabel htmlFor="title" className="flex items-center gap-2">
                      <Type className="h-4 w-4 text-muted-foreground" />
                      Titre
                    </FormLabel>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Votre nom ou titre"
                    />
                  </div>

                  <div className="space-y-2">
                    <FormLabel htmlFor="tagline" className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-muted-foreground" />
                      Tagline
                    </FormLabel>
                    <Input
                      id="tagline"
                      value={tagline}
                      onChange={(e) => setTagline(e.target.value)}
                      placeholder="Développeur Full Stack | Designer | ..."
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
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Github className="h-5 w-5" />
                  Intégration GitHub
                </CardTitle>
                <CardDescription>
                  Connectez votre compte GitHub pour afficher automatiquement vos projets
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleGitHubConnect} className="space-y-4">
                  <div className="space-y-2">
                    <FormLabel htmlFor="github">Nom d'utilisateur GitHub</FormLabel>
                    <div className="flex gap-2">
                      <Input
                        id="github"
                        value={githubUsername}
                        onChange={(e) => setGithubUsername(e.target.value)}
                        placeholder="votre-username"
                        className="flex-1"
                      />
                      <Button 
                        type="submit" 
                        variant="secondary"
                        disabled={isSaving || !githubUsername.trim()}
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
