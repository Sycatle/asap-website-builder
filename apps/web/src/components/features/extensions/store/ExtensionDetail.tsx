/**
 * Extension Detail Component
 * 
 * Full detail view for an extension with installation controls.
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Download,
  Star,
  Calendar,
  User,
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  Shield,
} from 'lucide-react';
import type { ExtensionStoreDetail } from '@/lib/api/store';
import { InstallButton } from './InstallButton';
import { formatDistanceToNow } from 'date-fns';

interface ExtensionDetailProps {
  extension: ExtensionStoreDetail;
  isInstalled: boolean;
  isInstalling: boolean;
  onInstall: () => void;
  onUninstall: () => void;
  onBack?: () => void;
}

export function ExtensionDetail({
  extension,
  isInstalled,
  isInstalling,
  onInstall,
  onUninstall,
  onBack,
}: ExtensionDetailProps) {
  // Extract permissions from manifest if available
  const permissions = (extension.manifest?.permissions as string[]) || [];

  return (
    <div className="space-y-6">
      {/* Back button */}
      {onBack && (
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to Store
        </Button>
      )}

      {/* Header */}
      <div className="flex gap-6">
        {/* Icon */}
        <div className="shrink-0">
          {extension.icon ? (
            <div className="w-20 h-20 rounded-xl bg-muted flex items-center justify-center text-4xl">
              {extension.icon}
            </div>
          ) : (
            <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
              <span className="text-2xl font-bold text-primary">
                {extension.name.charAt(0)}
              </span>
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 space-y-3">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{extension.name}</h1>
              {extension.featured && (
                <Badge variant="default" className="gap-1">
                  <Star className="w-3 h-3" />
                  Featured
                </Badge>
              )}
              {extension.beta && (
                <Badge variant="outline" className="gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Beta
                </Badge>
              )}
              {extension.author?.verified && (
                <Badge variant="secondary" className="gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Verified
                </Badge>
              )}
            </div>
            <p className="text-muted-foreground mt-1">
              {extension.description}
            </p>
          </div>

          {/* Stats */}
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Download className="w-4 h-4" />
              {extension.install_count.toLocaleString()} installs
            </span>
            {extension.rating !== undefined && extension.rating_count > 0 && (
              <span className="flex items-center gap-1.5">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                {extension.rating.toFixed(1)}
                <span className="text-muted-foreground">
                  ({extension.rating_count})
                </span>
              </span>
            )}
            {extension.author && (
              <span className="flex items-center gap-1.5">
                <User className="w-4 h-4" />
                {extension.author.name}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              Updated {formatDistanceToNow(new Date(extension.updated_at), { addSuffix: true })}
            </span>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <InstallButton
              isInstalled={isInstalled}
              isInstalling={isInstalling}
              requiredPlan={extension.min_plan}
              onInstall={onInstall}
              onUninstall={onUninstall}
              size="lg"
            />
          </div>
        </div>
      </div>

      <Separator />

      {/* Tabs: Overview, Permissions */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {permissions.length > 0 && (
            <TabsTrigger value="permissions" className="gap-1.5">
              <Shield className="w-4 h-4" />
              Permissions
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Long description */}
          {extension.long_description && (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <p className="whitespace-pre-wrap">{extension.long_description}</p>
            </div>
          )}

          {/* Banner */}
          {extension.banner && (
            <div className="space-y-3">
              <img
                src={extension.banner}
                alt={`${extension.name} banner`}
                className="rounded-lg border w-full"
              />
            </div>
          )}

          {/* Tags */}
          {extension.tags.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {extension.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Meta info */}
          <div className="grid grid-cols-2 gap-6 text-sm">
            <div>
              <h3 className="font-semibold mb-2">Information</h3>
              <dl className="space-y-1 text-muted-foreground">
                <div className="flex justify-between">
                  <dt>Version</dt>
                  <dd className="font-medium text-foreground">
                    {extension.version}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt>Min Plan</dt>
                  <dd className="font-medium text-foreground capitalize">
                    {extension.min_plan}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt>Category</dt>
                  <dd className="font-medium text-foreground capitalize">
                    {extension.category}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt>Created</dt>
                  <dd className="font-medium text-foreground">
                    {formatDistanceToNow(new Date(extension.created_at), { addSuffix: true })}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </TabsContent>

        {permissions.length > 0 && (
          <TabsContent value="permissions">
            <div className="space-y-3">
              {permissions.map((permission) => (
                <div
                  key={permission}
                  className="flex items-center gap-3 p-3 rounded-lg border bg-card"
                >
                  <Shield className="w-5 h-5 text-muted-foreground" />
                  <span className="font-medium">{permission}</span>
                </div>
              ))}
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

/**
 * Loading skeleton for extension detail
 */
export function ExtensionDetailSkeleton() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex gap-6">
        <Skeleton className="w-20 h-20 rounded-xl" />
        <div className="flex-1 space-y-3">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="flex gap-6">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="flex gap-3 pt-2">
            <Skeleton className="h-11 w-32" />
            <Skeleton className="h-11 w-28" />
          </div>
        </div>
      </div>

      <Separator />

      {/* Content */}
      <div className="space-y-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    </div>
  );
}
