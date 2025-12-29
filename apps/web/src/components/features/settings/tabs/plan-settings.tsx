"use client"

import { Check, Sparkles } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { type QuotaUsage, type Website, type WebsiteExtension } from "@/lib/api"
import { formatBytes } from "@/lib/utils/formatters"

// ============================================================================
// Types
// ============================================================================

export interface PlanSettingsProps {
  quota: QuotaUsage | null
  websites: Website[]
  extensions: WebsiteExtension[]
  isLoading: boolean
}

// ============================================================================
// Sub-components
// ============================================================================

function PlanSettingsSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-6 w-40 mb-2" />
        <Skeleton className="h-4 w-60" />
      </div>
      <Separator />
      <Card className="border-primary">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-12 rounded-full" />
              </div>
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-8 w-8" />
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 rounded" />
              <Skeleton className="h-4 w-40" />
            </div>
          ))}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-16" />
              </div>
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

interface PlanFeatureProps {
  children: React.ReactNode
}

function PlanFeature({ children }: PlanFeatureProps) {
  return (
    <div className="flex items-center gap-2">
      <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0" />
      <span>{children}</span>
    </div>
  )
}

interface UsageBarProps {
  label: string
  used: string | number
  total: string | number
  percentage: number
}

function UsageBar({ label, used, total, percentage }: UsageBarProps) {
  return (
    <div>
      <div className="flex justify-between text-xs sm:text-sm mb-1">
        <span>{label}</span>
        <span>{used} / {total}</span>
      </div>
      <Progress value={Math.min(percentage, 100)} className="h-2" />
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function PlanSettings({ quota, websites, extensions, isLoading }: PlanSettingsProps) {
  if (isLoading) {
    return <PlanSettingsSkeleton />
  }

  const enabledExtensions = extensions.filter(e => e.enabled).length
  
  // Plan configuration (can be enhanced with actual plan data from API)
  const plan = {
    name: 'Gratuit',
    price: '0',
    sitesLimit: 1,
    storageLimit: quota?.quota_limit || 1073741824, // 1GB default
    tokensLimit: 1000,
    tokensUsed: 0,
  }
  
  const sitesUsed = websites.length
  const sitesPercent = (sitesUsed / plan.sitesLimit) * 100
  const storagePercent = quota?.usage_percentage || 0

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h3 className="text-base sm:text-lg font-medium">Abonnement</h3>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Gérez votre plan et vos limites.
        </p>
      </div>
      <Separator />

      {/* Current Plan */}
      <Card className="border-primary">
        <CardHeader className="p-4 sm:p-6">
          <div className="flex items-start sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                Plan {plan.name}
                <Badge className="text-[10px] sm:text-xs">Actif</Badge>
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                {plan.price === '0' ? 'Gratuit pour toujours' : `${plan.price}€ / mois`}
              </CardDescription>
            </div>
            <Sparkles className="h-6 w-6 sm:h-8 sm:w-8 text-primary shrink-0" />
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
          <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
            <PlanFeature>{plan.sitesLimit} site publié</PlanFeature>
            <PlanFeature>{formatBytes(plan.storageLimit)} de stockage</PlanFeature>
            <PlanFeature>{plan.tokensLimit.toLocaleString()} tokens IA / mois</PlanFeature>
            <PlanFeature>Sous-domaine asap.cool</PlanFeature>
          </div>
        </CardContent>
      </Card>

      {/* Usage */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-sm sm:text-base">Utilisation ce mois</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 p-4 pt-0 sm:p-6 sm:pt-0">
          <UsageBar
            label="Sites"
            used={sitesUsed}
            total={plan.sitesLimit}
            percentage={sitesPercent}
          />
          <UsageBar
            label="Stockage"
            used={quota ? formatBytes(quota.total_size_used) : '0 B'}
            total={formatBytes(plan.storageLimit)}
            percentage={storagePercent}
          />
          <div>
            <div className="flex justify-between text-xs sm:text-sm mb-1">
              <span>Extensions actives</span>
              <span>{enabledExtensions}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
        <Button className="flex-1 h-9 sm:h-10 text-sm">
          Passer au plan Pro
        </Button>
        <Button variant="outline" className="h-9 sm:h-10 text-sm" asChild>
          <a href="/#pricing">Voir les plans</a>
        </Button>
      </div>

      {/* Cancel - only show for paid plans */}
      {plan.price !== '0' && (
        <div className="pt-4">
          <Button variant="ghost" className="text-muted-foreground hover:text-destructive">
            Annuler l'abonnement
          </Button>
        </div>
      )}
    </div>
  )
}
