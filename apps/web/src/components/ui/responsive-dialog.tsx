"use client"

import * as React from "react"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer"
import { cn } from "@/lib/utils"

interface ResponsiveDialogContextValue {
  isDesktop: boolean
}

const ResponsiveDialogContext = React.createContext<ResponsiveDialogContextValue>({
  isDesktop: true,
})

function useResponsiveDialog() {
  return React.useContext(ResponsiveDialogContext)
}

interface ResponsiveDialogProps {
  children: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

function ResponsiveDialog({ children, open, onOpenChange }: ResponsiveDialogProps) {
  const isMobile = useIsMobile()
  const isDesktop = !isMobile

  if (isDesktop) {
    return (
      <ResponsiveDialogContext.Provider value={{ isDesktop }}>
        <Dialog open={open} onOpenChange={onOpenChange}>
          {children}
        </Dialog>
      </ResponsiveDialogContext.Provider>
    )
  }

  return (
    <ResponsiveDialogContext.Provider value={{ isDesktop }}>
      <Drawer open={open} onOpenChange={onOpenChange}>
        {children}
      </Drawer>
    </ResponsiveDialogContext.Provider>
  )
}

function ResponsiveDialogTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogTrigger>) {
  const { isDesktop } = useResponsiveDialog()

  if (isDesktop) {
    return (
      <DialogTrigger className={className} {...props}>
        {children}
      </DialogTrigger>
    )
  }

  return (
    <DrawerTrigger className={className} {...props}>
      {children}
    </DrawerTrigger>
  )
}

function ResponsiveDialogContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DialogContent>) {
  const { isDesktop } = useResponsiveDialog()

  if (isDesktop) {
    return (
      <DialogContent className={className} {...props}>
        {children}
      </DialogContent>
    )
  }

  return (
    <DrawerContent className={cn("px-4", className)}>
      {children}
    </DrawerContent>
  )
}

function ResponsiveDialogHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const { isDesktop } = useResponsiveDialog()

  if (isDesktop) {
    return <DialogHeader className={className} {...props} />
  }

  return <DrawerHeader className={cn("text-left", className)} {...props} />
}

function ResponsiveDialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogTitle>) {
  const { isDesktop } = useResponsiveDialog()

  if (isDesktop) {
    return <DialogTitle className={className} {...props} />
  }

  return <DrawerTitle className={className} {...props} />
}

function ResponsiveDialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogDescription>) {
  const { isDesktop } = useResponsiveDialog()

  if (isDesktop) {
    return <DialogDescription className={className} {...props} />
  }

  return <DrawerDescription className={className} {...props} />
}

function ResponsiveDialogFooter({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const { isDesktop } = useResponsiveDialog()

  if (isDesktop) {
    return <DialogFooter className={className} {...props} />
  }

  return <DrawerFooter className={cn("pt-2", className)} {...props} />
}

function ResponsiveDialogClose({
  className,
  ...props
}: React.ComponentProps<typeof DialogClose>) {
  const { isDesktop } = useResponsiveDialog()

  if (isDesktop) {
    return <DialogClose className={className} {...props} />
  }

  return <DrawerClose className={className} {...props} />
}

export {
  ResponsiveDialog,
  ResponsiveDialogTrigger,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogClose,
  useResponsiveDialog,
}
