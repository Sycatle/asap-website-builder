"use client"

import { useState } from 'react';
import type { Website } from '@/lib/api';
import { websitesAPI } from '@/lib/api';
import { useCacheActions } from '@/hooks/useCache';
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
  
  const { removeWebsiteFromCache, updateWebsiteCache } = useCacheActions();

  const handleDelete = async () => {
    setIsDeleting(true);
    
    try {
      await websitesAPI.delete(website.id);
      removeWebsiteFromCache(website.id);
      toast.success('Site supprimé avec succès');
    } catch (error) {
      toast.error('Erreur lors de la suppression du site');
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    
    try {
      await websitesAPI.publish(website.id);
      updateWebsiteCache({ ...website, status: 'published' });
      toast.success('Site publié avec succès !');
    } catch (error) {
      toast.error('Erreur lors de la publication');
    } finally {
      setIsPublishing(false);
    }
  };

  const isPublished = website.status === 'published';
  const createdAt = website.created_at ? new Date(website.created_at) : new Date();

  return (
    <>
      <Card className="group relative overflow-hidden hover:shadow-lg transition-all duration-300 animate-fade-in-up">
        {/* Gradient background effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
        
        <CardHeader className="pb-2 relative">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center transition-transform duration-200 group-hover:scale-110">
                <Globe className="h-5 w-5 text-primary" />
              </div>
              {isPublished ? (
                <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-500/20">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  En ligne
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <Clock className="w-3 h-3 mr-1" />
                  Brouillon
                </Badge>
              )}
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onSelect?.(website)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Modifier
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <a href={`/${website.slug}`} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Voir le site
                  </a>
                </DropdownMenuItem>
                {!isPublished && (
                  <DropdownMenuItem onClick={handlePublish} disabled={isPublishing}>
                    <Rocket className="h-4 w-4 mr-2" />
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
              <span className="font-mono text-xs">{website.slug}.asap.cool</span>
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
