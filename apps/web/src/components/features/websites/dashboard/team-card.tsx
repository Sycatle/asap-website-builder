"use client"

import { useTranslation } from 'react-i18next';
import { 
  Users, 
  ChevronRight, 
  Crown 
} from "lucide-react";
import { Link } from "@/components/app-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAdministratorsQuery } from "@/lib/query";
import { getAvatarUrl, getInitials } from "./utils";
import type { TeamCardProps } from "./types";

const roleColors: Record<string, string> = {
  owner: 'bg-amber-500',
  admin: 'bg-blue-500',
  editor: 'bg-green-500',
  viewer: 'bg-muted0',
};

/**
 * Team card showing active administrators
 */
export function TeamCard({ websiteId }: TeamCardProps) {
  const { t } = useTranslation(['common', 'dashboard']);
  const { data: administrators = [], isLoading } = useAdministratorsQuery(websiteId);

  const roleLabels: Record<string, string> = {
    owner: t('dashboard:dashboard.roles.owner'),
    admin: t('dashboard:dashboard.roles.admin'),
    editor: t('dashboard:dashboard.roles.editor'),
    viewer: t('dashboard:dashboard.roles.viewer'),
  };

  if (isLoading) {
    return (
      <Card className="lg:col-span-5 shadow-sm hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            {t('dashboard:dashboard.team.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-24 mb-1" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-5 w-16" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Filter only active administrators
  const activeAdmins = administrators.filter(a => a.status === 'active');

  return (
    <Card className="lg:col-span-5 shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            {t('dashboard:dashboard.team.title')}
            {activeAdmins.length > 0 && (
              <Badge variant="secondary" className="text-[10px]">
                {activeAdmins.length}
              </Badge>
            )}
          </CardTitle>
          <Link href={`/${websiteId}/administrators`}>
            <Button variant="ghost" size="sm" className="text-xs h-7">
              {t('dashboard:dashboard.team.manage')}
              <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {activeAdmins.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{t('dashboard:dashboard.team.noCollaborators')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {activeAdmins.slice(0, 4).map((admin) => (
              <div key={admin.id} className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={getAvatarUrl(admin.avatar)} alt={admin.name || admin.email} />
                  <AvatarFallback className={`${roleColors[admin.role] || 'bg-primary'} text-white text-xs`}>
                    {getInitials(admin.name, admin.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate flex items-center gap-1.5">
                    {admin.name || admin.email.split('@')[0]}
                    {admin.role === 'owner' && <Crown className="h-3 w-3 text-yellow-500" />}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">{admin.email}</p>
                </div>
                <Badge variant="outline" className="text-[10px] shrink-0">
                  {roleLabels[admin.role] || admin.role}
                </Badge>
              </div>
            ))}
            {activeAdmins.length > 4 && (
              <p className="text-xs text-muted-foreground text-center">
                {t('dashboard:dashboard.team.otherMembers', { count: activeAdmins.length - 4 })}{activeAdmins.length - 4 > 1 ? 's' : ''}
              </p>
            )}
          </div>
        )}
        <Link 
          href={`/${websiteId}/administrators`}
          className="mt-4 flex items-center justify-center gap-2 p-2 rounded-lg border border-dashed hover:bg-accent transition-colors"
        >
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{t('dashboard:dashboard.team.inviteCollaborator')}</span>
        </Link>
      </CardContent>
    </Card>
  );
}
