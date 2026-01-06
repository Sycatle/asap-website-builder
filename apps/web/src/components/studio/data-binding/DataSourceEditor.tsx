/**
 * Data Source Editor Component
 * 
 * Complete editor for configuring a section's data source.
 * Includes collection selection, filtering, sorting, and field mapping.
 */

'use client';

import * as React from 'react';
import { 
  Database, 
  Filter, 
  ArrowUpDown, 
  Link2, 
  Plus, 
  Trash2,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CollectionSelector } from './CollectionSelector';
import type { 
  DataSource, 
  FilterClause, 
  SortClause, 
  FilterOperator,
  CollectionSummary,
  CollectionFieldDef,
  CollectionSchema,
} from '@asap/shared';

// ============================================
// Types
// ============================================

export interface DataSourceEditorProps {
  /** Current data source configuration */
  value: DataSource | undefined;
  /** Callback when configuration changes */
  onChange: (value: DataSource | undefined) => void;
  /** Available collections */
  collections: CollectionSummary[];
  /** Collection schema (for the selected collection) */
  schema?: CollectionSchema;
  /** Component props to map (from section definition) */
  componentProps?: string[];
  /** Loading state */
  isLoading?: boolean;
  /** Custom class name */
  className?: string;
}

// ============================================
// Filter Operators
// ============================================

const filterOperators: { value: FilterOperator; label: string }[] = [
  { value: 'eq', label: 'Égal à' },
  { value: 'neq', label: 'Différent de' },
  { value: 'gt', label: 'Supérieur à' },
  { value: 'gte', label: 'Supérieur ou égal' },
  { value: 'lt', label: 'Inférieur à' },
  { value: 'lte', label: 'Inférieur ou égal' },
  { value: 'contains', label: 'Contient' },
  { value: 'starts_with', label: 'Commence par' },
  { value: 'ends_with', label: 'Termine par' },
  { value: 'in', label: 'Dans la liste' },
  { value: 'exists', label: 'Existe' },
  { value: 'not_exists', label: 'N\'existe pas' },
];

// ============================================
// Filter Editor
// ============================================

interface FilterEditorProps {
  filters: FilterClause[];
  onChange: (filters: FilterClause[]) => void;
  fields: CollectionFieldDef[];
}

