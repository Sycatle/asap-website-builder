/**
 * Landing SaaS Property Editors
 * 
 * Generic, modular property editors based on schema definitions.
 * Each property type has its own dedicated editor component.
 */

"use client"

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import type { WebsiteElement, UpdateElementRequest } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Field, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Spinner } from "@/components/ui/spinner";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { 
  Plus, 
  Trash2, 
  GripVertical,
  ChevronDown,
  ChevronRight,
  Save,
  RotateCcw,
  Settings,
  Type,
  Link as LinkIcon,
  Image,
  ToggleLeft,
  List,
  Palette,
  Hash,
} from "lucide-react";
import { toast } from "sonner";
import {
  type PropertySchema,
  type SectionSchema,
  getSectionSchema,
  getDefaultSettings,
  getPropertyGroups,
  getPropertiesByGroup,
  AVAILABLE_ICONS,
} from "@asap/shared";

// ============================================
// Types
// ============================================

interface LandingSaaSPropertyEditorProps {
  element: WebsiteElement;
  onUpdate: (elementId: string, data: UpdateElementRequest) => Promise<WebsiteElement>;
  isUpdating?: boolean;
}

type SettingsData = Record<string, unknown>;

// ============================================
// Icon Map for Lucide Icons
// ============================================

const PropertyTypeIcons: Record<string, React.FC<{ className?: string }>> = {
  text: Type,
  textarea: Type,
  number: Hash,
  boolean: ToggleLeft,
  select: List,
  icon: Palette,
  url: LinkIcon,
  image: Image,
  array: List,
  group: Settings,
};

// ============================================
// Helper Functions
// ============================================

/**
 * Merge element settings with schema defaults
 * Element settings take priority over defaults
 */
function mergeWithDefaults(
  elementSettings: Record<string, unknown> | undefined,
  defaults: Record<string, unknown>
): SettingsData {
  const result = { ...defaults };
  
  if (!elementSettings) return result;
  
  // Override defaults with element settings (element data takes priority)
  for (const key of Object.keys(elementSettings)) {
    const value = elementSettings[key];
    // Only override if value is defined (not undefined)
    if (value !== undefined) {
      result[key] = value;
    }
  }
  
  return result;
}

function getValue<T>(data: SettingsData, key: string, defaultValue: T): T {
  if (data[key] === undefined) return defaultValue;
  return data[key] as T;
}

function shouldShowProperty(prop: PropertySchema, data: SettingsData): boolean {
  if (!prop.showIf) return true;
  return data[prop.showIf.key] === prop.showIf.value;
}

// ============================================
// Property Group Labels
// ============================================

const GROUP_LABELS: Record<string, { label: string; icon: React.FC<{ className?: string }> }> = {
  brand: { label: 'Marque', icon: Palette },
  content: { label: 'Contenu', icon: Type },
  navigation: { label: 'Navigation', icon: LinkIcon },
  auth: { label: 'Authentification', icon: Settings },
  mobile: { label: 'Mobile', icon: Settings },
  badge: { label: 'Badge', icon: Palette },
  cta: { label: 'Boutons d\'action', icon: LinkIcon },
  social_proof: { label: 'Preuve sociale', icon: Settings },
  preview: { label: 'Aperçu', icon: Image },
  style: { label: 'Style', icon: Palette },
  layout: { label: 'Mise en page', icon: Settings },
  features: { label: 'Fonctionnalités', icon: List },
  steps: { label: 'Étapes', icon: List },
  pricing: { label: 'Tarification', icon: Hash },
  plans: { label: 'Plans', icon: List },
  testimonials: { label: 'Témoignages', icon: List },
  badges: { label: 'Badges', icon: Palette },
  links: { label: 'Liens', icon: LinkIcon },
  social: { label: 'Réseaux sociaux', icon: LinkIcon },
  legal: { label: 'Légal', icon: Settings },
};

// ============================================
// Text Property Editor
// ============================================

interface PropertyEditorFieldProps {
  prop: PropertySchema;
  value: unknown;
  onChange: (key: string, value: unknown) => void;
}

