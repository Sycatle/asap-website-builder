"use client"

import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { formatDuration } from "../utils";
import type { TopPagesTableProps } from "../types";

/**
 * Top pages table showing most viewed content
 */
export function TopPagesTable({ pages }: TopPagesTableProps) {
  const { t } = useTranslation(['common', 'dashboard']);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          {t('dashboard:analytics.topPages.title')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">{t('dashboard:analytics.topPages.page')}</th>
                <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">{t('dashboard:analytics.topPages.views')}</th>
                <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">{t('dashboard:analytics.topPages.uniqueViews')}</th>
                <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">{t('dashboard:analytics.topPages.avgTime')}</th>
                <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">{t('dashboard:analytics.topPages.bounce')}</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((page, index) => (
                <tr key={page.path} className="border-b last:border-0 hover:bg-muted/50">
                  <td className="py-3 px-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold w-5 h-5 rounded flex items-center justify-center ${
                        index === 0 ? 'bg-amber-500/20 text-amber-600' :
                        index === 1 ? 'bg-zinc-300/30 text-zinc-500 dark:bg-zinc-600/30 dark:text-zinc-400' :
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
  );
}
