"use client"

import React, { useState, useEffect, useMemo } from 'react';
import { useWebsiteContext } from '@/contexts/WebsiteContext';
import { Link } from '@/components/app-router';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  BarChart,
  Bar,
  LineChart,
  Line,
} from "recharts";
import { 
  Search,
  TrendingUp,
  TrendingDown,
  Globe,
  MousePointerClick,
  Eye,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Link as LinkIcon,
  ExternalLink,
  RefreshCw,
  Calendar,
  Download,
  Target,
  Zap,
  Shield,
  Smartphone,
  Monitor,
  Award,
  AlertCircle,
  Info,
  ChevronRight,
  MapPin,
  Hash,
  Image,
  Code,
  FileWarning,
  Gauge,
} from "lucide-react";

// Dynamic SEO data generator
function useSeoData(websiteId: string | undefined, timeRange: string) {
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Auto-refresh every 5 seconds for real-time feel
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshKey(prev => prev + 1);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return useMemo(() => {
    const now = Date.now();
    const timeSlot = Math.floor(now / 5000);
    const baseSeed = websiteId 
      ? websiteId.split('').reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) | 0, 0)
      : 42;
    
    // Dynamic random function with small incremental changes
    const random = (min: number, max: number, offset = 0) => {
      const seed = Math.abs((baseSeed + offset + timeSlot + refreshKey) * 2654435761 % 2147483647);
      return Math.floor((seed / 2147483647) * (max - min)) + min;
    };

    // Small variation function
    const vary = (base: number, percent = 3) => {
      const variation = base * (percent / 100);
      return Math.floor(base + (Math.random() * variation * 2 - variation));
    };

    // Days based on time range
    const daysCount = timeRange === '7d' ? 7 : timeRange === '28d' ? 28 : 90;
    
    // Search performance data over time
    const performanceData = Array.from({ length: daysCount }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (daysCount - 1 - i));
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      const weekendMultiplier = isWeekend ? 0.75 : 1;
      const trendMultiplier = 1 + (i / daysCount) * 0.25;
      
      const impressions = Math.floor(random(800, 2500, i * 7) * weekendMultiplier * trendMultiplier);
      const clicks = Math.floor(impressions * (random(25, 55, i * 3) / 1000));
      
      return {
        date: date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
        shortDate: date.getDate().toString(),
        impressions: vary(impressions),
        clicks: vary(clicks),
        ctr: ((clicks / impressions) * 100).toFixed(1),
        position: (random(80, 150, i * 5) / 10).toFixed(1),
      };
    });

    // Calculate totals
    const totalImpressions = vary(performanceData.reduce((sum, d) => sum + d.impressions, 0));
    const totalClicks = vary(performanceData.reduce((sum, d) => sum + d.clicks, 0));
    const avgCtr = ((totalClicks / totalImpressions) * 100).toFixed(1);
    const avgPosition = (performanceData.reduce((sum, d) => sum + parseFloat(d.position), 0) / daysCount).toFixed(1);

    // Previous period comparison
    const changes = {
      impressions: random(5, 28, 100),
      clicks: random(8, 35, 101),
      ctr: random(-5, 15, 102),
      position: random(-8, 5, 103), // negative is better for position
    };

    // Top search queries
    const queries = [
      { query: 'portfolio designer', impressions: vary(random(800, 2000, 200)), clicks: vary(random(80, 250, 201)), ctr: (random(80, 150, 202) / 10).toFixed(1), position: (random(15, 45, 203) / 10).toFixed(1) },
      { query: 'création site web', impressions: vary(random(600, 1500, 204)), clicks: vary(random(50, 180, 205)), ctr: (random(60, 130, 206) / 10).toFixed(1), position: (random(20, 60, 207) / 10).toFixed(1) },
      { query: 'web designer freelance', impressions: vary(random(400, 1200, 208)), clicks: vary(random(40, 150, 209)), ctr: (random(70, 140, 210) / 10).toFixed(1), position: (random(25, 70, 211) / 10).toFixed(1) },
      { query: 'agence digitale', impressions: vary(random(300, 900, 212)), clicks: vary(random(25, 100, 213)), ctr: (random(50, 120, 214) / 10).toFixed(1), position: (random(30, 80, 215) / 10).toFixed(1) },
      { query: 'développeur react', impressions: vary(random(250, 800, 216)), clicks: vary(random(20, 90, 217)), ctr: (random(60, 130, 218) / 10).toFixed(1), position: (random(35, 90, 219) / 10).toFixed(1) },
      { query: 'site vitrine', impressions: vary(random(200, 700, 220)), clicks: vary(random(15, 70, 221)), ctr: (random(50, 110, 222) / 10).toFixed(1), position: (random(40, 100, 223) / 10).toFixed(1) },
      { query: 'ux designer', impressions: vary(random(150, 600, 224)), clicks: vary(random(12, 60, 225)), ctr: (random(55, 120, 226) / 10).toFixed(1), position: (random(45, 110, 227) / 10).toFixed(1) },
      { query: 'refonte site internet', impressions: vary(random(120, 500, 228)), clicks: vary(random(10, 50, 229)), ctr: (random(45, 100, 230) / 10).toFixed(1), position: (random(50, 120, 231) / 10).toFixed(1) },
    ].sort((a, b) => b.clicks - a.clicks);

    // Top pages in search
    const pages = [
      { path: '/', title: 'Accueil', impressions: vary(random(2000, 5000, 300)), clicks: vary(random(200, 600, 301)), ctr: (random(80, 140, 302) / 10).toFixed(1), position: (random(15, 40, 303) / 10).toFixed(1) },
      { path: '/projets', title: 'Projets', impressions: vary(random(1000, 3000, 304)), clicks: vary(random(100, 350, 305)), ctr: (random(70, 130, 306) / 10).toFixed(1), position: (random(20, 50, 307) / 10).toFixed(1) },
      { path: '/services', title: 'Services', impressions: vary(random(800, 2500, 308)), clicks: vary(random(80, 280, 309)), ctr: (random(65, 120, 310) / 10).toFixed(1), position: (random(25, 60, 311) / 10).toFixed(1) },
      { path: '/about', title: 'À propos', impressions: vary(random(600, 2000, 312)), clicks: vary(random(60, 200, 313)), ctr: (random(60, 110, 314) / 10).toFixed(1), position: (random(30, 70, 315) / 10).toFixed(1) },
      { path: '/contact', title: 'Contact', impressions: vary(random(400, 1500, 316)), clicks: vary(random(40, 150, 317)), ctr: (random(55, 100, 318) / 10).toFixed(1), position: (random(35, 80, 319) / 10).toFixed(1) },
      { path: '/blog', title: 'Blog', impressions: vary(random(300, 1200, 320)), clicks: vary(random(30, 120, 321)), ctr: (random(50, 95, 322) / 10).toFixed(1), position: (random(40, 90, 323) / 10).toFixed(1) },
    ].sort((a, b) => b.clicks - a.clicks);

    // Top countries
    const countries = [
      { name: 'France', code: 'FR', impressions: vary(random(4000, 10000, 400)), clicks: vary(random(400, 1200, 401)), ctr: (random(80, 140, 402) / 10).toFixed(1) },
      { name: 'Belgique', code: 'BE', impressions: vary(random(800, 2000, 403)), clicks: vary(random(80, 240, 404)), ctr: (random(70, 130, 405) / 10).toFixed(1) },
      { name: 'Suisse', code: 'CH', impressions: vary(random(600, 1500, 406)), clicks: vary(random(60, 180, 407)), ctr: (random(65, 120, 408) / 10).toFixed(1) },
      { name: 'Canada', code: 'CA', impressions: vary(random(400, 1000, 409)), clicks: vary(random(40, 120, 410)), ctr: (random(60, 110, 411) / 10).toFixed(1) },
      { name: 'Maroc', code: 'MA', impressions: vary(random(200, 600, 412)), clicks: vary(random(20, 70, 413)), ctr: (random(50, 100, 414) / 10).toFixed(1) },
    ];

    // Device breakdown for search
    const devices = [
      { name: 'Mobile', impressions: vary(random(3000, 8000, 500)), clicks: vary(random(250, 700, 501)), ctr: (random(60, 100, 502) / 10).toFixed(1), icon: Smartphone },
      { name: 'Desktop', impressions: vary(random(2000, 5000, 503)), clicks: vary(random(200, 500, 504)), ctr: (random(80, 130, 505) / 10).toFixed(1), icon: Monitor },
    ];

    // SEO Health Score
    const seoIssues = {
      critical: random(0, 3, 600),
      warnings: random(2, 8, 601),
      passed: random(15, 25, 602),
    };
    const seoScore = Math.min(100, Math.max(0, 100 - (seoIssues.critical * 15) - (seoIssues.warnings * 3)));

    // Page indexing status
    const indexingStatus = {
      indexed: random(8, 15, 700),
      notIndexed: random(0, 3, 701),
      excluded: random(1, 4, 702),
      crawled: random(10, 20, 703),
    };

    // Core Web Vitals
    const coreWebVitals = {
      lcp: { value: (random(15, 35, 800) / 10).toFixed(1), status: random(15, 35, 800) < 25 ? 'good' : random(15, 35, 800) < 40 ? 'needs-improvement' : 'poor' },
      fid: { value: random(50, 150, 801), status: random(50, 150, 801) < 100 ? 'good' : random(50, 150, 801) < 300 ? 'needs-improvement' : 'poor' },
      cls: { value: (random(5, 25, 802) / 100).toFixed(2), status: random(5, 25, 802) < 10 ? 'good' : random(5, 25, 802) < 25 ? 'needs-improvement' : 'poor' },
      ttfb: { value: random(200, 600, 803), status: random(200, 600, 803) < 400 ? 'good' : random(200, 600, 803) < 800 ? 'needs-improvement' : 'poor' },
    };

    // Backlinks
    const backlinks = {
      total: vary(random(50, 300, 900)),
      newThisMonth: vary(random(5, 25, 901)),
      lostThisMonth: vary(random(0, 8, 902)),
      dofollow: vary(random(30, 200, 903)),
      nofollow: vary(random(10, 80, 904)),
      referringDomains: vary(random(15, 80, 905)),
    };

    // SEO Issues breakdown
    const issuesList = [
      { type: 'critical', title: 'Pages sans meta description', count: random(0, 2, 1000), icon: FileWarning },
      { type: 'critical', title: 'Images sans attribut alt', count: random(0, 5, 1001), icon: Image },
      { type: 'warning', title: 'Titres trop longs (>60 car.)', count: random(1, 4, 1002), icon: Hash },
      { type: 'warning', title: 'Liens internes cassés', count: random(0, 3, 1003), icon: LinkIcon },
      { type: 'warning', title: 'Pages lentes (>3s)', count: random(0, 2, 1004), icon: Clock },
      { type: 'info', title: 'Pages sans H1', count: random(0, 2, 1005), icon: Code },
      { type: 'info', title: 'Redirections 301', count: random(2, 8, 1006), icon: ExternalLink },
    ].filter(issue => issue.count > 0);

    // Sitemap status
    const sitemapStatus = {
      lastSubmitted: new Date(Date.now() - random(1, 7, 1100) * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR'),
      urls: random(8, 20, 1101),
      indexed: random(6, 18, 1102),
      errors: random(0, 2, 1103),
    };

    // Rich results
    const richResults = {
      eligible: random(3, 8, 1200),
      detected: random(1, 5, 1201),
      types: ['Article', 'FAQ', 'Breadcrumb', 'Organization'].slice(0, random(1, 4, 1202)),
    };

    return {
      performanceData,
      totalImpressions,
      totalClicks,
      avgCtr,
      avgPosition,
      changes,
      queries,
      pages,
      countries,
      devices,
      seoIssues,
      seoScore,
      indexingStatus,
      coreWebVitals,
      backlinks,
      issuesList,
      sitemapStatus,
      richResults,
    };
  }, [websiteId, timeRange, refreshKey]);
}

