"use client"

import { Toaster as Sonner } from "sonner"
import { useTheme } from "next-themes"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { resolvedTheme } = useTheme()

  return (
    <Sonner
      theme={resolvedTheme as "light" | "dark" | "system"}
      className="toaster group"
      position="bottom-right"
      richColors
      visibleToasts={4}
      gap={8}
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg group-[.toaster]:rounded-lg group-[.toaster]:transition-all group-[.toaster]:duration-300 group-[.toaster]:ease-out",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:transition-all group-[.toast]:duration-200 group-[.toast]:hover:opacity-90 group-[.toast]:active:scale-95",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground group-[.toast]:transition-all group-[.toast]:duration-200 group-[.toast]:hover:opacity-90 group-[.toast]:active:scale-95",
          success: "group-[.toaster]:border-green-500/20 group-[.toaster]:bg-green-50 dark:group-[.toaster]:bg-green-950/50",
          error: "group-[.toaster]:border-red-500/20 group-[.toaster]:bg-red-50 dark:group-[.toaster]:bg-red-950/50",
          warning: "group-[.toaster]:border-yellow-500/20 group-[.toaster]:bg-yellow-50 dark:group-[.toaster]:bg-yellow-950/50",
          info: "group-[.toaster]:border-blue-500/20 group-[.toaster]:bg-blue-50 dark:group-[.toaster]:bg-blue-950/50",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