function TextPropertyEditor({ prop, value, onChange }: PropertyEditorFieldProps) {
  return (
    <Field>
      <FieldLabel className="text-xs text-muted-foreground">
        {prop.label}
        {prop.required && <span className="text-destructive ml-1">*</span>}
      </FieldLabel>
      <Input
        value={(value as string) || ''}
        onChange={(e) => onChange(prop.key, e.target.value)}
        placeholder={prop.placeholder}
        className="h-9"
      />
      {prop.description && (
        <p className="text-xs text-muted-foreground mt-1">{prop.description}</p>
      )}
    </Field>
  );
}

// ============================================
// Textarea Property Editor
// ============================================

function TextareaPropertyEditor({ prop, value, onChange }: PropertyEditorFieldProps) {
  return (
    <Field>
      <FieldLabel className="text-xs text-muted-foreground">
        {prop.label}
        {prop.required && <span className="text-destructive ml-1">*</span>}
      </FieldLabel>
      <Textarea
        value={(value as string) || ''}
        onChange={(e) => onChange(prop.key, e.target.value)}
        placeholder={prop.placeholder}
        className="resize-none"
        rows={3}
      />
    </Field>
  );
}

// ============================================
// Number Property Editor
// ============================================

function NumberPropertyEditor({ prop, value, onChange }: PropertyEditorFieldProps) {
  return (
    <Field>
      <FieldLabel className="text-xs text-muted-foreground">
        {prop.label}
      </FieldLabel>
      <Input
        type="number"
        value={(value as number) || 0}
        onChange={(e) => onChange(prop.key, parseInt(e.target.value, 10) || 0)}
        placeholder={prop.placeholder}
        className="h-9"
      />
    </Field>
  );
}

// ============================================
// Boolean Property Editor
// ============================================

function BooleanPropertyEditor({ prop, value, onChange }: PropertyEditorFieldProps) {
  return (
    <Field orientation="horizontal" className="py-2">
      <FieldLabel className="text-sm flex-1">{prop.label}</FieldLabel>
      <Switch
        checked={value as boolean || false}
        onCheckedChange={(checked) => onChange(prop.key, checked)}
      />
    </Field>
  );
}

// ============================================
// Select Property Editor
// ============================================

