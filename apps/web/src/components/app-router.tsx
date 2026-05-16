import React, { lazy, Suspense, useEffect, useState, type ComponentType } from "react"
import { AppShell } from "./layouts/app-shell"
import { TooltipProvider } from "@/components/ui/tooltip"
import { QueryProvider, WebSocketProvider, I18nProvider } from "@/components/providers"
import { ErrorBoundary } from "@/components/shared"
import { Spinner } from "@/components/ui/spinner"
import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getApiBaseUrl } from "@/lib/api/base-url"

// Helper to create lazy components with error handling for HMR issues
function lazyWithRetry<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  retries = 3,
  interval = 1000
): React.LazyExoticComponent<T> {
  return lazy(async () => {
    for (let i = 0; i < retries; i++) {
      try {
        return await importFn();
      } catch (error) {
        // If it's a dynamic import error (HMR issue), wait and retry
        if (error instanceof Error && error.message.includes('dynamically imported module')) {
          if (i < retries - 1) {
            await new Promise(resolve => setTimeout(resolve, interval));
            continue;
          }
        }
        throw error;
      }
    }
    return await importFn();
  });
}

// Lazy load page components with retry logic for HMR stability
const Dashboard = lazyWithRetry(() => import("@/components/features/websites/dashboard"))
const ExtensionMarketplace = lazyWithRetry(() => import("@/components/features/extensions/extension-marketplace"))
const ExtensionPage = lazyWithRetry(() => import("@/components/features/extensions/extension-page"))
const CloudPage = lazyWithRetry(() => import("@/components/features/cloud/cloud-manager"))
const SettingsPage = lazyWithRetry(() => import("@/components/features/settings/settings-page"))
const StudioPage = lazyWithRetry(() => import("@/components/studio/studio-page"))
const PagesPage = lazyWithRetry(() => import("@/components/features/pages/pages-page"))
const AdministratorsPage = lazyWithRetry(() => import("@/components/features/settings/administrators-page"))
const ThemePage = lazyWithRetry(() => import("@/components/features/settings/theme-page"))
const WebsiteSelector = lazyWithRetry(() => import("@/components/pages/website-selector"))
const AnalyticsPage = lazyWithRetry(() => import("@/components/features/analytics/analytics-page"))
const SeoPage = lazyWithRetry(() => import("@/components/features/seo/seo-page"))
const NotificationsPage = lazyWithRetry(() => import("@/components/features/notifications"))

// UUID regex pattern
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// Route types
type Route =
  | { page: "select" }
  | { page: "notifications" }
  | { page: "dashboard"; websiteId: string }
  | { page: "extensions"; websiteId: string }
  | { page: "extension"; websiteId: string; slug: string }
  | { page: "cloud"; websiteId: string }
  | { page: "settings"; websiteId: string }
  | { page: "studio"; websiteId: string }
  | { page: "pages"; websiteId: string }
  | { page: "administrators"; websiteId: string }
  | { page: "theme"; websiteId: string }
  | { page: "analytics"; websiteId: string }
  | { page: "seo"; websiteId: string }
  | { page: "not-found" }

// Parse route from pathname
function parseRoute(pathname: string): Route {
  // Remove leading slash
  const path = pathname.replace(/^\//, "")
  
  // Empty path = website selector
  if (!path) {
    return { page: "select" }
  }
  
  const segments = path.split("/").filter(Boolean)
  
  // Global routes (not tied to a specific website)
  if (segments[0] === "notifications") {
    return { page: "notifications" }
  }
  
  // First segment should be websiteId (UUID)
  const websiteId = segments[0]
  
  if (!websiteId || !UUID_PATTERN.test(websiteId)) {
    return { page: "select" }
  }
  
  // Second segment is the page
  const pageName = segments[1]
  
  if (!pageName) {
    // /{uuid} = dashboard
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
    
    case "analytics":
      return { page: "analytics", websiteId }
    
    case "seo":
      return { page: "seo", websiteId }
    
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
      
      // Only handle internal app routes (not auth pages)
      const isAuthPage = href.startsWith('/login') || href.startsWith('/signup') || 
                         href.startsWith('/forgot-password') || href.startsWith('/reset-password')
      if (!isAuthPage && href.startsWith('/')) {
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
    return `/${websiteId}`
  }
  return `/${websiteId}/${page}`
}

// Loading fallback
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-[50vh]">
      <Spinner className="h-8 w-8 text-primary" />
    </div>
  )
}

