/**
 * Common/generic types used across the application
 */

// ============================================
// GENERIC JSON TYPES
// ============================================

/**
 * Generic JSON value type - safer than 'any' for JSON data
 */
export type JsonValue = 
  | string 
  | number 
  | boolean 
  | null 
  | JsonValue[] 
  | { [key: string]: JsonValue };

/**
 * Generic JSON object type
 */
export type JsonObject = { [key: string]: JsonValue };

/**
 * Settings/Config object - commonly used for extension settings
 */
export type SettingsObject = Record<string, JsonValue>;

// ============================================
// FORM/UI TYPES
// ============================================

/**
 * Form field value
 */
export type FormFieldValue = string | number | boolean | string[] | null;

/**
 * Form values object
 */
export type FormValues = Record<string, FormFieldValue>;

// ============================================
// TYPE GUARDS
// ============================================

/**
 * Check if a value is a JsonObject
 */
export function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Check if a value is a JsonValue
 */
export function isJsonValue(value: unknown): value is JsonValue {
  if (value === null) return true;
  const type = typeof value;
  if (type === 'string' || type === 'number' || type === 'boolean') return true;
  if (Array.isArray(value)) return value.every(isJsonValue);
  if (type === 'object') {
    return Object.values(value as Record<string, unknown>).every(isJsonValue);
  }
  return false;
}
