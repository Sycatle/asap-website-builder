"use client"

import { useState, useRef } from 'react';
import { filesAPI, type FileMetadata } from '../lib/api';
import { formatBytes } from '../lib/utils/formatters';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Upload, 
  Image, 
  FileText, 
  Film, 
  Music, 
  File,
  Trash2,
  Download,
  Copy,
  CheckCircle2,
  AlertCircle,
  Loader2,
  LayoutGrid,
  List,
  HardDrive,
  X,
  Eye
} from "lucide-react";
import { useFiles, useQuota } from '@/hooks/useCache';

type ViewMode = 'grid' | 'list';

export default function CloudManager() {
  // Cache hooks
  const { files, isLoading: filesLoading, refetch: refetchFiles, addFile, removeFile } = useFiles();
  const { quota, isLoading: quotaLoading, refetch: refetchQuota } = useQuota();
  
  // Local UI state
  const [isUploading, setIsUploading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [previewFile, setPreviewFile] = useState<FileMetadata | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000/api';
  const isLoading = filesLoading || quotaLoading;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    const uploadPromise = async () => {
      const uploadedFile = await filesAPI.upload(file);
      // Optimistic update: add to cache immediately
      addFile(uploadedFile);
      // Refetch quota (it changed after upload)
      await refetchQuota(true);
      return file.name;
    };

    toast.promise(uploadPromise(), {
      loading: `Upload de ${file.name}...`,
      success: (name) => `${name} uploadé avec succès !`,
      error: 'Erreur lors de l\'upload',
    });

    try {
      await uploadPromise();
    } catch (error) {
      console.error('Failed to upload file:', error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (fileId: string, filename: string) => {
    if (!confirm(`Supprimer ${filename} ?`)) return;

    const deletePromise = async () => {
      await filesAPI.delete(fileId);
      // Optimistic update: remove from cache immediately
      removeFile(fileId);
      setPreviewFile(null);
      // Refetch quota (it changed after delete)
      await refetchQuota(true);
    };

    toast.promise(deletePromise(), {
      loading: 'Suppression en cours...',
      success: 'Fichier supprimé',
      error: 'Erreur lors de la suppression',
    });

    try {
      await deletePromise();
    } catch (error) {
      console.error('Failed to delete file:', error);
      // Refetch files on error to sync state
      await refetchFiles(true);
    }
  };

  const getFileUrl = (fileId: string) => {
    const token = localStorage.getItem('auth_token');
    return `${API_URL}/files/${fileId}?token=${token}`;
  };

  const copyToClipboard = async (fileId: string) => {
    const url = getFileUrl(fileId);
    await navigator.clipboard.writeText(url);
    setCopiedId(fileId);
    toast.success('Lien copié !');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const isImage = (mimeType: string) => mimeType.startsWith('image/');
  const isVideo = (mimeType: string) => mimeType.startsWith('video/');
  const isAudio = (mimeType: string) => mimeType.startsWith('audio/');
  const isPdf = (mimeType: string) => mimeType === 'application/pdf';

  const getFileIcon = (mimeType: string, className = "h-5 w-5") => {
    if (isImage(mimeType)) return <Image className={`${className} text-violet-500`} />;
    if (isVideo(mimeType)) return <Film className={`${className} text-blue-500`} />;
    if (isAudio(mimeType)) return <Music className={`${className} text-green-500`} />;
    if (isPdf(mimeType)) return <FileText className={`${className} text-red-500`} />;
    return <File className={`${className} text-muted-foreground`} />;
  };

  const getFileTypeLabel = (mimeType: string) => {
    if (isImage(mimeType)) return 'Image';
    if (isVideo(mimeType)) return 'Vidéo';
    if (isAudio(mimeType)) return 'Audio';
    if (isPdf(mimeType)) return 'PDF';
    return 'Fichier';
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        {/* Header Skeleton */}
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-5 w-48" />
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center border rounded-lg p-1">
              <Skeleton className="h-8 w-8" />
              <Skeleton className="h-8 w-8" />
            </div>
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
        
        {/* Quota Card Skeleton */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="flex-1 space-y-2">
                <div className="flex justify-between">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* File Grid Skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="rounded-lg border overflow-hidden">
              <Skeleton className="aspect-square w-full" />
              <div className="p-2 space-y-1">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:gap-2 animate-fade-in-down">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Fichiers</h1>
            <p className="text-sm sm:text-base text-muted-foreground mt-1">
              Gérez vos fichiers et médias
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* View Toggle */}
            <div className="flex items-center border rounded-lg p-1">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="h-8 w-8 p-0 transition-all duration-200"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
                className="h-8 w-8 p-0 transition-all duration-200"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              onChange={handleUpload}
              className="hidden"
              id="file-upload"
            />
            <Button asChild disabled={isUploading} className="h-9 sm:h-10 group">
              <label htmlFor="file-upload" className="cursor-pointer">
                {isUploading ? (
                  <Loader2 className="h-4 w-4 mr-1.5 sm:mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-1.5 sm:mr-2 transition-transform group-hover:-translate-y-0.5" />
                )}
                <span className="text-sm">{isUploading ? 'Upload...' : 'Upload'}</span>
              </label>
            </Button>
          </div>
        </div>
      </div>

      {/* Quota Card */}
      {quota && (
        <Card className="animate-fade-in-up" style={{ animationDelay: '0.05s', animationFillMode: 'both' }}>
          <CardHeader className="pb-2 px-4 sm:px-6">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm sm:text-base flex items-center gap-2">
                <HardDrive className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                <span className="hidden xs:inline">Espace de stockage</span>
                <span className="xs:hidden">Stockage</span>
              </CardTitle>
              <span className="text-xs sm:text-sm text-muted-foreground">
                {formatBytes(quota.total_size_used)} / {formatBytes(quota.quota_limit)}
              </span>
            </div>
          </CardHeader>
          <CardContent className="px-4 sm:px-6">
            <Progress 
              value={quota.usage_percentage} 
              className={`h-1.5 sm:h-2 transition-all duration-500 ${quota.usage_percentage > 80 ? '[&>div]:bg-destructive' : ''}`}
            />
            <p className="mt-1.5 sm:mt-2 text-[10px] sm:text-xs text-muted-foreground">
              {quota.usage_percentage.toFixed(1)}% utilisé · {formatBytes(quota.remaining)} restant
            </p>
          </CardContent>
        </Card>
      )}

      {/* Files */}
      {files.length === 0 ? (
        <Card className="border-dashed animate-fade-in-up" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted animate-bounce-subtle">
              <Upload className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="mt-4 text-lg font-semibold">Aucun fichier</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Commencez par uploader votre premier fichier
            </p>
            <Button className="mt-4 group" asChild>
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="h-4 w-4 mr-2 transition-transform group-hover:-translate-y-0.5" />
                Upload un fichier
              </label>
            </Button>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        /* Grid View */
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-4">
          {files.map((file, index) => (
            <Card
              key={file.id}
              className="group cursor-pointer hover:shadow-lg transition-all duration-300 hover:border-primary/50 hover:-translate-y-1 overflow-hidden animate-fade-in-up"
              style={{ animationDelay: `${Math.min(index * 0.03, 0.3)}s`, animationFillMode: 'both' }}
              onClick={() => setPreviewFile(file)}
            >
              {/* Preview Thumbnail */}
              <div className="aspect-square bg-muted relative overflow-hidden">
                {isImage(file.mime_type) ? (
                  <img
                    src={getFileUrl(file.id)}
                    alt={file.filename}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                    {getFileIcon(file.mime_type, "h-8 w-8 sm:h-12 sm:w-12")}
                  </div>
                )}
                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center">
                  <Eye className="h-5 w-5 sm:h-6 sm:w-6 text-white transform scale-0 group-hover:scale-100 transition-transform duration-300" />
                </div>
              </div>
              {/* File Info */}
              <CardContent className="p-2 sm:p-3">
                <p className="text-xs sm:text-sm font-medium truncate">{file.filename}</p>
                <div className="flex items-center justify-between mt-1">
                  <Badge variant="outline" className="text-[10px] sm:text-xs px-1.5 sm:px-2 transition-colors group-hover:bg-primary/10">
                    {getFileTypeLabel(file.mime_type)}
                  </Badge>
                  <span className="text-[10px] sm:text-xs text-muted-foreground">
                    {formatBytes(file.size)}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        /* List View */
        <Card className="animate-fade-in">
          <CardContent className="p-0">
            <div className="divide-y">
              {files.map((file, index) => (
                <div
                  key={file.id}
                  className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 hover:bg-accent/50 cursor-pointer transition-all duration-200 animate-fade-in-up"
                  style={{ animationDelay: `${index * 0.02}s`, animationFillMode: 'both' }}
                  onClick={() => setPreviewFile(file)}
                >
                  <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-muted shrink-0 transition-transform duration-200 hover:scale-110">
                    {getFileIcon(file.mime_type, "h-4 w-4 sm:h-5 sm:w-5")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm sm:text-base font-medium truncate">{file.filename}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {formatBytes(file.size)} · {new Date(file.created_at).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 transition-all duration-200 hover:scale-110"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(file.id);
                      }}
                    >
                      {copiedId === file.id ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(file.id, file.filename);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview Dialog */}
      <Dialog open={!!previewFile} onOpenChange={() => setPreviewFile(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-3xl p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-sm sm:text-base">
              {previewFile && getFileIcon(previewFile.mime_type, "h-4 w-4 sm:h-5 sm:w-5")}
              <span className="truncate">{previewFile?.filename}</span>
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {previewFile && `${getFileTypeLabel(previewFile.mime_type)} · ${formatBytes(previewFile.size)}`}
            </DialogDescription>
          </DialogHeader>
          
          {/* Preview Content */}
          {previewFile && (
            <div className="mt-3 sm:mt-4">
              {isImage(previewFile.mime_type) && (
                <img
                  src={getFileUrl(previewFile.id)}
                  alt={previewFile.filename}
                  className="max-h-[50vh] sm:max-h-[60vh] mx-auto rounded-lg"
                />
              )}
              {isVideo(previewFile.mime_type) && (
                <video
                  src={getFileUrl(previewFile.id)}
                  controls
                  className="max-h-[50vh] sm:max-h-[60vh] w-full mx-auto rounded-lg"
                />
              )}
              {isAudio(previewFile.mime_type) && (
                <audio
                  src={getFileUrl(previewFile.id)}
                  controls
                  className="w-full"
                />
              )}
              {!isImage(previewFile.mime_type) && !isVideo(previewFile.mime_type) && !isAudio(previewFile.mime_type) && (
                <div className="flex flex-col items-center justify-center py-8 sm:py-12 bg-muted rounded-lg">
                  {getFileIcon(previewFile.mime_type, "h-12 w-12 sm:h-16 sm:w-16")}
                  <p className="mt-3 sm:mt-4 text-sm text-muted-foreground">Aperçu non disponible</p>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="flex-col gap-2 mt-4 sm:mt-0">
            <Button
              variant="outline"
              onClick={() => previewFile && copyToClipboard(previewFile.id)}
              className="w-full sm:w-auto h-9 text-sm"
            >
              {copiedId === previewFile?.id ? (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-1.5 text-green-600" />
                  Copié !
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-1.5" />
                  Copier l'URL
                </>
              )}
            </Button>
            <Button
              variant="outline"
              asChild
              className="w-full sm:w-auto h-9 text-sm"
            >
              <a href={previewFile ? getFileUrl(previewFile.id) : '#'} download>
                <Download className="h-4 w-4 mr-1.5" />
                Télécharger
              </a>
            </Button>
            <Button
              variant="destructive"
              onClick={() => previewFile && handleDelete(previewFile.id, previewFile.filename)}
              className="w-full sm:w-auto h-9 text-sm"
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
