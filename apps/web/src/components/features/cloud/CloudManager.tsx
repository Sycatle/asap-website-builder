"use client"

import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { filesAPI, type FileMetadata } from '@/lib/api';
import { formatBytes, formatDate } from '@/lib/utils/formatters';
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
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
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
  AlertTriangle,
  Loader2,
  LayoutGrid,
  List,
  HardDrive,
  X,
  Eye,
  ExternalLink,
  Link2
} from "lucide-react";
import { useFilesQuery, useQuotaQuery, useUploadFileMutation, useDeleteFileMutation, useDeleteFilesMutation } from '@/lib/query';
import { useGridNavigation, KeyboardHint } from '@/hooks/useGridNavigation';
import { loggers } from '@/lib/logger';

const filesLogger = loggers.files;

type ViewMode = 'grid' | 'list';

export default function CloudManager() {
  // React Query hooks
  const { data: files = [], isLoading: filesLoading, refetch: refetchFiles } = useFilesQuery();
  const { data: quota = null, isLoading: quotaLoading, refetch: refetchQuota } = useQuotaQuery();
  const uploadFileMutation = useUploadFileMutation();
  const deleteFileMutation = useDeleteFileMutation();
  const deleteFilesMutation = useDeleteFilesMutation();
  
  // Note: Real-time sync is handled globally in app-shell via useSyncWebSocket
  // which auto-updates React Query cache for file events
  
  // Local UI state
  const [isUploading, setIsUploading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [previewFile, setPreviewFile] = useState<FileMetadata | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ file: FileMetadata } | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);

  // Detect number of columns based on container width
  const [columns, setColumns] = useState(2);
  
  useEffect(() => {
    const updateColumns = () => {
      if (typeof window === 'undefined') return;
      const width = window.innerWidth;
      if (width >= 1280) setColumns(5);      // xl
      else if (width >= 1024) setColumns(4); // lg
      else if (width >= 640) setColumns(3);  // sm
      else setColumns(2);                    // mobile
    };
    
    updateColumns();
    window.addEventListener('resize', updateColumns);
    return () => window.removeEventListener('resize', updateColumns);
  }, []);

  // Memoized callbacks for keyboard navigation
  const getFileId = useCallback((file: FileMetadata) => file.id, []);
  const handleOpenFile = useCallback((file: FileMetadata) => setPreviewFile(file), []);

  // Keyboard navigation
  const {
    focusedIndex,
    selectedIds,
    isSelected,
    isFocused,
    selectAll,
    clearSelection,
    toggleSelection,
    getItemProps,
    containerRef,
  } = useGridNavigation({
    items: files,
    getItemId: getFileId,
    columns: viewMode === 'grid' ? columns : 1,
    onOpen: handleOpenFile,
    enabled: files.length > 0,
  });

  const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000/api';
  const isLoading = filesLoading || quotaLoading;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);

    const uploadPromise = async () => {
      await uploadFileMutation.mutateAsync(file);
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
      filesLogger.error('Failed to upload file:', error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (file: FileMetadata) => {
    setDeleteConfirm({ file });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    
    const { file } = deleteConfirm;
    setIsDeleting(true);

    try {
      await deleteFileMutation.mutateAsync(file.id);
      setPreviewFile(null);
      toast.success('Fichier supprimé');
    } catch (error) {
      filesLogger.error('Failed to delete file:', error);
      toast.error('Erreur lors de la suppression');
    } finally {
      setIsDeleting(false);
      setDeleteConfirm(null);
    }
  };

  const handleBulkDelete = async () => {
    const selectedFileIds = files.filter(f => selectedIds.has(f.id)).map(f => f.id);
    if (selectedFileIds.length === 0) return;
    
    setIsDeleting(true);
    
    try {
      await deleteFilesMutation.mutateAsync(selectedFileIds);
      toast.success(`${selectedFileIds.length} fichier${selectedFileIds.length > 1 ? 's' : ''} supprimé${selectedFileIds.length > 1 ? 's' : ''}`);
      clearSelection();
    } catch (error) {
      filesLogger.error('Failed to delete files:', error);
      toast.error('Erreur lors de la suppression');
    } finally {
      setIsDeleting(false);
      setBulkDeleteConfirm(false);
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
              value={quota.usage_percentage ?? 0} 
              className={`h-1.5 sm:h-2 transition-all duration-500 ${(quota.usage_percentage ?? 0) > 80 ? '[&>div]:bg-destructive' : ''}`}
            />
            <p className="mt-1.5 sm:mt-2 text-[10px] sm:text-xs text-muted-foreground">
              {(quota.usage_percentage ?? 0).toFixed(1)}% utilisé · {formatBytes(quota.remaining)} restant
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
        <div 
          ref={containerRef as React.RefObject<HTMLDivElement>}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-4"
          role="grid"
          aria-label="Fichiers"
        >
          {files.map((file, index) => {
            const itemProps = getItemProps(file, index);
            return (
              <ContextMenu key={file.id}>
                <ContextMenuTrigger asChild>
                  <Card
                    tabIndex={itemProps.tabIndex}
                    data-focused={itemProps['data-focused']}
                    data-selected={itemProps['data-selected']}
                    className={`group cursor-pointer hover:shadow-lg transition-all duration-300 hover:border-primary/50 hover:-translate-y-1 overflow-hidden animate-fade-in-up outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                      isSelected(file) ? 'ring-2 ring-primary border-primary bg-primary/5 scale-[0.98]' : ''
                    } ${isFocused(index) ? 'ring-2 ring-ring' : ''}`}
                    style={{ animationDelay: `${Math.min(index * 0.03, 0.3)}s`, animationFillMode: 'both' }}
                    onFocus={itemProps.onFocus}
                    onClick={(e) => {
                      // Only handle selection on Ctrl/Cmd+click or Shift+click
                      if (e.ctrlKey || e.metaKey || e.shiftKey) {
                        itemProps.onClick(e);
                      } else {
                        // Normal click just opens preview
                        setPreviewFile(file);
                      }
                    }}
                    onKeyDown={itemProps.onKeyDown}
                    role="gridcell"
                  >
                    {/* Selection checkbox - visible on hover or when selected */}
                    <div 
                      className={`absolute top-2 left-2 z-10 transition-all duration-200 ${
                        isSelected(file) ? 'opacity-100 scale-100' : 'opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100'
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelection(file);
                      }}
                    >
                      <div className={`h-5 w-5 rounded-md border-2 flex items-center justify-center cursor-pointer transition-all duration-200 ${
                        isSelected(file) 
                          ? 'bg-primary border-primary' 
                          : 'bg-background/80 backdrop-blur-sm border-muted-foreground/30 hover:border-primary/50 hover:bg-background'
                      }`}>
                        {isSelected(file) && (
                          <CheckCircle2 className="h-3.5 w-3.5 text-primary-foreground" />
                        )}
                      </div>
                    </div>
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
                          {formatBytes(file.original_size)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </ContextMenuTrigger>
                <ContextMenuContent className="w-52">
                  <ContextMenuItem onClick={() => setPreviewFile(file)}>
                    <Eye className="mr-2 h-4 w-4" />
                    Aperçu
                    <ContextMenuShortcut>Entrée</ContextMenuShortcut>
                  </ContextMenuItem>
                  <ContextMenuItem onClick={() => copyToClipboard(file.id)}>
                    <Link2 className="mr-2 h-4 w-4" />
                    Copier le lien
                    <ContextMenuShortcut>⌘C</ContextMenuShortcut>
                  </ContextMenuItem>
                  <ContextMenuItem asChild>
                    <a href={getFileUrl(file.id)} download className="flex items-center">
                      <Download className="mr-2 h-4 w-4" />
                      Télécharger
                    </a>
                  </ContextMenuItem>
                  <ContextMenuItem asChild>
                    <a href={getFileUrl(file.id)} target="_blank" rel="noopener noreferrer" className="flex items-center">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Ouvrir dans un nouvel onglet
                    </a>
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem 
                    className="text-destructive focus:text-destructive"
                    onClick={() => handleDelete(file)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Supprimer
                    <ContextMenuShortcut>⌫</ContextMenuShortcut>
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            );
          })}
        </div>
      ) : (
        /* List View */
        <Card className="animate-fade-in">
          <CardContent className="p-0">
            <div 
              ref={containerRef as React.RefObject<HTMLDivElement>}
              className="divide-y"
              role="list"
              aria-label="Fichiers"
            >
              {files.map((file, index) => {
                const itemProps = getItemProps(file, index);
                return (
                  <ContextMenu key={file.id}>
                    <ContextMenuTrigger asChild>
                      <div
                        tabIndex={itemProps.tabIndex}
                        data-focused={itemProps['data-focused']}
                        data-selected={itemProps['data-selected']}
                        className={`group flex items-center gap-3 sm:gap-4 p-3 sm:p-4 hover:bg-accent/50 cursor-pointer transition-all duration-200 animate-fade-in-up outline-none focus-visible:bg-accent ${
                          isSelected(file) ? 'bg-primary/10 border-l-2 border-l-primary' : ''
                        } ${isFocused(index) ? 'bg-accent' : ''}`}
                        style={{ animationDelay: `${index * 0.02}s`, animationFillMode: 'both' }}
                        onFocus={itemProps.onFocus}
                        onClick={(e) => {
                          // Only handle selection on Ctrl/Cmd+click or Shift+click
                          if (e.ctrlKey || e.metaKey || e.shiftKey) {
                            itemProps.onClick(e);
                          } else {
                            // Normal click just opens preview
                            setPreviewFile(file);
                          }
                        }}
                        onKeyDown={itemProps.onKeyDown}
                        role="listitem"
                      >
                        {/* Selection checkbox - visible on hover or when selected */}
                        <div 
                          className={`shrink-0 transition-all duration-200 ${
                            isSelected(file) ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelection(file);
                          }}
                        >
                          <div className={`h-5 w-5 rounded-md border-2 flex items-center justify-center cursor-pointer transition-all duration-200 ${
                            isSelected(file) 
                              ? 'bg-primary border-primary' 
                              : 'bg-background border-muted-foreground/30 hover:border-primary/50'
                          }`}>
                            {isSelected(file) && (
                              <CheckCircle2 className="h-3.5 w-3.5 text-primary-foreground" />
                            )}
                          </div>
                        </div>
                        <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-muted shrink-0 transition-transform duration-200 hover:scale-110">
                          {getFileIcon(file.mime_type, "h-4 w-4 sm:h-5 sm:w-5")}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm sm:text-base font-medium truncate">{file.filename}</p>
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            {formatBytes(file.original_size)} · {formatDate(file.created_at)}
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
                              handleDelete(file);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    </ContextMenuTrigger>
                    <ContextMenuContent className="w-52">
                      <ContextMenuItem onClick={() => setPreviewFile(file)}>
                        <Eye className="mr-2 h-4 w-4" />
                        Aperçu
                        <ContextMenuShortcut>Entrée</ContextMenuShortcut>
                      </ContextMenuItem>
                      <ContextMenuItem onClick={() => copyToClipboard(file.id)}>
                        <Link2 className="mr-2 h-4 w-4" />
                        Copier le lien
                        <ContextMenuShortcut>⌘C</ContextMenuShortcut>
                      </ContextMenuItem>
                      <ContextMenuItem asChild>
                        <a href={getFileUrl(file.id)} download className="flex items-center">
                          <Download className="mr-2 h-4 w-4" />
                          Télécharger
                        </a>
                      </ContextMenuItem>
                      <ContextMenuItem asChild>
                        <a href={getFileUrl(file.id)} target="_blank" rel="noopener noreferrer" className="flex items-center">
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Ouvrir dans un nouvel onglet
                        </a>
                      </ContextMenuItem>
                      <ContextMenuSeparator />
                      <ContextMenuItem 
                        className="text-destructive focus:text-destructive"
                        onClick={() => handleDelete(file)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Supprimer
                        <ContextMenuShortcut>⌫</ContextMenuShortcut>
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selection Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up">
          <Card className="shadow-2xl border-primary bg-background/95 backdrop-blur-sm">
            <CardContent className="flex items-center gap-2 sm:gap-4 p-2 sm:p-3">
              {/* Selection count */}
              <div className="flex items-center gap-2 px-2 sm:px-3 py-1 bg-primary/10 rounded-lg">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <span className="text-xs sm:text-sm font-medium">
                  {selectedIds.size} <span className="hidden sm:inline">fichier{selectedIds.size > 1 ? 's' : ''}</span>
                </span>
              </div>
              
              <div className="h-6 w-px bg-border hidden sm:block" />
              
              {/* Actions */}
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 sm:px-3 text-xs gap-1"
                  onClick={() => selectAll()}
                  title="Tout sélectionner"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Tout</span>
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 sm:px-3 text-xs gap-1"
                  onClick={() => {
                    const selectedFiles = files.filter(f => selectedIds.has(f.id));
                    selectedFiles.forEach(file => {
                      const link = document.createElement('a');
                      link.href = getFileUrl(file.id);
                      link.download = file.filename;
                      link.click();
                    });
                    toast.success(`${selectedFiles.length} téléchargement${selectedFiles.length > 1 ? 's' : ''} lancé${selectedFiles.length > 1 ? 's' : ''}`);
                  }}
                  title="Télécharger la sélection"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Télécharger</span>
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 px-2 sm:px-3 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 gap-1"
                  onClick={() => setBulkDeleteConfirm(true)}
                  title="Supprimer la sélection"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Supprimer</span>
                </Button>
              </div>
              
              <div className="h-6 w-px bg-border" />
              
              {/* Close */}
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => clearSelection()}
                title="Annuler la sélection"
              >
                <X className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Keyboard Hint */}
      {files.length > 0 && selectedIds.size === 0 && (
        <KeyboardHint className="text-center mt-4" />
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
              {previewFile && `${getFileTypeLabel(previewFile.mime_type)} · ${formatBytes(previewFile.original_size)}`}
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
              onClick={() => {
                if (previewFile) {
                  setPreviewFile(null);
                  handleDelete(previewFile);
                }
              }}
              className="w-full sm:w-auto h-9 text-sm"
            >
              <Trash2 className="h-4 w-4 mr-1.5" />
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Confirmer la suppression
            </DialogTitle>
            <DialogDescription className="pt-2">
              Êtes-vous sûr de vouloir supprimer <span className="font-medium text-foreground">{deleteConfirm?.file.filename}</span> ?
              <br />
              <span className="text-muted-foreground">Cette action est irréversible.</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirm(null)}
              disabled={isDeleting}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Suppression...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={bulkDeleteConfirm} onOpenChange={setBulkDeleteConfirm}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Confirmer la suppression
            </DialogTitle>
            <DialogDescription className="pt-2">
              Êtes-vous sûr de vouloir supprimer <span className="font-medium text-foreground">{selectedIds.size} fichier{selectedIds.size > 1 ? 's' : ''}</span> ?
              <br />
              <span className="text-muted-foreground">Cette action est irréversible.</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setBulkDeleteConfirm(false)}
              disabled={isDeleting}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Suppression...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer {selectedIds.size} fichier{selectedIds.size > 1 ? 's' : ''}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
