/**
 * Permissions Review Component
 * 
 * Displays extension permissions with descriptions and risk levels.
 */

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Eye,
  Edit,
  Database,
  Globe,
  Bell,
  Settings,
  FileCode,
  Users,
  Key,
  type LucideIcon,
} from 'lucide-react';

interface Permission {
  key: string;
  name: string;
  description: string;
  risk_level?: 'low' | 'medium' | 'high';
}

// Permission metadata with icons and risk levels
const PERMISSION_META: Record<string, { icon: LucideIcon; risk: 'low' | 'medium' | 'high' }> = {
  'read:website': { icon: Eye, risk: 'low' },
  'write:website': { icon: Edit, risk: 'medium' },
  'read:account': { icon: Users, risk: 'low' },
  'write:account': { icon: Users, risk: 'high' },
  'read:analytics': { icon: Database, risk: 'low' },
  'write:analytics': { icon: Database, risk: 'medium' },
  'external:api': { icon: Globe, risk: 'medium' },
  'notifications': { icon: Bell, risk: 'low' },
  'settings': { icon: Settings, risk: 'medium' },
  'content:modify': { icon: FileCode, risk: 'high' },
  'auth:tokens': { icon: Key, risk: 'high' },
};

function getPermissionMeta(key: string) {
  return PERMISSION_META[key] || { icon: Shield, risk: 'medium' as const };
}

function getRiskBadge(risk: 'low' | 'medium' | 'high') {
  switch (risk) {
    case 'low':
      return (
        <Badge variant="outline" className="text-green-600 border-green-600">
          Low Risk
        </Badge>
      );
    case 'medium':
      return (
        <Badge variant="outline" className="text-yellow-600 border-yellow-600">
          Medium Risk
        </Badge>
      );
    case 'high':
      return (
        <Badge variant="outline" className="text-red-600 border-red-600">
          High Risk
        </Badge>
      );
  }
}

function getRiskIcon(risk: 'low' | 'medium' | 'high') {
  switch (risk) {
    case 'low':
      return <ShieldCheck className="w-5 h-5 text-green-600" />;
    case 'medium':
      return <Shield className="w-5 h-5 text-yellow-600" />;
    case 'high':
      return <ShieldAlert className="w-5 h-5 text-red-600" />;
  }
}

interface PermissionsListProps {
  permissions: string[] | Permission[];
  className?: string;
}

/**
 * List of permissions with descriptions
 */
export function PermissionsList({ permissions, className }: PermissionsListProps) {
  if (!permissions || permissions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <ShieldCheck className="w-12 h-12 mx-auto mb-3 text-green-600" />
        <p>This extension requires no special permissions.</p>
      </div>
    );
  }

  // Normalize permissions to array of objects
  const normalizedPermissions: Permission[] = permissions.map((p) => {
    if (typeof p === 'string') {
      const meta = getPermissionMeta(p);
      return {
        key: p,
        name: p.replace(/[_:]/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
        description: `Allows the extension to ${p.replace(':', ' ').replace('_', ' ')}`,
        risk_level: meta.risk,
      };
    }
    return p;
  });

  // Group by risk level
  const highRisk = normalizedPermissions.filter((p) => p.risk_level === 'high');
  const hasHighRisk = highRisk.length > 0;

  return (
    <div className={className}>
      {hasHighRisk && (
        <Alert variant="destructive" className="mb-4">
          <ShieldAlert className="w-4 h-4" />
          <AlertDescription>
            This extension requires {highRisk.length} high-risk permission{highRisk.length > 1 ? 's' : ''}.
            Please review carefully before installing.
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-3">
        {normalizedPermissions.map((permission) => {
          const meta = getPermissionMeta(permission.key);
          const Icon = meta.icon;
          const risk = permission.risk_level || meta.risk;

          return (
            <div
              key={permission.key}
              className="flex items-start gap-3 p-3 rounded-lg border bg-card"
            >
              <div className="shrink-0 mt-0.5">
                {getRiskIcon(risk)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                  <span className="font-medium">{permission.name}</span>
                  {getRiskBadge(risk)}
                </div>
                <p className="text-sm text-muted-foreground">
                  {permission.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface PermissionsReviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  extensionName: string;
  permissions: string[] | Permission[];
  onConfirm: () => void;
  isLoading?: boolean;
}

/**
 * Dialog for reviewing permissions before installation
 */
export function PermissionsReviewDialog({
  open,
  onOpenChange,
  extensionName,
  permissions,
  onConfirm,
  isLoading,
}: PermissionsReviewDialogProps) {
  const normalizedPermissions = permissions.map((p) => {
    if (typeof p === 'string') {
      const meta = getPermissionMeta(p);
      return { key: p, risk_level: meta.risk };
    }
    return p;
  });

  const hasHighRisk = normalizedPermissions.some((p) => p.risk_level === 'high');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Review Permissions
          </DialogTitle>
          <DialogDescription>
            <strong>{extensionName}</strong> requires the following permissions to function.
            Please review them before installing.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[400px] -mx-6 px-6">
          <PermissionsList permissions={permissions} />
        </ScrollArea>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isLoading}
            variant={hasHighRisk ? 'destructive' : 'default'}
          >
            {isLoading ? 'Installing...' : 'Install Extension'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
