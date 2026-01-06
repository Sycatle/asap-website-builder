/**
 * Form Renderer
 * 
 * Main orchestrator component that renders dynamic forms from config schemas.
 * Supports conditional visibility, sections, and various field types.
 */

import React, { useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { FormSection } from './FormSection';
import { TextField } from './TextField';
import { NumberField } from './NumberField';
import { BooleanField } from './BooleanField';
import { SelectField } from './SelectField';
import { MultiSelectField } from './MultiSelectField';
import { SecretField } from './SecretField';
import { ColorField } from './ColorField';
import type { 
  FormRendererProps, 
  FieldDef, 
  SectionDef,
  Condition,
  ConditionalGroup,
  FieldRendererProps,
} from './types';

// ============================================================================
// Field Registry
// ============================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fieldRenderers: Record<string, React.ComponentType<FieldRendererProps<any>>> = {
  text: TextField,
  textarea: TextField,
  email: TextField,
  url: TextField,
  password: TextField,
  number: NumberField,
  boolean: BooleanField,
  select: SelectField,
  multiselect: MultiSelectField,
  secret: SecretField,
  color: ColorField,
  // TODO: Add more field types as needed
  // date: DateField,
  // datetime: DateField,
  // file: FileField,
  // image: ImageField,
  // json: JsonField,
  // oauth: OAuthField,
};

// ============================================================================
// Conditional Logic Evaluation
// ============================================================================

function evaluateCondition(condition: Condition, values: Record<string, unknown>): boolean {
  const fieldValue = values[condition.field];
  const targetValue = condition.value;

  switch (condition.operator) {
    case 'eq':
      return fieldValue === targetValue;
    case 'neq':
      return fieldValue !== targetValue;
    case 'gt':
      return typeof fieldValue === 'number' && typeof targetValue === 'number' && fieldValue > targetValue;
    case 'lt':
      return typeof fieldValue === 'number' && typeof targetValue === 'number' && fieldValue < targetValue;
    case 'gte':
      return typeof fieldValue === 'number' && typeof targetValue === 'number' && fieldValue >= targetValue;
    case 'lte':
      return typeof fieldValue === 'number' && typeof targetValue === 'number' && fieldValue <= targetValue;
    case 'contains':
      if (Array.isArray(fieldValue)) {
        return fieldValue.includes(targetValue);
      }
      if (typeof fieldValue === 'string' && typeof targetValue === 'string') {
        return fieldValue.includes(targetValue);
      }
      return false;
    case 'not_contains':
      if (Array.isArray(fieldValue)) {
        return !fieldValue.includes(targetValue);
      }
      if (typeof fieldValue === 'string' && typeof targetValue === 'string') {
        return !fieldValue.includes(targetValue);
      }
      return true;
    case 'empty':
      return fieldValue === undefined || fieldValue === null || fieldValue === '' || 
             (Array.isArray(fieldValue) && fieldValue.length === 0);
    case 'not_empty':
      return fieldValue !== undefined && fieldValue !== null && fieldValue !== '' &&
             !(Array.isArray(fieldValue) && fieldValue.length === 0);
    default:
      return true;
  }
}

function evaluateConditional(
  conditional: Condition | ConditionalGroup | undefined,
  values: Record<string, unknown>
): boolean {
  if (!conditional) return true;

  // Check if it's a group
  if ('type' in conditional && ('conditions' in conditional)) {
    const group = conditional as ConditionalGroup;
    if (group.type === 'and') {
      return group.conditions.every(c => evaluateConditional(c, values));
    } else {
      return group.conditions.some(c => evaluateConditional(c, values));
    }
  }

  // It's a single condition
  return evaluateCondition(conditional as Condition, values);
}

// ============================================================================
// Field Renderer Component
// ============================================================================

interface FieldRendererWrapperProps {
  field: FieldDef;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
  disabled?: boolean;
}

