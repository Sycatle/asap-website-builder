"use client"

import { useState, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'

type FormData = Record<string, unknown>

interface UseFormDirtyOptions<T extends FormData> {
  /** Initial values for the form */
  initialValues: T
  /** Callback when saving */
  onSave: (values: T) => Promise<void>
  /** Success message key (i18n) - defaults to 'common:messages.saved' */
  successMessage?: string
  /** Error message key (i18n) - defaults to 'common:errors.update' */
  errorMessage?: string
  /** Custom success message (not i18n) */
  successMessageText?: string
  /** Custom error message (not i18n) */
  errorMessageText?: string
}

interface UseFormDirtyReturn<T extends FormData> {
  /** Current form values */
  values: T
  /** Update a single field */
  setValue: <K extends keyof T>(key: K, value: T[K]) => void
  /** Update multiple fields */
  setValues: (updates: Partial<T>) => void
  /** Reset to initial values */
  reset: () => void
  /** Check if form has changes */
  isDirty: boolean
  /** Save handler */
  save: () => Promise<void>
  /** Is currently saving */
  isSaving: boolean
  /** Sync initial values (call when external data changes) */
  syncInitialValues: (newValues: T) => void
}

/**
 * useFormDirty - Hook for managing form state with dirty tracking
 * 
 * Replaces the repetitive pattern:
 * ```tsx
 * const [isDirty, setIsDirty] = useState(false)
 * const [isSaving, setIsSaving] = useState(false)
 * const [value, setValue] = useState(initial)
 * 
 * const handleSave = async () => {
 *   if (!isDirty) return
 *   setIsSaving(true)
 *   try {
 *     await onUpdate(...)
 *     setIsDirty(false)
 *     toast.success(...)
 *   } catch {
 *     toast.error(...)
 *   } finally {
 *     setIsSaving(false)
 *   }
 * }
 * ```
 * 
 * Usage:
 * ```tsx
 * const { values, setValue, isDirty, save, isSaving } = useFormDirty({
 *   initialValues: { title: element.title, layout: element.layout },
 *   onSave: async (values) => {
 *     await onUpdate(element.id, values)
 *   },
 * })
 * ```
 */
export function useFormDirty<T extends FormData>({
  initialValues,
  onSave,
  successMessage = 'common:messages.saved',
  errorMessage = 'common:errors.update',
  successMessageText,
  errorMessageText,
}: UseFormDirtyOptions<T>): UseFormDirtyReturn<T> {
  const { t } = useTranslation()
  const [values, setValuesState] = useState<T>(initialValues)
  const [isSaving, setIsSaving] = useState(false)
  const initialRef = useRef<T>(initialValues)

  // Calculate isDirty by comparing current values with initial
  const isDirty = Object.keys(values).some(
    key => values[key] !== initialRef.current[key]
  )

  const setValue = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setValuesState(prev => ({ ...prev, [key]: value }))
  }, [])

  const setValues = useCallback((updates: Partial<T>) => {
    setValuesState(prev => ({ ...prev, ...updates }))
  }, [])

  const reset = useCallback(() => {
    setValuesState(initialRef.current)
  }, [])

  const syncInitialValues = useCallback((newValues: T) => {
    initialRef.current = newValues
    setValuesState(newValues)
  }, [])

  const save = useCallback(async () => {
    if (!isDirty) return
    
    setIsSaving(true)
    try {
      await onSave(values)
      initialRef.current = values
      toast.success(successMessageText || t(successMessage))
    } catch (error) {
      console.error('Failed to save:', error)
      toast.error(errorMessageText || t(errorMessage))
    } finally {
      setIsSaving(false)
    }
  }, [isDirty, values, onSave, successMessage, errorMessage, successMessageText, errorMessageText, t])

  return {
    values,
    setValue,
    setValues,
    reset,
    isDirty,
    save,
    isSaving,
    syncInitialValues,
  }
}

// ============================================
// Specialized version for element data
// ============================================

interface UseElementFormOptions {
  /** Element ID */
  elementId: string
  /** Initial content/data */
  initialData: FormData
  /** Update callback */
  onUpdate: (elementId: string, data: { data: FormData }) => Promise<unknown>
}

/**
 * useElementForm - Specialized hook for property editor forms
 * 
 * Handles the common pattern in property editors:
 * - Content/data stored as nested object
 * - Updates via onUpdate(elementId, { data })
 */
export function useElementForm({ elementId, initialData, onUpdate }: UseElementFormOptions) {
  return useFormDirty({
    initialValues: initialData,
    onSave: async (values) => {
      await onUpdate(elementId, { data: values })
    },
    successMessage: 'editor:messages.saved',
    errorMessage: 'common:errors.update',
  })
}
