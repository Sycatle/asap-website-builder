"use client"

import { 
  HardDrive, 
  ChevronRight,
  Upload,
  Image,
  Film,
  Music,
  FileText,
  File,
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
import type { CloudPreviewCardProps } from "./types";

/**
 * Cloud preview card showing recent files and storage usage
 */
export function CloudPreviewCard({ 
  websiteId, 
  storageUsed, 
  storageLimit, 
  storagePercentage 
}: CloudPreviewCardProps) {
  const { data: files = [], isLoading } = useFilesQuery();

  const isImage = (mimeType: string) => mimeType.startsWith('image/');
  const isVideo = (mimeType: string) => mimeType.startsWith('video/');
  const isAudio = (mimeType: string) => mimeType.startsWith('audio/');

  const getFileIcon = (mimeType: string, className = "h-5 w-5") => {
    if (isImage(mimeType)) return <Image className={`${className} text-violet-500`} />;
    if (isVideo(mimeType)) return <Film className={`${className} text-blue-500`} />;
    if (isAudio(mimeType)) return <Music className={`${className} text-green-500`} />;
    if (mimeType === 'application/pdf') return <FileText className={`${className} text-red-500`} />;
    return <File className={`${className} text-gray-500`} />;
  };

  // Get recent files (last 8)
  const recentFiles = files.slice(0, 8);

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-primary" />
            Cloud & Stockage
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
            Cloud & Stockage
            {files.length > 0 && (
              <Badge variant="secondary" className="text-[10px]">
                {files.length} fichier{files.length > 1 ? 's' : ''}
              </Badge>
            )}
          </CardTitle>
          <Link href={`/app/${websiteId}/cloud`}>
            <Button variant="ghost" size="sm" className="text-xs h-7">
              Gérer les fichiers
              <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </div>
        {/* Storage Progress Bar */}
        <div className="mt-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-muted-foreground">Espace utilisé</span>
            <span className="text-xs font-medium">{formatBytes(storageUsed)} / {formatBytes(storageLimit)}</span>
          </div>
          <Progress 
            value={storagePercentage} 
            className={`h-1.5 ${storagePercentage > 80 ? '[&>div]:bg-red-500' : storagePercentage > 60 ? '[&>div]:bg-amber-500' : ''}`}
          />
          {storagePercentage > 80 && (
            <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
              <AlertTriangle className="h-3 w-3" />
              Espace presque plein
            </p>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {recentFiles.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Upload className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p className="text-sm font-medium">Aucun fichier</p>
            <p className="text-xs mt-1">Uploadez vos premiers médias</p>
            <Link href={`/app/${websiteId}/cloud`}>
              <Button variant="outline" size="sm" className="mt-3">
                <Upload className="h-3.5 w-3.5 mr-1.5" />
                Ajouter des fichiers
              </Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">
              {recentFiles.map((file) => (
                <Link
                  key={file.id}
                  href={`/app/${websiteId}/cloud`}
                  className="group relative aspect-square rounded-lg border bg-muted overflow-hidden hover:ring-2 hover:ring-primary/50 transition-all"
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
                </Link>
              ))}
            </div>
            {files.length > 8 && (
              <p className="text-xs text-muted-foreground text-center mt-3">
                +{files.length - 8} autre{files.length - 8 > 1 ? 's' : ''} fichier{files.length - 8 > 1 ? 's' : ''}
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
