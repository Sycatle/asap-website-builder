/**
 * Form Field Components for Onboarding
 * 
 * Accessible, mobile-first form components with consistent styling.
 */

"use client"

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

// ============================================
// Field Container
// ============================================

interface FormFieldProps {
  children: React.ReactNode;
  className?: string;
}

export function FormField({ children, className }: FormFieldProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {children}
    </div>
  );
}

// ============================================
// Field Label
// ============================================

interface FormLabelProps {
  htmlFor: string;
  children: React.ReactNode;
  required?: boolean;
  className?: string;
}

export function FormLabel({ htmlFor, children, required, className }: FormLabelProps) {
  return (
    <Label 
      htmlFor={htmlFor} 
      className={cn('text-sm font-medium', className)}
    >
      {children}
      {required && <span className="text-destructive ml-1" aria-hidden="true">*</span>}
    </Label>
  );
}

// ============================================
// Field Hint
// ============================================

interface FormHintProps {
  children: React.ReactNode;
  className?: string;
}

export function FormHint({ children, className }: FormHintProps) {
  return (
    <p className={cn('text-xs text-muted-foreground', className)}>
      {children}
    </p>
  );
}

// ============================================
// Text Input Field
// ============================================

interface TextFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: React.ReactNode;
  required?: boolean;
  autoFocus?: boolean;
  type?: 'text' | 'email' | 'url';
  className?: string;
  inputClassName?: string;
  /** Transform input value (e.g., lowercase for slugs) */
  transform?: (value: string) => string;
  /** Prefix to show before input */
  prefix?: React.ReactNode;
  /** Suffix to show after input */
  suffix?: React.ReactNode;
}

export function TextField({
  id,
  label,
  value,
  onChange,
  placeholder,
  hint,
  required,
  autoFocus,
  type = 'text',
  className,
  inputClassName,
  transform,
  prefix,
  suffix,
}: TextFieldProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = transform ? transform(e.target.value) : e.target.value;
    onChange(newValue);
  };

  return (
    <FormField className={className}>
      <FormLabel htmlFor={id} required={required}>{label}</FormLabel>
      <div className="relative">
        {prefix && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">
            {prefix}
          </div>
        )}
        <Input
          id={id}
          type={type}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          autoFocus={autoFocus}
          required={required}
          aria-required={required}
          className={cn(
            'h-11 sm:h-12 text-base',
            prefix && 'pl-10',
            suffix && 'pr-10',
            inputClassName
          )}
        />
        {suffix && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm pointer-events-none">
            {suffix}
          </div>
        )}
      </div>
      {hint && <FormHint>{hint}</FormHint>}
    </FormField>
  );
}

// ============================================
// Textarea Field
// ============================================

interface TextareaFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hint?: React.ReactNode;
  required?: boolean;
  rows?: number;
  className?: string;
  textareaClassName?: string;
}

export function TextareaField({
  id,
  label,
  value,
  onChange,
  placeholder,
  hint,
  required,
  rows = 3,
  className,
  textareaClassName,
}: TextareaFieldProps) {
  return (
    <FormField className={className}>
      <FormLabel htmlFor={id} required={required}>{label}</FormLabel>
      <Textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        required={required}
        aria-required={required}
        className={cn('text-base resize-none', textareaClassName)}
      />
      {hint && <FormHint>{hint}</FormHint>}
    </FormField>
  );
}

// ============================================
// Color Picker Field
// ============================================

interface ColorPickerFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  presets?: Array<{ name: string; value: string }>;
  hint?: React.ReactNode;
  className?: string;
}

const defaultColorPresets = [
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Violet', value: '#8B5CF6' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Green', value: '#10B981' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Cyan', value: '#06B6D4' },
  { name: 'Yellow', value: '#EAB308' },
];

export function ColorPickerField({
  id,
  label,
  value,
  onChange,
  presets = defaultColorPresets,
  hint,
  className,
}: ColorPickerFieldProps) {
  return (
    <FormField className={className}>
      <FormLabel htmlFor={id}>{label}</FormLabel>
      
      {/* Color presets grid */}
      <div 
        className="grid grid-cols-8 gap-2"
        role="radiogroup"
        aria-label={label}
      >
        {presets.map((color) => (
          <button
            key={color.value}
            type="button"
            role="radio"
            aria-checked={value === color.value}
            aria-label={color.name}
            onClick={() => onChange(color.value)}
            className={cn(
              'w-full aspect-square rounded-lg sm:rounded-xl transition-all duration-200',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
              'hover:scale-110 active:scale-95',
              value === color.value 
                ? 'ring-2 ring-offset-2 ring-primary scale-110' 
                : 'hover:ring-2 hover:ring-muted-foreground/30'
            )}
            style={{ backgroundColor: color.value }}
          />
        ))}
      </div>
      
      {/* Custom color input */}
      <div className="flex items-center gap-2 mt-3">
        <label htmlFor={`${id}-picker`} className="sr-only">
          Custom color picker
        </label>
        <input
          id={`${id}-picker`}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            'w-10 h-10 sm:w-11 sm:h-11 rounded-lg cursor-pointer',
            'border-2 border-border hover:border-primary transition-colors',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary'
          )}
        />
        <Input
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#3B82F6"
          className="flex-1 font-mono h-10 sm:h-11"
          aria-label="Color hex value"
        />
      </div>
      
      {hint && <FormHint className="mt-2">{hint}</FormHint>}
    </FormField>
  );
}

export default {
  FormField,
  FormLabel,
  FormHint,
  TextField,
  TextareaField,
  ColorPickerField,
};
