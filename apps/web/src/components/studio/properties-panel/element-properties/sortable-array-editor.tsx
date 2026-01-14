"use client";

import React, { useState } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { 
  GripVertical, 
  Plus, 
  Trash2, 
  ChevronDown,
  Copy,
} from "lucide-react";
import type { PropertySchema } from "@asap/shared";
import { IconPicker } from "./icon-picker";
import { ImageEditor } from "./image-editor";

interface SortableArrayEditorProps {
  property: PropertySchema;
  value: unknown[];
  onChange: (value: unknown[]) => Promise<void>;
  isUpdating: boolean;
}

interface ArrayItem {
  id: string;
  data: Record<string, unknown>;
}

// Generate unique ID for items
function generateItemId(): string {
  return `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Convert raw array to items with IDs
function toArrayItems(items: unknown[]): ArrayItem[] {
  return items.map((item, index) => ({
    id: (item as Record<string, unknown>)?._id as string || `item-${index}`,
    data: item as Record<string, unknown>,
  }));
}

// Convert items back to raw array (without IDs if not in schema)
function fromArrayItems(items: ArrayItem[]): Record<string, unknown>[] {
  return items.map(item => item.data);
}

export function SortableArrayEditor({
  property,
  value,
  onChange,
  isUpdating,
}: SortableArrayEditorProps) {
  const items = toArrayItems(value || []);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex(item => item.id === active.id);
      const newIndex = items.findIndex(item => item.id === over.id);
      const newItems = arrayMove(items, oldIndex, newIndex);
      onChange(fromArrayItems(newItems));
    }
  };

  const handleAddItem = () => {
    const newItem: Record<string, unknown> = { _id: generateItemId() };
    property.itemSchema?.forEach((field: PropertySchema) => {
      newItem[field.key] = field.defaultValue ?? "";
    });
    const newItems = [...items, { id: newItem._id as string, data: newItem }];
    onChange(fromArrayItems(newItems));
    // Expand the new item
    setExpandedItems(prev => new Set([...prev, newItem._id as string]));
  };

  const handleDuplicateItem = (index: number) => {
    const itemToDuplicate = items[index];
    const newItem: Record<string, unknown> = { 
      ...itemToDuplicate.data, 
      _id: generateItemId() 
    };
    const newItems = [
      ...items.slice(0, index + 1),
      { id: newItem._id as string, data: newItem },
      ...items.slice(index + 1),
    ];
    onChange(fromArrayItems(newItems));
  };

  const handleRemoveItem = (index: number) => {
    const updated = items.filter((_, i) => i !== index);
    onChange(fromArrayItems(updated));
  };

  const handleItemChange = (index: number, key: string, fieldValue: unknown) => {
    const updated = [...items];
    updated[index] = { 
      ...updated[index], 
      data: { ...updated[index].data, [key]: fieldValue } 
    };
    onChange(fromArrayItems(updated));
  };

  const toggleExpanded = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const canAdd = !property.maxItems || items.length < property.maxItems;
  const canRemove = !property.minItems || items.length > property.minItems;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium">{property.label}</Label>
        <Badge variant="secondary" className="text-xs">
          {items.length}{property.maxItems ? `/${property.maxItems}` : ""}
        </Badge>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items.map(item => item.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {items.map((item, index) => (
              <SortableItem
                key={item.id}
                id={item.id}
                index={index}
                item={item.data}
                property={property}
                isExpanded={expandedItems.has(item.id)}
                onToggleExpanded={() => toggleExpanded(item.id)}
                onDuplicate={() => handleDuplicateItem(index)}
                onRemove={() => handleRemoveItem(index)}
                onChange={(key, value) => handleItemChange(index, key, value)}
                canRemove={canRemove}
                isUpdating={isUpdating}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

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

interface SortableItemProps {
  id: string;
  index: number;
  item: Record<string, unknown>;
  property: PropertySchema;
  isExpanded: boolean;
  onToggleExpanded: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
  onChange: (key: string, value: unknown) => void;
  canRemove: boolean;
  isUpdating: boolean;
}

function SortableItem({
  id,
  index,
  item,
  property,
  isExpanded,
  onToggleExpanded,
  onDuplicate,
  onRemove,
  onChange,
  canRemove,
  isUpdating,
}: SortableItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  // Get a preview text from the item
  const getPreviewText = () => {
    // Look for common title/name fields
    const titleFields = ['title', 'name', 'label', 'text', 'headline'];
    for (const field of titleFields) {
      if (item[field] && typeof item[field] === 'string') {
        return item[field] as string;
      }
    }
    return `${property.itemLabel || 'Élément'} ${index + 1}`;
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "border rounded-lg bg-card transition-colors",
        isDragging && "opacity-50 shadow-lg border-primary"
      )}
    >
      <Collapsible open={isExpanded} onOpenChange={onToggleExpanded}>
        {/* Header - always visible */}
        <div className="flex items-center gap-2 p-2">
          {/* Drag handle */}
          <button
            className={cn(
              "cursor-grab p-1 rounded hover:bg-muted",
              isDragging && "cursor-grabbing"
            )}
            {...attributes}
            {...listeners}
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </button>

          {/* Item preview */}
          <CollapsibleTrigger asChild>
            <button className="flex-1 flex items-center gap-2 text-left hover:bg-muted/50 rounded p-1 -m-1">
              <span className="text-sm font-medium truncate">
                {getPreviewText()}
              </span>
              <ChevronDown 
                className={cn(
                  "h-4 w-4 text-muted-foreground transition-transform ml-auto",
                  isExpanded && "rotate-180"
                )} 
              />
            </button>
          </CollapsibleTrigger>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={onDuplicate}
              disabled={isUpdating}
              title="Dupliquer"
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
            {canRemove && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-destructive hover:text-destructive"
                onClick={onRemove}
                disabled={isUpdating}
                title="Supprimer"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Expanded content */}
        <CollapsibleContent>
          <div className="px-3 pb-3 pt-1 space-y-3 border-t">
            {property.itemSchema?.map((field: PropertySchema) => (
              <ArrayItemField
                key={field.key}
                field={field}
                value={item[field.key]}
                onChange={(value) => onChange(field.key, value)}
                isUpdating={isUpdating}
              />
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

interface ArrayItemFieldProps {
  field: PropertySchema;
  value: unknown;
  onChange: (value: unknown) => void;
  isUpdating: boolean;
}

function ArrayItemField({ field, value, onChange, isUpdating }: ArrayItemFieldProps) {
  const stringValue = (value as string) || "";

  switch (field.type) {
    case "textarea":
      return (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{field.label}</Label>
          <Textarea
            value={stringValue}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            disabled={isUpdating}
            rows={2}
            className="text-sm resize-none"
          />
        </div>
      );

    case "icon":
      return (
        <IconPicker
          value={stringValue}
          onChange={onChange}
          label={field.label}
          disabled={isUpdating}
        />
      );

    case "image":
      return (
        <ImageEditor
          value={stringValue}
          onChange={(v) => onChange(v)}
          label={field.label}
          disabled={isUpdating}
        />
      );

    case "url":
      return (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{field.label}</Label>
          <Input
            type="url"
            value={stringValue}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || "https://..."}
            disabled={isUpdating}
            className="h-8 text-sm"
          />
        </div>
      );

    case "number":
      return (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{field.label}</Label>
          <Input
            type="number"
            value={value as number || ""}
            onChange={(e) => onChange(Number(e.target.value))}
            placeholder={field.placeholder}
            disabled={isUpdating}
            className="h-8 text-sm"
          />
        </div>
      );

    default:
      return (
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">{field.label}</Label>
          <Input
            value={stringValue}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder}
            disabled={isUpdating}
            className="h-8 text-sm"
          />
        </div>
      );
  }
}

export default SortableArrayEditor;
