"use client"

import { useState, useCallback } from 'react';
import type { Website } from '@/lib/api';
import { websitesAPI } from '@/lib/api';
import { queryKeys } from '@/lib/query';
import { useQueryClient } from '@tanstack/react-query';
import { getWebsiteDisplayUrl, getWebsiteUrl } from '@/lib/utils/formatters';
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
  Loader2,
  Copy,
} from "lucide-react";
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface WebsiteCardProps {
  website: Website;
  onSelect?: (website: Website) => void;
}

export function WebsiteCard({ website, onSelect }: WebsiteCardProps) {
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
      toast.success('Site supprimé avec succès', {
        description: `Le site "${website.title}" a été supprimé définitivement.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Une erreur est survenue';
      toast.error('Erreur lors de la suppression du site', {
        description: message,
      });
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  }, [website.id, website.title, queryClient]);

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
      toast.success('Site publié avec succès !', {
        description: `Votre site est maintenant accessible à l'adresse ${displayUrl}`,
        action: {
          label: 'Voir le site',
          onClick: () => window.open(fullUrl, '_blank'),
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Une erreur est survenue';
      toast.error('Erreur lors de la publication', {
        description: message,
      });
    } finally {
      setIsPublishing(false);
    }
  }, [website, queryClient]);

  const handleCopyUrl = useCallback(() => {
    const url = getWebsiteUrl(website.slug);
    navigator.clipboard.writeText(url);
    toast.success('URL copiée !', {
      description: url,
    });
  }, [website.slug]);

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
                      En ligne
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>Ce site est accessible publiquement</p>
                  </TooltipContent>
                </Tooltip>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="secondary" className="cursor-default">
                      <Clock className="w-3 h-3 mr-1" />
                      Brouillon
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>Ce site n'est pas encore publié</p>
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
                  aria-label="Actions du site"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => onSelect?.(website)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Modifier
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href={fullUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Voir le site
                  </a>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleCopyUrl}>
                  <Copy className="h-4 w-4 mr-2" />
                  Copier l'URL
                </DropdownMenuItem>
                {!isPublished && (
                  <DropdownMenuItem onClick={handlePublish} disabled={isPublishing}>
                    {isPublishing ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Rocket className="h-4 w-4 mr-2" />
                    )}
                    Publier
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-destructive focus:text-destructive"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          
          <div className="mt-3">
            <CardTitle className="text-lg line-clamp-1">{website.title || 'Sans titre'}</CardTitle>
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
                Éditer
              </Button>
              {!isPublished && (
                <Button 
                  size="sm" 
                  className="h-8 bg-green-600 hover:bg-green-700"
                  onClick={handlePublish}
                  disabled={isPublishing}
                >
                  {isPublishing ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <>
                      <Rocket className="h-3.5 w-3.5 mr-1.5" />
                      Publier
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
            <AlertDialogTitle>Supprimer le site ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. Le site <strong>{website.title}</strong> et toutes ses données seront définitivement supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Suppression...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
