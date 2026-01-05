"use client"

import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  // Get theme from document class
  const isDark = typeof document !== 'undefined' && document.documentElement.classList.contains('dark')

  return (
    <Sonner
      theme={isDark ? "dark" : "light"}
      className="toaster group"
      position="top-center"
      richColors
      visibleToasts={4}
      gap={8}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:rounded-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          success: "group-[.toaster]:border-green-500/30 dark:group-[.toaster]:border-green-500/40 group-[.toaster]:bg-green-50 dark:group-[.toaster]:bg-green-950/50 group-[.toaster]:text-green-900 dark:group-[.toaster]:text-green-100",
          error: "group-[.toaster]:border-red-500/30 dark:group-[.toaster]:border-red-500/40 group-[.toaster]:bg-red-50 dark:group-[.toaster]:bg-red-950/50 group-[.toaster]:text-red-900 dark:group-[.toaster]:text-red-100",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