function FieldRendererWrapper({ field, value, onChange, error, disabled }: FieldRendererWrapperProps) {
  const Renderer = fieldRenderers[field.type];
  
  if (!Renderer) {
    console.warn(`Unknown field type: ${field.type}`);
    return (
      <div className="text-sm text-muted-foreground p-2 bg-muted rounded">
        Champ non supporté: {field.type}
      </div>
    );
  }
  
  return (
    <Renderer
      field={field}
      value={value}
      onChange={onChange}
      error={error}
      disabled={disabled}
    />
  );
}

// ============================================================================
// Main Form Renderer
// ============================================================================

export function FormRenderer({
  schema,
  values,
  onChange,
  errors,
  isLoading,
  readOnly,
  sectionId,
  className,
}: FormRendererProps) {
  // Compute visible fields based on conditional logic
  const visibleFields = useMemo(() => {
    return new Set(
      schema.fields
        .filter(field => evaluateConditional(field.visible_if, values))
        .map(field => field.key)
    );
  }, [schema.fields, values]);

  // Compute disabled fields
  const disabledFields = useMemo(() => {
    return new Set(
      schema.fields
        .filter(field => evaluateConditional(field.disabled_if, values))
        .map(field => field.key)
    );
  }, [schema.fields, values]);

  // Type for grouped fields
  type GroupedField = { section: SectionDef | null; fields: FieldDef[] };

  // Group fields by sections
  const groupedFields = useMemo((): GroupedField[] => {
    const fieldMap = new Map(schema.fields.map(f => [f.key, f]));
    
    if (!schema.sections || schema.sections.length === 0) {
      // No sections defined, return all fields in a single group
      return [{
        section: null,
        fields: schema.fields.filter(f => visibleFields.has(f.key)),
      }];
    }

    // Filter sections if sectionId is provided
    const sectionsToRender = sectionId 
      ? schema.sections.filter(s => s.id === sectionId)
      : schema.sections;

    // Get fields assigned to sections
    const assignedFields = new Set(
      sectionsToRender.flatMap(s => s.fields)
    );

    // Build grouped structure
    const groups: GroupedField[] = sectionsToRender.map(section => ({
      section,
      fields: section.fields
        .map(key => fieldMap.get(key))
        .filter((f): f is FieldDef => f !== undefined && visibleFields.has(f.key)),
    }));

    // Add unassigned fields at the end (only if not filtering by sectionId)
    if (!sectionId) {
      const unassignedFields = schema.fields.filter(
        f => !assignedFields.has(f.key) && visibleFields.has(f.key)
      );
      if (unassignedFields.length > 0) {
        groups.push({
          section: null,
          fields: unassignedFields,
        });
      }
    }

    return groups;
  }, [schema, visibleFields, sectionId]);

  // Handle field change
  const handleFieldChange = (key: string, value: unknown) => {
    onChange({
      ...values,
      [key]: value,
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className={cn('space-y-6', className)}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {groupedFields.map(({ section, fields }, groupIndex) => {
        if (fields.length === 0) return null;

        const content = fields.map(field => (
          <FieldRendererWrapper
            key={field.key}
            field={field}
            value={values[field.key]}
            onChange={(v) => handleFieldChange(field.key, v)}
            error={errors?.[field.key]}
            disabled={readOnly || disabledFields.has(field.key)}
          />
        ));

        if (section) {
          return (
            <FormSection key={section.id} section={section}>
              {content}
            </FormSection>
          );
        }

        return (
          <div key={`group-${groupIndex}`} className="space-y-4">
            {content}
          </div>
        );
      })}
    </div>
  );
}

// ============================================================================
// Exports
// ============================================================================

export * from './types';
export { FormSection } from './FormSection';
export { TextField } from './TextField';
export { NumberField } from './NumberField';
export { BooleanField } from './BooleanField';
export { SelectField } from './SelectField';
export { MultiSelectField } from './MultiSelectField';
export { SecretField } from './SecretField';
export { ColorField } from './ColorField';
