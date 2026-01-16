"use client";

/**
 * Collection Binding Component
 * 
 * Allows binding an array property to a collection data source.
 * Shows a visual selector and mapping configuration.
 */

import * as React from "react";
import { useState, useMemo, useCallback } from "react";
import { 
  Database, 
  Link2, 
  Unlink, 
  ArrowRight,
  Settings2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useStudioCollections } from "../../data-binding";
import type { 
  CollectionSummary, 
  CollectionFieldDef,
  DataBinding,
  PropertySchema,
  WebsiteCollection,
  CollectionSchema,
} from "@asap/shared";

// ============================================
// Types
// ============================================

interface CollectionBindingProps {
  /** Property schema (for array items structure) */
  property: PropertySchema;
  /** Current data binding configuration */
  binding?: DataBinding;
  /** Callback when binding changes */
  onBindingChange: (binding: DataBinding | undefined) => void;
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Custom class name */
  className?: string;
}

// ============================================
// Collection Selector
// ============================================

interface CollectionPickerProps {
  collections: CollectionSummary[];
  value?: string;
  onChange: (slug: string | undefined) => void;
  isLoading?: boolean;
  disabled?: boolean;
}

function CollectionPicker({
  collections,
  value,
  onChange,
  isLoading,
  disabled,
}: CollectionPickerProps) {
  if (isLoading) {
    return (
      <div className="h-9 bg-muted animate-pulse rounded-md" />
    );
  }
  
  if (!collections?.length) {
    return (
      <div className="text-sm text-muted-foreground p-3 border rounded-md bg-muted/30 text-center">
        <Database className="h-5 w-5 mx-auto mb-2 text-muted-foreground" />
        <p>Aucune collection disponible</p>
        <p className="text-xs mt-1">Activez une extension pour synchroniser des données</p>
      </div>
    );
  }
  
  return (
    <Select value={value || ""} onValueChange={(v) => onChange(v || undefined)} disabled={disabled}>
      <SelectTrigger className="h-9">
        <SelectValue placeholder="Choisir une collection" />
      </SelectTrigger>
      <SelectContent>
        {collections?.map((collection) => (
          <SelectItem key={collection.collection_slug} value={collection.collection_slug}>
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-muted-foreground" />
              <span>{formatCollectionName(collection.collection_slug)}</span>
              <Badge variant="secondary" className="ml-auto text-xs">
                {collection.total_count}
              </Badge>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ============================================
// Field Mapping Editor
// ============================================

interface FieldMappingEditorProps {
  /** Fields from the property schema (array item structure) */
  propertyFields: { key: string; label: string; type: string }[];
  /** Fields from the collection schema */
  collectionFields: CollectionFieldDef[];
  /** Current mappings */
  mappings: Record<string, string>;
  /** Callback when mappings change */
  onChange: (mappings: Record<string, string>) => void;
}

function FieldMappingEditor({
  propertyFields,
  collectionFields,
  mappings,
  onChange,
}: FieldMappingEditorProps) {
  const handleMappingChange = (propertyField: string, collectionField: string) => {
    const newMappings = { ...mappings };
    if (collectionField) {
      newMappings[propertyField] = collectionField;
    } else {
      delete newMappings[propertyField];
    }
    onChange(newMappings);
  };
  
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
        <span className="flex-1">Propriété</span>
        <ArrowRight className="h-3 w-3" />
        <span className="flex-1">Champ collection</span>
      </div>
      
      <div className="space-y-2">
        {propertyFields.map((field) => (
          <div key={field.key} className="flex items-center gap-2">
            <div className="flex-1 text-sm truncate">
              <span className="font-medium">{field.label}</span>
              <span className="text-muted-foreground ml-1 text-xs">({field.type})</span>
            </div>
            <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
            <Select
              value={mappings[field.key] || ""}
              onValueChange={(v) => handleMappingChange(field.key, v)}
            >
              <SelectTrigger className="flex-1 h-8 text-sm">
                <SelectValue placeholder="Non mappé" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Non mappé</SelectItem>
                {collectionFields.map((cf) => (
                  <SelectItem key={cf.key} value={cf.key}>
                    {cf.label || cf.key}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// Helper Functions
// ============================================

function formatCollectionName(slug: string): string {
  return slug
    .replace(/-/g, " ")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

interface ItemSchemaField {
  label?: string;
  type?: string;
}

function getPropertyArrayFields(property: PropertySchema): { key: string; label: string; type: string }[] {
  // Extract fields from itemSchema (the correct property name)
  const itemSchema = property.itemSchema as Record<string, ItemSchemaField> | undefined;
  if (!itemSchema) return [];
  
  return Object.entries(itemSchema).map(([key, schema]) => ({
    key,
    label: schema?.label || key,
    type: schema?.type || "text",
  }));
}

// ============================================
// Main Component
// ============================================

export function CollectionBinding({
  property,
  binding,
  onBindingChange,
  disabled = false,
  className,
}: CollectionBindingProps) {
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  
  // Get collections from context
  let collections: CollectionSummary[] = [];
  let isLoading = false;
  let fetchCollection: ((slug: string) => Promise<WebsiteCollection | null>) | undefined;
  
  try {
    const ctx = useStudioCollections();
    collections = ctx.collections ?? [];
    isLoading = ctx.isLoading;
    fetchCollection = ctx.fetchCollection;
  } catch {
    // Outside StudioDataProvider
  }
  
  // Current binding state
  const boundCollection = binding?.collection?.slug;
  const currentMapping = binding?.mapping || {};
  
  // Get fields for mapping
  const propertyFields = useMemo(() => 
    getPropertyArrayFields(property), 
    [property]
  );
  
  const [collectionFields, setCollectionFields] = useState<CollectionFieldDef[]>([]);
  
  // Fetch collection schema when bound
  React.useEffect(() => {
    if (boundCollection && fetchCollection) {
      fetchCollection(boundCollection).then((data) => {
        const collectionWithSchema = data as (WebsiteCollection & { schema?: CollectionSchema }) | null;
        if (collectionWithSchema?.schema?.fields) {
          setCollectionFields(collectionWithSchema.schema.fields);
        }
      });
    }
  }, [boundCollection, fetchCollection]);
  
  // Handle collection change
  const handleCollectionChange = useCallback((slug: string | undefined) => {
    if (!slug) {
      onBindingChange(undefined);
    } else {
      onBindingChange({
        collection: { slug },
        mapping: {},
      });
    }
  }, [onBindingChange]);
  
  // Handle mapping change
  const handleMappingChange = useCallback((mapping: Record<string, string>) => {
    if (!boundCollection) return;
    
    onBindingChange({
      collection: { slug: boundCollection },
      mapping,
    });
  }, [boundCollection, onBindingChange]);
  
  // Unlink
  const handleUnlink = useCallback(() => {
    onBindingChange(undefined);
    setIsConfigOpen(false);
  }, [onBindingChange]);
  
  const selectedCollection = collections?.find(c => c.collection_slug === boundCollection);
  
  // No binding - show button to add
  if (!boundCollection) {
    return (
      <div className={cn("", className)}>
        <Dialog>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className="w-full gap-2 text-muted-foreground"
              disabled={disabled || !collections?.length}
            >
              <Link2 className="h-4 w-4" />
              Lier à une collection
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Lier à une collection</DialogTitle>
              <DialogDescription>
                Choisissez une collection pour alimenter automatiquement ce champ
              </DialogDescription>
            </DialogHeader>
            
            <div className="py-4">
              <CollectionPicker
                collections={collections}
                value={undefined}
                onChange={handleCollectionChange}
                isLoading={isLoading}
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>
    );
  }
  
  // Has binding - show bound state with config
  return (
    <div className={cn("space-y-2", className)}>
      {/* Bound State Card */}
      <div className="flex items-center gap-2 p-2 rounded-md border bg-primary/5 border-primary/20">
        <Database className="h-4 w-4 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">
            {formatCollectionName(boundCollection)}
          </p>
          {selectedCollection && (
            <p className="text-xs text-muted-foreground">
              {selectedCollection.total_count} éléments • {Object.keys(currentMapping).length} champs mappés
            </p>
          )}
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-1">
          <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 px-2">
                <Settings2 className="h-3.5 w-3.5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Configuration du mapping</DialogTitle>
                <DialogDescription>
                  Associez les champs de la collection aux propriétés de l'élément
                </DialogDescription>
              </DialogHeader>
              
              <div className="py-4 space-y-4">
                {/* Collection Selector */}
                <div className="space-y-2">
                  <Label className="text-xs">Collection source</Label>
                  <CollectionPicker
                    collections={collections}
                    value={boundCollection}
                    onChange={handleCollectionChange}
                    isLoading={isLoading}
                  />
                </div>
                
                <Separator />
                
                {/* Field Mapping */}
                <div className="space-y-2">
                  <Label className="text-xs">Mapping des champs</Label>
                  {propertyFields.length > 0 && collectionFields.length > 0 ? (
                    <FieldMappingEditor
                      propertyFields={propertyFields}
                      collectionFields={collectionFields}
                      mappings={currentMapping as Record<string, string>}
                      onChange={handleMappingChange}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Chargement des champs...
                    </p>
                  )}
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" onClick={handleUnlink} className="gap-2">
                  <Unlink className="h-4 w-4" />
                  Délier
                </Button>
                <Button onClick={() => setIsConfigOpen(false)}>
                  Terminé
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 px-2 text-muted-foreground hover:text-destructive"
            onClick={handleUnlink}
          >
            <Unlink className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      
      {/* Mapping Preview */}
      {Object.keys(currentMapping).length > 0 && (
        <div className="text-xs text-muted-foreground px-2">
          Mapping: {Object.entries(currentMapping).map(([k, v]) => `${k}→${v}`).join(", ")}
        </div>
      )}
    </div>
  );
}
