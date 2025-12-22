"use client"

import React, { useState, useEffect, useMemo } from 'react';
import { useWebsiteContext } from '@/contexts/WebsiteContext';
import { Link } from '@/components/app-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ResponsiveContainer,
} from "recharts";
import { 
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Eye,
  Clock,
  MousePointerClick,
  Globe,
  Smartphone,
  Monitor,
  Tablet,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Target,
  Mail,
  MessageSquare,
  Share2,
  ExternalLink,
  RefreshCw,
  Calendar,
  Filter,
  Download,
  ChevronRight,
  Percent,
  Timer,
  Layers,
  FileText,
  Search,
  MapPin,
  Zap,
} from "lucide-react";

// Dynamic data generator that changes over time
function useAnalyticsData(websiteId: string | undefined, timeRange: string) {
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Auto-refresh every 30 seconds for real-time feel
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshKey(prev => prev + 1);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  return useMemo(() => {
    // Use current time + website ID for dynamic but consistent-per-session data
    const now = Date.now();
    const timeSlot = Math.floor(now / 30000); // Changes every 30 seconds
    const baseSeed = websiteId 
      ? websiteId.split('').reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) | 0, 0)
      : 42;
    
    // Dynamic random function
    const random = (min: number, max: number, offset = 0) => {
      const seed = Math.abs((baseSeed + offset + timeSlot + refreshKey) * 2654435761 % 2147483647);
      return Math.floor((seed / 2147483647) * (max - min)) + min;
    };

    // Variation function for small real-time changes
    const vary = (base: number, percent = 5) => {
      const variation = base * (percent / 100);
      return Math.floor(base + (Math.random() * variation * 2 - variation));
    };

    // Days based on time range
    const daysCount = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    
    // Traffic trend data
    const trafficData = Array.from({ length: daysCount }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (daysCount - 1 - i));
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      const baseVisits = random(100, 400, i * 7);
      const weekendMultiplier = isWeekend ? 0.7 : 1;
      const trendMultiplier = 1 + (i / daysCount) * 0.3; // Upward trend
      
      return {
        date: date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
        shortDate: date.getDate().toString(),
        visits: Math.floor(baseVisits * weekendMultiplier * trendMultiplier),
        pageViews: Math.floor(baseVisits * weekendMultiplier * trendMultiplier * random(18, 28, i) / 10),
        uniqueVisitors: Math.floor(baseVisits * weekendMultiplier * trendMultiplier * 0.65),
        bounceRate: random(25, 55, i * 3),
        avgDuration: random(90, 300, i * 5),
      };
    });

    // Calculate totals
    const totalVisits = vary(trafficData.reduce((sum, d) => sum + d.visits, 0));
    const totalPageViews = vary(trafficData.reduce((sum, d) => sum + d.pageViews, 0));
    const totalUniqueVisitors = vary(trafficData.reduce((sum, d) => sum + d.uniqueVisitors, 0));
    const avgBounceRate = Math.floor(trafficData.reduce((sum, d) => sum + d.bounceRate, 0) / daysCount);
    const avgDuration = Math.floor(trafficData.reduce((sum, d) => sum + d.avgDuration, 0) / daysCount);

    // Previous period comparison
    const prevMultiplier = random(70, 95, 100) / 100;
    const changes = {
      visits: Math.floor((1 - prevMultiplier) * 100 + random(-5, 15, 101)),
      pageViews: Math.floor((1 - prevMultiplier) * 100 + random(-3, 18, 102)),
      uniqueVisitors: Math.floor((1 - prevMultiplier) * 100 + random(-8, 12, 103)),
      bounceRate: random(-8, 5, 104),
      avgDuration: random(-5, 15, 105),
    };

    // Real-time metrics
    const realtime = {
      activeUsers: vary(random(5, 35, 200)),
      pageViewsPerMin: vary(random(2, 12, 201)),
      avgLoadTime: (random(8, 25, 202) / 10).toFixed(1),
    };

    // Traffic sources
    const trafficSources = [
      { name: 'Direct', value: random(30, 45, 300), visitors: vary(random(800, 2500, 301)), change: random(-5, 25, 302), color: '#6366f1' },
      { name: 'Recherche organique', value: random(20, 35, 303), visitors: vary(random(500, 1800, 304)), change: random(5, 35, 305), color: '#22c55e' },
      { name: 'Réseaux sociaux', value: random(15, 28, 306), visitors: vary(random(400, 1200, 307)), change: random(-3, 40, 308), color: '#8b5cf6' },
      { name: 'Référents', value: random(8, 18, 309), visitors: vary(random(200, 700, 310)), change: random(-10, 30, 311), color: '#f59e0b' },
      { name: 'Email', value: random(3, 12, 312), visitors: vary(random(100, 400, 313)), change: random(0, 50, 314), color: '#ec4899' },
    ];

    // Device breakdown
    const devices = [
      { name: 'Mobile', value: random(55, 68, 400), icon: Smartphone, color: '#6366f1' },
      { name: 'Desktop', value: random(28, 38, 401), icon: Monitor, color: '#8b5cf6' },
      { name: 'Tablet', value: random(4, 10, 402), icon: Tablet, color: '#22c55e' },
    ];

    // Top pages
    const topPages = [
      { path: '/', name: 'Accueil', views: vary(random(2000, 6000, 500)), uniqueViews: vary(random(1500, 4500, 501)), avgTime: random(60, 180, 502), bounceRate: random(20, 45, 503) },
      { path: '/projets', name: 'Projets', views: vary(random(800, 3000, 504)), uniqueViews: vary(random(600, 2200, 505)), avgTime: random(90, 240, 506), bounceRate: random(25, 50, 507) },
      { path: '/about', name: 'À propos', views: vary(random(500, 1800, 508)), uniqueViews: vary(random(400, 1400, 509)), avgTime: random(120, 300, 510), bounceRate: random(30, 55, 511) },
      { path: '/contact', name: 'Contact', views: vary(random(300, 1200, 512)), uniqueViews: vary(random(250, 1000, 513)), avgTime: random(45, 120, 514), bounceRate: random(15, 35, 515) },
      { path: '/blog', name: 'Blog', views: vary(random(200, 900, 516)), uniqueViews: vary(random(150, 700, 517)), avgTime: random(180, 360, 518), bounceRate: random(35, 60, 519) },
    ].sort((a, b) => b.views - a.views);

    // Geographic data
    const countries = [
      { name: 'France', code: 'FR', visitors: vary(random(1500, 4000, 600)), percent: random(45, 65, 601) },
      { name: 'Belgique', code: 'BE', visitors: vary(random(300, 800, 602)), percent: random(8, 15, 603) },
      { name: 'Suisse', code: 'CH', visitors: vary(random(200, 600, 604)), percent: random(5, 12, 605) },
      { name: 'Canada', code: 'CA', visitors: vary(random(150, 500, 606)), percent: random(4, 10, 607) },
      { name: 'États-Unis', code: 'US', visitors: vary(random(100, 400, 608)), percent: random(3, 8, 609) },
    ];

    // Conversion metrics
    const conversions = {
      newsletterSignups: {
        total: vary(random(150, 500, 700)),
        change: random(5, 35, 701),
        rate: (random(20, 50, 702) / 10).toFixed(1),
      },
      contactForms: {
        total: vary(random(30, 120, 703)),
        change: random(-5, 45, 704),
        rate: (random(8, 25, 705) / 10).toFixed(1),
      },
      ctaClicks: {
        total: vary(random(500, 1500, 706)),
        change: random(0, 30, 707),
        rate: (random(30, 70, 708) / 10).toFixed(1),
      },
      downloads: {
        total: vary(random(50, 300, 709)),
        change: random(-10, 40, 710),
        rate: (random(10, 35, 711) / 10).toFixed(1),
      },
    };

    // Engagement metrics
    const engagement = {
      pagesPerSession: (random(20, 45, 800) / 10).toFixed(1),
      avgSessionDuration: avgDuration,
      scrollDepth: random(55, 85, 801),
      returnVisitors: random(25, 45, 802),
    };

    // Hourly data for today
    const hourlyData = Array.from({ length: 24 }, (_, hour) => {
      const isBusinessHour = hour >= 9 && hour <= 18;
      const isPeakHour = hour >= 10 && hour <= 14;
      const baseVisits = isPeakHour ? random(15, 40, hour) : isBusinessHour ? random(8, 25, hour) : random(2, 12, hour);
      
      return {
        hour: `${hour}h`,
        visits: vary(baseVisits),
        pageViews: vary(Math.floor(baseVisits * 2.3)),
      };
    });

    return {
      trafficData,
      totalVisits,
      totalPageViews,
      totalUniqueVisitors,
      avgBounceRate,
      avgDuration,
      changes,
      realtime,
      trafficSources,
      devices,
      topPages,
      countries,
      conversions,
      engagement,
      hourlyData,
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

// Format duration helper
const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

export default function AnalyticsPage() {
  const { currentWebsite: website, currentWebsiteId, isLoading } = useWebsiteContext();
  const [timeRange, setTimeRange] = useState('30d');
  const [activeTab, setActiveTab] = useState('overview');
  
  const data = useAnalyticsData(currentWebsiteId, timeRange);

  // Chart configs
  const trafficChartConfig = {
    visits: { label: "Visites", color: "hsl(var(--primary))" },
    pageViews: { label: "Pages vues", color: "#3b82f6" },
    uniqueVisitors: { label: "Visiteurs uniques", color: "#22c55e" },
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Analytics
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Analyse détaillée des performances de votre site
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-[140px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">7 derniers jours</SelectItem>
              <SelectItem value="30d">30 derniers jours</SelectItem>
              <SelectItem value="90d">90 derniers jours</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" title="Exporter">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Real-time banner */}
      <Card className="bg-gradient-to-r from-green-500/10 via-emerald-500/5 to-transparent border-green-500/20">
        <CardContent className="py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse" />
                <div className="absolute inset-0 h-3 w-3 rounded-full bg-green-500 animate-ping opacity-75" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">En temps réel</p>
                <p className="text-2xl font-bold text-green-600">{data.realtime.activeUsers}</p>
                <p className="text-xs text-muted-foreground">visiteurs actifs</p>
              </div>
            </div>
            <div className="flex gap-8">
              <div className="text-center">
                <p className="text-lg font-semibold">{data.realtime.pageViewsPerMin}</p>
                <p className="text-xs text-muted-foreground">pages/min</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-semibold">{data.realtime.avgLoadTime}s</p>
                <p className="text-xs text-muted-foreground">temps de chargement</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Visites totales</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalVisits.toLocaleString()}</div>
            <div className="flex items-center gap-2 mt-1">
              <ChangeIndicator value={data.changes.visits} />
              <span className="text-xs text-muted-foreground">vs période précédente</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Visiteurs uniques</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalUniqueVisitors.toLocaleString()}</div>
            <div className="flex items-center gap-2 mt-1">
              <ChangeIndicator value={data.changes.uniqueVisitors} />
              <span className="text-xs text-muted-foreground">vs période précédente</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pages vues</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalPageViews.toLocaleString()}</div>
            <div className="flex items-center gap-2 mt-1">
              <ChangeIndicator value={data.changes.pageViews} />
              <span className="text-xs text-muted-foreground">vs période précédente</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Taux de rebond</CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.avgBounceRate}%</div>
            <div className="flex items-center gap-2 mt-1">
              <ChangeIndicator value={data.changes.bounceRate} inverted />
              <span className={`text-xs ${data.avgBounceRate < 40 ? 'text-green-600' : data.avgBounceRate < 60 ? 'text-amber-600' : 'text-red-500'}`}>
                {data.avgBounceRate < 40 ? 'Excellent' : data.avgBounceRate < 60 ? 'Moyen' : 'À améliorer'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for different views */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="traffic">Trafic</TabsTrigger>
          <TabsTrigger value="content">Contenu</TabsTrigger>
          <TabsTrigger value="conversions">Conversions</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-12">
            {/* Traffic Chart */}
            <Card className="lg:col-span-8">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Évolution du trafic
                </CardTitle>
                <CardDescription>
                  Visites et pages vues sur la période sélectionnée
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={trafficChartConfig} className="h-[300px] w-full">
                  <AreaChart data={data.trafficData} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="fillVisits" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="fillPageViews" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" vertical={false} />
                    <XAxis dataKey="shortDate" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} interval="preserveStartEnd" />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10 }} width={40} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Area type="monotone" dataKey="pageViews" stroke="#3b82f6" fill="url(#fillPageViews)" strokeWidth={2} />
                    <Area type="monotone" dataKey="visits" stroke="hsl(var(--primary))" fill="url(#fillVisits)" strokeWidth={2} />
                  </AreaChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Traffic Sources */}
            <Card className="lg:col-span-4">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Globe className="h-5 w-5 text-primary" />
                  Sources de trafic
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.trafficSources.map((source) => (
                  <div key={source.name} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className="h-3 w-3 rounded-full" style={{ backgroundColor: source.color }} />
                        <span>{source.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{source.value}%</span>
                        <ChangeIndicator value={source.change} />
                      </div>
                    </div>
                    <Progress value={source.value} className="h-2" />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Secondary metrics row */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Pages/session</span>
                  <Layers className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold">{data.engagement.pagesPerSession}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Durée moyenne</span>
                  <Timer className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold">{formatDuration(data.engagement.avgSessionDuration)}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Profondeur scroll</span>
                  <TrendingDown className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold">{data.engagement.scrollDepth}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground">Visiteurs récurrents</span>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-bold">{data.engagement.returnVisitors}%</p>
              </CardContent>
            </Card>
          </div>

          {/* Devices */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Smartphone className="h-5 w-5 text-primary" />
                  Appareils
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.devices.map((device) => {
                    const Icon = device.icon;
                    return (
                      <div key={device.name} className="flex items-center gap-4">
                        <div className="p-2 rounded-lg" style={{ backgroundColor: `${device.color}20` }}>
                          <Icon className="h-5 w-5" style={{ color: device.color }} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium">{device.name}</span>
                            <span className="text-sm text-muted-foreground">{device.value}%</span>
                          </div>
                          <Progress value={device.value} className="h-2" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Top Countries */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  Pays
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.countries.map((country, index) => (
                    <div key={country.code} className="flex items-center justify-between py-2 border-b last:border-0">
                      <div className="flex items-center gap-3">
                        <span className={`text-sm font-bold w-6 h-6 rounded flex items-center justify-center ${
                          index === 0 ? 'bg-amber-500/20 text-amber-600' :
                          index === 1 ? 'bg-gray-300/30 text-gray-600' :
                          index === 2 ? 'bg-orange-500/20 text-orange-600' :
                          'bg-muted text-muted-foreground'
                        }`}>
                          {index + 1}
                        </span>
                        <span className="font-medium">{country.name}</span>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{country.visitors.toLocaleString()}</p>
                        <p className="text-xs text-muted-foreground">{country.percent}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Traffic Tab */}
        <TabsContent value="traffic" className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Hourly traffic */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Trafic par heure (aujourd'hui)</CardTitle>
              </CardHeader>
              <CardContent>
                <ChartContainer config={trafficChartConfig} className="h-[250px] w-full">
                  <BarChart data={data.hourlyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" vertical={false} />
                    <XAxis dataKey="hour" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
                    <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10 }} width={30} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="visits" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Traffic sources detail */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Détail des sources</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.trafficSources.map((source) => (
                    <div key={source.name} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div className="h-4 w-4 rounded-full" style={{ backgroundColor: source.color }} />
                        <div>
                          <p className="font-medium">{source.name}</p>
                          <p className="text-xs text-muted-foreground">{source.visitors.toLocaleString()} visiteurs</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">{source.value}%</p>
                        <ChangeIndicator value={source.change} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Content Tab */}
        <TabsContent value="content" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Pages les plus consultées
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Page</th>
                      <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Vues</th>
                      <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Vues uniques</th>
                      <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Temps moyen</th>
                      <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Rebond</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.topPages.map((page, index) => (
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
                              <p className="font-medium">{page.name}</p>
                              <p className="text-xs text-muted-foreground">{page.path}</p>
                            </div>
                          </div>
                        </td>
                        <td className="text-right py-3 px-2 font-medium">{page.views.toLocaleString()}</td>
                        <td className="text-right py-3 px-2 text-muted-foreground">{page.uniqueViews.toLocaleString()}</td>
                        <td className="text-right py-3 px-2 text-muted-foreground">{formatDuration(page.avgTime)}</td>
                        <td className="text-right py-3 px-2">
                          <span className={page.bounceRate < 40 ? 'text-green-600' : page.bounceRate < 55 ? 'text-amber-600' : 'text-red-500'}>
                            {page.bounceRate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Conversions Tab */}
        <TabsContent value="conversions" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-green-500/20 bg-gradient-to-br from-green-500/5 to-transparent">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Inscriptions newsletter
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{data.conversions.newsletterSignups.total}</div>
                <div className="flex items-center justify-between mt-2">
                  <ChangeIndicator value={data.conversions.newsletterSignups.change} />
                  <Badge variant="secondary" className="text-xs">
                    {data.conversions.newsletterSignups.rate}% taux
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Formulaires de contact
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{data.conversions.contactForms.total}</div>
                <div className="flex items-center justify-between mt-2">
                  <ChangeIndicator value={data.conversions.contactForms.change} />
                  <Badge variant="secondary" className="text-xs">
                    {data.conversions.contactForms.rate}% taux
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-transparent">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <MousePointerClick className="h-4 w-4" />
                  Clics CTA
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-violet-600">{data.conversions.ctaClicks.total}</div>
                <div className="flex items-center justify-between mt-2">
                  <ChangeIndicator value={data.conversions.ctaClicks.change} />
                  <Badge variant="secondary" className="text-xs">
                    {data.conversions.ctaClicks.rate}% taux
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Téléchargements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-600">{data.conversions.downloads.total}</div>
                <div className="flex items-center justify-between mt-2">
                  <ChangeIndicator value={data.conversions.downloads.change} />
                  <Badge variant="secondary" className="text-xs">
                    {data.conversions.downloads.rate}% taux
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Conversion funnel visualization */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Entonnoir de conversion
              </CardTitle>
              <CardDescription>
                Parcours des visiteurs vers les objectifs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  { label: 'Visiteurs totaux', value: data.totalVisits, percent: 100 },
                  { label: 'Pages vues', value: data.totalPageViews, percent: Math.min(100, Math.round((data.totalPageViews / data.totalVisits) * 40)) },
                  { label: 'Engagés (>30s)', value: Math.round(data.totalVisits * 0.45), percent: 45 },
                  { label: 'Clics CTA', value: data.conversions.ctaClicks.total, percent: Math.round((data.conversions.ctaClicks.total / data.totalVisits) * 100) },
                  { label: 'Conversions', value: data.conversions.newsletterSignups.total + data.conversions.contactForms.total, percent: Math.round(((data.conversions.newsletterSignups.total + data.conversions.contactForms.total) / data.totalVisits) * 100) },
                ].map((step, index) => (
                  <div key={step.label} className="flex items-center gap-4">
                    <div className="w-32 text-sm font-medium">{step.label}</div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-8 bg-muted rounded-lg overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-primary to-primary/60 flex items-center justify-end px-2"
                            style={{ width: `${step.percent}%` }}
                          >
                            <span className="text-xs font-medium text-primary-foreground">{step.percent}%</span>
                          </div>
                        </div>
                        <span className="text-sm font-medium w-20 text-right">{step.value.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
