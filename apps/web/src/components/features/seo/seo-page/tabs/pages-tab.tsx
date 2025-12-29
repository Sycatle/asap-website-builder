"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Globe, CheckCircle2, Clock, XCircle } from "lucide-react";
import { RankBadge, PositionIndicator } from "../utils";
import type { PagesTabProps } from "../types";

/**
 * Pages tab showing indexed pages and their performance
 */
export function PagesTab({ pages, indexingStatus, sitemapStatus }: PagesTabProps) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-12">
        {/* Pages Table */}
        <Card className="lg:col-span-8">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Pages dans les résultats de recherche
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Page</th>
                    <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Impressions</th>
                    <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Clics</th>
                    <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">CTR</th>
                    <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Position</th>
                  </tr>
                </thead>
                <tbody>
                  {pages.map((page, index) => (
                    <tr key={page.path} className="border-b last:border-0 hover:bg-muted/50">
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <RankBadge rank={index + 1} />
                          <div>
                            <p className="font-medium">{page.title}</p>
                            <p className="text-xs text-muted-foreground">{page.path}</p>
                          </div>
                        </div>
                      </td>
                      <td className="text-right py-3 px-2 text-muted-foreground">
                        {page.impressions.toLocaleString()}
                      </td>
                      <td className="text-right py-3 px-2 font-medium">
                        {page.clicks.toLocaleString()}
                      </td>
                      <td className="text-right py-3 px-2">
                        <span className={
                          parseFloat(page.ctr) >= 5 ? 'text-green-600' : 
                          parseFloat(page.ctr) >= 2 ? 'text-amber-600' : 
                          'text-muted-foreground'
                        }>
                          {page.ctr}%
                        </span>
                      </td>
                      <td className="text-right py-3 px-2">
                        <PositionIndicator position={page.position} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Indexing Status */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Globe className="h-5 w-5 text-primary" />
              Indexation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                  <span>Pages indexées</span>
                </div>
                <span className="font-bold text-green-600">{indexingStatus.indexed}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <div className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-amber-600" />
                  <span>En attente</span>
                </div>
                <span className="font-bold text-amber-600">{indexingStatus.notIndexed}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted border">
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-muted-foreground" />
                  <span>Exclues</span>
                </div>
                <span className="font-bold">{indexingStatus.excluded}</span>
              </div>
            </div>

            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium mb-3">Sitemap</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Dernière soumission</span>
                  <span>{sitemapStatus.lastSubmitted}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">URLs dans sitemap</span>
                  <span>{sitemapStatus.urls}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">URLs indexées</span>
                  <span className="text-green-600">{sitemapStatus.indexed}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
