"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Layers, CheckCircle2, Clock, Home } from "lucide-react";
import type { StatsCardsProps } from "../types";

/**
 * Statistics cards showing page counts
 */
export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <TooltipProvider>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total des pages</CardTitle>
            <Tooltip>
              <TooltipTrigger asChild>
                <Layers className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Nombre total de pages créées</p>
              </TooltipContent>
            </Tooltip>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Pages sur votre site
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pages publiées</CardTitle>
            <Tooltip>
              <TooltipTrigger asChild>
                <CheckCircle2 className="h-4 w-4 text-green-500 cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Pages visibles publiquement</p>
              </TooltipContent>
            </Tooltip>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.published}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Visibles sur le site
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Brouillons</CardTitle>
            <Tooltip>
              <TooltipTrigger asChild>
                <Clock className="h-4 w-4 text-amber-500 cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Pages masquées non visibles</p>
              </TooltipContent>
            </Tooltip>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.draft}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Pages non publiées
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Page d'accueil</CardTitle>
            <Tooltip>
              <TooltipTrigger asChild>
                <Home className="h-4 w-4 text-primary cursor-help" />
              </TooltipTrigger>
              <TooltipContent>
                <p>Page principale du site (URL: /)</p>
              </TooltipContent>
            </Tooltip>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.homepage}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Page principale
            </p>
          </CardContent>
        </Card>
      </TooltipProvider>
    </div>
  );
}
