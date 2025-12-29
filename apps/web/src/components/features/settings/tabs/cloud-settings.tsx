"use client"

import { Cloud } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"
import { type QuotaUsage, type FileMetadata } from "@/lib/api"
import { formatBytes } from "@/lib/utils/formatters"
import { navigate } from "@/components/app-router"

// ============================================================================
// Types
// ============================================================================

export interface CloudSettingsProps {
  quota: QuotaUsage | null
  files: FileMetadata[]
  isLoading: boolean
  websiteId: string | null
  onClose: () => void
}

// ============================================================================
// Helpers
// ============================================================================

interface StorageBreakdownItem {
  label: string
  size: string
  color: string
}

function getStorageBreakdown(files: FileMetadata[]): StorageBreakdownItem[] {
  const categories: Record<string, { size: number; color: string }> = {
    'Images': { size: 0, color: 'bg-blue-500' },
    'Documents': { size: 0, color: 'bg-green-500' },
    'Vidéos': { size: 0, color: 'bg-purple-500' },
    'Autres': { size: 0, color: 'bg-muted0' },
  }
  
  files.forEach(file => {
    const fileSize = file.original_size || 0
    if (file.mime_type.startsWith('image/')) {
      categories['Images'].size += fileSize
    } else if (file.mime_type.startsWith('video/')) {
      categories['Vidéos'].size += fileSize
    } else if (
      file.mime_type.includes('pdf') ||
      file.mime_type.includes('document') ||
      file.mime_type.includes('text')
    ) {
      categories['Documents'].size += fileSize
    } else {
      categories['Autres'].size += fileSize
    }
  })
  
  return Object.entries(categories)
    .filter(([_, data]) => data.size > 0)
    .map(([label, data]) => ({
      label,
      size: formatBytes(data.size),
      color: data.color,
    }))
}

// ============================================================================
// Sub-components
// ============================================================================

function CloudSettingsSkeleton() {
  return (
    <div className="space-y-6">
      <div>
        <Skeleton className="h-6 w-40 mb-2" />
        <Skeleton className="h-4 w-60" />
      </div>
      <Separator />
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4" />
            <Skeleton className="h-5 w-40" />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-20" />
            </div>
            <Skeleton className="h-2 w-full rounded-full" />
          </div>
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="p-3 border rounded-lg space-y-1">
              <Skeleton className="h-8 w-12" />
              <Skeleton className="h-3 w-16" />
            </div>
            <div className="p-3 border rounded-lg space-y-1">
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded" />
              <div className="flex-1 space-y-1">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
              <Skeleton className="h-4 w-12" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}

interface StorageBreakdownCardProps {
  breakdown: StorageBreakdownItem[]
}

function StorageBreakdownCard({ breakdown }: StorageBreakdownCardProps) {
  if (breakdown.length === 0) return null
  
  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="text-sm sm:text-base">Répartition</CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
        <div className="space-y-2.5 sm:space-y-3">
          {breakdown.map((item) => (
            <div key={item.label} className="flex items-center gap-2.5 sm:gap-3">
              <div className={cn("h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full", item.color)} />
              <span className="text-xs sm:text-sm flex-1">{item.label}</span>
              <span className="text-xs sm:text-sm text-muted-foreground">{item.size}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export function CloudSettings({ quota, files, isLoading, websiteId, onClose }: CloudSettingsProps) {
  if (isLoading) {
    return <CloudSettingsSkeleton />
  }

  const breakdown = getStorageBreakdown(files)

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h3 className="text-base sm:text-lg font-medium">Stockage Cloud</h3>
        <p className="text-xs sm:text-sm text-muted-foreground">
          Gérez votre espace de stockage.
        </p>
      </div>
      <Separator />

      {/* Storage Usage */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <Cloud className="h-4 w-4" />
            Utilisation du stockage
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 p-4 pt-0 sm:p-6 sm:pt-0">
          <div className="space-y-2">
            <div className="flex justify-between text-xs sm:text-sm">
              <span>{quota ? formatBytes(quota.total_size_used) : '0 B'} utilisés</span>
              <span>{quota ? formatBytes(quota.quota_limit) : '0 B'} total</span>
            </div>
            <Progress value={quota?.usage_percentage || 0} className="h-2" />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 pt-2">
            <div className="p-2.5 sm:p-3 border rounded-lg">
              <p className="text-xl sm:text-2xl font-bold">{files.length}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Fichiers</p>
            </div>
            <div className="p-2.5 sm:p-3 border rounded-lg">
              <p className="text-xl sm:text-2xl font-bold">{quota ? formatBytes(quota.remaining) : '0 B'}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground">Disponible</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <StorageBreakdownCard breakdown={breakdown} />

      <Button 
        variant="outline" 
        className="w-full h-9 sm:h-10 text-sm"
        onClick={() => {
          onClose()
          if (websiteId) {
            navigate(`/app/${websiteId}/cloud`)
          }
        }}
      >
        Gérer mes fichiers
      </Button>
    </div>
  )
}
