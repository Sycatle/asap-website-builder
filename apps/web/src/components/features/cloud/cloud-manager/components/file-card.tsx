"use client"

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { 
  Trash2,
  Download,
  CheckCircle2,
  Eye,
  ExternalLink,
  Link2
} from "lucide-react";
import { formatBytes } from "@/lib/utils/formatters";
import { isImage, getFileIcon, getFileTypeLabel } from "@/components/shared/file-utils";
import type { FileCardProps } from "../types";

/**
 * File card component for grid view
 */
export function FileCard({
  file,
  index,
  isSelected,
  isFocused,
  onPreview,
  onDelete,
  onCopyLink,
  onToggleSelection,
  getItemProps,
  getFileUrl,
}: FileCardProps) {
  const itemProps = getItemProps(file, index);
  
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <Card
          tabIndex={itemProps.tabIndex}
          data-focused={itemProps['data-focused']}
          data-selected={itemProps['data-selected']}
          className={`group cursor-pointer hover:shadow-lg transition-all duration-300 hover:border-primary/50 hover:-translate-y-1 overflow-hidden animate-fade-in-up outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
            isSelected ? 'ring-2 ring-primary border-primary bg-primary/5 scale-[0.98]' : ''
          } ${isFocused ? 'ring-2 ring-ring' : ''}`}
          style={{ animationDelay: `${Math.min(index * 0.03, 0.3)}s`, animationFillMode: 'both' }}
          onFocus={itemProps.onFocus}
          onClick={(e) => {
            if (e.ctrlKey || e.metaKey || e.shiftKey) {
              itemProps.onClick(e);
            } else {
              onPreview();
            }
          }}
          onKeyDown={itemProps.onKeyDown}
          role="gridcell"
        >
          {/* Selection checkbox */}
          <div 
            className={`absolute top-2 left-2 z-10 transition-all duration-200 ${
              isSelected ? 'opacity-100 scale-100' : 'opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100'
            }`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelection();
            }}
          >
            <div className={`h-5 w-5 rounded-md border-2 flex items-center justify-center cursor-pointer transition-all duration-200 ${
              isSelected 
                ? 'bg-primary border-primary' 
                : 'bg-background/80 backdrop-blur-sm border-muted-foreground/30 hover:border-primary/50 hover:bg-background'
            }`}>
              {isSelected && (
                <CheckCircle2 className="h-3.5 w-3.5 text-primary-foreground" />
              )}
            </div>
          </div>

          {/* Preview Thumbnail */}
          <div className="aspect-square bg-muted relative overflow-hidden">
            {isImage(file.mime_type) ? (
              <img
                src={getFileUrl(file.id)}
                alt={file.filename}
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                {getFileIcon(file.mime_type, "h-8 w-8 sm:h-12 sm:w-12")}
              </div>
            )}
            {/* Hover Overlay */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
              <Eye className="h-5 w-5 sm:h-6 sm:w-6 text-white transform scale-0 group-hover:scale-100 transition-transform duration-300" />
            </div>
          </div>

          {/* File Info */}
          <CardContent className="p-2 sm:p-3">
            <p className="text-xs sm:text-sm font-medium truncate">{file.filename}</p>
            <div className="flex items-center justify-between mt-1">
              <Badge variant="outline" className="text-[10px] sm:text-xs px-1.5 sm:px-2 transition-colors group-hover:bg-primary/10">
                {getFileTypeLabel(file.mime_type)}
              </Badge>
              <span className="text-[10px] sm:text-xs text-muted-foreground">
                {formatBytes(file.original_size)}
              </span>
            </div>
          </CardContent>
        </Card>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-52">
        <ContextMenuItem onClick={onPreview}>
          <Eye className="mr-2 h-4 w-4" />
          Aperçu
          <ContextMenuShortcut>Entrée</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onClick={onCopyLink}>
          <Link2 className="mr-2 h-4 w-4" />
          Copier le lien
          <ContextMenuShortcut>⌘C</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem asChild>
          <a href={getFileUrl(file.id)} download className="flex items-center">
            <Download className="mr-2 h-4 w-4" />
            Télécharger
          </a>
        </ContextMenuItem>
        <ContextMenuItem asChild>
          <a href={getFileUrl(file.id)} target="_blank" rel="noopener noreferrer" className="flex items-center">
            <ExternalLink className="mr-2 h-4 w-4" />
            Ouvrir dans un nouvel onglet
          </a>
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem 
          className="text-destructive focus:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Supprimer
          <ContextMenuShortcut>⌫</ContextMenuShortcut>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
