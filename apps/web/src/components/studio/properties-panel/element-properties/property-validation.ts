/**
 * Zod validation schemas for property editor inputs
 * 
 * Generates runtime validation based on PropertySchema definitions
 */

import { z } from "zod";
import type { PropertySchema, SectionSchema } from "@asap/shared";

// ============================================
// Base validators
// ============================================

/**
 * Validate a URL - allows relative paths and absolute URLs
 */
export const urlSchema = z.string().refine(
  (val) => {
    if (!val) return true; // Allow empty
    // Allow relative paths
    if (val.startsWith('/') || val.startsWith('#')) return true;
    // Allow mailto and tel
    if (val.startsWith('mailto:') || val.startsWith('tel:')) return true;
    // Validate absolute URLs
    try {
      new URL(val);
      return true;
    } catch {
      return false;
    }
  },
  { message: "URL invalide" }
);

/**
 * Validate an email
 */
export const emailSchema = z.string().email("Email invalide").or(z.literal(""));

/**
 * Validate a hex color or CSS gradient
 */
export const colorSchema = z.string().refine(
  (val) => {
    if (!val) return true;
    // Hex color
    if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(val)) return true;
    // RGB/RGBA
    if (/^rgba?\([\d\s,%.]+\)$/.test(val)) return true;
    // HSL/HSLA
    if (/^hsla?\([\d\s,%.]+\)$/.test(val)) return true;
    // CSS gradients
    if (val.includes('gradient')) return true;
    // CSS color names (basic check)
    if (/^[a-z]+$/i.test(val)) return true;
    return false;
  },
  { message: "Couleur invalide" }
);

/**
 * Validate an icon name (kebab-case)
 */
export const iconSchema = z.string().regex(
  /^[a-z0-9-]*$/,
  "Nom d'icône invalide (utilisez kebab-case)"
).or(z.literal(""));

// ============================================
// Schema Generator
// ============================================

/**
 * Generate a zod schema from a PropertySchema
 */
export function generatePropertyZodSchema(property: PropertySchema): z.ZodTypeAny {
  let schema: z.ZodTypeAny;

  switch (property.type) {
    case 'text':
      schema = z.string();
      break;
    
    case 'textarea':
      schema = z.string();
      break;
    
    case 'url':
      schema = urlSchema;
      break;
    
    case 'image':
      // Image can be URL or data URL
      schema = z.string().refine(
        (val) => {
          if (!val) return true;
          if (val.startsWith('data:image/')) return true;
          return urlSchema.safeParse(val).success;
        },
        { message: "Image invalide" }
      );
      break;
    
    case 'number':
      schema = z.number().or(z.string().transform(Number));
      break;
    
    case 'boolean':
      schema = z.boolean();
      break;
    
    case 'select':
      if (property.options?.length) {
        const values = property.options.map(opt => opt.value);
        schema = z.enum(values as [string, ...string[]]);
      } else {
        schema = z.string();
      }
      break;
    
    case 'color':
      schema = colorSchema;
      break;
    
    case 'icon':
      schema = iconSchema;
      break;
    
    case 'array':
      if (property.itemSchema?.length) {
        const itemShape: Record<string, z.ZodTypeAny> = {};
        for (const itemProp of property.itemSchema) {
          itemShape[itemProp.key] = generatePropertyZodSchema(itemProp);
          if (!itemProp.required) {
            itemShape[itemProp.key] = itemShape[itemProp.key].optional();
          }
        }
        let arraySchema = z.array(z.object(itemShape));
        
        if (property.minItems !== undefined) {
          arraySchema = arraySchema.min(property.minItems, 
            `Minimum ${property.minItems} élément(s)`);
        }
        if (property.maxItems !== undefined) {
          arraySchema = arraySchema.max(property.maxItems, 
            `Maximum ${property.maxItems} élément(s)`);
        }
        schema = arraySchema;
      } else {
        schema = z.array(z.unknown());
      }
      break;
    
    case 'group':
      if (property.properties?.length) {
        const groupShape: Record<string, z.ZodTypeAny> = {};
        for (const groupProp of property.properties) {
          groupShape[groupProp.key] = generatePropertyZodSchema(groupProp);
          if (!groupProp.required) {
            groupShape[groupProp.key] = groupShape[groupProp.key].optional();
          }
        }
        schema = z.object(groupShape);
      } else {
        schema = z.object({});
      }
      break;
    
    default:
      schema = z.unknown();
  }

  // Apply required/optional
  if (!property.required) {
    schema = schema.optional().or(z.literal("")).or(z.null());
  }

  return schema;
}

/**
 * Generate a complete zod schema for a section's settings
 */
export function generateSectionZodSchema(sectionSchema: SectionSchema): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {};
  
  for (const property of sectionSchema.properties) {
    shape[property.key] = generatePropertyZodSchema(property);
  }
  
  return z.object(shape).passthrough();
}

// ============================================
// Validation helpers
// ============================================

export interface ValidationResult {
  success: boolean;
  errors: Record<string, string>;
}

/**
 * Validate a single property value
 */
export function validateProperty(
  property: PropertySchema,
  value: unknown
): ValidationResult {
  const schema = generatePropertyZodSchema(property);
  const result = schema.safeParse(value);
  
  if (result.success) {
    return { success: true, errors: {} };
  }
  
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join('.') || property.key;
    errors[path] = issue.message;
  }
  
  return { success: false, errors };
}

/**
 * Validate entire settings object for a section
 */
export function validateSettings(
  sectionSchema: SectionSchema,
  settings: Record<string, unknown>
): ValidationResult {
  const zodSchema = generateSectionZodSchema(sectionSchema);
  const result = zodSchema.safeParse(settings);
  
  if (result.success) {
    return { success: true, errors: {} };
  }
  
  const errors: Record<string, string> = {};
  for (const issue of result.error.issues) {
    const path = issue.path.join('.');
    errors[path] = issue.message;
  }
  
  return { success: false, errors };
}

/**
 * Hook for property validation
 */
export function usePropertyValidation(property: PropertySchema) {
  const validate = (value: unknown): string | null => {
    const result = validateProperty(property, value);
    if (result.success) return null;
    return Object.values(result.errors)[0] || null;
  };
  
  return { validate };
}
