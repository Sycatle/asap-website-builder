"use client"

import { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { Website } from '@/lib/api';
import { websitesAPI } from '@/lib/api';
import { queryKeys } from '@/lib/query';
import { useQueryClient } from '@tanstack/react-query';
import { getWebsiteDisplayUrl, getWebsiteUrl } from '@/lib/utils/formatters';
import { openExternalUrl } from '@/lib/utils/security';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { 
  Globe, 
  ExternalLink,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  Rocket,
  CheckCircle2,
  Clock,
  Copy,
} from "lucide-react";
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface WebsiteCardProps {
  website: Website;
  onSelect?: (website: Website) => void;
}

export function WebsiteCard({ website, onSelect }: WebsiteCardProps) {
  const { t } = useTranslation(['common', 'dashboard']);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
  const queryClient = useQueryClient();

  const handleDelete = useCallback(async () => {
    setIsDeleting(true);
    
    try {
      await websitesAPI.delete(website.id);
      // Remove from cache via React Query
      queryClient.setQueryData<Website[]>(queryKeys.websites.all, (old) => {
        if (!old) return [];
        return old.filter(w => w.id !== website.id);
      });
      toast.success(t('dashboard:websites.toast.deleted'), {
        description: t('dashboard:websites.toast.deletedDescription', { title: website.title }),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : t('common:errors.generic');
      toast.error(t('dashboard:websites.toast.deleteError'), {
        description: message,
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  }, [website.id, website.title, queryClient, t]);

  const handlePublish = useCallback(async () => {
    setIsPublishing(true);
    
    const displayUrl = getWebsiteDisplayUrl(website.slug);
    const fullUrl = getWebsiteUrl(website.slug);
    
    try {
      await websitesAPI.publish(website.id);
      // Update cache via React Query
      queryClient.setQueryData<Website[]>(queryKeys.websites.all, (old) => {
        if (!old) return [];
        return old.map(w => w.id === website.id ? { ...w, status: 'published' } : w);
      });
      toast.success(t('dashboard:websites.toast.published'), {
        description: t('dashboard:websites.toast.publishedDescription', { url: displayUrl }),
        action: {
          label: t('dashboard:websites.card.view'),
          onClick: () => openExternalUrl(fullUrl),
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : t('common:errors.generic');
      toast.error(t('dashboard:websites.toast.publishError'), {
        description: message,
      });
    } finally {
      setIsPublishing(false);
    }
  }, [website, queryClient, t]);

  const handleCopyUrl = useCallback(() => {
    const url = getWebsiteUrl(website.slug);
    navigator.clipboard.writeText(url);
    toast.success(t('dashboard:websites.toast.urlCopied'), {
      description: url,
    });
  }, [website.slug, t]);

  const isPublished = website.status === 'published';
  const createdAt = website.created_at ? new Date(website.created_at) : new Date();
  const displayUrl = getWebsiteDisplayUrl(website.slug);
  const fullUrl = getWebsiteUrl(website.slug);

  return (
    <>
      <Card className="group relative overflow-hidden hover:shadow-lg transition-all duration-300">
        {/* Gradient background effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
        
        <CardHeader className="pb-2 relative">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center transition-transform duration-200 group-hover:scale-105 cursor-default">
                    <Globe className="h-5 w-5 text-primary" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p>{displayUrl}</p>
                </TooltipContent>
              </Tooltip>
              {isPublished ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-500/20 cursor-default">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      {t('dashboard:websites.status.online')}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>{t('dashboard:websites.card.publicTooltip')}</p>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="secondary" className="cursor-default">
                      <Clock className="w-3 h-3 mr-1" />
                      {t('dashboard:websites.status.draft')}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>{t('dashboard:websites.card.draftTooltip')}</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                  aria-label={t('common:actions.actions')}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => onSelect?.(website)}>
                  <Edit className="h-4 w-4 mr-2" />
                  {t('common:actions.edit')}
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href={fullUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    {t('dashboard:websites.card.view')}
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCopyUrl}>
                  <Copy className="h-4 w-4 mr-2" />
                  {t('dashboard:websites.card.copyUrl')}
                </DropdownMenuItem>
                {!isPublished && (
                  <DropdownMenuItem onClick={handlePublish} disabled={isPublishing}>
                    {isPublishing ? (
                      <Spinner className="h-4 w-4 mr-2" />
                    ) : (
                      <Rocket className="h-4 w-4 mr-2" />
                    )}
                    {t('dashboard:websites.card.publish')}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-destructive focus:text-destructive"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('common:actions.delete')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <div className="mt-3">
            <CardTitle className="text-lg line-clamp-1">{website.title || t('dashboard:websites.card.untitled')}</CardTitle>
            <CardDescription className="mt-1 line-clamp-1">
              <span className="font-mono text-xs">{displayUrl}</span>
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="pt-2 relative">
          {website.tagline && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
              {website.tagline}
            </p>
          )}
          
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              Créé {formatDistanceToNow(createdAt, { addSuffix: true, locale: fr })}
            </span>
            
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8"
                onClick={() => onSelect?.(website)}
              >
                <Eye className="h-3.5 w-3.5 mr-1.5" />
                {t('dashboard:websites.card.edit')}
              </Button>
              {!isPublished && (
                <Button 
                  size="sm" 
                  className="h-8 bg-green-600 hover:bg-green-700"
                  onClick={handlePublish}
                  disabled={isPublishing}
                >
                  {isPublishing ? (
                    <Spinner className="h-3.5 w-3.5" />
                  ) : (
                    <>
                      <Rocket className="h-3.5 w-3.5 mr-1.5" />
                      {t('dashboard:websites.card.publish')}
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('dashboard:websites.card.confirmDelete')}</AlertDialogTitle>
            <AlertDialogDescription>
              <span dangerouslySetInnerHTML={{ __html: t('dashboard:websites.card.confirmDeleteDescription', { title: website.title }) }} />
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t('common:actions.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Spinner className="h-4 w-4 mr-2" />
                  {t('dashboard:websites.card.deleting')}
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t('common:actions.delete')}
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
