"use client"

import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
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
  Copy,
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
import { formatBytes, formatDate } from "@/lib/utils/formatters";
import { getFileIcon } from "@/components/shared/file-utils";
import type { FileListItemProps } from "../types";
import type { FileVisibility } from "@/lib/types";

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
 * File list item component for list view
 */
export function FileListItem({
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
  copiedId,
}: FileListItemProps) {
  const { t } = useTranslation(['common', 'dashboard']);
  const itemProps = getItemProps(file, index);
  
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          tabIndex={itemProps.tabIndex}
          data-focused={itemProps['data-focused']}
          data-selected={itemProps['data-selected']}
          className={`group flex items-center gap-3 sm:gap-4 p-3 sm:p-4 hover:bg-accent/50 cursor-pointer transition-all duration-200 animate-fade-in-up outline-none focus-visible:bg-accent ${
            isSelected ? 'bg-primary/10 border-l-2 border-l-primary' : ''
          } ${isFocused ? 'bg-accent' : ''}`}
          style={{ animationDelay: `${index * 0.02}s`, animationFillMode: 'both' }}
          onFocus={itemProps.onFocus}
          onClick={(e) => {
            if (e.ctrlKey || e.metaKey || e.shiftKey) {
              itemProps.onClick(e);
            } else {
              onPreview();
            }
          }}
          onKeyDown={itemProps.onKeyDown}
          role="listitem"
        >
          {/* Selection checkbox */}
          <div 
            className={`shrink-0 transition-all duration-200 ${
              isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
            onClick={(e) => {
              e.stopPropagation();
              onToggleSelection();
            }}
          >
            <div className={`h-5 w-5 rounded-md border-2 flex items-center justify-center cursor-pointer transition-all duration-200 ${
              isSelected 
                ? 'bg-primary border-primary' 
                : 'bg-background border-muted-foreground/30 hover:border-primary/50'
            }`}>
              {isSelected && (
                <CheckCircle2 className="h-3.5 w-3.5 text-primary-foreground" />
              )}
            </div>
          </div>

          {/* File icon */}
          <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-muted shrink-0 transition-transform duration-200 hover:scale-110">
            {getFileIcon(file.mime_type, "h-4 w-4 sm:h-5 sm:w-5")}
          </div>

          {/* File info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm sm:text-base font-medium truncate">{file.filename}</p>
              {file.visibility && (
                <Badge 
                  variant={file.visibility === 'public' ? 'default' : 'secondary'} 
                  className="h-5 px-1.5 text-[10px] gap-1 shrink-0"
                >
                  {getVisibilityIcon(file.visibility)}
                </Badge>
              )}
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {formatBytes(file.original_size)} · {formatDate(file.created_at)}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 transition-all duration-200 hover:scale-110"
              onClick={(e) => {
                e.stopPropagation();
                onCopyLink();
              }}
            >
              {copiedId === file.id ? (
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              ) : (
                <Copy className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </div>
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
