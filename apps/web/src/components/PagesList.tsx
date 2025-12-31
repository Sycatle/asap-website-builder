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
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
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
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
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
  // React Query hooks
  const { data: pages = [], isLoading } = usePagesQuery(websiteId);
  const createPageMutation = useCreatePageMutation();
  const updatePageMutation = useUpdatePageMutation();
  const deletePageMutation = useDeletePageMutation();
  const reorderPagesMutation = useReorderPagesMutation();

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
      toast.error("Le titre est requis");
      return;
    }

    try {
      if (!websiteId) return;
      const slug = formData.slug.trim() || slugify(formData.title);
      await createPageMutation.mutateAsync({
        websiteId,
        data: {
          ...formData,
          slug,
        },
      });
      
      toast.success(`Page "${formData.title}" créée avec succès`);
      
      setCreateDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de créer la page");
    }
  };

  // Handle edit
  const handleEdit = async () => {
    if (!selectedPage || !formData.title.trim()) return;

    try {
      if (!websiteId) return;
      const updateData: UpdatePageRequest = {
        title: formData.title,
        slug: formData.slug,
        description: formData.description,
        is_homepage: formData.is_homepage,
        visible: formData.visible,
      };

      await updatePageMutation.mutateAsync({ websiteId, pageId: selectedPage.id, data: updateData });
      
      toast.success(`Page "${formData.title}" mise à jour`);
      
      setEditDialogOpen(false);
      resetForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de modifier la page");
    }
  };

  // Handle delete
  const handleDelete = async () => {
    if (!selectedPage || !websiteId) return;

    try {
      await deletePageMutation.mutateAsync({ websiteId, pageId: selectedPage.id });
      
      toast.success(`Page "${selectedPage.title}" supprimée`);
      
      setDeleteDialogOpen(false);
      setSelectedPage(null);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible de supprimer la page");
    }
  };

  // Handle visibility toggle
  const handleToggleVisibility = async (page: Page) => {
    if (!websiteId) return;
    const newVisibility = !page.visible;
    try {
      await updatePageMutation.mutateAsync({ websiteId, pageId: page.id, data: { visible: newVisibility } });
      toast.success(`Page "${page.title}" ${newVisibility ? 'visible' : 'masquée'}`);
    } catch (error) {
      toast.error("Impossible de modifier la visibilité");
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
      if (!websiteId) return;
      await reorderPagesMutation.mutateAsync({ websiteId, pageIds });
      toast.success("Ordre des pages mis à jour");
    } catch (error) {
      toast.error("Impossible de réorganiser les pages");
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
          <div className="relative">
            <SidebarGroupLabel asChild>
              <CollapsibleTrigger className="flex w-full items-center justify-between pr-8">
                <span className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Pages
                </span>
                <ChevronRight className={cn(
                  "h-4 w-4 transition-transform",
                  isOpen && "rotate-90"
                )} />
              </CollapsibleTrigger>
            </SidebarGroupLabel>
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 absolute right-1 top-1/2 -translate-y-1/2"
              onClick={(e) => {
                e.stopPropagation();
                resetForm();
                setCreateDialogOpen(true);
              }}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
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
      <ResponsiveDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Nouvelle page</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Créez une nouvelle page pour votre site web
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <FieldGroup className="py-4">
            <Field>
              <FieldLabel htmlFor="title">Titre</FieldLabel>
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
            </Field>
            <Field>
              <FieldLabel htmlFor="slug">URL (slug)</FieldLabel>
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
              <FieldDescription>
                Laissez vide pour la page d'accueil
              </FieldDescription>
            </Field>
            <Field>
              <FieldLabel htmlFor="description">Description</FieldLabel>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Description de la page (optionnel)"
                rows={2}
              />
            </Field>
            <Field orientation="horizontal">
              <FieldContent>
                <FieldLabel>Page d'accueil</FieldLabel>
                <FieldDescription>
                  Définir comme page principale
                </FieldDescription>
              </FieldContent>
              <Switch
                checked={formData.is_homepage}
                onCheckedChange={(checked) => setFormData(prev => ({ 
                  ...prev, 
                  is_homepage: checked,
                  slug: checked ? '' : prev.slug
                }))}
              />
            </Field>
          </FieldGroup>
          <ResponsiveDialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleCreate}>
              Créer la page
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

      {/* Edit Page Dialog */}
      <ResponsiveDialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <ResponsiveDialogContent>
          <ResponsiveDialogHeader>
            <ResponsiveDialogTitle>Modifier la page</ResponsiveDialogTitle>
            <ResponsiveDialogDescription>
              Modifiez les informations de la page
            </ResponsiveDialogDescription>
          </ResponsiveDialogHeader>
          <FieldGroup className="py-4">
            <Field>
              <FieldLabel htmlFor="edit-title">Titre</FieldLabel>
              <Input
                id="edit-title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="edit-slug">URL (slug)</FieldLabel>
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
            </Field>
            <Field>
              <FieldLabel htmlFor="edit-description">Description</FieldLabel>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={2}
              />
            </Field>
            <Field orientation="horizontal">
              <FieldContent>
                <FieldLabel>Page d'accueil</FieldLabel>
                <FieldDescription>
                  Définir comme page principale
                </FieldDescription>
              </FieldContent>
              <Switch
                checked={formData.is_homepage}
                onCheckedChange={(checked) => setFormData(prev => ({ 
                  ...prev, 
                  is_homepage: checked,
                  slug: checked ? '' : prev.slug
                }))}
              />
            </Field>
            <Field orientation="horizontal">
              <FieldContent>
                <FieldLabel>Visible</FieldLabel>
                <FieldDescription>
                  Afficher la page sur le site
                </FieldDescription>
              </FieldContent>
              <Switch
                checked={formData.visible}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, visible: checked }))}
              />
            </Field>
          </FieldGroup>
          <ResponsiveDialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Annuler
            </Button>
            <Button onClick={handleEdit}>
              Enregistrer
            </Button>
          </ResponsiveDialogFooter>
        </ResponsiveDialogContent>
      </ResponsiveDialog>

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

export default PagesList;