// Error fallback for lazy load failures
function LazyLoadError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
      <p className="text-muted-foreground">Le module n'a pas pu être chargé.</p>
      <Button onClick={onRetry} variant="outline">
        <RefreshCw className="mr-2 h-4 w-4" />
        Réessayer
      </Button>
    </div>
  )
}

// Page title helper
function getPageTitle(route: Route): string {
  switch (route.page) {
    case "select":
      return "Sélectionner un site"
    case "notifications":
      return "Notifications"
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
    case "analytics":
      return "Analytics"
    case "seo":
      return "SEO"
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
          { label: "Extensions", href: `/${websiteId}/extensions` },
          { label: route.slug }
        ]
      }
      return []
    default:
      return []
  }
}

// Get accounts app URL for redirects
function getAccountsUrl(): string {
  return import.meta.env.PUBLIC_ACCOUNTS_URL || 'http://localhost:4323';
}

export default function AppRouter() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const [isRedirecting, setIsRedirecting] = useState(false)

  // Check authentication on mount
  useEffect(() => {
    // Prevent multiple redirects
    if (isRedirecting) return;
    
    const checkAuth = async () => {
      // First, check if tokens are passed in URL hash (from accounts app redirect)
      const hashTokens = extractTokensFromHash();
      if (hashTokens) {
        localStorage.setItem('auth_token', hashTokens.accessToken);
        localStorage.setItem('refresh_token', hashTokens.refreshToken);
        // Clean up URL hash
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
      
      const token = localStorage.getItem('auth_token')
      
      if (!token) {
        redirectToLogin()
        return
      }
      
      // Validate token with API
      try {
        const response = await fetch(`${getApiBaseUrl()}/auth/me`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        })
        
        if (response.ok) {
          setIsAuthenticated(true)
        } else if (response.status === 401) {
          // Token invalid, try refresh
          const refreshToken = localStorage.getItem('refresh_token')
          if (refreshToken) {
            try {
              const refreshResponse = await fetch(
                `${getApiBaseUrl()}/auth/refresh`,
                {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ refresh_token: refreshToken }),
                }
              )
              
              if (refreshResponse.ok) {
                const data = await refreshResponse.json()
                localStorage.setItem('auth_token', data.access_token)
                localStorage.setItem('refresh_token', data.refresh_token)
                setIsAuthenticated(true)
                return
              }
            } catch (e) {
              // Token refresh failed silently
            }
          }
          
          // Clear invalid tokens and redirect
          localStorage.removeItem('auth_token')
          localStorage.removeItem('refresh_token')
          redirectToLogin()
        } else {
          // Other errors (network, server) - let user proceed
          setIsAuthenticated(true)
        }
      } catch (error) {
        // Network error - let user proceed if they have a token
        setIsAuthenticated(true)
      }
    }
    
    // Extract tokens from URL hash (passed from accounts app)
    const extractTokensFromHash = (): { accessToken: string; refreshToken: string } | null => {
      const hash = window.location.hash;
      if (!hash || !hash.includes('auth=')) return null;
      
      try {
        const hashParams = new URLSearchParams(hash.substring(1)); // Remove leading #
        const accessToken = hashParams.get('auth');
        const refreshToken = hashParams.get('refresh');
        
        if (accessToken && refreshToken) {
          return {
            accessToken: decodeURIComponent(accessToken),
            refreshToken: decodeURIComponent(refreshToken),
          };
        }
      } catch (e) {
        // Failed to parse auth tokens
      }
      return null;
    }
    
    const redirectToLogin = () => {
      if (isRedirecting) return;
      setIsRedirecting(true);
      
      const authPaths = ['/login', '/signup', '/forgot-password', '/reset-password']
      const currentPathname = window.location.pathname
      const isAuthPath = authPaths.some(path => currentPathname.startsWith(path))
      
      const accountsUrl = getAccountsUrl()
      
      if (isAuthPath) {
        window.location.href = `${accountsUrl}/login`
      } else {
        const redirectParam = encodeURIComponent(window.location.origin + window.location.pathname)
        window.location.href = `${accountsUrl}/login?redirect=${redirectParam}`
      }
    }
    
    checkAuth()
  }, [isRedirecting])

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
        <Spinner className="h-8 w-8 text-primary" />
      </div>
    )
  }

  const route = parseRoute(currentPath)
  const websiteId = "websiteId" in route ? route.websiteId : null
  const isSelectPage = route.page === "select"
  const isStudioPage = route.page === "studio"
  const title = getPageTitle(route)
  const breadcrumbs = getPageBreadcrumbs(route, websiteId)

  // Store last visited website and page for navigation
  if (websiteId && route.page !== "not-found") {
    localStorage.setItem('last_website_id', websiteId);
    localStorage.setItem('last_page', route.page);
    localStorage.setItem('last_path', currentPath);
  }

  // Render page content
  function renderPage() {
    switch (route.page) {
      case "select":
        return <WebsiteSelector />
      
      case "notifications":
        return <NotificationsPage />
      
      case "dashboard":
        return <Dashboard />
      
      case "extensions":
        return <ExtensionMarketplace />
      
      case "extension":
        return <ExtensionPage slug={route.slug} />
      
      case "cloud":
        return <CloudPage />
      
      case "settings":
        return <SettingsPage />
      
      case "studio":
        return <StudioPage />
      
      case "pages":
        return <PagesPage />
      
      case "administrators":
        return <AdministratorsPage />
      
      case "theme":
        return <ThemePage />
      
      case "analytics":
        return <AnalyticsPage />
      
      case "seo":
        return <SeoPage />
      
      case "not-found":
      default:
        return (
          <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
            <h1 className="text-2xl font-bold">Page non trouvée</h1>
            <p className="text-muted-foreground">La page que vous cherchez n'existe pas.</p>
            <Link href="/" className="text-primary hover:underline">
              Retourner à l'accueil
            </Link>
          </div>
        )
    }
  }

  // For select page, render without AppShell (same layout as login/register)
  if (isSelectPage) {
    return (
      <I18nProvider>
        <QueryProvider>
          <WebSocketProvider>
            <TooltipProvider>
              <ErrorBoundary level="page">
                <Suspense fallback={<PageLoader />}>
                  <WebsiteSelector />
                </Suspense>
              </ErrorBoundary>
            </TooltipProvider>
          </WebSocketProvider>
        </QueryProvider>
      </I18nProvider>
    )
  }

  return (
    <I18nProvider>
      <QueryProvider>
        <WebSocketProvider>
          <TooltipProvider>
            <ErrorBoundary level="page">
              <AppShell 
                title={title} 
                breadcrumbs={breadcrumbs}
                isStudioPage={isStudioPage}
                websiteId={websiteId}
                showSidebar={true}
                currentPage={route.page}
              >
                <ErrorBoundary level="section" title={title}>
                  <Suspense fallback={<PageLoader />}>
                    {renderPage()}
                  </Suspense>
                </ErrorBoundary>
              </AppShell>
            </ErrorBoundary>
          </TooltipProvider>
        </WebSocketProvider>
      </QueryProvider>
    </I18nProvider>
  )
}
