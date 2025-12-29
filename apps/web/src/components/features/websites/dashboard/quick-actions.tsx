"use client"

import { 
  Edit, 
  FileText, 
  Puzzle, 
  HardDrive, 
  Palette, 
  BarChart3, 
  Settings 
} from "lucide-react";
import { Link } from "@/components/app-router";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { QuickActionsProps } from "./types";

/**
 * Quick action buttons for common dashboard operations
 */
export function QuickActions({ websiteId, pagesCount, enabledExtensionsCount }: QuickActionsProps) {
  return (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-hide">
          <Link
            href={`/app/${websiteId}/studio`}
            className="group flex items-center gap-2.5 px-4 py-2.5 rounded-full border bg-card hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all shrink-0"
          >
            <Edit className="h-4 w-4" />
            <span className="text-sm font-medium">Studio</span>
          </Link>
          
          <Link
            href={`/app/${websiteId}/pages`}
            className="group flex items-center gap-2.5 px-4 py-2.5 rounded-full border bg-card hover:bg-indigo-500 hover:text-white hover:border-indigo-500 transition-all shrink-0"
          >
            <FileText className="h-4 w-4" />
            <span className="text-sm font-medium">Pages</span>
            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 group-hover:bg-card/20 group-hover:text-white">{pagesCount}</Badge>
          </Link>
          
          <Link
            href={`/app/${websiteId}/extensions`}
            className="group flex items-center gap-2.5 px-4 py-2.5 rounded-full border bg-card hover:bg-violet-500 hover:text-white hover:border-violet-500 transition-all shrink-0"
          >
            <Puzzle className="h-4 w-4" />
            <span className="text-sm font-medium">Extensions</span>
            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 group-hover:bg-card/20 group-hover:text-white">{enabledExtensionsCount}</Badge>
          </Link>
          
          <Link
            href={`/app/${websiteId}/cloud`}
            className="group flex items-center gap-2.5 px-4 py-2.5 rounded-full border bg-card hover:bg-emerald-500 hover:text-white hover:border-emerald-500 transition-all shrink-0"
          >
            <HardDrive className="h-4 w-4" />
            <span className="text-sm font-medium">Médias</span>
          </Link>
          
          <Link
            href={`/app/${websiteId}/theme`}
            className="group flex items-center gap-2.5 px-4 py-2.5 rounded-full border bg-card hover:bg-pink-500 hover:text-white hover:border-pink-500 transition-all shrink-0"
          >
            <Palette className="h-4 w-4" />
            <span className="text-sm font-medium">Thème</span>
          </Link>
          
          <Link
            href={`/app/${websiteId}/analytics`}
            className="group flex items-center gap-2.5 px-4 py-2.5 rounded-full border bg-card hover:bg-blue-500 hover:text-white hover:border-blue-500 transition-all shrink-0"
          >
            <BarChart3 className="h-4 w-4" />
            <span className="text-sm font-medium">Analytics</span>
          </Link>
          
          <Link
            href={`/app/${websiteId}/settings`}
            className="group flex items-center gap-2.5 px-4 py-2.5 rounded-full border bg-card hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all shrink-0"
          >
            <Settings className="h-4 w-4" />
            <span className="text-sm font-medium">Paramètres</span>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
