"use client"

import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import type { EmptyStateProps } from "../types";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";

/**
 * Empty state when no files exist
 */
export function EmptyState({ onUploadClick }: EmptyStateProps) {
  return (
    <Empty className="border-2 border-dashed animate-fade-in-up" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
      <EmptyHeader>
        <EmptyMedia variant="icon" className="h-16 w-16 animate-bounce-subtle">
          <Upload className="h-8 w-8" />
        </EmptyMedia>
        <EmptyTitle>Aucun fichier</EmptyTitle>
        <EmptyDescription>
          Commencez par uploader votre premier fichier
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button className="group" onClick={onUploadClick}>
          <Upload className="h-4 w-4 mr-2 transition-transform group-hover:-translate-y-0.5" />
          Upload un fichier
        </Button>
      </EmptyContent>
    </Empty>
  );
}