// Change indicator component
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

// Status badge component
const StatusBadge = ({ status }: { status: string }) => {
  const styles = {
    'good': 'bg-green-100 text-green-700 border-green-200',
    'needs-improvement': 'bg-amber-100 text-amber-700 border-amber-200',
    'poor': 'bg-red-100 text-red-700 border-red-200',
  };
  const labels = {
    'good': 'Bon',
    'needs-improvement': 'À améliorer',
    'poor': 'Mauvais',
  };
  return (
    <Badge variant="outline" className={styles[status as keyof typeof styles]}>
      {labels[status as keyof typeof labels]}
    </Badge>
  );
};

// Position indicator
const PositionIndicator = ({ position }: { position: string }) => {
  const pos = parseFloat(position);
  const color = pos <= 3 ? 'text-green-600' : pos <= 10 ? 'text-amber-600' : 'text-muted-foreground';
  return <span className={`font-medium ${color}`}>{position}</span>;
};

export default function SeoPage() {
  const { currentWebsite: website, currentWebsiteId, isLoading } = useWebsiteContext();
  const [timeRange, setTimeRange] = useState('28d');
  const [activeTab, setActiveTab] = useState('performance');
  
  const data = useSeoData(currentWebsiteId, timeRange);

  // Chart configs
  const performanceChartConfig = {
    impressions: { label: "Impressions", color: "#6366f1" },
    clicks: { label: "Clics", color: "#22c55e" },
  } satisfies ChartConfig;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 sm:gap-8 animate-fade-in">
      {/* Page Header */}
      <PageHeader
        title="SEO & Référencement"
        subtitle="Performances de recherche et optimisation du référencement"
        icon={
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg">
            <Search className="h-5 w-5 text-white" />
          </div>
        }
        badge={{
          label: `Score ${data.seoScore}`,
          className: data.seoScore >= 80 ? 'bg-green-500/10 text-green-600 border-green-500/20' :
                     data.seoScore >= 50 ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' :
                     'bg-red-500/10 text-red-600 border-red-500/20',
        }}
        backHref={currentWebsiteId ? `/app/${currentWebsiteId}` : '/app'}
        actions={[
          {
            label: 'Exporter',
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
                <Badge className={data.seoScore >= 80 ? 'bg-green-500/10 text-green-600 border-green-500/20 text-[10px] h-5' :
                                 data.seoScore >= 50 ? 'bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] h-5' :
                                 'bg-red-500/10 text-red-600 border-red-500/20 text-[10px] h-5'}>
                  Score {data.seoScore}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-[130px] h-8 text-xs">
                  <Calendar className="h-3.5 w-3.5 mr-1.5" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">7 derniers jours</SelectItem>
                  <SelectItem value="28d">28 derniers jours</SelectItem>
                  <SelectItem value="90d">3 derniers mois</SelectItem>
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
                    <p>Exporter les données SEO</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        }
      >
        {/* Time range selector in header */}
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[140px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 derniers jours</SelectItem>
              <SelectItem value="28d">28 derniers jours</SelectItem>
              <SelectItem value="90d">3 derniers mois</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </PageHeader>

      {/* SEO Health Score Banner */}
      <Card className={`border-2 ${
        data.seoScore >= 80 ? 'border-green-500/30 bg-gradient-to-r from-green-500/10 to-transparent' :
        data.seoScore >= 50 ? 'border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-transparent' :
        'border-red-500/30 bg-gradient-to-r from-red-500/10 to-transparent'
      }`}>
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`h-16 w-16 rounded-full flex items-center justify-center text-2xl font-bold ${
                data.seoScore >= 80 ? 'bg-green-500/20 text-green-600' :
                data.seoScore >= 50 ? 'bg-amber-500/20 text-amber-600' :
                'bg-red-500/20 text-red-600'
              }`}>
                {data.seoScore}
              </div>
              <div>
                <p className="font-semibold text-lg">Score SEO</p>
                <p className="text-sm text-muted-foreground">
                  {data.seoScore >= 80 ? 'Excellent ! Votre site est bien optimisé.' :
                   data.seoScore >= 50 ? 'Correct. Quelques améliorations possibles.' :
                   'À améliorer. Plusieurs problèmes détectés.'}
                </p>
              </div>
            </div>
            <div className="flex gap-6">
              <div className="text-center">
                <p className="text-2xl font-bold text-red-600">{data.seoIssues.critical}</p>
                <p className="text-xs text-muted-foreground">Critiques</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-amber-600">{data.seoIssues.warnings}</p>
                <p className="text-xs text-muted-foreground">Avertissements</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-green-600">{data.seoIssues.passed}</p>
                <p className="text-xs text-muted-foreground">Réussis</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <TooltipProvider>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Impressions</CardTitle>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Eye className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Nombre de fois où votre site apparaît dans les résultats de recherche</p>
                </TooltipContent>
              </Tooltip>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.totalImpressions.toLocaleString()}</div>
              <div className="flex items-center gap-2 mt-1">
                <ChangeIndicator value={data.changes.impressions} />
                <span className="text-xs text-muted-foreground">vs période précédente</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Clics</CardTitle>
              <Tooltip>
                <TooltipTrigger asChild>
                  <MousePointerClick className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Nombre de clics vers votre site depuis les résultats de recherche</p>
                </TooltipContent>
              </Tooltip>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.totalClicks.toLocaleString()}</div>
              <div className="flex items-center gap-2 mt-1">
                <ChangeIndicator value={data.changes.clicks} />
                <span className="text-xs text-muted-foreground">vs période précédente</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">CTR moyen</CardTitle>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Target className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Taux de clics : pourcentage d'impressions convertis en clics</p>
                </TooltipContent>
              </Tooltip>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.avgCtr}%</div>
              <div className="flex items-center gap-2 mt-1">
                <ChangeIndicator value={data.changes.ctr} />
                <span className={`text-xs ${parseFloat(data.avgCtr) >= 5 ? 'text-green-600' : parseFloat(data.avgCtr) >= 2 ? 'text-amber-600' : 'text-red-500'}`}>
                  {parseFloat(data.avgCtr) >= 5 ? 'Excellent' : parseFloat(data.avgCtr) >= 2 ? 'Bon' : 'À améliorer'}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Position moyenne</CardTitle>
              <Tooltip>
                <TooltipTrigger asChild>
                  <TrendingUp className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Position moyenne de votre site dans les résultats de recherche</p>
                </TooltipContent>
              </Tooltip>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{data.avgPosition}</div>
              <div className="flex items-center gap-2 mt-1">
                <ChangeIndicator value={data.changes.position} inverted />
                <span className={`text-xs ${parseFloat(data.avgPosition) <= 10 ? 'text-green-600' : parseFloat(data.avgPosition) <= 30 ? 'text-amber-600' : 'text-red-500'}`}>
                  {parseFloat(data.avgPosition) <= 10 ? 'Page 1' : parseFloat(data.avgPosition) <= 30 ? 'Top 3 pages' : 'À optimiser'}
                </span>
              </div>
            </CardContent>
          </Card>
        </TooltipProvider>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="queries">Requêtes</TabsTrigger>
          <TabsTrigger value="pages">Pages</TabsTrigger>
          <TabsTrigger value="health">Santé SEO</TabsTrigger>
          <TabsTrigger value="backlinks">Backlinks</TabsTrigger>
        </TabsList>

        {/* Performance Tab */}
        <TabsContent value="performance" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-12">
            {/* Performance Chart */}
            <Card className="lg:col-span-8">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Performances de recherche
                </CardTitle>
                <CardDescription>
                  Impressions et clics dans les résultats Google
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={performanceChartConfig} className="h-[300px] w-full">
                  <AreaChart data={data.performanceData} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="fillImpressions" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="fillClicks" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" vertical={false} />
                    <XAxis dataKey="shortDate" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10 }} width={50} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area type="monotone" dataKey="impressions" stroke="#6366f1" fill="url(#fillImpressions)" strokeWidth={2} />
                    <Area type="monotone" dataKey="clicks" stroke="#22c55e" fill="url(#fillClicks)" strokeWidth={2} />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Devices */}
            <Card className="lg:col-span-4">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-primary" />
                  Par appareil
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.devices.map((device) => {
                  const Icon = device.icon;
                  return (
                    <div key={device.name} className="p-3 rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Icon className="h-5 w-5 text-muted-foreground" />
                          <span className="font-medium">{device.name}</span>
                        </div>
                        <span className="text-sm text-muted-foreground">{device.ctr}% CTR</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-muted-foreground">Impressions</p>
                          <p className="font-medium">{device.impressions.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Clics</p>
                          <p className="font-medium">{device.clicks.toLocaleString()}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </div>

          {/* Countries */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MapPin className="h-5 w-5 text-primary" />
                Par pays
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                {data.countries.map((country, index) => (
                  <div key={country.code} className="p-3 rounded-lg border">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs font-bold w-5 h-5 rounded flex items-center justify-center ${
                        index === 0 ? 'bg-amber-500/20 text-amber-600' :
                        index === 1 ? 'bg-gray-300/30 text-gray-600' :
                        index === 2 ? 'bg-orange-500/20 text-orange-600' :
                        'bg-muted text-muted-foreground'
                      }`}>
                        {index + 1}
                      </span>
                      <span className="font-medium">{country.name}</span>
                    </div>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Impressions</span>
                        <span>{country.impressions.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Clics</span>
                        <span>{country.clicks.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">CTR</span>
                        <span>{country.ctr}%</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Queries Tab */}
        <TabsContent value="queries" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Search className="h-5 w-5 text-primary" />
                Requêtes de recherche
              </CardTitle>
              <CardDescription>
                Les termes de recherche qui amènent les visiteurs sur votre site
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Requête</th>
                      <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Impressions</th>
                      <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Clics</th>
                      <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">CTR</th>
                      <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Position</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.queries.map((query, index) => (
                      <tr key={query.query} className="border-b last:border-0 hover:bg-muted/50">
                        <td className="py-3 px-2">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold w-5 h-5 rounded flex items-center justify-center ${
                              index === 0 ? 'bg-amber-500/20 text-amber-600' :
                              index === 1 ? 'bg-gray-300/30 text-gray-600' :
                              index === 2 ? 'bg-orange-500/20 text-orange-600' :
                              'bg-muted text-muted-foreground'
                            }`}>
                              {index + 1}
                            </span>
                            <span className="font-medium">{query.query}</span>
                          </div>
                        </td>
                        <td className="text-right py-3 px-2 text-muted-foreground">{query.impressions.toLocaleString()}</td>
                        <td className="text-right py-3 px-2 font-medium">{query.clicks.toLocaleString()}</td>
                        <td className="text-right py-3 px-2">
                          <span className={parseFloat(query.ctr) >= 5 ? 'text-green-600' : parseFloat(query.ctr) >= 2 ? 'text-amber-600' : 'text-muted-foreground'}>
                            {query.ctr}%
                          </span>
                        </td>
                        <td className="text-right py-3 px-2">
                          <PositionIndicator position={query.position} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pages Tab */}
        <TabsContent value="pages" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-12">
            <Card className="lg:col-span-8">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Pages dans les résultats de recherche
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Page</th>
                        <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Impressions</th>
                        <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Clics</th>
                        <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">CTR</th>
                        <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Position</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.pages.map((page, index) => (
                        <tr key={page.path} className="border-b last:border-0 hover:bg-muted/50">
                          <td className="py-3 px-2">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-bold w-5 h-5 rounded flex items-center justify-center ${
                                index === 0 ? 'bg-amber-500/20 text-amber-600' :
                                index === 1 ? 'bg-gray-300/30 text-gray-600' :
                                index === 2 ? 'bg-orange-500/20 text-orange-600' :
                                'bg-muted text-muted-foreground'
                              }`}>
                                {index + 1}
                              </span>
                              <div>
                                <p className="font-medium">{page.title}</p>
                                <p className="text-xs text-muted-foreground">{page.path}</p>
                              </div>
                            </div>
                          </td>
                          <td className="text-right py-3 px-2 text-muted-foreground">{page.impressions.toLocaleString()}</td>
                          <td className="text-right py-3 px-2 font-medium">{page.clicks.toLocaleString()}</td>
                          <td className="text-right py-3 px-2">
                            <span className={parseFloat(page.ctr) >= 5 ? 'text-green-600' : parseFloat(page.ctr) >= 2 ? 'text-amber-600' : 'text-muted-foreground'}>
                              {page.ctr}%
                            </span>
                          </td>
                          <td className="text-right py-3 px-2">
                            <PositionIndicator position={page.position} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Indexing Status */}
            <Card className="lg:col-span-4">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
                  Indexation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-5 w-5 text-green-600" />
                      <span>Pages indexées</span>
                    </div>
                    <span className="font-bold text-green-600">{data.indexingStatus.indexed}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-amber-600" />
                      <span>En attente</span>
                    </div>
                    <span className="font-bold text-amber-600">{data.indexingStatus.notIndexed}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-lg bg-muted border">
                    <div className="flex items-center gap-2">
                      <XCircle className="h-5 w-5 text-muted-foreground" />
                      <span>Exclues</span>
                    </div>
                    <span className="font-bold">{data.indexingStatus.excluded}</span>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h4 className="text-sm font-medium mb-3">Sitemap</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Dernière soumission</span>
                      <span>{data.sitemapStatus.lastSubmitted}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">URLs dans sitemap</span>
                      <span>{data.sitemapStatus.urls}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">URLs indexées</span>
                      <span className="text-green-600">{data.sitemapStatus.indexed}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Health Tab */}
        <TabsContent value="health" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Core Web Vitals */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Gauge className="h-5 w-5 text-primary" />
                  Core Web Vitals
                </CardTitle>
                <CardDescription>
                  Métriques de performance essentielles pour le SEO
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium">LCP (Largest Contentful Paint)</p>
                      <p className="text-xs text-muted-foreground">Temps de chargement du contenu principal</p>
                    </div>
                    <StatusBadge status={data.coreWebVitals.lcp.status} />
                  </div>
                  <p className="text-2xl font-bold">{data.coreWebVitals.lcp.value}s</p>
                  <Progress 
                    value={Math.min(100, (2.5 / parseFloat(data.coreWebVitals.lcp.value)) * 100)} 
                    className="h-2 mt-2" 
                  />
                </div>

                <div className="p-4 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium">FID (First Input Delay)</p>
                      <p className="text-xs text-muted-foreground">Délai de première interaction</p>
                    </div>
                    <StatusBadge status={data.coreWebVitals.fid.status} />
                  </div>
                  <p className="text-2xl font-bold">{data.coreWebVitals.fid.value}ms</p>
                  <Progress 
                    value={Math.min(100, (100 / data.coreWebVitals.fid.value) * 100)} 
                    className="h-2 mt-2" 
                  />
                </div>

                <div className="p-4 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium">CLS (Cumulative Layout Shift)</p>
                      <p className="text-xs text-muted-foreground">Stabilité visuelle de la page</p>
                    </div>
                    <StatusBadge status={data.coreWebVitals.cls.status} />
                  </div>
                  <p className="text-2xl font-bold">{data.coreWebVitals.cls.value}</p>
                  <Progress 
                    value={Math.min(100, (0.1 / parseFloat(data.coreWebVitals.cls.value)) * 100)} 
                    className="h-2 mt-2" 
                  />
                </div>

                <div className="p-4 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="font-medium">TTFB (Time to First Byte)</p>
                      <p className="text-xs text-muted-foreground">Temps de réponse du serveur</p>
                    </div>
                    <StatusBadge status={data.coreWebVitals.ttfb.status} />
                  </div>
                  <p className="text-2xl font-bold">{data.coreWebVitals.ttfb.value}ms</p>
                  <Progress 
                    value={Math.min(100, (400 / data.coreWebVitals.ttfb.value) * 100)} 
                    className="h-2 mt-2" 
                  />
                </div>
              </CardContent>
            </Card>

            {/* SEO Issues */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-primary" />
                  Problèmes détectés
                </CardTitle>
                <CardDescription>
                  Points à corriger pour améliorer votre référencement
                </CardDescription>
              </CardHeader>
              <CardContent>
                {data.issuesList.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
                    <p className="font-medium">Aucun problème détecté !</p>
                    <p className="text-sm text-muted-foreground">Votre site est bien optimisé.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {data.issuesList.map((issue, index) => {
                      const Icon = issue.icon;
                      return (
                        <div 
                          key={index}
                          className={`flex items-center justify-between p-3 rounded-lg border ${
                            issue.type === 'critical' ? 'bg-red-500/10 border-red-500/20' :
                            issue.type === 'warning' ? 'bg-amber-500/10 border-amber-500/20' :
                            'bg-blue-500/10 border-blue-500/20'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <Icon className={`h-5 w-5 ${
                              issue.type === 'critical' ? 'text-red-600' :
                              issue.type === 'warning' ? 'text-amber-600' :
                              'text-blue-600'
                            }`} />
                            <span className="text-sm">{issue.title}</span>
                          </div>
                          <Badge variant="secondary" className={
                            issue.type === 'critical' ? 'bg-red-500/20 text-red-700' :
                            issue.type === 'warning' ? 'bg-amber-500/20 text-amber-700' :
                            'bg-blue-500/20 text-blue-700'
                          }>
                            {issue.count}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Rich Results */}
                <div className="mt-6 pt-4 border-t">
                  <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                    <Award className="h-4 w-4" />
                    Rich Results
                  </h4>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Éligibles</span>
                      <span className="font-medium">{data.richResults.eligible}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Détectés</span>
                      <span className="font-medium text-green-600">{data.richResults.detected}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {data.richResults.types.map((type) => (
                        <Badge key={type} variant="outline" className="text-xs">
                          {type}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Backlinks Tab */}
        <TabsContent value="backlinks" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <LinkIcon className="h-4 w-4" />
                  Total backlinks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{data.backlinks.total}</div>
                <div className="flex items-center gap-4 mt-2 text-sm">
                  <span className="text-green-600">+{data.backlinks.newThisMonth} ce mois</span>
                  <span className="text-red-500">-{data.backlinks.lostThisMonth} perdus</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Domaines référents
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{data.backlinks.referringDomains}</div>
                <p className="text-sm text-muted-foreground mt-2">Sites uniques pointant vers vous</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Répartition liens
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Dofollow</span>
                      <span className="font-medium text-green-600">{data.backlinks.dofollow}</span>
                    </div>
                    <Progress value={(data.backlinks.dofollow / data.backlinks.total) * 100} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Nofollow</span>
                      <span className="font-medium text-muted-foreground">{data.backlinks.nofollow}</span>
                    </div>
                    <Progress value={(data.backlinks.nofollow / data.backlinks.total) * 100} className="h-2 bg-muted" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Conseils pour améliorer vos backlinks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="p-4 rounded-lg border bg-gradient-to-br from-green-500/5 to-transparent">
                  <h4 className="font-medium flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Points forts
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Bon ratio dofollow/nofollow</li>
                    <li>• Diversité des domaines référents</li>
                    <li>• Croissance positive ce mois-ci</li>
                  </ul>
                </div>
                <div className="p-4 rounded-lg border bg-gradient-to-br from-amber-500/5 to-transparent">
                  <h4 className="font-medium flex items-center gap-2 mb-2">
                    <AlertCircle className="h-4 w-4 text-amber-600" />
                    À améliorer
                  </h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Créer du contenu partageable</li>
                    <li>• Développer les partenariats</li>
                    <li>• Publier des études de cas</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
