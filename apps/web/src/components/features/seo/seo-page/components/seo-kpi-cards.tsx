"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Eye, MousePointerClick, Target, TrendingUp } from "lucide-react";
import { ChangeIndicator, getCtrQuality, getPositionQuality } from "../utils";
import type { SeoKpiCardsProps } from "../types";

/**
 * Main KPI cards for SEO metrics
 */
export function SeoKpiCards({ data }: SeoKpiCardsProps) {
  const ctrQuality = getCtrQuality(data.avgCtr);
  const positionQuality = getPositionQuality(data.avgPosition);

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <TooltipProvider>
        {/* Impressions */}
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

        {/* Clicks */}
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

        {/* CTR */}
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
              <span className={`text-xs ${ctrQuality.color}`}>
                {ctrQuality.label}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Position */}
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
              <span className={`text-xs ${positionQuality.color}`}>
                {positionQuality.label}
              </span>
            </div>
          </CardContent>
        </Card>
      </TooltipProvider>
    </div>
  );
}
