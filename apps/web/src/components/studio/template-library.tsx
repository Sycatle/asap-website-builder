"use client";

import { useState, useEffect } from 'react';
import { Star, Search, Trash2, Filter, FolderOpen } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { templatesAPI, type ElementTemplateSummary } from '@/lib/api/templates';
import { getElementIcon } from '@/lib/constants/elements';
import { VARIANT_VISUALS } from './variant-picker';

export interface TemplateLibraryProps {
  /** Filter by element type (optional) */
  elementType?: string;
  /** Called when a template is selected */
  onSelect: (template: ElementTemplateSummary) => void;
  /** Currently selected template ID */
  selectedTemplateId?: string;
  /** Show in compact mode */
  compact?: boolean;
}

// Section type labels for filtering
const SECTION_TYPES = [
  { value: 'all', label: 'Tous les types' },
  { value: 'hero', label: 'Hero' },
  { value: 'features', label: 'Fonctionnalités' },
  { value: 'pricing', label: 'Tarifs' },
  { value: 'testimonials', label: 'Témoignages' },
  { value: 'faq', label: 'FAQ' },
  { value: 'content', label: 'Contenu' },
  { value: 'contact', label: 'Contact' },
  { value: 'about', label: 'À propos' },
  { value: 'gallery', label: 'Galerie' },
  { value: 'stats', label: 'Statistiques' },
  { value: 'logos', label: 'Logos' },
  { value: 'blog-list', label: 'Articles' },
];

export function TemplateLibrary({
  elementType,
  onSelect,
  selectedTemplateId,
  compact = false,
}: TemplateLibraryProps) {
  const [templates, setTemplates] = useState<ElementTemplateSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState(elementType || 'all');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  
  // Delete confirmation
  const [deleteTemplate, setDeleteTemplate] = useState<ElementTemplateSummary | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch templates
  const fetchTemplates = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await templatesAPI.list({
        element_type: filterType !== 'all' ? filterType : undefined,
        favorites_only: showFavoritesOnly,
        search: search || undefined,
        limit: 50,
      });
      setTemplates(data);
    } catch (err) {
      console.error('Failed to fetch templates:', err);
      setError('Erreur lors du chargement des templates');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, [filterType, showFavoritesOnly]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTemplates();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Toggle favorite
  const handleToggleFavorite = async (e: React.MouseEvent, template: ElementTemplateSummary) => {
    e.stopPropagation();
    try {
      const updated = await templatesAPI.toggleFavorite(template.id);
      setTemplates(templates.map(t => t.id === template.id ? { ...t, is_favorite: updated.is_favorite } : t));
    } catch {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  // Delete template
  const handleDelete = async () => {
    if (!deleteTemplate) return;
    setIsDeleting(true);
    try {
      await templatesAPI.delete(deleteTemplate.id);
      setTemplates(templates.filter(t => t.id !== deleteTemplate.id));
      toast.success('Template supprimé');
    } catch {
      toast.error('Erreur lors de la suppression');
    } finally {
      setIsDeleting(false);
      setDeleteTemplate(null);
    }
  };

  // Get visual for template
  const getTemplateVisual = (template: ElementTemplateSummary) => {
    const sectionVisuals = VARIANT_VISUALS[template.element_type];
    if (sectionVisuals && template.variant) {
      return sectionVisuals[template.variant];
    }
    // Fallback to first variant or icon
    if (sectionVisuals) {
      const firstVariant = Object.keys(sectionVisuals)[0];
      return sectionVisuals[firstVariant];
    }
    return null;
  };

  if (isLoading && templates.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-destructive text-sm">{error}</p>
        <Button variant="outline" size="sm" onClick={fetchTemplates} className="mt-2">
          Réessayer
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher..."
            className="pl-8 h-9"
          />
        </div>
        {!elementType && (
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[160px] h-9">
              <Filter className="h-3.5 w-3.5 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SECTION_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Button
          variant={showFavoritesOnly ? 'default' : 'outline'}
          size="sm"
          className="h-9"
          onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
        >
          <Star className={`h-4 w-4 ${showFavoritesOnly ? 'fill-current' : ''}`} />
        </Button>
      </div>

      {/* Templates Grid */}
      {templates.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p className="text-sm">
            {search || showFavoritesOnly 
              ? 'Aucun template trouvé avec ces filtres'
              : 'Aucun template sauvegardé'}
          </p>
          <p className="text-xs mt-1">
            Sauvegardez une section configurée pour créer un template
          </p>
        </div>
      ) : (
        <ScrollArea className={compact ? 'h-[300px]' : 'h-[400px]'}>
          <div className={`grid gap-3 pr-4 ${compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}>
            {templates.map((template) => {
              const Icon = getElementIcon(template.element_type);
              const isSelected = selectedTemplateId === template.id;
              const Visual = getTemplateVisual(template);
              
              return (
                <Card
                  key={template.id}
                  className={`cursor-pointer transition-all hover:border-primary group relative ${
                    isSelected ? 'border-primary ring-2 ring-primary bg-primary/5' : ''
                  }`}
                  onClick={() => onSelect(template)}
                >
                  <CardContent className="p-3">
                    {/* Visual Preview */}
                    <div className="aspect-[16/9] rounded-md bg-muted/50 border mb-2 flex items-center justify-center overflow-hidden">
                      {Visual ? (
                        <div className="scale-75">{Visual}</div>
                      ) : (
                        <Icon className="h-8 w-8 text-muted-foreground/50" />
                      )}
                    </div>
                    
                    {/* Info */}
                    <div className="space-y-1">
                      <div className="flex items-start justify-between gap-1">
                        <h4 className="text-sm font-medium line-clamp-1">{template.name}</h4>
                        <button
                          onClick={(e) => handleToggleFavorite(e, template)}
                          className="shrink-0 hover:scale-110 transition-transform"
                        >
                          <Star
                            className={`h-4 w-4 ${
                              template.is_favorite
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-muted-foreground hover:text-yellow-400'
                            }`}
                          />
                        </button>
                      </div>
                      
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-[10px] px-1 py-0">
                          {template.element_type}
                        </Badge>
                        {template.variant && (
                          <Badge variant="secondary" className="text-[10px] px-1 py-0">
                            {template.variant}
                          </Badge>
                        )}
                      </div>
                      
                      {template.description && !compact && (
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {template.description}
                        </p>
                      )}
                    </div>
                    
                    {/* Delete button (on hover) */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTemplate(template);
                      }}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md bg-destructive/10 hover:bg-destructive/20 text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </ScrollArea>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTemplate} onOpenChange={() => setDeleteTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer ce template ?</AlertDialogTitle>
            <AlertDialogDescription>
              Le template "{deleteTemplate?.name}" sera définitivement supprimé.
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? <Spinner className="h-4 w-4 mr-2" /> : null}
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default TemplateLibrary;
