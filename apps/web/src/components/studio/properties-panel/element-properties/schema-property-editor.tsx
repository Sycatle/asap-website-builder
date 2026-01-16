"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { WebsiteElement, UpdateElementRequest } from "@/lib/types/element";
import { 
  getSectionSchema, 
  getPropertyGroups, 
  getPropertiesByGroup,
  type PropertySchema,
  type SectionSchema,
  type DataBinding,
} from "@asap/shared";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
import { ChevronDown, AlertCircle } from "lucide-react";
import { IconPicker } from "./icon-picker";
import { ImageEditor } from "./image-editor";
import { ColorPicker } from "./color-picker";
import { SortableArrayEditor } from "./sortable-array-editor";
import { VariableTextInput } from "./variable-text-input";
import { CollectionBinding } from "./collection-binding";
import { usePropertyValidation } from "./property-validation";
import { cn } from "@/lib/utils";

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
// Validation Error Component
// ============================================

function ValidationError({ message }: { message: string | null }) {
  if (!message) return null;
  
  return (
    <div className="flex items-center gap-1 text-xs text-destructive">
      <AlertCircle className="h-3 w-3" />
      <span>{message}</span>
    </div>
  );
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
  const { validate } = usePropertyValidation(property);
  const [error, setError] = useState<string | null>(null);
  
  // Validate on change
  const handleChange = useCallback((newValue: string) => {
    setLocalValue(newValue);
    setError(validate(newValue));
  }, [setLocalValue, validate]);

  // Check if this field supports variables (text fields that aren't URLs)
  const supportsVariables = property.type === "text" && !property.key.includes("url");

  if (supportsVariables) {
    return (
      <VariableTextInput
        value={localValue}
        onChange={handleChange}
        label={property.label}
        placeholder={property.placeholder}
        disabled={isUpdating}
        error={error}
        description={property.description}
        required={property.required}
      />
    );
  }

  return (
    <div className="space-y-1.5">
      <Label htmlFor={property.key} className="text-xs">
        {property.label}
        {property.required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <Input
        id={property.key}
        value={localValue}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={property.placeholder}
        disabled={isUpdating}
        className={cn("h-8 text-sm", error && "border-destructive")}
      />
      <ValidationError message={error} />
      {!error && property.description && (
        <p className="text-xs text-muted-foreground">{property.description}</p>
      )}
    </div>
  );
}

function TextareaProperty({ property, value, onChange, isUpdating }: BasePropertyProps<string>) {
  const [localValue, setLocalValue] = useDebouncedInput(value, onChange);

  // Textareas always support variables
  return (
    <VariableTextInput
      value={localValue}
      onChange={setLocalValue}
      label={property.label}
      placeholder={property.placeholder}
      disabled={isUpdating}
      description={property.description}
      multiline
      rows={3}
    />
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
  const [binding, setBinding] = useState<DataBinding | undefined>(undefined);
  
  return (
    <div className="space-y-3">
      {/* Collection Binding Option */}
      <CollectionBinding
        property={property}
        binding={binding}
        onBindingChange={setBinding}
        disabled={isUpdating}
      />
      
      {/* Manual Editor (shown when not bound to collection) */}
      {!binding?.collection && (
        <SortableArrayEditor
          property={property}
          value={value || []}
          onChange={onChange}
          isUpdating={isUpdating}
        />
      )}
      
      {/* Bound Preview (shown when bound to collection) */}
      {binding?.collection && (
        <div className="text-sm text-muted-foreground p-3 border rounded-md bg-muted/30 text-center">
          <p>Les données seront automatiquement chargées depuis la collection</p>
          <p className="text-xs mt-1">La preview se mettra à jour lors de la publication</p>
        </div>
      )}
    </div>
  );
}
