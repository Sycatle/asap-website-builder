import React, { lazy, Suspense, useEffect, useState } from "react"
import { AppShell } from "./layouts/app-shell"
import { TooltipProvider } from "@/components/ui/tooltip"
import { QueryProvider } from "@/components/providers"
import { ErrorBoundary } from "@/components/shared/ErrorBoundary"
import { Loader2 } from "lucide-react"

// Lazy load page components
const Dashboard = lazy(() => import("@/components/features/websites/Dashboard"))
const ExtensionsManager = lazy(() => import("@/components/features/extensions/ExtensionsManager"))
const ExtensionPage = lazy(() => import("@/components/features/extensions/ExtensionConfig"))
const CloudPage = lazy(() => import("@/components/features/cloud/CloudManager"))
const SettingsPage = lazy(() => import("@/components/features/settings/SettingsPage"))
const StudioPage = lazy(() => import("@/components/studio/StudioPage"))
const PagesPage = lazy(() => import("@/components/PagesList"))
const AdministratorsPage = lazy(() => import("@/components/features/settings/AdministratorsPage"))
const ThemePage = lazy(() => import("@/components/features/settings/ThemePage"))
const WebsiteSelector = lazy(() => import("@/components/pages/WebsiteSelector"))

// UUID regex pattern
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Route types
type Route =
  | { page: "select" }
  | { page: "dashboard"; websiteId: string }
  | { page: "extensions"; websiteId: string }
  | { page: "extension"; websiteId: string; slug: string }
  | { page: "cloud"; websiteId: string }
  | { page: "settings"; websiteId: string }
  | { page: "studio"; websiteId: string }
  | { page: "pages"; websiteId: string }
  | { page: "administrators"; websiteId: string }
  | { page: "theme"; websiteId: string }
  | { page: "not-found" }

// Parse route from pathname
function parseRoute(pathname: string): Route {
  // Remove /app prefix
  const path = pathname.replace(/^\/app\/?/, "")
  
  // Empty path = website selector
  if (!path) {
    return { page: "select" }
  }
  
  const segments = path.split("/").filter(Boolean)
  
  // First segment should be websiteId (UUID)
  const websiteId = segments[0]
  
  if (!websiteId || !UUID_PATTERN.test(websiteId)) {
    // Invalid UUID - maybe old URL format, redirect to select
    return { page: "select" }
  }
  
  // Second segment is the page
  const pageName = segments[1]
  
  if (!pageName) {
    // /app/{uuid} = dashboard
    return { page: "dashboard", websiteId }
  }
  
  switch (pageName) {
    case "extensions":
      // Check if there's an extension slug
      const slug = segments[2]
      if (slug) {
        return { page: "extension", websiteId, slug }
      }
      return { page: "extensions", websiteId }
    
    case "cloud":
      return { page: "cloud", websiteId }
    
    case "settings":
      return { page: "settings", websiteId }
    
    case "studio":
      return { page: "studio", websiteId }
    
    case "pages":
      return { page: "pages", websiteId }
    
    case "administrators":
      return { page: "administrators", websiteId }
    
    case "theme":
      return { page: "theme", websiteId }
    
    // Legacy routes without UUID - redirect to select
    case "dashboard":
      return { page: "select" }
    
    default:
      return { page: "not-found" }
  }
}

// Navigation helper
export function navigate(path: string) {
  window.history.pushState({}, "", path)
  window.dispatchEvent(new PopStateEvent("popstate"))
}

// Link component for SPA navigation
interface LinkProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string
  children: React.ReactNode
}

export const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(
  ({ href, onClick, children, ...props }, ref) => {
    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
      // Allow ctrl/cmd click for new tab
      if (e.metaKey || e.ctrlKey || e.shiftKey) {
        return
      }
      
      // Only handle internal /app routes
      if (href.startsWith('/app')) {
        e.preventDefault()
        navigate(href)
      }
      
      onClick?.(e)
    }

    return (
      <a ref={ref} href={href} onClick={handleClick} {...props}>
        {children}
      </a>
    )
  }
)
Link.displayName = "Link"

