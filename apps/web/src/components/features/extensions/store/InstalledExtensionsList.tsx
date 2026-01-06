/**
 * Installed Extensions List Component
 * 
 * Lists extensions installed on an account with management controls.
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MoreHorizontal,
  ExternalLink,
  Settings,
  Trash2,
  Globe,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import type { InstalledExtensionSummary } from '@/lib/api/store';
import { formatDistanceToNow } from 'date-fns';

interface InstalledExtensionsListProps {
  extensions: InstalledExtensionSummary[];
  isLoading?: boolean;
  onUninstall: (slug: string) => void;
  onOpenSettings?: (slug: string) => void;
  onOpenDetails?: (slug: string) => void;
}

export function InstalledExtensionsList({
  extensions,
  isLoading,
  onUninstall,
  onOpenSettings,
  onOpenDetails,
}: InstalledExtensionsListProps) {
  if (isLoading) {
    return <InstalledExtensionsListSkeleton />;
  }

  if (extensions.length === 0) {
    return (
      <div className="text-center py-12 border rounded-lg">
        <Globe className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="font-semibold mb-2">No extensions installed</h3>
        <p className="text-sm text-muted-foreground mb-4">
          Browse the Extension Store to discover and install extensions.
        </p>
        <Button variant="outline">Browse Store</Button>
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Extension</TableHead>
            <TableHead>Version</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Websites</TableHead>
            <TableHead>Installed</TableHead>
            <TableHead className="w-[60px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {extensions.map((ext) => (
            <TableRow key={ext.slug}>
              <TableCell>
                <div className="flex items-center gap-3">
                  {ext.icon ? (
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center text-xl">
                      {ext.icon}
                    </div>
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                      <span className="text-sm font-bold text-primary">
                        {ext.name.charAt(0)}
                      </span>
                    </div>
                  )}
                  <div>
                    <button
                      onClick={() => onOpenDetails?.(ext.slug)}
                      className="font-medium hover:underline text-left"
                    >
                      {ext.name}
                    </button>
                    <p className="text-sm text-muted-foreground">
                      {ext.category}
                    </p>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="outline">{ext.version}</Badge>
              </TableCell>
              <TableCell>
                {ext.enabled ? (
                  <Badge variant="default" className="gap-1">
                    <CheckCircle className="w-3 h-3" />
                    Enabled
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="gap-1">
                    <XCircle className="w-3 h-3" />
                    Disabled
                  </Badge>
                )}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {ext.websites_count} website{ext.websites_count !== 1 ? 's' : ''}
              </TableCell>
              <TableCell className="text-muted-foreground">
                {formatDistanceToNow(new Date(ext.installed_at), { addSuffix: true })}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onOpenDetails?.(ext.slug)}>
                      <ExternalLink className="w-4 h-4 mr-2" />
                      View Details
                    </DropdownMenuItem>
                    {onOpenSettings && (
                      <DropdownMenuItem onClick={() => onOpenSettings(ext.slug)}>
                        <Settings className="w-4 h-4 mr-2" />
                        Settings
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onUninstall(ext.slug)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Uninstall
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function InstalledExtensionsListSkeleton() {
  return (
    <div className="border rounded-lg">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Extension</TableHead>
            <TableHead>Version</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Websites</TableHead>
            <TableHead>Installed</TableHead>
            <TableHead className="w-[60px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {Array.from({ length: 3 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell>
                <div className="flex items-center gap-3">
                  <Skeleton className="w-10 h-10 rounded-lg" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-16" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-5 w-20" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-16" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-4 w-24" />
              </TableCell>
              <TableCell>
                <Skeleton className="h-8 w-8" />
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
