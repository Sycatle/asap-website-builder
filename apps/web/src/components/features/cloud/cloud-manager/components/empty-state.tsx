"use client"

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import type { EmptyStateProps } from "../types";

/**
 * Empty state when no files exist
 */
export function EmptyState({ onUploadClick }: EmptyStateProps) {
  return (
    <Card className="border-dashed animate-fade-in-up" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
      <CardContent className="flex flex-col items-center justify-center py-12">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted animate-bounce-subtle">
          <Upload className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="mt-4 text-lg font-semibold">Aucun fichier</h3>
        <p className="mt-2 text-sm text-muted-foreground">
          Commencez par uploader votre premier fichier
        </p>
        <Button className="mt-4 group" onClick={onUploadClick}>
          <Upload className="h-4 w-4 mr-2 transition-transform group-hover:-translate-y-0.5" />
          Upload un fichier
        </Button>
      </CardContent>
    </Card>
  );
}
