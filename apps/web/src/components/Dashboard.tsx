"use client"

import { useEffect, useState } from 'react';
import { websitesAPI, filesAPI, modulesAPI, type Website, type QuotaUsage, type TenantModule } from '../lib/api';
import { formatBytes } from '../lib/utils/formatters';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
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
  Sparkles
} from "lucide-react";

export default function Dashboard() {
  const [website, setWebsite] = useState<Website | null>(null);
  const [quota, setQuota] = useState<QuotaUsage | null>(null);
  const [modules, setModules] = useState<TenantModule[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [websites, quotaData, modulesData] = await Promise.all([
          websitesAPI.list(),
          filesAPI.getQuota(),
          modulesAPI.listForTenant()
        ]);
        
        if (websites.length > 0) {
          setWebsite(websites[0]);
        }
        setQuota(quotaData);
        setModules(modulesData);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

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
      <div className="space-y-8">
        <div className="space-y-2">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
          <Skeleton className="col-span-4 h-80" />
          <Skeleton className="col-span-3 h-80" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight">
            {website?.title || 'Mon Dashboard'}
          </h1>
          {website?.status === 'published' && (
            <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-500/20">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              En ligne
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground">
          Bienvenue ! Voici un aperçu de votre site et de son activité.
        </p>
      </div>

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
              {website?.slug ? `asap.cool/${website.slug}` : 'Configurez votre site'}
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
            <a
              href="/app/website"
              className="group flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-all duration-200 hover:border-primary/50"
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
            </a>

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

      {/* Site Info Card */}
      {website && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Informations du site</CardTitle>
                <CardDescription>Détails de configuration de votre site</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <a href="/app/website">
                  <Edit className="h-4 w-4 mr-2" />
                  Modifier
                </a>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Titre</p>
                <p className="font-medium">{website.title || 'Non défini'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Tagline</p>
                <p className="font-medium">{website.tagline || 'Non défini'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">URL</p>
                <p className="font-medium font-mono text-sm">{website.slug}.asap.cool</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Statut</p>
                <div className="flex items-center gap-2">
                  {website.status === 'published' ? (
                    <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Publié
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <Clock className="w-3 h-3 mr-1" />
                      Brouillon
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
