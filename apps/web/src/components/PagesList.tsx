import * as React from "react";
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
  ChevronRight,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuAction,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { usePages, getPagePath, getPageIcon } from "@/hooks/usePages";
import type { Page, CreatePageRequest, UpdatePageRequest } from "@/lib/api";
import { slugify } from "@/lib/utils/formatters";
import { cn } from "@/lib/utils";

interface PagesListProps {
  websiteId: string | null | undefined;
  websiteSlug?: string;
  currentPageId?: string;
  onPageSelect?: (page: Page) => void;
}

export function PagesList({ 
  websiteId, 
  websiteSlug,
  currentPageId,
  onPageSelect 
}: PagesListProps) {
  const { toast } = useToast();
  const { 
    pages, 
    isLoading, 
    createPage, 
    updatePage, 
    deletePage,
    reorderPages
  } = usePages(websiteId);

  const [isOpen, setIsOpen] = React.useState(true);
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [editDialogOpen, setEditDialogOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [selectedPage, setSelectedPage] = React.useState<Page | null>(null);
  
  // Form state
  const [formData, setFormData] = React.useState<CreatePageRequest>({
    slug: '',
    title: '',
    description: '',
    is_homepage: false,
    visible: true,
  });

  // Drag state
  const [draggedPageId, setDraggedPageId] = React.useState<string | null>(null);
  const [dragOverPageId, setDragOverPageId] = React.useState<string | null>(null);

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
      const slug = formData.slug.trim() || slugify(formData.title);
      await createPage({
        ...formData,
        slug,
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
      const updateData: UpdatePageRequest = {
        title: formData.title,
        slug: formData.slug,
        description: formData.description,
        is_homepage: formData.is_homepage,
        visible: formData.visible,
      };

      await updatePage(selectedPage.id, updateData);
      
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
    if (!selectedPage) return;

    try {
      await deletePage(selectedPage.id);
      
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
    const newVisibility = !page.visible;
    try {
      await updatePage(page.id, { visible: newVisibility });
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
      await reorderPages(pageIds);
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

  if (!websiteId) {
    return null;
  }

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen} className="group/collapsible">
        <SidebarGroup>
          <SidebarGroupLabel asChild>
            <CollapsibleTrigger className="flex w-full items-center justify-between">
              <span className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Pages
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5"
                  onClick={(e) => {
                    e.stopPropagation();
                    resetForm();
                    setCreateDialogOpen(true);
                  }}
                >
                  <Plus className="h-3 w-3" />
                </Button>
                <ChevronRight className={cn(
                  "h-4 w-4 transition-transform",
                  isOpen && "rotate-90"
                )} />
              </div>
            </CollapsibleTrigger>
          </SidebarGroupLabel>
          <CollapsibleContent>
            <SidebarGroupContent>
              <SidebarMenu>
                {isLoading ? (
                  <SidebarMenuItem>
                    <SidebarMenuButton disabled>
                      <span className="text-muted-foreground text-sm">Chargement...</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ) : pages.length === 0 ? (
                  <SidebarMenuItem>
                    <SidebarMenuButton 
                      onClick={() => {
                        resetForm();
                        setCreateDialogOpen(true);
                      }}
                      className="text-muted-foreground"
                    >
                      <Plus className="h-4 w-4" />
                      <span>Ajouter une page</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ) : (
                  pages.map((page) => (
                    <SidebarMenuItem 
                      key={page.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, page.id)}
                      onDragOver={(e) => handleDragOver(e, page.id)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, page.id)}
                      onDragEnd={handleDragEnd}
                      className={cn(
                        "group/item",
                        dragOverPageId === page.id && "bg-accent",
                        draggedPageId === page.id && "opacity-50"
                      )}
                    >
                      <SidebarMenuButton 
                        isActive={currentPageId === page.id}
                        onClick={() => onPageSelect?.(page)}
                        className="group"
                      >
                        <GripVertical className="h-3 w-3 opacity-0 group-hover/item:opacity-50 cursor-grab" />
                        <span className="text-base">{getPageIcon(page.slug)}</span>
                        <span className={cn(
                          "flex-1 truncate",
                          !page.visible && "text-muted-foreground"
                        )}>
                          {page.title}
                        </span>
                        {page.is_homepage && (
                          <Home className="h-3 w-3 text-muted-foreground" />
                        )}
                        {!page.visible && (
                          <EyeOff className="h-3 w-3 text-muted-foreground" />
                        )}
                      </SidebarMenuButton>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <SidebarMenuAction>
                            <MoreHorizontal className="h-4 w-4" />
                          </SidebarMenuAction>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem onClick={() => openEditDialog(page)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Modifier
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
                          {websiteSlug && (
                            <DropdownMenuItem asChild>
                              <a 
                                href={`https://${websiteSlug}.asap.com${getPagePath(page)}`}
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
                    </SidebarMenuItem>
                  ))
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </CollapsibleContent>
        </SidebarGroup>
      </Collapsible>

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
    </>
  );
}