function SelectPropertyEditor({ prop, value, onChange }: PropertyEditorFieldProps) {
  return (
    <Field>
      <FieldLabel className="text-xs text-muted-foreground">
        {prop.label}
      </FieldLabel>
      <Select
        value={(value as string) || prop.defaultValue as string || ''}
        onValueChange={(val) => onChange(prop.key, val)}
      >
        <SelectTrigger className="h-9">
          <SelectValue placeholder="Sélectionner..." />
        </SelectTrigger>
        <SelectContent>
          {prop.options?.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

// ============================================
// Icon Property Editor
// ============================================

function IconPropertyEditor({ prop, value, onChange }: PropertyEditorFieldProps) {
  return (
    <Field>
      <FieldLabel className="text-xs text-muted-foreground">
        {prop.label}
      </FieldLabel>
      <Select
        value={(value as string) || ''}
        onValueChange={(val) => onChange(prop.key, val)}
      >
        <SelectTrigger className="h-9">
          <SelectValue placeholder="Choisir une icône..." />
        </SelectTrigger>
        <SelectContent>
          <ScrollArea className="h-[200px]">
            {AVAILABLE_ICONS.map((icon) => (
              <SelectItem key={icon.value} value={icon.value}>
                {icon.label}
              </SelectItem>
            ))}
          </ScrollArea>
        </SelectContent>
      </Select>
    </Field>
  );
}

// ============================================
// URL Property Editor
// ============================================

function UrlPropertyEditor({ prop, value, onChange }: PropertyEditorFieldProps) {
  return (
    <Field>
      <FieldLabel className="text-xs text-muted-foreground flex items-center gap-1">
        <LinkIcon className="h-3 w-3" /> {prop.label}
      </FieldLabel>
      <Input
        type="url"
        value={(value as string) || ''}
        onChange={(e) => onChange(prop.key, e.target.value)}
        placeholder={prop.placeholder || 'https://...'}
        className="h-9"
      />
    </Field>
  );
}

// ============================================
// Image Property Editor
// ============================================

function ImagePropertyEditor({ prop, value, onChange }: PropertyEditorFieldProps) {
  const imageUrl = typeof value === 'string' ? value : '';
  
  return (
    <Field>
      <FieldLabel className="text-xs text-muted-foreground flex items-center gap-1">
        <Image className="h-3 w-3" /> {prop.label}
      </FieldLabel>
      <Input
        value={imageUrl}
        onChange={(e) => onChange(prop.key, e.target.value)}
        placeholder={prop.placeholder || 'https://...'}
        className="h-9"
      />
      {imageUrl && (
        <div className="mt-2 relative rounded-md overflow-hidden border h-20">
          <img
            src={imageUrl}
            alt="Preview"
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </div>
      )}
    </Field>
  );
}

// ============================================
// Array Item Editor
// ============================================

interface ArrayItemEditorProps {
  itemSchema: PropertySchema[];
  item: Record<string, unknown>;
  index: number;
  onUpdate: (index: number, key: string, value: unknown) => void;
  onRemove: (index: number) => void;
}

function ArrayItemEditor({ itemSchema, item, index, onUpdate, onRemove }: ArrayItemEditorProps) {
  const [isOpen, setIsOpen] = useState(true);
  
  // Get a label for the item
  const itemLabel = item.title || item.name || item.label || item.author || `Item ${index + 1}`;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="border rounded-lg bg-muted/30">
        <CollapsibleTrigger asChild>
          <div className="flex items-center gap-2 p-3 cursor-pointer hover:bg-muted/50">
            <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
            {isExpanded ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
            <span className="text-sm font-medium flex-1 truncate">{itemLabel as string}</span>
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(index);
              }}
              className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="p-3 pt-0 space-y-3">
            {itemSchema.map((prop) => (
              <PropertyFieldRouter
                key={prop.key}
                prop={prop}
                value={item[prop.key]}
                onChange={(key, value) => onUpdate(index, key, value)}
              />
            ))}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

// ============================================
// Array Property Editor
// ============================================

interface ArrayPropertyEditorProps extends PropertyEditorFieldProps {
  itemSchema: PropertySchema[];
  itemLabel: string;
  maxItems?: number;
}

function ArrayPropertyEditor({ prop, value, onChange, itemSchema, itemLabel, maxItems }: ArrayPropertyEditorProps) {
  const items = (value as Record<string, unknown>[]) || [];

  const addItem = () => {
    if (maxItems && items.length >= maxItems) return;
    
    // Create new item with default values
    const newItem: Record<string, unknown> = {};
    itemSchema.forEach((schema) => {
      if (schema.defaultValue !== undefined) {
        newItem[schema.key] = schema.defaultValue;
      } else {
        newItem[schema.key] = '';
      }
    });
    
    onChange(prop.key, [...items, newItem]);
  };

  const updateItem = (index: number, key: string, newValue: unknown) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [key]: newValue };
    onChange(prop.key, updated);
  };

  const removeItem = (index: number) => {
    onChange(prop.key, items.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <FieldLabel className="text-xs text-muted-foreground">
          {prop.label}
          {maxItems && (
            <Badge variant="outline" className="ml-2 text-xs">
              {items.length}/{maxItems}
            </Badge>
          )}
        </FieldLabel>
        <Button
          size="sm"
          variant="ghost"
          onClick={addItem}
          disabled={maxItems ? items.length >= maxItems : false}
          className="h-7"
        >
          <Plus className="h-3 w-3 mr-1" />
          {itemLabel}
        </Button>
      </div>
      
      <div className="space-y-2">
        {items.map((item, index) => (
          <ArrayItemEditor
            key={index}
            itemSchema={itemSchema}
            item={item}
            index={index}
            onUpdate={updateItem}
            onRemove={removeItem}
          />
        ))}
        
        {items.length === 0 && (
          <div className="text-center py-6 text-muted-foreground border-2 border-dashed rounded-lg">
            <p className="text-sm">Aucun {itemLabel.toLowerCase()}</p>
            <Button size="sm" variant="ghost" onClick={addItem} className="mt-2">
              <Plus className="h-3 w-3 mr-1" />
              Ajouter un {itemLabel.toLowerCase()}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// Nested Array Property Editor (for features in plans, etc.)
// ============================================

interface NestedArrayPropertyEditorProps extends PropertyEditorFieldProps {
  prop: PropertySchema;
}

function NestedArrayPropertyEditor({ prop, value, onChange }: NestedArrayPropertyEditorProps) {
  const items = (value as string[]) || [];

  const addItem = () => {
    onChange(prop.key, [...items, '']);
  };

  const updateItem = (index: number, newValue: string) => {
    const updated = [...items];
    updated[index] = newValue;
    onChange(prop.key, updated);
  };

  const removeItem = (index: number) => {
    onChange(prop.key, items.filter((_, i) => i !== index));
  };

  // Handle simple string arrays (like plan features)
  if (prop.itemSchema?.length === 1 && prop.itemSchema[0].type === 'text') {
    return (
      <div className="space-y-2">
        <FieldLabel className="text-xs text-muted-foreground">{prop.label}</FieldLabel>
        {items.map((item, index) => (
          <div key={index} className="flex items-center gap-2">
            <Input
              value={item}
              onChange={(e) => updateItem(index, e.target.value)}
              placeholder={prop.itemSchema?.[0].placeholder}
              className="h-8 flex-1"
            />
            <Button
              size="sm"
              variant="ghost"
              onClick={() => removeItem(index)}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
        <Button size="sm" variant="ghost" onClick={addItem} className="h-7">
          <Plus className="h-3 w-3 mr-1" />
          Ajouter
        </Button>
      </div>
    );
  }

  // For complex nested arrays, delegate to ArrayPropertyEditor
  return (
    <ArrayPropertyEditor
      prop={prop}
      value={value}
      onChange={onChange}
      itemSchema={prop.itemSchema || []}
      itemLabel={prop.itemLabel || 'Item'}
      maxItems={prop.maxItems}
    />
  );
}

// ============================================
// Property Field Router
// ============================================

function PropertyFieldRouter({ prop, value, onChange }: PropertyEditorFieldProps) {
  switch (prop.type) {
    case 'text':
      return <TextPropertyEditor prop={prop} value={value} onChange={onChange} />;
    case 'textarea':
      return <TextareaPropertyEditor prop={prop} value={value} onChange={onChange} />;
    case 'number':
      return <NumberPropertyEditor prop={prop} value={value} onChange={onChange} />;
    case 'boolean':
      return <BooleanPropertyEditor prop={prop} value={value} onChange={onChange} />;
    case 'select':
      return <SelectPropertyEditor prop={prop} value={value} onChange={onChange} />;
    case 'icon':
      return <IconPropertyEditor prop={prop} value={value} onChange={onChange} />;
    case 'url':
      return <UrlPropertyEditor prop={prop} value={value} onChange={onChange} />;
    case 'image':
      return <ImagePropertyEditor prop={prop} value={value} onChange={onChange} />;
    case 'array':
      if (prop.itemSchema) {
        return (
          <ArrayPropertyEditor
            prop={prop}
            value={value}
            onChange={onChange}
            itemSchema={prop.itemSchema}
            itemLabel={prop.itemLabel || 'Item'}
            maxItems={prop.maxItems}
          />
        );
      }
      return null;
    default:
      return <TextPropertyEditor prop={prop} value={value} onChange={onChange} />;
  }
}

// ============================================
// Property Group Component
// ============================================

interface PropertyGroupProps {
  groupKey: string;
  properties: PropertySchema[];
  settings: SettingsData;
  onChange: (key: string, value: unknown) => void;
}

function PropertyGroup({ groupKey, properties, settings, onChange }: PropertyGroupProps) {
  const [isOpen, setIsOpen] = useState(true);
  const groupInfo = GROUP_LABELS[groupKey] || { label: groupKey, icon: Settings };
  const GroupIcon = groupInfo.icon;

  // Filter properties based on showIf conditions
  const visibleProperties = properties.filter((prop) => shouldShowProperty(prop, settings));

  if (visibleProperties.length === 0) return null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <div className="flex items-center gap-2 py-2 cursor-pointer hover:text-foreground text-muted-foreground">
          {isOpen ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
          <GroupIcon className="h-4 w-4" />
          <span className="text-sm font-medium">{groupInfo.label}</span>
          <Badge variant="outline" className="ml-auto text-xs">
            {visibleProperties.length}
          </Badge>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="pl-6 pb-4 space-y-3">
          {visibleProperties.map((prop) => (
            <PropertyFieldRouter
              key={prop.key}
              prop={prop}
              value={settings[prop.key]}
              onChange={onChange}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

// ============================================
// Main Landing SaaS Property Editor
// ============================================

export function LandingSaaSPropertyEditor({
  element,
  onUpdate,
  isUpdating,
}: LandingSaaSPropertyEditorProps) {
  const { t } = useTranslation(['common', 'editor']);
  
  // Get schema for this element type
  const schema = useMemo(() => getSectionSchema(element.element_type), [element.element_type]);
  
  // Get default settings for this element type
  const defaults = useMemo(() => getDefaultSettings(element.element_type), [element.element_type]);
  
  // Local state for settings - merge element settings with defaults
  const [settings, setSettings] = useState<SettingsData>(() => 
    mergeWithDefaults(element.settings as Record<string, unknown>, defaults)
  );
  const [isDirty, setIsDirty] = useState(false);

  // Sync settings when element changes (e.g., selecting a different element)
  useEffect(() => {
    const newSettings = mergeWithDefaults(element.settings as Record<string, unknown>, defaults);
    setSettings(newSettings);
    setIsDirty(false);
  }, [element.id, element.settings, defaults]);

  // Get property groups
  const groups = useMemo(() => {
    if (!schema) return [];
    return getPropertyGroups(schema);
  }, [schema]);

  // Handle property change
  const handleChange = useCallback((key: string, value: unknown) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setIsDirty(true);
  }, []);

  // Save changes
  const handleSave = useCallback(async () => {
    if (!isDirty) return;
    try {
      await onUpdate(element.id, { settings });
      setIsDirty(false);
      toast.success(t('editor:messages.saved'));
    } catch {
      toast.error(t('common:errors.update'));
    }
  }, [element.id, settings, isDirty, onUpdate, t]);

  // Reset to defaults
  const handleReset = useCallback(() => {
    const defaultSettings = getDefaultSettings(element.element_type);
    setSettings(defaultSettings);
    setIsDirty(true);
  }, [element.element_type]);

  if (!schema) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">Éditeur non disponible pour ce type d'élément.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">{schema.label}</h3>
          <p className="text-xs text-muted-foreground">{schema.description}</p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleReset}
            disabled={isUpdating}
            title="Réinitialiser"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!isDirty || isUpdating}
          >
            {isUpdating ? (
              <Spinner className="h-4 w-4" />
            ) : (
              <>
                <Save className="h-4 w-4 mr-1" />
                Enregistrer
              </>
            )}
          </Button>
        </div>
      </div>

      <Separator />

      {/* Property Groups */}
      <ScrollArea className="h-[calc(100vh-280px)]">
        <div className="space-y-1 pr-4">
          {groups.map((groupKey) => {
            const groupProperties = getPropertiesByGroup(schema, groupKey);
            return (
              <PropertyGroup
                key={groupKey}
                groupKey={groupKey}
                properties={groupProperties}
                settings={settings}
                onChange={handleChange}
              />
            );
          })}
          
          {/* Properties without a group */}
          {schema.properties
            .filter((p) => !p.group && shouldShowProperty(p, settings))
            .map((prop) => (
              <PropertyFieldRouter
                key={prop.key}
                prop={prop}
                value={settings[prop.key]}
                onChange={handleChange}
              />
            ))}
        </div>
      </ScrollArea>
    </div>
  );
}

export default LandingSaaSPropertyEditor;
