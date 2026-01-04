"use client"

import { useTranslation } from 'react-i18next';
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
} from "@/components/ui/context-menu";
import { 
  Trash2,
  Download,
  CheckCircle2,
  Eye,
  ExternalLink,
  Link2,
  FolderInput,
  Globe,
  Lock,
  Users,
  Pencil,
} from "lucide-react";
import { formatBytes } from "@/lib/utils/formatters";
import { isImage, getFileIcon, getFileTypeLabel } from "@/components/shared/file-utils";
import type { FileCardProps } from "../types";
import type { FileVisibility, FileFolder } from "@/lib/types";

/**
 * Visibility icon helper
 */
function getVisibilityIcon(visibility: FileVisibility | undefined) {
  switch (visibility) {
    case 'public':
      return <Globe className="h-3 w-3" />;
    case 'website':
      return <Users className="h-3 w-3" />;
    case 'private':
    default:
      return <Lock className="h-3 w-3" />;
  }
}

/**
 * File card component for grid view - simplified UX
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
  onMoveToFolder,
  onChangeVisibility,
  onRename,
  folders = [],
  getItemProps,
  getFileUrl,
  selectedIds,
}: FileCardProps & { selectedIds?: Set<string> }) {
  const { t } = useTranslation(['common', 'dashboard']);
  const itemProps = getItemProps(file, index);

  // Drag handler - include all selected files if this file is selected
  const handleDragStart = (e: React.DragEvent) => {
    const fileIds = selectedIds && selectedIds.has(file.id) && selectedIds.size > 1
      ? Array.from(selectedIds)
      : [file.id];
    e.dataTransfer.setData('application/x-file-ids', JSON.stringify(fileIds));
    e.dataTransfer.effectAllowed = 'move';
  };
  
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <Card
          tabIndex={itemProps.tabIndex}
          data-focused={itemProps['data-focused']}
          data-selected={itemProps['data-selected']}
          draggable
          onDragStart={handleDragStart}
          className={`group cursor-pointer hover:shadow-md transition-shadow overflow-hidden outline-none focus-visible:ring-2 focus-visible:ring-ring ${
            isSelected ? 'ring-2 ring-primary' : ''
          } ${isFocused ? 'ring-2 ring-ring' : ''}`}
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
            className={`absolute top-2 left-2 z-10 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelection();
            }}
          >
            <div className={`h-5 w-5 rounded border-2 flex items-center justify-center cursor-pointer ${
              isSelected ? 'bg-primary border-primary' : 'bg-background/80 border-muted-foreground/30'
            }`}>
              {isSelected && <CheckCircle2 className="h-3.5 w-3.5 text-primary-foreground" />}
            </div>
          </div>

          {/* Preview Thumbnail */}
          <div className="aspect-square bg-muted relative overflow-hidden">
            {isImage(file.mime_type) ? (
              <img
                src={getFileUrl(file.id)}
                alt={file.filename}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                {getFileIcon(file.mime_type, "h-10 w-10")}
              </div>
            )}
            {/* Visibility Badge - only show if not website default */}
            {file.visibility && file.visibility !== 'website' && (
              <div className="absolute top-2 right-2">
                <Badge variant="secondary" className="h-5 px-1.5 text-[10px] gap-1">
                  {getVisibilityIcon(file.visibility)}
                </Badge>
              </div>
            )}
          </div>

          {/* File Info - simplified */}
          <CardContent className="p-2">
            <p className="text-xs font-medium truncate">{file.filename}</p>
            <span className="text-[10px] text-muted-foreground">
              {formatBytes(file.original_size)}
            </span>
          </CardContent>
        </Card>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-56">
        <ContextMenuItem onClick={onPreview}>
          <Eye className="mr-2 h-4 w-4" />
          {t('dashboard:cloud.contextMenu.preview')}
          <ContextMenuShortcut>Entrée</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem onClick={onCopyLink}>
          <Link2 className="mr-2 h-4 w-4" />
          {t('dashboard:cloud.contextMenu.copyLink')}
          <ContextMenuShortcut>⌘C</ContextMenuShortcut>
        </ContextMenuItem>
        <ContextMenuItem asChild>
          <a href={getFileUrl(file.id)} download className="flex items-center">
            <Download className="mr-2 h-4 w-4" />
            {t('dashboard:cloud.contextMenu.download')}
          </a>
        </ContextMenuItem>
        <ContextMenuItem asChild>
          <a href={getFileUrl(file.id)} target="_blank" rel="noopener noreferrer" className="flex items-center">
            <ExternalLink className="mr-2 h-4 w-4" />
            {t('dashboard:cloud.contextMenu.openNewTab')}
          </a>
        </ContextMenuItem>
        
        <ContextMenuSeparator />
        
        {/* Rename option */}
        <ContextMenuItem 
          onClick={() => {
            if (!onRename) return;
            const newName = prompt(t('common:prompts.enterNewName'), file.filename);
            if (newName && newName.trim() !== file.filename) {
              onRename(newName.trim());
            }
          }} 
          disabled={!onRename}
        >
          <Pencil className="mr-2 h-4 w-4" />
          {t('common:actions.rename')}
        </ContextMenuItem>
        
        {/* Move to folder submenu */}
        <ContextMenuSub>
          <ContextMenuSubTrigger disabled={!onMoveToFolder}>
            <FolderInput className="mr-2 h-4 w-4" />
            {t('dashboard:cloud.contextMenu.moveTo')}
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-48">
            <ContextMenuItem onClick={() => onMoveToFolder?.(null)}>
              {t('dashboard:cloud.folders.root')}
            </ContextMenuItem>
            {folders.length > 0 && <ContextMenuSeparator />}
            {folders.map((folder) => (
              <ContextMenuItem 
                key={folder.id} 
                onClick={() => onMoveToFolder?.(folder.id)}
              >
                {folder.name}
              </ContextMenuItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>
        
        {/* Visibility submenu */}
        <ContextMenuSub>
          <ContextMenuSubTrigger disabled={!onChangeVisibility}>
            {getVisibilityIcon(file.visibility)}
            <span className="ml-2">{t('dashboard:cloud.contextMenu.visibility')}</span>
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-40">
            <ContextMenuItem 
              onClick={() => onChangeVisibility?.('private')}
              className={file.visibility === 'private' ? 'bg-accent' : ''}
            >
              <Lock className="mr-2 h-4 w-4" />
              {t('dashboard:cloud.visibility.private')}
            </ContextMenuItem>
            <ContextMenuItem 
              onClick={() => onChangeVisibility?.('public')}
              className={file.visibility === 'public' ? 'bg-accent' : ''}
            >
              <Globe className="mr-2 h-4 w-4" />
              {t('dashboard:cloud.visibility.public')}
            </ContextMenuItem>
            <ContextMenuItem 
              onClick={() => onChangeVisibility?.('website')}
              className={file.visibility === 'website' ? 'bg-accent' : ''}
            >
              <Users className="mr-2 h-4 w-4" />
              {t('dashboard:cloud.visibility.website')}
            </ContextMenuItem>
          </ContextMenuSubContent>
        </ContextMenuSub>
        
        <ContextMenuSeparator />
        <ContextMenuItem 
          className="text-destructive focus:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          {t('common:actions.delete')}
          <ContextMenuShortcut>⌫</ContextMenuShortcut>
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
}
