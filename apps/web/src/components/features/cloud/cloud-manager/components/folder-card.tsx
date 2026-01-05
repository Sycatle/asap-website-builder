"use client"

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from "@/components/ui/card";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { 
  Folder,
  Trash2,
  Pencil,
  FolderOpen,
  FileIcon,
  Globe,
  Lock,
  FileText,
  Film,
  Music,
  FileCode,
  Archive,
} from "lucide-react";
import type { FileFolder, FileMetadata } from '@/lib/types';
import { isImage } from "@/components/shared/file-utils";

interface FolderCardProps {
  folder: FileFolder;
  index: number;
  isFocused: boolean;
  onOpen: () => void;
  onRename: () => void;
  onDelete: () => void;
  previewFiles?: FileMetadata[];
  getFileUrl?: (fileId: string) => string;
  onDropFiles?: (fileIds: string[], folderId: string) => void;
  onDropFolder?: (sourceFolderId: string, targetFolderId: string) => void;
}

/**
 * Folder card component for grid view
 */
export function FolderCard({
  folder,
  index,
  isFocused,
  onOpen,
  onRename,
  onDelete,
  previewFiles = [],
  getFileUrl,
  onDropFiles,
  onDropFolder,
}: FolderCardProps) {
  const { t } = useTranslation(['common', 'dashboard']);
  const [isDragOver, setIsDragOver] = useState(false);

  const getVisibilityIcon = () => {
    if (folder.website_id) {
      return <Globe className="h-3 w-3 text-blue-500" />;
    }
    return <Lock className="h-3 w-3 text-muted-foreground" />;
  };

  // Get icon for non-image files
  const getFileTypeIcon = (mimeType: string) => {
    if (mimeType.startsWith('video/')) return <Film className="h-full w-full text-purple-400" />;
    if (mimeType.startsWith('audio/')) return <Music className="h-full w-full text-green-400" />;
    if (mimeType.startsWith('text/') || mimeType.includes('json') || mimeType.includes('xml')) 
      return <FileCode className="h-full w-full text-blue-400" />;
    if (mimeType.includes('zip') || mimeType.includes('archive') || mimeType.includes('tar') || mimeType.includes('rar'))
      return <Archive className="h-full w-full text-orange-400" />;
    if (mimeType.includes('pdf') || mimeType.includes('document') || mimeType.includes('word'))
      return <FileText className="h-full w-full text-red-400" />;
    return <FileIcon className="h-full w-full text-muted-foreground" />;
  };

  // Take first 4 files for 2x2 preview
  const previewItems = previewFiles.slice(0, 4);

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const types = e.dataTransfer.types;
    if (types.includes('application/x-file-ids') || types.includes('application/x-folder-id')) {
      e.dataTransfer.dropEffect = 'move';
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    // Handle file drop
    const fileIdsJson = e.dataTransfer.getData('application/x-file-ids');
    if (fileIdsJson && onDropFiles) {
      try {
        const fileIds = JSON.parse(fileIdsJson) as string[];
        onDropFiles(fileIds, folder.id);
      } catch {
        // Invalid JSON
      }
      return;
    }

    // Handle folder drop
    const sourceFolderId = e.dataTransfer.getData('application/x-folder-id');
    if (sourceFolderId && onDropFolder && sourceFolderId !== folder.id) {
      onDropFolder(sourceFolderId, folder.id);
    }
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/x-folder-id', folder.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <Card
          tabIndex={0}
          draggable
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`group cursor-pointer hover:shadow-lg transition-all duration-300 hover:border-primary/50 hover:-translate-y-1 overflow-hidden animate-fade-in-up outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
            isFocused ? 'ring-2 ring-ring' : ''
          } ${isDragOver ? 'ring-2 ring-primary bg-primary/10 scale-105' : ''}`}
          style={{ 
            animationDelay: `${Math.min(index * 0.03, 0.3)}s`, 
            animationFillMode: 'both',
            backgroundColor: isDragOver ? undefined : (folder.color ? `${folder.color}10` : undefined),
          }}
          onClick={onOpen}
          onDoubleClick={onOpen}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              onOpen();
            }
          }}
          role="gridcell"
        >
          {/* Folder Preview - 2x2 grid or folder icon */}
          <div className="aspect-square bg-muted/50 relative overflow-hidden">
            {previewItems.length > 0 ? (
              <div className="absolute inset-1 grid grid-cols-2 grid-rows-2 gap-0.5 rounded overflow-hidden">
                {previewItems.map((file) => (
                  <div 
                    key={file.id} 
                    className="aspect-square bg-muted/80 overflow-hidden flex items-center justify-center"
                  >
                    {isImage(file.mime_type) && getFileUrl ? (
                      <img 
                        src={getFileUrl(file.id)} 
                        alt="" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-6 h-6 sm:w-8 sm:h-8">
                        {getFileTypeIcon(file.mime_type)}
                      </div>
                    )}
                  </div>
                ))}
                {/* Fill empty slots */}
                {Array.from({ length: 4 - previewItems.length }).map((_, i) => (
                  <div key={`empty-${i}`} className="aspect-square bg-muted/40" />
                ))}
              </div>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="transition-all duration-300 group-hover:scale-110">
                  <Folder 
                    className="h-12 w-12 sm:h-16 sm:w-16" 
                    style={{ color: folder.color || 'currentColor' }}
                    fill={folder.color ? `${folder.color}40` : 'transparent'}
                  />
                </div>
              </div>
            )}
            {/* Hover Overlay */}
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
              <FolderOpen className="h-6 w-6 text-white transform scale-0 group-hover:scale-100 transition-transform duration-300" />
            </div>
          </div>

          {/* Folder Info */}
          <CardContent className="p-2 sm:p-3">
            <div className="flex items-center gap-1.5">
              {folder.icon && <span className="text-sm">{folder.icon}</span>}
              <p className="text-xs sm:text-sm font-medium truncate flex-1">{folder.name}</p>
              {getVisibilityIcon()}
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1">
                <FileIcon className="h-3 w-3" />
                {folder.file_count} {t('dashboard:cloud.folders.files')}
              </span>
              {folder.subfolder_count > 0 && (
                <span className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1">
                  <Folder className="h-3 w-3" />
                  {folder.subfolder_count}
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      </ContextMenuTrigger>

      <ContextMenuContent className="w-48">
        <ContextMenuItem onClick={onOpen}>
          <FolderOpen className="h-4 w-4 mr-2" />
          {t('dashboard:cloud.folders.open')}
        </ContextMenuItem>
        <ContextMenuItem onClick={onRename}>
          <Pencil className="h-4 w-4 mr-2" />
          {t('common:rename')}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem 
          onClick={onDelete}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          {t('common:delete')}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
