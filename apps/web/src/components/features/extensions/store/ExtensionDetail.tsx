/**
 * Extension Detail View
 * 
 * Shows detailed information about a single extension from the store.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft,
  Download,
  Star,
  CheckCircle,
  ExternalLink,
  Shield,
  Package,
} from 'lucide-react';
import type { ExtensionStoreSummary, ExtensionStoreDetail } from '@/lib/api/store';
import { ExtensionIcon } from '@/lib/extension-icons';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

interface ExtensionDetailProps {
  extension: ExtensionStoreSummary | ExtensionStoreDetail;
  isInstalled: boolean;
  onBack: () => void;
  onInstall: () => void;
  onUninstall: () => void;
  isInstalling?: boolean;
  isUninstalling?: boolean;
}

// Type guard
function isDetailType(ext: ExtensionStoreSummary | ExtensionStoreDetail): ext is ExtensionStoreDetail {
  return 'long_description' in ext || (ext as ExtensionStoreDetail).author !== undefined;
}

// ============================================================================
// Main Component
// ============================================================================

export function ExtensionDetail({
  extension,
  isInstalled,
  onBack,
  onInstall,
  onUninstall,
  isInstalling,
  isUninstalling,
}: ExtensionDetailProps) {
  const { t } = useTranslation(['dashboard', 'common']);
  
  // Extract author info based on type
  const authorName = isDetailType(extension) 
    ? extension.author?.name 
    : extension.author_name;
  const authorVerified = isDetailType(extension)
    ? extension.author?.verified
    : extension.author_verified;
  const longDescription = isDetailType(extension) 
    ? extension.long_description 
    : undefined;
  // Extract manifest data for permissions
  const manifest = isDetailType(extension) ? extension.manifest : undefined;
  const permissions = manifest?.permissions as string[] | undefined;
  const repository = manifest?.repository as string | undefined;

  return (
    <div className="space-y-6">
      {/* Back button */}
      <Button variant="ghost" onClick={onBack} className="gap-2">
        <ArrowLeft className="w-4 h-4" />
        {t('common:back', 'Retour')}
      </Button>

      {/* Header */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-start gap-4">
            <ExtensionIcon 
              slug={extension.slug}
              size="lg"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h1 className="text-2xl font-bold">{extension.name}</h1>
                {authorVerified && (
                  <Badge variant="secondary" className="gap-1">
                    <CheckCircle className="w-3 h-3" />
                    {t('dashboard:extensions.verified', 'Vérifié')}
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground">{extension.description}</p>
              
              {/* Stats */}
              <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Download className="w-4 h-4" />
                  {extension.install_count?.toLocaleString() ?? 0} installs
                </span>
                {extension.rating && (
                  <span className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500" />
                    {extension.rating.toFixed(1)}
                  </span>
                )}
                <span className="capitalize">{extension.category}</span>
              </div>
            </div>

            {/* Action button */}
            <div>
              {isInstalled ? (
                <Button 
                  variant="destructive" 
                  onClick={onUninstall}
                  disabled={isUninstalling}
                >
                  {isUninstalling ? t('common:loading', 'Chargement...') : t('dashboard:extensions.uninstall', 'Désinstaller')}
                </Button>
              ) : (
                <Button 
                  onClick={onInstall}
                  disabled={isInstalling}
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  {isInstalling ? t('common:loading', 'Chargement...') : t('dashboard:extensions.install', 'Installer')}
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Details */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Description */}
        <Card className="md:col-span-2">
          <CardHeader>
            <h2 className="font-semibold">{t('dashboard:extensions.about', 'À propos')}</h2>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground whitespace-pre-wrap">
              {longDescription || extension.description}
            </p>
          </CardContent>
        </Card>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Info */}
          <Card>
            <CardHeader>
              <h2 className="font-semibold">{t('dashboard:extensions.information', 'Informations')}</h2>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('dashboard:extensions.version', 'Version')}</span>
                <span>{extension.version || '1.0.0'}</span>
              </div>
              <Separator />
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t('dashboard:extensions.category', 'Catégorie')}</span>
                <span className="capitalize">{extension.category}</span>
              </div>
              {authorName && (
                <>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">{t('dashboard:extensions.author', 'Auteur')}</span>
                    <span>{authorName}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Permissions */}
          {permissions && permissions.length > 0 && (
            <Card>
              <CardHeader>
                <h2 className="font-semibold flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  {t('dashboard:extensions.permissions', 'Permissions')}
                </h2>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {permissions.map((perm: string, i: number) => (
                    <li key={i} className="flex items-center gap-2">
                      <Package className="w-3 h-3" />
                      {perm}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Links */}
          {repository && (
            <Card>
              <CardHeader>
                <h2 className="font-semibold">{t('dashboard:extensions.links', 'Liens')}</h2>
              </CardHeader>
              <CardContent>
                <a 
                  href={repository}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <ExternalLink className="w-4 h-4" />
                  {t('dashboard:extensions.viewSource', 'Code source')}
                </a>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Skeleton
// ============================================================================

export function ExtensionDetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-10 w-24" />
      <Card>
        <CardHeader>
          <div className="flex items-start gap-4">
            <Skeleton className="w-20 h-20 rounded-2xl" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-full max-w-md" />
              <Skeleton className="h-4 w-32" />
            </div>
            <Skeleton className="h-10 w-28" />
          </div>
        </CardHeader>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <Skeleton className="h-6 w-24" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-32 w-full" />
          </CardContent>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-24" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
