"use client"

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'

type AsyncFnWithArgs<T, A extends unknown[]> = (...args: A) => Promise<T>

interface UseAsyncActionOptions {
  /** Success message key (i18n) */
  successMessage?: string
  /** Error message key (i18n) */
  errorMessage?: string
  /** Custom success message (not i18n) */
  successMessageText?: string
  /** Custom error message (not i18n) */
  errorMessageText?: string
  /** Show success toast? Default: true */
  showSuccessToast?: boolean
  /** Show error toast? Default: true */
  showErrorToast?: boolean
  /** Callback on success */
  onSuccess?: () => void
  /** Callback on error */
  onError?: (error: unknown) => void
}

interface UseAsyncActionReturn<T, A extends unknown[]> {
  /** Execute the async action */
  execute: (...args: A) => Promise<T | undefined>
  /** Is currently executing */
  isLoading: boolean
  /** Last error */
  error: Error | null
  /** Reset error state */
  reset: () => void
}

/**
 * useAsyncAction - Hook for managing async operations with loading/error states
 * 
 * Replaces the repetitive pattern:
 * ```tsx
 * const [isLoading, setIsLoading] = useState(false)
 * 
 * const handleAction = async () => {
 *   setIsLoading(true)
 *   try {
 *     await doSomething()
 *     toast.success('Done!')
 *   } catch (error) {
 *     toast.error('Failed')
 *   } finally {
 *     setIsLoading(false)
 *   }
 * }
 * ```
 * 
 * Usage:
 * ```tsx
 * const { execute: deleteWebsite, isLoading } = useAsyncAction(
 *   async () => {
 *     await websitesAPI.delete(id)
 *   },
 *   { successMessage: 'settings:toast.deleted' }
 * )
 * 
 * <Button onClick={deleteWebsite} disabled={isLoading}>
 *   {isLoading ? <Spinner /> : 'Delete'}
 * </Button>
 * ```
 */
export function useAsyncAction<T, A extends unknown[] = []>(
  action: AsyncFnWithArgs<T, A>,
  options: UseAsyncActionOptions = {}
): UseAsyncActionReturn<T, A> {
  const { t } = useTranslation()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const {
    successMessage,
    errorMessage,
    successMessageText,
    errorMessageText,
    showSuccessToast = true,
    showErrorToast = true,
    onSuccess,
    onError,
  } = options

  const execute = useCallback(async (...args: A): Promise<T | undefined> => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await action(...args)
      
      if (showSuccessToast && (successMessage || successMessageText)) {
        toast.success(successMessageText || t(successMessage!))
      }
      
      onSuccess?.()
      return result
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err))
      setError(errorObj)
      
      if (showErrorToast) {
        const message = errorMessageText 
          || (errorMessage ? t(errorMessage) : errorObj.message)
        toast.error(message)
      }
      
      onError?.(err)
      return undefined
    } finally {
      setIsLoading(false)
    }
  }, [action, successMessage, errorMessage, successMessageText, errorMessageText, showSuccessToast, showErrorToast, onSuccess, onError, t])

  const reset = useCallback(() => {
    setError(null)
  }, [])

  return {
    execute,
    isLoading,
    error,
    reset,
  }
}

/**
 * useAsyncActionWithConfirm - Version with built-in confirmation
 */
export function useAsyncActionWithConfirm<T, A extends unknown[] = []>(
  action: AsyncFnWithArgs<T, A>,
  options: UseAsyncActionOptions & {
    confirmMessage?: string
    confirmTitle?: string
  } = {}
) {
  const base = useAsyncAction(action, options)
  const [showConfirm, setShowConfirm] = useState(false)
  const pendingArgs = useState<A | null>(null)

  const requestExecute = useCallback((...args: A) => {
    pendingArgs[1](args)
    setShowConfirm(true)
  }, [pendingArgs])

  const confirmExecute = useCallback(async () => {
    const args = pendingArgs[0]
    if (args) {
      setShowConfirm(false)
      await base.execute(...args)
      pendingArgs[1](null)
    }
  }, [base, pendingArgs])

  const cancelExecute = useCallback(() => {
    setShowConfirm(false)
    pendingArgs[1](null)
  }, [pendingArgs])

  return {
    ...base,
    requestExecute,
    confirmExecute,
    cancelExecute,
    showConfirm,
    confirmTitle: options.confirmTitle,
    confirmMessage: options.confirmMessage,
  }
}

// ============================================
// Common Patterns as Ready-to-use Hooks
// ============================================

/**
 * useSaveAction - Pre-configured for save operations
 */
export function useSaveAction<T>(
  action: () => Promise<T>,
  options?: Omit<UseAsyncActionOptions, 'successMessage' | 'errorMessage'>
) {
  return useAsyncAction(action, {
    successMessage: 'common:messages.saved',
    errorMessage: 'common:errors.update',
    ...options,
  })
}

/**
 * useDeleteAction - Pre-configured for delete operations
 */
export function useDeleteAction<T>(
  action: () => Promise<T>,
  options?: Omit<UseAsyncActionOptions, 'successMessage' | 'errorMessage'>
) {
  return useAsyncAction(action, {
    successMessage: 'common:messages.deleted',
    errorMessage: 'common:errors.delete',
    ...options,
  })
}
