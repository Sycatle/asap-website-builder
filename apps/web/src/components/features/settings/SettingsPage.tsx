"use client"

import { useEffect, useState } from 'react';
import { websitesAPI, type Website, type UpdateWebsiteRequest } from '@/lib/api';
import { useWebsiteContext } from '@/contexts/WebsiteContext';
import { useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { FormActions } from "@/components/ui/form-actions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  Settings, 
  Globe,
  Type,
  FileText,
  Link2,
  Search,
  Share2,
  Trash2,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Eye,
  EyeOff,
  Clock,
  Rocket,
  Image,
  MessageSquare,
} from "lucide-react";

export default function SettingsPage() {
  const { currentWebsite: website, currentWebsiteId, isLoading: contextLoading, refetch: refetchAll } = useWebsiteContext();
  const queryClient = useQueryClient();
  
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [favicon, setFavicon] = useState('');
  const [ogImage, setOgImage] = useState('');
  const [isIndexable, setIsIndexable] = useState(true);
  
  // Initial values for dirty checking
  const [initialValues, setInitialValues] = useState({
    title: '',
    tagline: '',
    description: '',
    favicon: '',
    ogImage: '',
    isIndexable: true,
  });

  // Sync form state when website changes
  useEffect(() => {
    if (website) {
      const values = {
        title: website.title || '',
        tagline: website.tagline || '',
        description: website.description || '',
        favicon: website.favicon || '',
        ogImage: website.og_image || '',
        isIndexable: website.is_indexable !== false,
      };
      setTitle(values.title);
      setTagline(values.tagline);
      setDescription(values.description);
      setFavicon(values.favicon);
      setOgImage(values.ogImage);
      setIsIndexable(values.isIndexable);
      setInitialValues(values);
    }
  }, [website]);

  // Check if form is dirty
  const isFormDirty = 
    title !== initialValues.title ||
    tagline !== initialValues.tagline ||
    description !== initialValues.description ||
    favicon !== initialValues.favicon ||
    ogImage !== initialValues.ogImage ||
    isIndexable !== initialValues.isIndexable;

  const handleSave = async () => {
    if (!currentWebsiteId) return;
    
    setIsSaving(true);
    try {
      await websitesAPI.update(currentWebsiteId, {
        title,
        tagline,
        description,
        favicon,
        og_image: ogImage,
        is_indexable: isIndexable,
      } as UpdateWebsiteRequest);
      
      await queryClient.invalidateQueries({ queryKey: queryKeys.websites.all() });
      refetchAll();
      
      // Update initial values
      setInitialValues({
        title,
        tagline,
        description,
        favicon,
        ogImage,
        isIndexable,
      });
      
      toast.success('Paramètres enregistrés');
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setTitle(initialValues.title);
    setTagline(initialValues.tagline);
    setDescription(initialValues.description);
    setFavicon(initialValues.favicon);
    setOgImage(initialValues.ogImage);
    setIsIndexable(initialValues.isIndexable);
  };

  const handlePublish = async () => {
    if (!currentWebsiteId) return;
    
    setIsSaving(true);
    try {
      await websitesAPI.update(currentWebsiteId, { status: 'published' } as UpdateWebsiteRequest);
      await queryClient.invalidateQueries({ queryKey: queryKeys.websites.all() });
      refetchAll();
      toast.success('Site publié avec succès !');
    } catch (error) {
      toast.error('Erreur lors de la publication');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUnpublish = async () => {
    if (!currentWebsiteId) return;
    
    setIsSaving(true);
    try {
      await websitesAPI.update(currentWebsiteId, { status: 'draft' } as UpdateWebsiteRequest);
      await queryClient.invalidateQueries({ queryKey: queryKeys.websites.all() });
      refetchAll();
      toast.success('Site mis en brouillon');
    } catch (error) {
      toast.error('Erreur lors de la mise en brouillon');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteWebsite = async () => {
    if (!currentWebsiteId) return;
    
    setIsDeleting(true);
    try {
      await websitesAPI.delete(currentWebsiteId);
      await queryClient.invalidateQueries({ queryKey: queryKeys.websites.all() });
      toast.success('Site supprimé');
      window.location.href = '/app';
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    } finally {
      setIsDeleting(false);
    }
  };

  if (contextLoading) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-5 w-72" />
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-[300px]" />
          <Skeleton className="h-[300px]" />
        </div>
        <Skeleton className="h-[200px]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 sm:gap-8 max-w-4xl animate-fade-in">
      {/* Page Header */}
      <PageHeader
        title="Paramètres du site"
        subtitle="Configurez les informations et le comportement de votre site"
        icon={
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center shadow-lg">
            <Settings className="h-5 w-5 text-white" />
          </div>
        }
        backHref={currentWebsiteId ? `/app/${currentWebsiteId}` : '/app'}
        stickyContent={
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center">
                <Settings className="h-4 w-4 text-white" />
              </div>
              <p className="text-sm font-semibold hidden sm:block">Paramètres</p>
            </div>
            {isFormDirty && (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleCancel} className="h-8">
                  Annuler
                </Button>
                <Button size="sm" onClick={handleSave} disabled={isSaving} className="h-8">
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <CheckCircle2 className="h-4 w-4 mr-1.5" />}
                  Enregistrer
                </Button>
              </div>
            )}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* General Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Globe className="h-5 w-5 text-primary" />
              Informations générales
            </CardTitle>
            <CardDescription>
              Les informations de base de votre site
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="slug" className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-muted-foreground" />
                URL du site
              </Label>
              <div className="flex items-center">
                <span className="flex h-10 items-center rounded-l-md border border-r-0 bg-muted px-3 text-sm text-muted-foreground">
                  asap.cool/
                </span>
                <Input
                  id="slug"
                  value={website?.slug || ''}
                  disabled
                  className="rounded-l-none bg-muted"
                />
              </div>
              <p className="text-xs text-muted-foreground">L'URL ne peut pas être modifiée après création</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title" className="flex items-center gap-2">
                <Type className="h-4 w-4 text-muted-foreground" />
                Titre du site
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Mon super site"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tagline" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                Tagline
              </Label>
              <Input
                id="tagline"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="Une courte description accrocheuse"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-muted-foreground" />
                Description
              </Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description détaillée de votre site pour le SEO..."
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Utilisée pour les moteurs de recherche (meta description)
              </p>
            </div>
          </CardContent>
        </Card>

        {/* SEO & Social */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Search className="h-5 w-5 text-primary" />
              SEO & Réseaux sociaux
            </CardTitle>
            <CardDescription>
              Optimisez la visibilité de votre site
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="favicon" className="flex items-center gap-2">
                <Image className="h-4 w-4 text-muted-foreground" />
                Favicon (URL)
              </Label>
              <Input
                id="favicon"
                value={favicon}
                onChange={(e) => setFavicon(e.target.value)}
                placeholder="https://example.com/favicon.ico"
              />
              <p className="text-xs text-muted-foreground">
                L'icône affichée dans l'onglet du navigateur
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ogImage" className="flex items-center gap-2">
                <Share2 className="h-4 w-4 text-muted-foreground" />
                Image de partage (OG Image)
              </Label>
              <Input
                id="ogImage"
                value={ogImage}
                onChange={(e) => setOgImage(e.target.value)}
                placeholder="https://example.com/og-image.jpg"
              />
              <p className="text-xs text-muted-foreground">
                Image affichée lors du partage sur les réseaux sociaux (1200x630px recommandé)
              </p>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="flex items-center gap-2">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  Indexation par les moteurs de recherche
                </Label>
                <p className="text-sm text-muted-foreground">
                  Autoriser Google et autres à indexer votre site
                </p>
              </div>
              <Switch
                checked={isIndexable}
                onCheckedChange={setIsIndexable}
              />
            </div>
            {!isIndexable && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-amber-500/10 text-amber-600 text-sm">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>Votre site ne sera pas visible dans les résultats de recherche</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Publication Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            {website?.status === 'published' ? (
              <CheckCircle2 className="h-5 w-5 text-green-500" />
            ) : (
              <Clock className="h-5 w-5 text-amber-500" />
            )}
            Statut de publication
          </CardTitle>
          <CardDescription>
            Gérez la visibilité de votre site
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-xl ${
                website?.status === 'published' 
                  ? 'bg-green-500/10' 
                  : 'bg-amber-500/10'
              }`}>
                {website?.status === 'published' ? (
                  <Globe className="h-6 w-6 text-green-600" />
                ) : (
                  <EyeOff className="h-6 w-6 text-amber-600" />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {website?.status === 'published' ? 'Site en ligne' : 'Site en brouillon'}
                  </span>
                  <Badge className={website?.status === 'published' 
                    ? 'bg-green-500/10 text-green-600 border-green-500/20' 
                    : 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                  }>
                    {website?.status === 'published' ? 'Public' : 'Privé'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {website?.status === 'published' 
                    ? `Accessible à ${website?.slug}.asap.cool`
                    : 'Seul vous pouvez voir votre site'
                  }
                </p>
              </div>
            </div>
            
            {website?.status === 'published' ? (
              <Button 
                variant="outline" 
                onClick={handleUnpublish}
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <EyeOff className="h-4 w-4 mr-2" />
                )}
                Mettre en brouillon
              </Button>
            ) : (
              <Button 
                onClick={handlePublish}
                disabled={isSaving}
                className="bg-green-600 hover:bg-green-700"
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Rocket className="h-4 w-4 mr-2" />
                )}
                Publier le site
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Zone de danger
          </CardTitle>
          <CardDescription>
            Actions irréversibles sur votre site
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="font-medium">Supprimer le site</p>
              <p className="text-sm text-muted-foreground">
                Supprimer définitivement ce site et toutes ses données
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isDeleting}>
                  {isDeleting ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 mr-2" />
                  )}
                  Supprimer
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Supprimer le site ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action est irréversible. Toutes les données de ce site seront définitivement supprimées :
                    pages, sections, médias, extensions et configurations.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteWebsite}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Supprimer définitivement
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>
      
      {/* Sticky form actions */}
      <FormActions
        isDirty={isFormDirty}
        isSaving={isSaving}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    </div>
  );
}
