"use client";

import { useState, useEffect, useRef } from "react";
import type { WebsiteElement, UpdateElementRequest } from "@/lib/types/element";
import { 
  getSectionSchema, 
  getPropertyGroups, 
  getPropertiesByGroup,
  type PropertySchema,
  type SectionSchema 
} from "@asap/shared";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useDebounce } from "@/hooks/use-debounce";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { IconPicker } from "./icon-picker";
import { ImageEditor } from "./image-editor";
import { ColorPicker } from "./color-picker";

interface SchemaPropertyEditorProps {
  element: WebsiteElement;
  onUpdate: (updates: Partial<UpdateElementRequest>) => Promise<void>;
  isUpdating: boolean;
}

// Group labels in French
const GROUP_LABELS: Record<string, string> = {
  badge: "Badge",
  content: "Contenu",
  cta: "Boutons d'action",
  social_proof: "Preuve sociale",
  preview: "Aperçu",
  navigation: "Navigation",
  features: "Fonctionnalités",
  steps: "Étapes",
  plans: "Plans tarifaires",
  testimonials: "Témoignages",
  links: "Liens",
  branding: "Marque",
  layout: "Mise en page",
  style: "Style",
};

export function SchemaPropertyEditor({
  element,
  onUpdate,
  isUpdating,
}: SchemaPropertyEditorProps) {
  const schema = getSectionSchema(element.element_type);
  
  if (!schema) {
    return (
      <div className="text-sm text-muted-foreground p-4">
        Aucun schéma disponible pour le type "{element.element_type}"
      </div>
    );
  }

  const groups = getPropertyGroups(schema);
  const settings = element.settings || {};

  return (
    <div className="space-y-4">
      {groups.map((group: string) => (
        <PropertyGroup
          key={`${element.id}-${group}`}
          elementId={element.id}
          group={group}
          schema={schema}
          settings={settings}
          onUpdate={onUpdate}
          isUpdating={isUpdating}
        />
      ))}
      
      {/* Properties without group */}
      <PropertyGroup
        elementId={element.id}
        group=""
        schema={schema}
        settings={settings}
        onUpdate={onUpdate}
        isUpdating={isUpdating}
      />
    </div>
  );
}

interface PropertyGroupProps {
  elementId: string;
  group: string;
  schema: SectionSchema;
  settings: Record<string, unknown>;
  onUpdate: (updates: Partial<UpdateElementRequest>) => Promise<void>;
  isUpdating: boolean;
}

