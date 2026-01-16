"use client"

import React, { useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Field, FieldLabel, FieldDescription } from "@/components/ui/field"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Spinner } from "@/components/ui/spinner"
import {
  Plus,
  Trash2,
  GripVertical,
  Image as ImageIcon,
  Link as LinkIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"

// ============================================
// Shared Styles Constants
// ============================================

export const EDITOR_STYLES = {
  input: {
    compact: "h-8 text-sm",
    default: "h-9",
  },
  select: {
    compact: "h-8",
    default: "h-9",
  },
  label: "text-xs text-muted-foreground",
  labelWithIcon: "text-xs text-muted-foreground flex items-center gap-1",
  listItem: "p-3 rounded-lg border bg-muted/30 space-y-3",
  deleteButton: "h-8 w-8 p-0 text-destructive hover:text-destructive",
  deleteButtonSmall: "h-7 w-7 p-0 text-muted-foreground hover:text-destructive",
} as const

// ============================================
// Types
// ============================================

export interface BaseFieldProps {
  /** Field key/name */
  name: string
  /** Display label */
  label?: string
  /** Placeholder text */
  placeholder?: string
  /** Description text */
  description?: string
  /** Is field required */
  required?: boolean
  /** Field is disabled */
  disabled?: boolean
  /** Icon to show before label */
  icon?: React.ElementType
  /** Additional className */
  className?: string
}

interface TextFieldProps extends BaseFieldProps {
  value: string
  onChange: (value: string) => void
  type?: 'text' | 'email' | 'url' | 'tel'
}

interface TextareaFieldProps extends BaseFieldProps {
  value: string
  onChange: (value: string) => void
  rows?: number
}

interface SwitchFieldProps extends BaseFieldProps {
  value: boolean
  onChange: (value: boolean) => void
}

interface SelectFieldProps extends BaseFieldProps {
  value: string
  onChange: (value: string) => void
  options: { value: string; label: string }[]
}

interface EditableListProps<T> {
  /** List items */
  items: T[]
  /** On items change */
  onChange: (items: T[]) => void
  /** Render a single item */
  renderItem: (item: T, index: number, actions: ListItemActions) => React.ReactNode
  /** Create new empty item */
  createItem: () => T
  /** Add button label */
  addLabel?: string
  /** Max height for scrollable area */
  maxHeight?: number
  /** Show drag handles */
  sortable?: boolean
}

interface ListItemActions {
  update: <K extends string>(field: K, value: unknown) => void
  remove: () => void
}

// ============================================
// Text Field Component
// ============================================

export function TextField({
  name: _name,
  label,
  placeholder,
  description,
  required,
  disabled,
  icon: Icon,
  className,
  value,
  onChange,
  type = 'text',
}: TextFieldProps) {
  return (
    <Field className={className}>
      {label && (
        <FieldLabel className={Icon ? EDITOR_STYLES.labelWithIcon : EDITOR_STYLES.label}>
          {Icon && <Icon className="h-3 w-3" />}
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </FieldLabel>
      )}
      <Input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className={EDITOR_STYLES.input.default}
      />
      {description && <FieldDescription>{description}</FieldDescription>}
    </Field>
  )
}

// ============================================
// Textarea Field Component
// ============================================

export function TextareaField({
  name: _name,
  label,
  placeholder,
  description,
  required,
  disabled,
  icon: Icon,
  className,
  value,
  onChange,
  rows = 3,
}: TextareaFieldProps) {
  return (
    <Field className={className}>
      {label && (
        <FieldLabel className={Icon ? EDITOR_STYLES.labelWithIcon : EDITOR_STYLES.label}>
          {Icon && <Icon className="h-3 w-3" />}
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </FieldLabel>
      )}
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="resize-none"
        rows={rows}
      />
      {description && <FieldDescription>{description}</FieldDescription>}
    </Field>
  )
}

// ============================================
// Switch Field Component
// ============================================

export function SwitchField({
  name: _name,
  label,
  description,
  disabled,
  className,
  value,
  onChange,
}: SwitchFieldProps) {
  return (
    <Field orientation="horizontal" className={cn("py-2", className)}>
      <div className="flex-1">
        {label && <FieldLabel className="text-sm">{label}</FieldLabel>}
        {description && (
          <FieldDescription className="text-xs">{description}</FieldDescription>
        )}
      </div>
      <Switch
        checked={value}
        onCheckedChange={onChange}
        disabled={disabled}
      />
    </Field>
  )
}

// ============================================
// Select Field Component
// ============================================

export function SelectField({
  name: _name,
  label,
  placeholder,
  description,
  required,
  disabled,
  icon: Icon,
  className,
  value,
  onChange,
  options,
}: SelectFieldProps) {
  return (
    <Field className={className}>
      {label && (
        <FieldLabel className={Icon ? EDITOR_STYLES.labelWithIcon : EDITOR_STYLES.label}>
          {Icon && <Icon className="h-3 w-3" />}
          {label}
          {required && <span className="text-destructive ml-1">*</span>}
        </FieldLabel>
      )}
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger className={EDITOR_STYLES.select.default}>
          <SelectValue placeholder={placeholder || "Sélectionner..."} />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {description && <FieldDescription>{description}</FieldDescription>}
    </Field>
  )
}

// ============================================
// URL/Link Field Component
// ============================================

export function UrlField(props: Omit<TextFieldProps, 'type' | 'icon'>) {
  return <TextField {...props} type="url" icon={LinkIcon} />
}

// ============================================
// Image URL Field Component
// ============================================

export function ImageUrlField(props: Omit<TextFieldProps, 'type' | 'icon'>) {
  return <TextField {...props} type="url" icon={ImageIcon} />
}

// ============================================
// CTA (Button) Field Component - Text + Link pair
// ============================================

interface CtaFieldProps {
  textValue: string
  linkValue: string
  onTextChange: (value: string) => void
  onLinkChange: (value: string) => void
  label?: string
  textPlaceholder?: string
  linkPlaceholder?: string
}

export function CtaField({
  textValue,
  linkValue,
  onTextChange,
  onLinkChange,
  label = "Bouton d'action",
  textPlaceholder = "Texte du bouton",
  linkPlaceholder = "#section",
}: CtaFieldProps) {
  return (
    <Field>
      <FieldLabel className={EDITOR_STYLES.labelWithIcon}>
        <LinkIcon className="h-3 w-3" />
        {label}
      </FieldLabel>
      <div className="grid grid-cols-2 gap-2">
        <Input
          value={textValue}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder={textPlaceholder}
          className={EDITOR_STYLES.input.default}
        />
        <Input
          value={linkValue}
          onChange={(e) => onLinkChange(e.target.value)}
          placeholder={linkPlaceholder}
          className={EDITOR_STYLES.input.default}
        />
      </div>
    </Field>
  )
}

// ============================================
// Editable List Component
// ============================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function EditableList<T extends Record<string, any>>({
  items,
  onChange,
  renderItem,
  createItem,
  addLabel = "Ajouter",
  maxHeight = 400,
  sortable = false,
}: EditableListProps<T>) {
  const handleAdd = useCallback(() => {
    onChange([...items, createItem()])
  }, [items, onChange, createItem])

  const handleUpdate = useCallback((index: number, field: string, value: unknown) => {
    const updated = [...items]
    updated[index] = { ...updated[index], [field]: value }
    onChange(updated)
  }, [items, onChange])

  const handleRemove = useCallback((index: number) => {
    onChange(items.filter((_, i) => i !== index))
  }, [items, onChange])

  return (
    <div className="space-y-3">
      <ScrollArea className="pr-4" style={{ maxHeight }}>
        <div className="space-y-3">
          {items.map((item, index) => (
            <div key={index} className={EDITOR_STYLES.listItem}>
              <div className="flex items-start gap-2">
                {sortable && (
                  <GripVertical className="h-4 w-4 mt-2 text-muted-foreground cursor-grab" />
                )}
                <div className="flex-1">
                  {renderItem(item, index, {
                    update: (field, value) => handleUpdate(index, field, value),
                    remove: () => handleRemove(index),
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={handleAdd}
        className="w-full"
      >
        <Plus className="h-3 w-3 mr-1" />
        {addLabel}
      </Button>
    </div>
  )
}

// ============================================
// Simple String List Component
// ============================================

interface StringListProps {
  items: string[]
  onChange: (items: string[]) => void
  placeholder?: string
  addLabel?: string
}

export function StringList({
  items,
  onChange,
  placeholder = "Nouvel élément",
  addLabel = "Ajouter",
}: StringListProps) {
  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
          <Input
            value={item}
            onChange={(e) => {
              const updated = [...items]
              updated[index] = e.target.value
              onChange(updated)
            }}
            placeholder={`${placeholder} ${index + 1}`}
            className={EDITOR_STYLES.input.compact}
          />
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => onChange(items.filter((_, i) => i !== index))}
            className={EDITOR_STYLES.deleteButtonSmall}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      ))}
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => onChange([...items, ''])}
        className="h-7 px-2"
      >
        <Plus className="h-3 w-3 mr-1" />
        {addLabel}
      </Button>
    </div>
  )
}

