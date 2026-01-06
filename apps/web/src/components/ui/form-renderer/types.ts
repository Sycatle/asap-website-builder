/**
 * Form Renderer Types
 * 
 * Type definitions for dynamic form rendering from extension manifests.
 */

// ============================================================================
// Field Types
// ============================================================================

export type FieldType = 
  | 'text'
  | 'textarea'
  | 'email'
  | 'url'
  | 'password'
  | 'number'
  | 'boolean'
  | 'select'
  | 'multiselect'
  | 'color'
  | 'date'
  | 'datetime'
  | 'file'
  | 'image'
  | 'json'
  | 'secret'
  | 'oauth';

// ============================================================================
// Validation Types
// ============================================================================

export interface TextValidation {
  pattern?: string;
  min_length?: number;
  max_length?: number;
  message?: string;
}

export interface NumberValidation {
  min?: number;
  max?: number;
  step?: number;
  message?: string;
}

export interface SelectValidation {
  min?: number;
  max?: number;
}

export interface FileValidation {
  accept?: string[];
  max_size?: number; // bytes
}

export interface ImageValidation extends FileValidation {
  dimensions?: {
    min_width?: number;
    max_width?: number;
    min_height?: number;
    max_height?: number;
  };
}

// ============================================================================
// Conditional Logic
// ============================================================================

export interface Condition {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte' | 'contains' | 'not_contains' | 'empty' | 'not_empty';
  value?: unknown;
}

export interface ConditionalGroup {
  type: 'and' | 'or';
  conditions: (Condition | ConditionalGroup)[];
}

// ============================================================================
// Field Definitions
// ============================================================================

export interface BaseFieldDef {
  key: string;
  type: FieldType;
  label: string;
  description?: string;
  required?: boolean;
  default?: unknown;
  visible_if?: Condition | ConditionalGroup;
  disabled_if?: Condition | ConditionalGroup;
}

export interface TextFieldDef extends BaseFieldDef {
  type: 'text' | 'textarea' | 'email' | 'url' | 'password';
  placeholder?: string;
  validation?: TextValidation;
}

export interface NumberFieldDef extends BaseFieldDef {
  type: 'number';
  placeholder?: string;
  validation?: NumberValidation;
  format?: {
    style?: 'decimal' | 'percent' | 'currency';
    currency?: string;
  };
}

export interface BooleanFieldDef extends BaseFieldDef {
  type: 'boolean';
}

export interface SelectOption {
  value: string;
  label: string;
  icon?: string;
  disabled?: boolean;
}

export interface SelectFieldDef extends BaseFieldDef {
  type: 'select';
  options: SelectOption[];
  placeholder?: string;
}

export interface MultiSelectFieldDef extends BaseFieldDef {
  type: 'multiselect';
  options: SelectOption[];
  validation?: SelectValidation;
}

export interface ColorFieldDef extends BaseFieldDef {
  type: 'color';
  format?: 'hex' | 'rgb' | 'hsl';
  presets?: string[];
}

export interface DateFieldDef extends BaseFieldDef {
  type: 'date' | 'datetime';
  validation?: {
    min?: string;
    max?: string;
  };
}

export interface FileFieldDef extends BaseFieldDef {
  type: 'file' | 'image';
  validation?: FileValidation | ImageValidation;
}

export interface SecretFieldDef extends BaseFieldDef {
  type: 'secret';
  placeholder?: string;
}

export interface OAuthFieldDef extends BaseFieldDef {
  type: 'oauth';
  provider: string;
  scopes?: string[];
}

export interface JsonFieldDef extends BaseFieldDef {
  type: 'json';
  schema?: Record<string, unknown>;
}

// Union type for all field definitions
export type FieldDef =
  | TextFieldDef
  | NumberFieldDef
  | BooleanFieldDef
  | SelectFieldDef
  | MultiSelectFieldDef
  | ColorFieldDef
  | DateFieldDef
  | FileFieldDef
  | SecretFieldDef
  | OAuthFieldDef
  | JsonFieldDef;

// ============================================================================
// Section Definition
// ============================================================================

export interface SectionDef {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  fields: string[]; // field keys
  collapsible?: boolean;
  defaultCollapsed?: boolean;
}

// ============================================================================
// Config Schema
// ============================================================================

export interface ConfigSchemaDef {
  fields: FieldDef[];
  sections?: SectionDef[];
}

// ============================================================================
// Form Renderer Props
// ============================================================================

export interface FormRendererProps {
  /** Schema from extension manifest */
  schema: ConfigSchemaDef;
  /** Current values */
  values: Record<string, unknown>;
  /** Change handler */
  onChange: (values: Record<string, unknown>) => void;
  /** Validation errors */
  errors?: Record<string, string>;
  /** Loading state */
  isLoading?: boolean;
  /** Read-only mode */
  readOnly?: boolean;
  /** Show only specific section */
  sectionId?: string;
  /** Custom class name */
  className?: string;
}

// ============================================================================
// Field Renderer Props
// ============================================================================

export interface FieldRendererProps<T extends FieldDef = FieldDef> {
  field: T;
  value: unknown;
  onChange: (value: unknown) => void;
  error?: string;
  disabled?: boolean;
}
