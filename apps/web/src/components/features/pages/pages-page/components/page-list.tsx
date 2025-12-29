"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FileText, Plus, Search } from "lucide-react";
import { PageListItem } from "./page-list-item";
import type { PageListProps } from "../types";

interface PageListComponentProps extends PageListProps {
  onSearchChange: (value: string) => void;
}

/**
 * Pages list container with search and empty state
 */
export function PageList({
  pages,
  searchQuery,
  websiteSlug,
  draggedPageId,
  dragOverPageId,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd,
  onEdit,
  onDuplicate,
  onToggleVisibility,
  onDelete,
  onCreateNew,
  onSearchChange,
}: PageListComponentProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Liste des pages
            </CardTitle>
            <CardDescription className="mt-1">
              Organisez et gérez les pages de votre site
            </CardDescription>
          </div>
        </div>
        {/* Search bar */}
        <div className="relative mt-4">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher une page..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>
      </CardHeader>
      <CardContent>
        {pages.length === 0 ? (
          <div className="text-center py-12">
            {searchQuery ? (
              <>
                <Search className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                <p className="text-muted-foreground">Aucune page trouvée</p>
                <p className="text-sm text-muted-foreground">
                  Essayez avec un autre terme de recherche
                </p>
              </>
            ) : (
              <>
                <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                <p className="font-medium mb-2">Aucune page</p>
                <p className="text-sm text-muted-foreground mb-4">
                  Commencez par créer votre première page
                </p>
                <Button onClick={onCreateNew}>
                  <Plus className="h-4 w-4 mr-2" />
                  Créer une page
                </Button>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {pages.map((page) => (
              <PageListItem
                key={page.id}
                page={page}
                websiteSlug={websiteSlug}
                draggedPageId={draggedPageId}
                dragOverPageId={dragOverPageId}
                onDragStart={onDragStart}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onDragEnd={onDragEnd}
                onEdit={onEdit}
                onDuplicate={onDuplicate}
                onToggleVisibility={onToggleVisibility}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