// ============================================
// Property Section Header with Save Button
// ============================================

interface PropertySectionHeaderProps {
  title: string
  isDirty?: boolean
  isSaving?: boolean
  onSave?: () => void
  actions?: React.ReactNode
}

export function PropertySectionHeader({
  title,
  isDirty,
  isSaving,
  onSave,
  actions,
}: PropertySectionHeaderProps) {
  const { t } = useTranslation(['common'])

  return (
    <div className="flex items-center justify-between">
      <h4 className="text-sm font-medium">{title}</h4>
      <div className="flex gap-2">
        {onSave && (
          <Button
            size="sm"
            variant="outline"
            onClick={onSave}
            disabled={!isDirty || isSaving}
          >
            {isSaving ? (
              <Spinner className="h-3 w-3" />
            ) : (
              t('common:actions.apply')
            )}
          </Button>
        )}
        {actions}
      </div>
    </div>
  )
}

// ============================================
// Delete Item Button (reusable)
// ============================================

interface DeleteButtonProps {
  onClick: () => void
  size?: 'sm' | 'default'
  className?: string
}

export function DeleteButton({ onClick, size = 'sm', className }: DeleteButtonProps) {
  return (
    <Button
      type="button"
      size={size}
      variant="ghost"
      onClick={onClick}
      className={cn(
        size === 'sm' ? EDITOR_STYLES.deleteButtonSmall : EDITOR_STYLES.deleteButton,
        className
      )}
    >
      <Trash2 className="h-3 w-3" />
    </Button>
  )
}
