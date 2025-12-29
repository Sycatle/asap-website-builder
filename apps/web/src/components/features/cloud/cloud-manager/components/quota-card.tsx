"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { HardDrive } from "lucide-react";
import { formatBytes } from "@/lib/utils/formatters";
import type { QuotaCardProps } from "../types";

/**
 * Storage quota card showing usage and limits
 */
export function QuotaCard({ quota }: QuotaCardProps) {
  return (
    <Card className="animate-fade-in-up" style={{ animationDelay: '0.05s', animationFillMode: 'both' }}>
      <CardHeader className="pb-2 px-4 sm:px-6">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HardDrive className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>Quota de stockage total disponible</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <span className="hidden xs:inline">Espace de stockage</span>
            <span className="xs:hidden">Stockage</span>
          </CardTitle>
          <span className="text-xs sm:text-sm text-muted-foreground">
            {formatBytes(quota.total_size_used)} / {formatBytes(quota.quota_limit)}
          </span>
        </div>
      </CardHeader>
      <CardContent className="px-4 sm:px-6">
        <Progress 
          value={quota.usage_percentage ?? 0} 
          className={`h-1.5 sm:h-2 transition-all duration-500 ${(quota.usage_percentage ?? 0) > 80 ? '[&>div]:bg-destructive' : ''}`}
        />
        <p className="mt-1.5 sm:mt-2 text-[10px] sm:text-xs text-muted-foreground">
          {(quota.usage_percentage ?? 0).toFixed(1)}% utilisé · {formatBytes(quota.remaining)} restant
        </p>
      </CardContent>
    </Card>
  );
}
