import * as React from "react"
import { useEffect, useState } from "react"
import { AsapSidebar } from "@/components/asap-sidebar"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Toaster } from "@/components/ui/sonner"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { modulesAPI, websitesAPI, type WebsiteModule } from "@/lib/api"

interface AppShellProps {
  children: React.ReactNode
  title?: string
  breadcrumbs?: { label: string; href?: string }[]
}

export function AppShell({ children, title, breadcrumbs = [] }: AppShellProps) {
  const [modules, setModules] = useState<WebsiteModule[]>([])
  const [isAuthenticated, setIsAuthenticated] = useState(true)

  useEffect(() => {
    // Check authentication
    const token = localStorage.getItem('auth_token')
    if (!token) {
      window.location.href = '/login'
      setIsAuthenticated(false)
      return
    }

    // Load modules for sidebar
    const loadModules = async () => {
      try {
        const websites = await websitesAPI.list()
        if (websites.length > 0) {
          const data = await modulesAPI.listForWebsite(websites[0].id)
          setModules(data.filter(m => m.enabled))
        }
      } catch (err) {
        console.error('Failed to load modules:', err)
      }
    }

    loadModules()
  }, [])

  if (!isAuthenticated) {
    return null
  }

  return (
    <SidebarProvider>
      <AsapSidebar modules={modules} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem className="hidden md:block">
                <BreadcrumbLink href="/app/dashboard">
                  ASAP
                </BreadcrumbLink>
              </BreadcrumbItem>
              {breadcrumbs.map((crumb, index) => (
                <React.Fragment key={index}>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    {crumb.href ? (
                      <BreadcrumbLink href={crumb.href}>
                        {crumb.label}
                      </BreadcrumbLink>
                    ) : (
                      <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                    )}
                  </BreadcrumbItem>
                </React.Fragment>
              ))}
              {title && breadcrumbs.length === 0 && (
                <>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>{title}</BreadcrumbPage>
                  </BreadcrumbItem>
                </>
              )}
            </BreadcrumbList>
          </Breadcrumb>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-6">
          {children}
        </main>
      </SidebarInset>
      <Toaster />
    </SidebarProvider>
  )
}
