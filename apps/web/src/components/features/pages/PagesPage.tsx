"use client"

import React, { useState } from 'react';
import { useWebsiteContext } from '@/contexts/WebsiteContext';
import { PageHeader } from '@/components/shared/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useToast } from "@/hooks/use-toast";
import { 
  usePagesQuery, 
  useCreatePageMutation, 
  useUpdatePageMutation, 
  useDeletePageMutation,
  useReorderPagesMutation 
} from "@/lib/query";
import { getPagePath, getPageIcon } from "@/lib/utils/pages";
import type { Page, CreatePageRequest, UpdatePageRequest } from "@/lib/types";
import { slugify } from "@/lib/utils/formatters";
import { cn } from "@/lib/utils";
import { 
  FileText,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Home,
  GripVertical,
  ExternalLink,
  CheckCircle2,
  Clock,
  Layers,
  Search,
  Copy,
  Link as LinkIcon,
} from "lucide-react";

export default function PagesPage() {
  const { currentWebsite: website, currentWebsiteId, isLoading: contextLoading } = useWebsiteContext();
  const { toast } = useToast();
  
  // React Query hooks
  const { data: pages = [], isLoading: pagesLoading } = usePagesQuery(currentWebsiteId);
  const createPageMutation = useCreatePageMutation();
  const updatePageMutation = useUpdatePageMutation();
  const deletePageMutation = useDeletePageMutation();
  const reorderPagesMutation = useReorderPagesMutation();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPage, setSelectedPage] = useState<Page | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form state
  const [formData, setFormData] = useState<CreatePageRequest>({
    slug: '',
    title: '',
    description: '',
    is_homepage: false,
    visible: true,
  });

  // Drag state
  const [draggedPageId, setDraggedPageId] = useState<string | null>(null);
  const [dragOverPageId, setDragOverPageId] = useState<string | null>(null);

  // Reset form
  const resetForm = () => {
    setFormData({
      slug: '',
      title: '',
      description: '',
      is_homepage: false,
      visible: true,
    });
    setSelectedPage(null);
  };

  // Handle create
  const handleCreate = async () => {
    if (!formData.title.trim()) {
      toast({
        title: "Erreur",
        description: "Le titre est requis",
        variant: "destructive",
      });
      return;
    }

    try {
      if (!currentWebsiteId) return;
      const slug = formData.slug.trim() || slugify(formData.title);
      await createPageMutation.mutateAsync({
        websiteId: currentWebsiteId,
        data: {
          ...formData,
          slug,
        },
      });
      
      toast({
        title: "Page créée",
        description: `La page "${formData.title}" a été créée avec succès`,
      });
      
      setCreateDialogOpen(false);
      resetForm();
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de créer la page",
        variant: "destructive",
      });
    }
  };

  // Handle edit
  const handleEdit = async () => {
    if (!selectedPage || !formData.title.trim()) return;

    try {
      if (!currentWebsiteId) return;
      const updateData: UpdatePageRequest = {
        title: formData.title,
        slug: formData.slug,
        description: formData.description,
        is_homepage: formData.is_homepage,
        visible: formData.visible,
      };

      await updatePageMutation.mutateAsync({ 
        websiteId: currentWebsiteId, 
        pageId: selectedPage.id, 
        data: updateData 
      });
      
      toast({
        title: "Page modifiée",
        description: `La page "${formData.title}" a été mise à jour`,
      });
      
      setEditDialogOpen(false);
      resetForm();
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de modifier la page",
        variant: "destructive",
      });
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!selectedPage || !currentWebsiteId) return;

    try {
      await deletePageMutation.mutateAsync({ 
        websiteId: currentWebsiteId, 
        pageId: selectedPage.id 
      });
      
      toast({
        title: "Page supprimée",
        description: `La page "${selectedPage.title}" a été supprimée`,
      });
      
      setDeleteDialogOpen(false);
      setSelectedPage(null);
    } catch (error) {
      toast({
        title: "Erreur",
        description: error instanceof Error ? error.message : "Impossible de supprimer la page",
        variant: "destructive",
      });
    }
  };

  // Handle visibility toggle
  const handleToggleVisibility = async (page: Page) => {
    if (!currentWebsiteId) return;
    const newVisibility = !page.visible;
    try {
      await updatePageMutation.mutateAsync({ 
        websiteId: currentWebsiteId, 
        pageId: page.id, 
        data: { visible: newVisibility } 
      });
      toast({
        title: newVisibility ? "Page visible" : "Page masquée",
        description: `La page "${page.title}" est maintenant ${newVisibility ? 'visible' : 'masquée'}`,
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de modifier la visibilité",
        variant: "destructive",
      });
    }
  };

  // Open edit dialog
  const openEditDialog = (page: Page) => {
    setSelectedPage(page);
    setFormData({
      slug: page.slug,
      title: page.title,
      description: page.description,
      is_homepage: page.is_homepage,
      visible: page.visible,
    });
    setEditDialogOpen(true);
  };

  // Open delete dialog
  const openDeleteDialog = (page: Page) => {
    setSelectedPage(page);
    setDeleteDialogOpen(true);
  };

  // Duplicate page
  const handleDuplicatePage = async (page: Page) => {
    if (!currentWebsiteId) return;
    try {
      await createPageMutation.mutateAsync({
        websiteId: currentWebsiteId,
        data: {
          slug: `${page.slug}-copie`,
          title: `${page.title} (copie)`,
          description: page.description,
          visible: false,
        },
      });
      toast({
        title: "Page dupliquée",
        description: `La page "${page.title}" a été dupliquée`,
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de dupliquer la page",
        variant: "destructive",
      });
    }
  };

  // Drag & drop handlers
  const handleDragStart = (e: React.DragEvent, pageId: string) => {
    setDraggedPageId(pageId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, pageId: string) => {
    e.preventDefault();
    if (pageId !== draggedPageId) {
      setDragOverPageId(pageId);
    }
  };

  const handleDragLeave = () => {
    setDragOverPageId(null);
  };

  const handleDrop = async (e: React.DragEvent, targetPageId: string) => {
    e.preventDefault();
    setDragOverPageId(null);

    if (!draggedPageId || draggedPageId === targetPageId) {
      setDraggedPageId(null);
      return;
    }

    const draggedIndex = pages.findIndex(p => p.id === draggedPageId);
    const targetIndex = pages.findIndex(p => p.id === targetPageId);

    if (draggedIndex === -1 || targetIndex === -1) {
      setDraggedPageId(null);
      return;
    }

    const newOrder = [...pages];
    const [draggedPage] = newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedPage);

    const pageIds = newOrder.map(p => p.id);

    try {
      if (!currentWebsiteId) return;
      await reorderPagesMutation.mutateAsync({ websiteId: currentWebsiteId, pageIds });
      toast({
        title: "Ordre mis à jour",
        description: "L'ordre des pages a été modifié",
      });
    } catch (error) {
      toast({
        title: "Erreur",
        description: "Impossible de réorganiser les pages",
        variant: "destructive",
      });
    }

    setDraggedPageId(null);
  };

  const handleDragEnd = () => {
    setDraggedPageId(null);
    setDragOverPageId(null);
  };

  // Filter pages based on search
  const filteredPages = pages.filter(page => 
    page.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    page.slug.toLowerCase().includes(searchQuery.toLowerCase()) ||
    page.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate statistics
  const stats = {
    total: pages.length,
    published: pages.filter(p => p.visible).length,
    draft: pages.filter(p => !p.visible).length,
    homepage: pages.filter(p => p.is_homepage).length,
  };

  if (contextLoading || pagesLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 sm:gap-8 animate-fade-in">
      {/* Page Header */}
      <PageHeader
        title="Pages"
        subtitle="Gérez les pages de votre site web"
        icon={
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center shadow-lg">
            <FileText className="h-5 w-5 text-white" />
          </div>
        }
        backHref={currentWebsiteId ? `/app/${currentWebsiteId}` : '/app'}
        actions={[
          {
            label: 'Nouvelle page',
            icon: <Plus className="h-4 w-4" />,
            onClick: () => {
              resetForm();
              setCreateDialogOpen(true);
            },
          }
        ]}
        stickyContent={
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center">
                <FileText className="h-4 w-4 text-white" />
              </div>
              <div className="hidden sm:flex items-center gap-3">
                <p className="text-sm font-semibold">Pages</p>
                <Badge variant="secondary" className="text-[10px] h-5">
                  {stats.total} {stats.total > 1 ? 'pages' : 'page'}
                </Badge>
              </div>
            </div>
            <Button 
              size="sm" 
              className="h-8"
              onClick={() => {
                resetForm();
                setCreateDialogOpen(true);
              }}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Nouvelle page
            </Button>
          </div>
        }
      />

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total des pages</CardTitle>
            <Layers className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Pages sur votre site
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pages publiées</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.published}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Visibles sur le site
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Brouillons</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.draft}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Pages non publiées
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Page d'accueil</CardTitle>
            <Home className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.homepage}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Page principale
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pages List Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Liste des pages
              </CardTitle>
              <CardDescription className="mt-1">
                Organisez et gérez les pages de votre site
              </CardDescription>
            </div>
          </div>
          {/* Search bar */}
          <div className="relative mt-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Rechercher une page..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {filteredPages.length === 0 ? (
            <div className="text-center py-12">
              {searchQuery ? (
                <>
                  <Search className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="text-muted-foreground">Aucune page trouvée</p>
                  <p className="text-sm text-muted-foreground">
                    Essayez avec un autre terme de recherche
                  </p>
                </>
              ) : (
                <>
                  <FileText className="h-12 w-12 mx-auto mb-3 text-muted-foreground" />
                  <p className="font-medium mb-2">Aucune page</p>
                  <p className="text-sm text-muted-foreground mb-4">
                    Commencez par créer votre première page
                  </p>
                  <Button onClick={() => {
                    resetForm();
                    setCreateDialogOpen(true);
                  }}>
                    <Plus className="h-4 w-4 mr-2" />
                    Créer une page
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredPages.map((page) => (
                <div
                  key={page.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, page.id)}
                  onDragOver={(e) => handleDragOver(e, page.id)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, page.id)}
                  onDragEnd={handleDragEnd}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-lg border transition-all hover:bg-accent/50 group",
                    dragOverPageId === page.id && "border-primary bg-accent",
                    draggedPageId === page.id && "opacity-50"
                  )}
                >
                  <GripVertical className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 cursor-grab flex-shrink-0" />
                  
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
                        <Badge variant="secondary" className="text-xs">
                          <Home className="h-3 w-3 mr-1" />
                          Accueil
                        </Badge>
                      )}
                      {!page.visible && (
                        <Badge variant="outline" className="text-xs text-amber-600 border-amber-300">
                          <EyeOff className="h-3 w-3 mr-1" />
                          Masquée
                        </Badge>
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
                    {website?.slug && page.visible && (
                      <Button
                        variant="ghost"
                        size="sm"
                        asChild
                      >
                        <a 
                          href={`https://${website.slug}.asap.com${getPagePath(page)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    )}
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => openEditDialog(page)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicatePage(page)}>
                          <Copy className="h-4 w-4 mr-2" />
                          Dupliquer
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleToggleVisibility(page)}>
                          {page.visible ? (
                            <>
                              <EyeOff className="h-4 w-4 mr-2" />
                              Masquer
                            </>
                          ) : (
                            <>
                              <Eye className="h-4 w-4 mr-2" />
                              Afficher
                            </>
                          )}
                        </DropdownMenuItem>
                        {website?.slug && (
                          <DropdownMenuItem asChild>
                            <a 
                              href={`https://${website.slug}.asap.com${getPagePath(page)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              Voir la page
                            </a>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                          onClick={() => openDeleteDialog(page)}
                          className="text-destructive focus:text-destructive"
                          disabled={page.is_homepage}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Page Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nouvelle page</DialogTitle>
            <DialogDescription>
              Créez une nouvelle page pour votre site web
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Titre</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  title: e.target.value,
                  slug: prev.slug || slugify(e.target.value)
                }))}
                placeholder="Contact"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="slug">URL (slug)</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">/</span>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    slug: slugify(e.target.value)
                  }))}
                  placeholder="contact"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Laissez vide pour la page d'accueil
              </p>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Description de la page (optionnel)"
                rows={2}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Page d'accueil</Label>
                <p className="text-xs text-muted-foreground">
                  Définir comme page principale
                </p>
              </div>
              <Switch
                checked={formData.is_homepage}
                onCheckedChange={(checked) => setFormData(prev => ({ 
                  ...prev, 
                  is_homepage: checked,
                  slug: checked ? '' : prev.slug
                }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreate}>
              Créer la page
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Page Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifier la page</DialogTitle>
            <DialogDescription>
              Modifiez les informations de la page
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-title">Titre</Label>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-slug">URL (slug)</Label>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">/</span>
                <Input
                  id="edit-slug"
                  value={formData.slug}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    slug: slugify(e.target.value)
                  }))}
                  disabled={formData.is_homepage}
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Page d'accueil</Label>
                <p className="text-xs text-muted-foreground">
                  Définir comme page principale
                </p>
              </div>
              <Switch
                checked={formData.is_homepage}
                onCheckedChange={(checked) => setFormData(prev => ({ 
                  ...prev, 
                  is_homepage: checked,
                  slug: checked ? '' : prev.slug
                }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Visible</Label>
                <p className="text-xs text-muted-foreground">
                  Afficher la page sur le site
                </p>
              </div>
              <Switch
                checked={formData.visible}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, visible: checked }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleEdit}>
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la page ?</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer la page "{selectedPage?.title}" ?
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