function FilterEditor({ filters, onChange, fields }: FilterEditorProps) {
  const filterableFields = fields.filter(f => f.filterable);

  const addFilter = () => {
    const defaultField = filterableFields[0]?.key || 'id';
    onChange([...filters, { field: defaultField, operator: 'eq', value: '' }]);
  };

  const updateFilter = (index: number, update: Partial<FilterClause>) => {
    const newFilters = [...filters];
    newFilters[index] = { ...newFilters[index], ...update };
    onChange(newFilters);
  };

  const removeFilter = (index: number) => {
    onChange(filters.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      {filters.map((filter, index) => (
        <div key={index} className="flex items-center gap-2">
          <Select
            value={filter.field}
            onValueChange={(v) => updateFilter(index, { field: v })}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {filterableFields.map((field) => (
                <SelectItem key={field.key} value={field.key}>
                  {field.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Select
            value={filter.operator}
            onValueChange={(v) => updateFilter(index, { operator: v as FilterOperator })}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {filterOperators.map((op) => (
                <SelectItem key={op.value} value={op.value}>
                  {op.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Input
            value={String(filter.value || '')}
            onChange={(e) => updateFilter(index, { value: e.target.value })}
            placeholder="Valeur"
            className="flex-1"
          />
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => removeFilter(index)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      
      <Button
        variant="outline"
        size="sm"
        onClick={addFilter}
        className="w-full"
        disabled={filterableFields.length === 0}
      >
        <Plus className="h-4 w-4 mr-2" />
        Ajouter un filtre
      </Button>
      
      {filterableFields.length === 0 && (
        <p className="text-xs text-muted-foreground text-center">
          Aucun champ filtrable dans cette collection
        </p>
      )}
    </div>
  );
}

// ============================================
// Sort Editor
// ============================================

interface SortEditorProps {
  sort: SortClause | undefined;
  onChange: (sort: SortClause | undefined) => void;
  fields: CollectionFieldDef[];
}

function SortEditor({ sort, onChange, fields }: SortEditorProps) {
  const sortableFields = fields.filter(f => f.sortable);

  return (
    <div className="flex items-center gap-2">
      <Select
        value={sort?.field || ''}
        onValueChange={(v) => {
          if (v) {
            onChange({ field: v, order: sort?.order || 'desc' });
          } else {
            onChange(undefined);
          }
        }}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Trier par..." />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="">Aucun tri</SelectItem>
          {sortableFields.map((field) => (
            <SelectItem key={field.key} value={field.key}>
              {field.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {sort && (
        <Select
          value={sort.order}
          onValueChange={(v) => onChange({ ...sort, order: v as 'asc' | 'desc' })}
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="asc">Croissant</SelectItem>
            <SelectItem value="desc">Décroissant</SelectItem>
          </SelectContent>
        </Select>
      )}
    </div>
  );
}

// ============================================
// Field Mapping Editor
// ============================================

interface FieldMappingEditorProps {
  mapping: Record<string, string>;
  onChange: (mapping: Record<string, string>) => void;
  fields: CollectionFieldDef[];
  componentProps: string[];
}

function FieldMappingEditor({ 
  mapping, 
  onChange, 
  fields, 
  componentProps 
}: FieldMappingEditorProps) {
  const updateMapping = (prop: string, field: string) => {
    if (field) {
      onChange({ ...mapping, [prop]: field });
    } else {
      const newMapping = { ...mapping };
      delete newMapping[prop];
      onChange(newMapping);
    }
  };

  return (
    <div className="space-y-3">
      {componentProps.map((prop) => (
        <div key={prop} className="flex items-center gap-3">
          <Label className="w-[120px] text-sm">{formatPropName(prop)}</Label>
          <div className="flex items-center gap-2 flex-1">
            <Link2 className="h-4 w-4 text-muted-foreground" />
            <Select
              value={mapping[prop] || ''}
              onValueChange={(v) => updateMapping(prop, v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un champ..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Non lié</SelectItem>
                {fields.map((field) => (
                  <SelectItem key={field.key} value={field.key}>
                    {field.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function DataSourceEditor({
  value,
  onChange,
  collections,
  schema,
  componentProps = [],
  isLoading = false,
  className,
}: DataSourceEditorProps) {
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [sortOpen, setSortOpen] = React.useState(false);
  const [mappingOpen, setMappingOpen] = React.useState(false);

  const isCollectionSource = value?.type === 'collection';
  const fields = schema?.fields || [];

  const handleTypeChange = (type: 'static' | 'collection') => {
    if (type === 'static') {
      onChange({ type: 'static' });
    } else {
      onChange({ 
        type: 'collection',
        collection: collections[0]?.collection_slug,
      });
    }
  };

  const handleCollectionChange = (slug: string | undefined) => {
    onChange({
      ...value,
      type: 'collection',
      collection: slug,
      filter: undefined, // Reset filters when changing collection
      sort: undefined,
      mapping: undefined,
    });
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Database className="h-4 w-4" />
          Source de données
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Source Type Toggle */}
        <div className="flex gap-2">
          <Button
            variant={!isCollectionSource ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleTypeChange('static')}
            className="flex-1"
          >
            Statique
          </Button>
          <Button
            variant={isCollectionSource ? 'default' : 'outline'}
            size="sm"
            onClick={() => handleTypeChange('collection')}
            className="flex-1"
          >
            Collection
          </Button>
        </div>

        {isCollectionSource && (
          <>
            {/* Collection Selector */}
            <CollectionSelector
              collections={collections}
              value={value.collection}
              onChange={handleCollectionChange}
              isLoading={isLoading}
            />

            {value.collection && schema && (
              <>
                <Separator />

                {/* Filters */}
                <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between">
                      <span className="flex items-center gap-2">
                        <Filter className="h-4 w-4" />
                        Filtres
                        {value.filter && value.filter.length > 0 && (
                          <Badge variant="secondary">
                            {value.filter.length}
                          </Badge>
                        )}
                      </span>
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-2">
                    <FilterEditor
                      filters={value.filter || []}
                      onChange={(filter) => onChange({ ...value, filter })}
                      fields={fields}
                    />
                  </CollapsibleContent>
                </Collapsible>

                {/* Sort */}
                <Collapsible open={sortOpen} onOpenChange={setSortOpen}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" className="w-full justify-between">
                      <span className="flex items-center gap-2">
                        <ArrowUpDown className="h-4 w-4" />
                        Tri
                        {value.sort && (
                          <Badge variant="secondary">
                            {value.sort.field}
                          </Badge>
                        )}
                      </span>
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-2">
                    <SortEditor
                      sort={value.sort}
                      onChange={(sort) => onChange({ ...value, sort })}
                      fields={fields}
                    />
                  </CollapsibleContent>
                </Collapsible>

                {/* Limit */}
                <div className="flex items-center gap-3">
                  <Label className="text-sm">Limite</Label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={value.limit || ''}
                    onChange={(e) => onChange({ 
                      ...value, 
                      limit: e.target.value ? parseInt(e.target.value) : undefined 
                    })}
                    placeholder="Tous"
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">éléments</span>
                </div>

                {/* Field Mapping */}
                {componentProps.length > 0 && (
                  <Collapsible open={mappingOpen} onOpenChange={setMappingOpen}>
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" className="w-full justify-between">
                        <span className="flex items-center gap-2">
                          <Link2 className="h-4 w-4" />
                          Correspondance des champs
                        </span>
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="pt-2">
                      <FieldMappingEditor
                        mapping={value.mapping as Record<string, string> || {}}
                        onChange={(mapping) => onChange({ ...value, mapping })}
                        fields={fields}
                        componentProps={componentProps}
                      />
                    </CollapsibleContent>
                  </Collapsible>
                )}
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// Utility Functions
// ============================================

function formatPropName(prop: string): string {
  return prop
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

export default DataSourceEditor;
