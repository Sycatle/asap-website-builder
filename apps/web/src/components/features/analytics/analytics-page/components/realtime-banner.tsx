"use client"

import { Card, CardContent } from "@/components/ui/card";
import type { RealtimeBannerProps } from "../types";

/**
 * Real-time analytics banner showing live visitors
 */
export function RealtimeBanner({ realtime }: RealtimeBannerProps) {
  return (
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
              <p className="text-2xl font-bold text-green-600">{realtime.activeUsers}</p>
              <p className="text-xs text-muted-foreground">visiteurs actifs</p>
            </div>
          </div>
          <div className="flex gap-8">
            <div className="text-center">
              <p className="text-lg font-semibold">{realtime.pageViewsPerMin}</p>
              <p className="text-xs text-muted-foreground">pages/min</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold">{realtime.avgLoadTime}s</p>
              <p className="text-xs text-muted-foreground">temps de chargement</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
