"use client"

import { useTranslation } from 'react-i18next';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { getPagePath, getPageIcon } from "@/lib/utils/pages";
import { 
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Home,
  GripVertical,
  ExternalLink,
  Copy,
  Link as LinkIcon,
} from "lucide-react";
import type { PageListItemProps } from "../types";
import { PUBLIC_DOMAIN } from "../types";

/**
 * Individual page list item with drag & drop and actions
 */
export function PageListItem({
  page,
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
}: PageListItemProps) {
  const { t } = useTranslation(['common', 'dashboard']);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, page.id)}
      onDragOver={(e) => onDragOver(e, page.id)}
      onDragLeave={onDragLeave}
      onDrop={(e) => onDrop(e, page.id)}
      onDragEnd={onDragEnd}
      className={cn(
        "flex items-center gap-4 p-4 rounded-lg border transition-all hover:bg-accent/50 group",
        dragOverPageId === page.id && "border-primary bg-accent",
        draggedPageId === page.id && "opacity-50"
      )}
    >
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <GripVertical className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 cursor-grab flex-shrink-0" />
          </TooltipTrigger>
          <TooltipContent>
            <p>{t('dashboard:pages.item.dragTooltip')}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      <div className="text-2xl flex-shrink-0">{getPageIcon(page.slug)}</div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h3 className={cn(
            "font-medium truncate",
            !page.visible && "text-muted-foreground"
          )}>
            {page.title}
          </h3>
          {page.is_homepage && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="secondary" className="text-xs cursor-help">
                    <Home className="h-3 w-3 mr-1" />
                    {t('dashboard:pages.item.home')}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('dashboard:pages.item.homepageTooltip')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {!page.visible && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 cursor-help">
                    <EyeOff className="h-3 w-3 mr-1" />
                    {t('dashboard:pages.item.hidden')}
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('dashboard:pages.item.hiddenTooltip')}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <LinkIcon className="h-3 w-3" />
            {getPagePath(page)}
          </span>
          {page.description && (
            <span className="truncate">{page.description}</span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {websiteSlug && page.visible && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                >
                  <a 
                    href={`https://${websiteSlug}.${PUBLIC_DOMAIN}${getPagePath(page)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{t('dashboard:pages.item.viewTooltip')}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => onEdit(page)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    {t('dashboard:pages.actions.edit')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onDuplicate(page)}>
                    <Copy className="h-4 w-4 mr-2" />
                    {t('dashboard:pages.actions.duplicate')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onToggleVisibility(page)}>
                    {page.visible ? (
                      <>
                        <EyeOff className="h-4 w-4 mr-2" />
                        {t('dashboard:pages.actions.hide')}
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4 mr-2" />
                        {t('dashboard:pages.actions.show')}
                      </>
                    )}
                  </DropdownMenuItem>
                  {websiteSlug && (
                    <DropdownMenuItem asChild>
                      <a 
                        href={`https://${websiteSlug}.${PUBLIC_DOMAIN}${getPagePath(page)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        {t('dashboard:pages.actions.view')}
                      </a>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <DropdownMenuItem 
                            onClick={() => onDelete(page)}
                            className="text-destructive focus:text-destructive"
                            disabled={page.is_homepage}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t('dashboard:pages.actions.delete')}
                          </DropdownMenuItem>
                        </div>
                      </TooltipTrigger>
                      {page.is_homepage && (
                        <TooltipContent>
                          <p>{t('dashboard:pages.actions.deleteDisabled')}</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                </DropdownMenuContent>
              </DropdownMenu>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t('dashboard:pages.item.actionsTooltip')}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </div>
  );
}
