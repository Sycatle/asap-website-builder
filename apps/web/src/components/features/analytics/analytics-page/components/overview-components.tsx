"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
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
} from "recharts";
import { 
  TrendingUp,
  Globe,
  Layers,
  Timer,
  TrendingDown,
  Users,
  MapPin,
} from "lucide-react";
import { ChangeIndicator, formatDuration } from "../utils";
import type { 
  TrafficChartProps, 
  TrafficSourcesCardProps, 
  EngagementCardsProps,
  DevicesCardProps,
  CountriesCardProps,
  HourlyChartProps,
} from "../types";

const trafficChartConfig = {
  visits: { label: "Visites", color: "hsl(var(--primary))" },
  pageViews: { label: "Pages vues", color: "#3b82f6" },
  uniqueVisitors: { label: "Visiteurs uniques", color: "#22c55e" },
} satisfies ChartConfig;

/**
 * Traffic evolution chart
 */
export function TrafficChart({ data }: TrafficChartProps) {
  return (
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
          <AreaChart data={data} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
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
  );
}

/**
 * Traffic sources breakdown card
 */
export function TrafficSourcesCard({ sources }: TrafficSourcesCardProps) {
  return (
    <Card className="lg:col-span-4">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Globe className="h-5 w-5 text-primary" />
          Sources de trafic
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {sources.map((source) => (
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
  );
}

/**
 * Engagement metrics cards row
 */
export function EngagementCards({ engagement }: EngagementCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Pages/session</span>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold">{engagement.pagesPerSession}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Durée moyenne</span>
            <Timer className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold">{formatDuration(engagement.avgSessionDuration)}</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Profondeur scroll</span>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold">{engagement.scrollDepth}%</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Visiteurs récurrents</span>
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold">{engagement.returnVisitors}%</p>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Device breakdown card
 */
export function DevicesCard({ devices }: DevicesCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <span className="h-5 w-5 text-primary">📱</span>
          Appareils
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {devices.map((device) => {
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
  );
}

/**
 * Countries breakdown card
 */
export function CountriesCard({ countries }: CountriesCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          Pays
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {countries.map((country, index) => (
            <div key={country.code} className="flex items-center justify-between py-2 border-b last:border-0">
              <div className="flex items-center gap-3">
                <span className={`text-sm font-bold w-6 h-6 rounded flex items-center justify-center ${
                  index === 0 ? 'bg-amber-500/20 text-amber-600' :
                  index === 1 ? 'bg-zinc-300/30 text-zinc-500 dark:bg-zinc-600/30 dark:text-zinc-400' :
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
  );
}

/**
 * Hourly traffic chart
 */
export function HourlyChart({ data }: HourlyChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Trafic par heure (aujourd'hui)</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={trafficChartConfig} className="h-[250px] w-full">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" vertical={false} />
            <XAxis dataKey="hour" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10 }} width={30} />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="visits" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

/**
 * Traffic sources detail card
 */
export function TrafficSourcesDetailCard({ sources }: TrafficSourcesCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Détail des sources</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sources.map((source) => (
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
  );
}
