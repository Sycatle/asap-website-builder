"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Kbd } from "@/components/ui/kbd"
import { Save, X } from "lucide-react"

interface FormActionsProps {
  isDirty: boolean
  isSaving?: boolean
  onSave: () => void
  onCancel: () => void
  saveLabel?: string
  cancelLabel?: string
  className?: string
}

// Platform-aware modifier key
function getModifierKey(): string {
  if (typeof window === 'undefined') return '⌘'
  return navigator.platform.toLowerCase().includes('mac') ? '⌘' : 'Ctrl'
}

export function FormActions({
  isDirty,
  isSaving = false,
  onSave,
  onCancel,
  saveLabel = "Enregistrer",
  cancelLabel = "Annuler",
  className,
}: FormActionsProps) {
  const modKey = React.useMemo(() => getModifierKey(), [])
  
  return (
    <div
      className={cn(
        "fixed bottom-0 inset-x-0 z-50 transform transition-all duration-300 ease-out",
        isDirty
          ? "translate-y-0 opacity-100"
          : "translate-y-full opacity-0 pointer-events-none",
        className
      )}
    >
      <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border-t shadow-lg">
        <div className="container max-w-screen-xl mx-auto px-4 py-3 sm:py-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground hidden sm:block">
              Vous avez des modifications non enregistrées
            </p>
            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSaving}
                className="flex-1 sm:flex-none group"
              >
                <X className="h-4 w-4 mr-2 sm:mr-0 sm:hidden" />
                <span>{cancelLabel}</span>
                <Kbd className="hidden sm:inline-flex ml-2">
                  Esc
                </Kbd>
              </Button>
              <Button
                type="button"
                onClick={onSave}
                disabled={isSaving}
                className="flex-1 sm:flex-none group"
              >
                {isSaving ? (
                  <Spinner className="h-4 w-4 mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {saveLabel}
                <Kbd className="hidden sm:inline-flex ml-2 bg-primary-foreground/20">
                  {modKey}+S
                </Kbd>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Hook to track form changes
export function useFormDirty<T extends Record<string, unknown>>(
  initialValues: T,
  currentValues: T
): boolean {
  return React.useMemo(() => {
    return JSON.stringify(initialValues) !== JSON.stringify(currentValues)
  }, [initialValues, currentValues])
}
