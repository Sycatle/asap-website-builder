"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search } from "lucide-react";
import { RankBadge, PositionIndicator } from "../utils";
import type { QueriesTabProps } from "../types";

/**
 * Queries tab showing top search terms
 */
export function QueriesTab({ queries }: QueriesTabProps) {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Search className="h-5 w-5 text-primary" />
            Requêtes de recherche
          </CardTitle>
          <CardDescription>
            Les termes de recherche qui amènent les visiteurs sur votre site
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 text-sm font-medium text-muted-foreground">Requête</th>
                  <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Impressions</th>
                  <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Clics</th>
                  <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">CTR</th>
                  <th className="text-right py-3 px-2 text-sm font-medium text-muted-foreground">Position</th>
                </tr>
              </thead>
              <tbody>
                {queries.map((query, index) => (
                  <tr key={query.query} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        <RankBadge rank={index + 1} />
                        <span className="font-medium">{query.query}</span>
                      </div>
                    </td>
                    <td className="text-right py-3 px-2 text-muted-foreground">
                      {query.impressions.toLocaleString()}
                    </td>
                    <td className="text-right py-3 px-2 font-medium">
                      {query.clicks.toLocaleString()}
                    </td>
                    <td className="text-right py-3 px-2">
                      <span className={
                        parseFloat(query.ctr) >= 5 ? 'text-green-600' : 
                        parseFloat(query.ctr) >= 2 ? 'text-amber-600' : 
                        'text-muted-foreground'
                      }>
                        {query.ctr}%
                      </span>
                    </td>
                    <td className="text-right py-3 px-2">
                      <PositionIndicator position={query.position} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