// Build app URL helper
export function buildAppUrl(websiteId: string, page?: string): string {
  if (!page) {
    return `/app/${websiteId}`
  }
  return `/app/${websiteId}/${page}`
}

// Loading fallback
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-[50vh]">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  )
}

// Page title helper
function getPageTitle(route: Route): string {
  switch (route.page) {
    case "select":
      return "Sélectionner un site"
    case "dashboard":
      return "Accueil"
    case "extensions":
      return "Extensions"
    case "extension":
      return "Extension"
    case "cloud":
      return "Médias"
    case "settings":
      return "Paramètres"
    case "studio":
      return "Studio"
    case "pages":
      return "Pages"
    case "administrators":
      return "Administrateurs"
    case "theme":
      return "Thème"
    default:
      return "Page non trouvée"
  }
}

// Page breadcrumbs helper
function getPageBreadcrumbs(route: Route, websiteId: string | null): { label: string; href?: string }[] {
  if (!websiteId) return []
  
  switch (route.page) {
    case "extension":
      if (route.page === "extension") {
        return [
          { label: "Extensions", href: `/app/${websiteId}/extensions` },
          { label: route.slug }
        ]
      }
      return []
    default:
      return []
  }
}

export default function AppRouter() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)

  // Check authentication on mount
  useEffect(() => {
    const token = localStorage.getItem('auth_token')
    if (!token) {
      // Redirect to login with return URL
      const currentUrl = window.location.pathname + window.location.search
      const redirectParam = encodeURIComponent(currentUrl)
      window.location.href = `/login?redirect=${redirectParam}`
      return
    }
    setIsAuthenticated(true)
  }, [])

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname)
    }

    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [])

  // Show loading while checking auth
  if (isAuthenticated === null) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const route = parseRoute(currentPath)
  const websiteId = "websiteId" in route ? route.websiteId : null
  const isSelectPage = route.page === "select"
  const isStudioPage = route.page === "studio"
  const title = getPageTitle(route)
  const breadcrumbs = getPageBreadcrumbs(route, websiteId)

  // Render page content
  function renderPage() {
    switch (route.page) {
      case "select":
        return <WebsiteSelector />
      
      case "dashboard":
        return <Dashboard />
      
      case "extensions":
        return <ExtensionsManager />
      
      case "extension":
        return <ExtensionPage slug={route.slug} />
      
      case "cloud":
        return <CloudPage />
      
      case "settings":
        return <SettingsPage />
      
      case "studio":
        return <StudioPage />
      
      case "pages":
        return <PagesPage websiteId={route.websiteId} />
      
      case "administrators":
        return <AdministratorsPage />
      
      case "theme":
        return <ThemePage />
      
      case "not-found":
      default:
        return (
          <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
            <h1 className="text-2xl font-bold">Page non trouvée</h1>
            <p className="text-muted-foreground">La page que vous cherchez n'existe pas.</p>
            <Link href="/app" className="text-primary hover:underline">
              Retourner à l'accueil
            </Link>
          </div>
        )
    }
  }

  // For select page, render without AppShell (same layout as login/register)
  if (isSelectPage) {
    return (
      <QueryProvider>
        <TooltipProvider>
          <ErrorBoundary level="page">
            <Suspense fallback={<PageLoader />}>
              <WebsiteSelector />
            </Suspense>
          </ErrorBoundary>
        </TooltipProvider>
      </QueryProvider>
    )
  }

  return (
    <QueryProvider>
      <TooltipProvider>
        <ErrorBoundary level="page">
          <AppShell 
            title={title} 
            breadcrumbs={breadcrumbs}
            isStudioPage={isStudioPage}
            websiteId={websiteId}
            showSidebar={true}
          >
            <ErrorBoundary level="section" title={title}>
              <Suspense fallback={<PageLoader />}>
                {renderPage()}
              </Suspense>
            </ErrorBoundary>
          </AppShell>
        </ErrorBoundary>
      </TooltipProvider>
    </QueryProvider>
  )
}
