import { useEffect, useState, Suspense, lazy } from "react"
import { AppShell } from "@/components/app-shell"
import { Loader2 } from "lucide-react"

// Lazy load page components
const Dashboard = lazy(() => import("@/components/Dashboard"))
const ModulesManager = lazy(() => import("@/components/ModulesManager"))
const ModuleConfig = lazy(() => import("@/components/ModuleConfig"))
const CloudManager = lazy(() => import("@/components/CloudManager"))

type Route = 
  | { page: "dashboard" }
  | { page: "modules" }
  | { page: "module-config"; moduleSlug: string }
  | { page: "cloud" }
  | { page: "not-found" }

function parseRoute(pathname: string): Route {
  // Remove trailing slash
  const path = pathname.endsWith("/") && pathname !== "/" 
    ? pathname.slice(0, -1) 
    : pathname

  if (path === "/app" || path === "/app/dashboard") {
    return { page: "dashboard" }
  }
  
  if (path === "/app/modules") {
    return { page: "modules" }
  }
  
  // Match /app/modules/:slug
  const moduleMatch = path.match(/^\/app\/modules\/([^/]+)$/)
  if (moduleMatch) {
    return { page: "module-config", moduleSlug: moduleMatch[1] }
  }
  
  // Website page merged into dashboard
  if (path === "/app/website" || path === "/app/websites") {
    return { page: "dashboard" }
  }
  
  if (path === "/app/cloud") {
    return { page: "cloud" }
  }
  
  // Settings is now a modal, redirect to dashboard
  if (path === "/app/settings") {
    return { page: "dashboard" }
  }
  
  return { page: "not-found" }
}

function getPageTitle(route: Route): string {
  switch (route.page) {
    case "dashboard":
      return "Dashboard"
    case "modules":
      return "Modules"
    case "module-config":
      return "Configuration du module"
    case "cloud":
      return "Fichiers"
    default:
      return "Page non trouvée"
  }
}

function getBreadcrumbs(route: Route): { label: string; href?: string }[] {
  switch (route.page) {
    case "dashboard":
      return [{ label: "Dashboard" }]
    case "modules":
      return [{ label: "Modules" }]
    case "module-config":
      return [
        { label: "Modules", href: "/app/modules" },
        { label: route.moduleSlug }
      ]
    case "cloud":
      return [{ label: "Fichiers" }]
    default:
      return [{ label: "Page non trouvée" }]
  }
}

function PageLoader() {
  return (
    <div className="flex h-[50vh] items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  )
}

function NotFound() {
  return (
    <div className="flex h-[50vh] flex-col items-center justify-center gap-4">
      <h1 className="text-2xl font-semibold">Page non trouvée</h1>
      <p className="text-muted-foreground">
        La page que vous recherchez n'existe pas.
      </p>
      <a 
        href="/app/dashboard" 
        className="text-primary hover:underline"
        onClick={(e) => {
          e.preventDefault()
          window.history.pushState({}, "", "/app/dashboard")
          window.dispatchEvent(new PopStateEvent("popstate"))
        }}
      >
        Retour au dashboard
      </a>
    </div>
  )
}

function PageContent({ route }: { route: Route }) {
  switch (route.page) {
    case "dashboard":
      return <Dashboard />
    case "modules":
      return <ModulesManager />
    case "module-config":
      return <ModuleConfig slug={route.moduleSlug} />
    case "cloud":
      return <CloudManager />
    case "not-found":
      return <NotFound />
  }
}

export function AppRouter() {
  const [route, setRoute] = useState<Route>(() => 
    parseRoute(window.location.pathname)
  )

  useEffect(() => {
    // Update document title
    document.title = `${getPageTitle(route)} - ASAP`
  }, [route])

  useEffect(() => {
    // Handle browser back/forward
    const handlePopState = () => {
      setRoute(parseRoute(window.location.pathname))
    }

    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [])

  useEffect(() => {
    // Intercept link clicks for SPA navigation
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const anchor = target.closest("a")
      
      if (!anchor) return
      
      const href = anchor.getAttribute("href")
      if (!href) return
      
      // Only handle internal /app links
      if (!href.startsWith("/app")) return
      
      // Don't handle if modifier keys are pressed
      if (e.metaKey || e.ctrlKey || e.shiftKey) return
      
      // Don't handle if target="_blank"
      if (anchor.target === "_blank") return
      
      e.preventDefault()
      
      // Update URL and route
      if (window.location.pathname !== href) {
        window.history.pushState({}, "", href)
        setRoute(parseRoute(href))
      }
    }

    document.addEventListener("click", handleClick)
    return () => document.removeEventListener("click", handleClick)
  }, [])

  const breadcrumbs = getBreadcrumbs(route)

  return (
    <AppShell breadcrumbs={breadcrumbs}>
      <Suspense fallback={<PageLoader />}>
        <PageContent route={route} />
      </Suspense>
    </AppShell>
  )
}

// Navigation helper for programmatic navigation
export function navigate(path: string) {
  window.history.pushState({}, "", path)
  window.dispatchEvent(new PopStateEvent("popstate"))
}
