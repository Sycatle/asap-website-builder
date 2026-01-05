"use client"

import { useState } from "react";
import { useTranslation } from 'react-i18next';
import { 
  HardDrive, 
  ChevronRight,
  Upload,
  AlertTriangle,
  Eye,
} from "lucide-react";
import { Link } from "@/components/app-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useFilesQuery } from "@/lib/query";
import { formatBytes } from "@/lib/utils/formatters";
import { getAuthenticatedFileUrl } from "./utils";
import { isImage, getFileIcon } from "@/components/shared/file-utils";
import { FilePreviewDialog } from "@/components/shared/file-preview-dialog";
import type { CloudPreviewCardProps } from "./types";
import type { FileMetadata } from "@/lib/types";

/**
 * Cloud preview card showing recent files and storage usage
 * Features file preview on click instead of navigation
 */
export function CloudPreviewCard({ 
  websiteId, 
  storageUsed, 
  storageLimit, 
  storagePercentage 
}: CloudPreviewCardProps) {
  const { t } = useTranslation(['common', 'dashboard']);
  const { data: files = [], isLoading } = useFilesQuery();
  const [previewFile, setPreviewFile] = useState<FileMetadata | null>(null);

  // Get recent files (last 8)
  const recentFiles = files.slice(0, 8);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-primary" />
            {t('dashboard:dashboard.cloud.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-2 w-full" />
          <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-primary" />
            {t('dashboard:dashboard.cloud.title')}
            {files.length > 0 && (
              <Badge variant="secondary" className="text-[10px]">
                {files.length} {t('dashboard:dashboard.cloud.files', { count: files.length }).split(' ')[1]}{files.length > 1 ? 's' : ''}
              </Badge>
            )}
          </CardTitle>
          <Link href={`/${websiteId}/cloud`}>
            <Button variant="ghost" size="sm" className="text-xs h-7">
              {t('dashboard:dashboard.cloud.manageFiles')}
              <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </div>
        {/* Storage Progress Bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-muted-foreground">{t('dashboard:dashboard.cloud.spaceUsed')}</span>
            <span className="text-xs font-medium">{formatBytes(storageUsed)} / {formatBytes(storageLimit)}</span>
          </div>
          <Progress 
            value={storagePercentage} 
            className={`h-1.5 ${storagePercentage > 80 ? '[&>div]:bg-red-500' : storagePercentage > 60 ? '[&>div]:bg-amber-500' : ''}`}
          />
          {storagePercentage > 80 && (
            <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
              <AlertTriangle className="h-3 w-3" />
              {t('dashboard:dashboard.cloud.spaceAlmostFull')}
            </p>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {recentFiles.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Upload className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm font-medium">{t('dashboard:dashboard.cloud.noFiles')}</p>
            <p className="text-xs mt-1">{t('dashboard:dashboard.cloud.uploadFirst')}</p>
            <Link href={`/${websiteId}/cloud`}>
              <Button variant="outline" size="sm" className="mt-3">
                <Upload className="h-3.5 w-3.5 mr-1.5" />
                {t('dashboard:dashboard.cloud.addFiles')}
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">
              {recentFiles.map((file) => (
                <button
                  key={file.id}
                  onClick={() => setPreviewFile(file)}
                  className="group relative aspect-square rounded-lg border bg-muted overflow-hidden hover:ring-2 hover:ring-primary/50 transition-all cursor-pointer"
                >
                  {isImage(file.mime_type) ? (
                    <img
                      src={getAuthenticatedFileUrl(file.id)}
                      alt={file.filename}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {getFileIcon(file.mime_type, "h-6 w-6")}
                    </div>
                  )}
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Eye className="h-4 w-4 text-white" />
                  </div>
                </button>
              ))}
            </div>
            {files.length > 8 && (
              <p className="text-xs text-muted-foreground text-center mt-3">
                {t('dashboard:dashboard.cloud.otherFiles', { count: files.length - 8 })}{files.length - 8 > 1 ? 's' : ''}
              </p>
            )}
          </>
        )}
      </CardContent>

      {/* File Preview Dialog */}
      <FilePreviewDialog
        file={previewFile}
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
        customGetFileUrl={getAuthenticatedFileUrl}
      />
    </Card>
  );
}