function PropertyGroup({
  elementId,
  group,
  schema,
  settings,
  onUpdate,
  isUpdating,
}: PropertyGroupProps) {
  const properties = group 
    ? getPropertiesByGroup(schema, group)
    : schema.properties.filter((p: PropertySchema) => !p.group);
  
  if (properties.length === 0) return null;

  const groupLabel = GROUP_LABELS[group] || group || "Général";

  return (
    <Collapsible defaultOpen className="border rounded-lg">
      <CollapsibleTrigger className="flex items-center justify-between w-full p-3 hover:bg-muted/50 transition-colors">
        <span className="text-sm font-medium">{groupLabel}</span>
        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="p-3 pt-0 space-y-4">
          {properties.map((prop: PropertySchema) => (
            <PropertyField
              key={`${elementId}-${prop.key}`}
              property={prop}
              settings={settings}
              onUpdate={onUpdate}
              isUpdating={isUpdating}
            />
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

interface PropertyFieldProps {
  property: PropertySchema;
  settings: Record<string, unknown>;
  onUpdate: (updates: Partial<UpdateElementRequest>) => Promise<void>;
  isUpdating: boolean;
}

function PropertyField({
  property,
  settings,
  onUpdate,
  isUpdating,
}: PropertyFieldProps) {
  // Check conditional visibility
  if (property.showIf) {
    const conditionValue = settings[property.showIf.key];
    if (conditionValue !== property.showIf.value) {
      return null;
    }
  }

  const currentValue = settings[property.key] ?? property.defaultValue;

  const handleChange = async (value: unknown) => {
    await onUpdate({
      settings: {
        ...settings,
        [property.key]: value,
      },
    });
  };

  switch (property.type) {
    case "text":
    case "url":
      return (
        <TextProperty
          property={property}
          value={currentValue as string}
          onChange={handleChange}
          isUpdating={isUpdating}
        />
      );
    
    case "image":
      return (
        <ImageProperty
          property={property}
          value={currentValue as string}
          onChange={handleChange}
          isUpdating={isUpdating}
        />
      );
    
    case "textarea":
      return (
        <TextareaProperty
          property={property}
          value={currentValue as string}
          onChange={handleChange}
          isUpdating={isUpdating}
        />
      );
    
    case "number":
      return (
        <NumberProperty
          property={property}
          value={currentValue as number}
          onChange={handleChange}
          isUpdating={isUpdating}
        />
      );
    
    case "boolean":
      return (
        <BooleanProperty
          property={property}
          value={currentValue as boolean}
          onChange={handleChange}
          isUpdating={isUpdating}
        />
      );
    
    case "select":
      return (
        <SelectProperty
          property={property}
          value={currentValue as string}
          onChange={handleChange}
          isUpdating={isUpdating}
        />
      );
    
    case "icon":
      return (
        <IconProperty
          property={property}
          value={currentValue as string}
          onChange={handleChange}
          isUpdating={isUpdating}
        />
      );
    
    case "color":
      return (
        <ColorProperty
          property={property}
          value={currentValue as string}
          onChange={handleChange}
          isUpdating={isUpdating}
        />
      );
    
    case "array":
      return (
        <ArrayProperty
          property={property}
          value={currentValue as unknown[]}
          onChange={handleChange}
          isUpdating={isUpdating}
        />
      );
    
    default:
      return (
        <div className="text-xs text-muted-foreground">
          Type "{property.type}" non supporté
        </div>
      );
  }
}

// ============================================
// Custom hook for debounced text inputs
// ============================================

function useDebouncedInput(
  initialValue: string,
  onChange: (value: string) => Promise<void>,
  delay = 500
) {
  const [localValue, setLocalValue] = useState(initialValue || "");
  const debouncedValue = useDebounce(localValue, delay);
  const isInitialMount = useRef(true);
  const lastSavedValue = useRef(initialValue || "");
  const onChangeRef = useRef(onChange);
  
  // Keep onChange ref up to date (must be in effect, not during render)
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Auto-save when debounced value changes (skip initial mount)
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    
    // Only save if value actually changed from last saved
    if (debouncedValue !== lastSavedValue.current) {
      lastSavedValue.current = debouncedValue;
      onChangeRef.current(debouncedValue);
    }
  }, [debouncedValue]);

  return [localValue, setLocalValue] as const;
}

// ============================================
// Property Type Components
// ============================================

interface BasePropertyProps<T> {
  property: PropertySchema;
  value: T;
  onChange: (value: T) => Promise<void>;
  isUpdating: boolean;
}

function TextProperty({ property, value, onChange, isUpdating }: BasePropertyProps<string>) {
  const [localValue, setLocalValue] = useDebouncedInput(value, onChange);

  return (
    <div className="space-y-2">
      <Label htmlFor={property.key} className="text-xs">
        {property.label}
        {property.required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <Input
        id={property.key}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder={property.placeholder}
        disabled={isUpdating}
        className="h-8 text-sm"
      />
      {property.description && (
        <p className="text-xs text-muted-foreground">{property.description}</p>
      )}
    </div>
  );
}

function TextareaProperty({ property, value, onChange, isUpdating }: BasePropertyProps<string>) {
  const [localValue, setLocalValue] = useDebouncedInput(value, onChange);

  return (
    <div className="space-y-2">
      <Label htmlFor={property.key} className="text-xs">
        {property.label}
      </Label>
      <Textarea
        id={property.key}
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder={property.placeholder}
        disabled={isUpdating}
        rows={3}
        className="text-sm resize-none"
      />
    </div>
  );
}

function NumberProperty({ property, value, onChange, isUpdating }: BasePropertyProps<number>) {
  return (
    <div className="space-y-2">
      <Label htmlFor={property.key} className="text-xs">
        {property.label}
      </Label>
      <Input
        id={property.key}
        type="number"
        value={value ?? ""}
        onChange={(e) => onChange(Number(e.target.value))}
        placeholder={property.placeholder}
        disabled={isUpdating}
        className="h-8 text-sm"
      />
    </div>
  );
}

function BooleanProperty({ property, value, onChange, isUpdating }: BasePropertyProps<boolean>) {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-0.5">
        <Label htmlFor={property.key} className="text-xs">
          {property.label}
        </Label>
        {property.description && (
          <p className="text-xs text-muted-foreground">{property.description}</p>
        )}
      </div>
      <Switch
        id={property.key}
        checked={value ?? false}
        onCheckedChange={onChange}
        disabled={isUpdating}
      />
    </div>
  );
}

function SelectProperty({ property, value, onChange, isUpdating }: BasePropertyProps<string>) {
  return (
    <div className="space-y-2">
      <Label htmlFor={property.key} className="text-xs">
        {property.label}
      </Label>
      <Select
        value={value || ""}
        onValueChange={onChange}
        disabled={isUpdating}
      >
        <SelectTrigger className="h-8 text-sm">
          <SelectValue placeholder={property.placeholder || "Sélectionner..."} />
        </SelectTrigger>
        <SelectContent>
          {property.options?.map((option: { value: string; label: string }) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

function IconProperty({ property, value, onChange, isUpdating }: BasePropertyProps<string>) {
  return (
    <IconPicker
      value={value || ""}
      onChange={onChange}
      label={property.label}
      placeholder={property.placeholder || "Sélectionner une icône"}
      disabled={isUpdating}
    />
  );
}

function ImageProperty({ property, value, onChange, isUpdating }: BasePropertyProps<string>) {
  return (
    <ImageEditor
      value={value || ""}
      onChange={onChange}
      label={property.label}
      placeholder={property.placeholder || "Sélectionner une image"}
      disabled={isUpdating}
    />
  );
}

function ColorProperty({ property, value, onChange, isUpdating }: BasePropertyProps<string>) {
  return (
    <ColorPicker
      value={value || ""}
      onChange={onChange}
      label={property.label}
      disabled={isUpdating}
    />
  );
}

function ArrayProperty({ property, value, onChange, isUpdating }: BasePropertyProps<unknown[]>) {
  const items = value || [];

  const handleAddItem = () => {
    const newItem: Record<string, unknown> = {};
    property.itemSchema?.forEach((field: PropertySchema) => {
      newItem[field.key] = field.defaultValue ?? "";
    });
    onChange([...items, newItem]);
  };

  const handleRemoveItem = (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleItemChange = (index: number, key: string, fieldValue: unknown) => {
    const updated = [...items];
    updated[index] = { ...(updated[index] as object), [key]: fieldValue };
    onChange(updated);
  };

  const canAdd = !property.maxItems || items.length < property.maxItems;
  const canRemove = !property.minItems || items.length > property.minItems;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs">{property.label}</Label>
        <Badge variant="secondary" className="text-xs">
          {items.length}{property.maxItems ? `/${property.maxItems}` : ""}
        </Badge>
      </div>
      
      <div className="space-y-2">
        {items.map((item, index) => (
          <div 
            key={index}
            className="border rounded-md p-3 space-y-3 bg-muted/30"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                {property.itemLabel || "Élément"} {index + 1}
              </span>
              {canRemove && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => handleRemoveItem(index)}
                  disabled={isUpdating}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
            
            {property.itemSchema?.map((field: PropertySchema) => (
              <div key={field.key} className="space-y-1">
                <Label className="text-xs text-muted-foreground">
                  {field.label}
                </Label>
                {field.type === "textarea" ? (
                  <Textarea
                    value={(item as Record<string, unknown>)[field.key] as string || ""}
                    onChange={(e) => handleItemChange(index, field.key, e.target.value)}
                    placeholder={field.placeholder}
                    disabled={isUpdating}
                    rows={2}
                    className="text-sm resize-none"
                  />
                ) : (
                  <Input
                    value={(item as Record<string, unknown>)[field.key] as string || ""}
                    onChange={(e) => handleItemChange(index, field.key, e.target.value)}
                    placeholder={field.placeholder}
                    disabled={isUpdating}
                    className="h-7 text-sm"
                  />
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      {canAdd && (
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={handleAddItem}
          disabled={isUpdating}
        >
          <Plus className="h-3 w-3 mr-2" />
          Ajouter {property.itemLabel?.toLowerCase() || "un élément"}
        </Button>
      )}
    </div>
  );
}
