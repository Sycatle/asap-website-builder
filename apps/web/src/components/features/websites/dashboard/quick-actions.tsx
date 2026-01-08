"use client"

import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation(['common', 'dashboard']);

  return (
    <Card className="shadow-sm border-dashed bg-card/50">
      <CardContent className="p-3 sm:p-4">
        <div className="flex items-center gap-2 sm:gap-3 overflow-x-auto pb-1 scrollbar-hide">
          <Link
            href={`/${websiteId}/studio`}
            className="group flex items-center gap-2.5 px-4 py-2.5 rounded-full border bg-card hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all shrink-0"
          >
            <Edit className="h-4 w-4" />
            <span className="text-sm font-medium">{t('dashboard:dashboard.quickActions.studio')}</span>
          </Link>
          
          <Link
            href={`/${websiteId}/pages`}
            className="group flex items-center gap-2.5 px-4 py-2.5 rounded-full border bg-card hover:bg-indigo-500 hover:text-white hover:border-indigo-500 transition-all shrink-0"
          >
            <FileText className="h-4 w-4" />
            <span className="text-sm font-medium">{t('dashboard:dashboard.quickActions.pages')}</span>
            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 group-hover:bg-card/20 group-hover:text-white">{pagesCount}</Badge>
          </Link>
          
          <Link
            href={`/${websiteId}/extensions`}
            className="group flex items-center gap-2.5 px-4 py-2.5 rounded-full border bg-card hover:bg-violet-500 hover:text-white hover:border-violet-500 transition-all shrink-0"
          >
            <Puzzle className="h-4 w-4" />
            <span className="text-sm font-medium">{t('dashboard:dashboard.quickActions.extensions')}</span>
            <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 group-hover:bg-card/20 group-hover:text-white">{enabledExtensionsCount}</Badge>
          </Link>
          
          <Link
            href={`/${websiteId}/cloud`}
            className="group flex items-center gap-2.5 px-4 py-2.5 rounded-full border bg-card hover:bg-emerald-500 hover:text-white hover:border-emerald-500 transition-all shrink-0"
          >
            <HardDrive className="h-4 w-4" />
            <span className="text-sm font-medium">{t('dashboard:dashboard.quickActions.medias')}</span>
          </Link>
          
          <Link
            href={`/${websiteId}/theme`}
            className="group flex items-center gap-2.5 px-4 py-2.5 rounded-full border bg-card hover:bg-pink-500 hover:text-white hover:border-pink-500 transition-all shrink-0"
          >
            <Palette className="h-4 w-4" />
            <span className="text-sm font-medium">{t('dashboard:dashboard.quickActions.theme')}</span>
          </Link>
          
          <Link
            href={`/${websiteId}/analytics`}
            className="group flex items-center gap-2.5 px-4 py-2.5 rounded-full border bg-card hover:bg-blue-500 hover:text-white hover:border-blue-500 transition-all shrink-0"
          >
            <BarChart3 className="h-4 w-4" />
            <span className="text-sm font-medium">{t('dashboard:dashboard.quickActions.analytics')}</span>
          </Link>
          
          <Link
            href={`/${websiteId}/settings`}
            className="group flex items-center gap-2.5 px-4 py-2.5 rounded-full border bg-card hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all shrink-0"
          >
            <Settings className="h-4 w-4" />
            <span className="text-sm font-medium">{t('dashboard:dashboard.quickActions.settings')}</span>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
