"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
import { TrendingUp, Smartphone, MapPin } from "lucide-react";
import type { PerformanceTabProps } from "../types";

const performanceChartConfig = {
  impressions: { label: "Impressions", color: "#6366f1" },
  clicks: { label: "Clics", color: "#22c55e" },
} satisfies ChartConfig;

/**
 * Performance tab content showing charts and breakdowns
 */
export function PerformanceTab({ data }: PerformanceTabProps) {
  return (
    <div className="space-y-4">
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
                    index === 1 ? 'bg-zinc-300/30 text-zinc-500 dark:bg-zinc-600/30 dark:text-zinc-400' :
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
    </div>
  );
}
