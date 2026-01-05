"use client"

import React, { useState, useRef, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { FileMetadata, FileFolder, FileVisibility } from '@/lib/types';
import { formatBytes } from '@/lib/utils/formatters';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { 
  Upload, 
  LayoutGrid,
  List,
  Folder,
  ChevronRight,
  FolderPlus,
  Search,
  X,
  Home,
  HardDrive,
  ChevronLeft,
  Trash2,
  Pencil,
  FolderOpen,
} from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import { PageHeader } from "@/components/shared/page-header";
import { PageIcon } from "@/lib/navigation-config";
import { 
  useWebsiteFilesQuery, 
  useQuotaQuery, 
  useUploadFileMutation, 
  useDeleteFileMutation, 
  useDeleteFilesMutation,
  useFoldersQuery,
  useCreateFolderMutation,
  useUpdateFileMutation,
  useDeleteFolderMutation,
} from '@/lib/query';
import { useWebsiteContext } from '@/contexts/WebsiteContext';

import type { ViewMode, DeleteConfirmState } from "./types";
import { getFileUrl } from "@/components/shared/file-utils";
import { FileCard } from "./components/file-card";
import { FileListItem } from "./components/file-list-item";
import { FilePreviewDialog } from "./components/file-preview-dialog";
import { DeleteConfirmDialog, BulkDeleteDialog, FolderDeleteDialog } from "./components/delete-dialogs";
import { EmptyState } from "./components/empty-state";
import { FolderCard } from "./components/folder-card";

/**
 * CloudManager - Mobile-first file management with PageHeader
 */
export function CloudManager() {
  const { t } = useTranslation(['common', 'dashboard']);
  const { currentWebsiteId, currentWebsite } = useWebsiteContext();
  
  // State
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<FileFolder[]>([]);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [previewFile, setPreviewFile] = useState<FileMetadata | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [folderToDelete, setFolderToDelete] = useState<FileFolder | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Queries - use 'root' to filter files at root level when no folder is selected
  const { data: files = [], isLoading: filesLoading } = useWebsiteFilesQuery(
    currentWebsiteId,
    { folder_id: currentFolderId || 'root' }
  );
  // Get ALL files for folder previews (without folder filter)
  const { data: allFiles = [] } = useWebsiteFilesQuery(
    currentWebsiteId,
    {},
    { staleTime: 60000 } // Cache for 1 minute
  );
  // Get folders for current level - use 'root' for root-level folders (no parent)
  const { data: folders = [], isLoading: foldersLoading } = useFoldersQuery(
    { website_id: currentWebsiteId || undefined, parent_id: currentFolderId || 'root' }
  );
  // Get root folders for "Move to" menu (folders without parent)
  const { data: rootFolders = [] } = useFoldersQuery(
    { website_id: currentWebsiteId || undefined, parent_id: 'root' },
    { staleTime: 60000 }
  );
  const { data: quota } = useQuotaQuery();
  
  // Group files by folder for previews
  const filesByFolder = useMemo(() => {
    const grouped = new Map<string, typeof allFiles>();
    for (const file of allFiles) {
      if (file.folder_id) {
        const existing = grouped.get(file.folder_id) || [];
        if (existing.length < 4) { // Only need 4 for 2x2 preview
          existing.push(file);
          grouped.set(file.folder_id, existing);
        }
      }
    }
    return grouped;
  }, [allFiles]);
  
  // Mutations
  const uploadMutation = useUploadFileMutation();
  const deleteMutation = useDeleteFileMutation();
  const deletesMutation = useDeleteFilesMutation();
  const createFolderMutation = useCreateFolderMutation();
  const updateFileMutation = useUpdateFileMutation();
  const deleteFolderMutation = useDeleteFolderMutation();

  // Filtered files
  const filteredFiles = useMemo(() => {
    if (!search) return files;
    return files.filter(f => f.filename.toLowerCase().includes(search.toLowerCase()));
  }, [files, search]);

  // Navigation
  const navigateToFolder = useCallback((folderId: string | null) => {
    if (folderId === null) {
      setFolderPath([]);
      setCurrentFolderId(null);
    } else {
      const idx = folderPath.findIndex(f => f.id === folderId);
      if (idx !== -1) {
        setFolderPath(folderPath.slice(0, idx + 1));
      } else {
        const folder = folders.find(f => f.id === folderId);
        if (folder) setFolderPath([...folderPath, folder]);
      }
      setCurrentFolderId(folderId);
    }
  }, [folderPath, folders]);

  const goBack = useCallback(() => {
    if (folderPath.length > 1) {
      navigateToFolder(folderPath[folderPath.length - 2].id);
    } else {
      navigateToFolder(null);
    }
  }, [folderPath, navigateToFolder]);

  // Upload
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles?.length) return;

    setIsUploading(true);
    let success = 0, failed = 0;

    for (const file of Array.from(selectedFiles)) {
      try {
        await uploadMutation.mutateAsync({ 
          file,
          options: {
            website_id: currentWebsiteId || undefined,
            folder_id: currentFolderId || undefined,
            visibility: 'website',
          }
        });
        success++;
      } catch {
        failed++;
      }
    }

    if (success > 0) toast.success(t('dashboard:cloud.upload.successMultiple', { count: success }));
    if (failed > 0) toast.error(t('dashboard:cloud.upload.errorMultiple', { count: failed }));
    
    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Drag & Drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('Files')) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set dragging false if we're leaving the drop zone entirely
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const droppedFiles = e.dataTransfer.files;
    if (!droppedFiles?.length) return;

    setIsUploading(true);
    let success = 0, failed = 0;

    for (const file of Array.from(droppedFiles)) {
      try {
        await uploadMutation.mutateAsync({ 
          file,
          options: {
            website_id: currentWebsiteId || undefined,
            folder_id: currentFolderId || undefined,
            visibility: 'website',
          }
        });
        success++;
      } catch {
        failed++;
      }
    }

    if (success > 0) toast.success(t('dashboard:cloud.upload.successMultiple', { count: success }));
    if (failed > 0) toast.error(t('dashboard:cloud.upload.errorMultiple', { count: failed }));
    
    setIsUploading(false);
  }, [uploadMutation, currentWebsiteId, currentFolderId, t]);

  // Create folder
  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    try {
      await createFolderMutation.mutateAsync({
        name: newFolderName.trim(),
        parent_folder_id: currentFolderId || undefined,
        website_id: currentWebsiteId || undefined,
      });
      toast.success(t('dashboard:cloud.folders.createSuccess', { name: newFolderName }));
      setNewFolderName('');
      setIsCreateFolderOpen(false);
    } catch {
      toast.error(t('dashboard:cloud.folders.createError'));
    }
  };

  // Delete
  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    setIsDeleting(true);
    try {
      await deleteMutation.mutateAsync(deleteConfirm.file.id);
      setPreviewFile(null);
      toast.success(t('dashboard:cloud.delete.success'));
    } catch {
      toast.error(t('dashboard:cloud.delete.error'));
    } finally {
      setIsDeleting(false);
      setDeleteConfirm(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    setIsDeleting(true);
    try {
      await deletesMutation.mutateAsync(Array.from(selectedIds));
      toast.success(t('dashboard:cloud.delete.successMultiple', { count: selectedIds.size }));
      setSelectedIds(new Set());
    } catch {
      toast.error(t('dashboard:cloud.delete.error'));
    } finally {
      setIsDeleting(false);
      setBulkDeleteConfirm(false);
    }
  };

  // File operations
  const handleMoveToFolder = async (fileId: string, folderId: string | null) => {
    try {
      // Use 'root' as special value to move file to root (no folder)
      await updateFileMutation.mutateAsync({ 
        fileId, 
        data: { folder_id: folderId ?? 'root' } 
      });
      toast.success(t('dashboard:cloud.operations.moveSuccess'));
    } catch {
      toast.error(t('common:errors.generic'));
    }
  };

  // Move multiple files to folder (for drag and drop)
  const handleMoveFilesToFolder = async (fileIds: string[], folderId: string) => {
    let success = 0, failed = 0;
    for (const fileId of fileIds) {
      try {
        await updateFileMutation.mutateAsync({ fileId, data: { folder_id: folderId } });
        success++;
      } catch {
        failed++;
      }
    }
    if (success > 0) {
      toast.success(t('dashboard:cloud.operations.moveMultipleSuccess', { count: success }));
      setSelectedIds(new Set()); // Clear selection after move
    }
    if (failed > 0) toast.error(t('dashboard:cloud.operations.moveMultipleFailed', { count: failed }));
  };

  // Move folder to another folder (for drag and drop)
  const handleMoveFolderToFolder = async (sourceFolderId: string, targetFolderId: string) => {
    // TODO: Implement folder move API
    toast.info('Move folder coming soon');
  };

  // Delete folder
  const handleDeleteFolder = async (deleteContents: boolean) => {
    if (!folderToDelete) return;
    setIsDeleting(true);
    try {
      await deleteFolderMutation.mutateAsync({ 
        folderId: folderToDelete.id, 
        deleteContents 
      });
      toast.success(t('dashboard:cloud.folders.deleteSuccess', { name: folderToDelete.name }));
      setFolderToDelete(null);
    } catch {
      toast.error(t('dashboard:cloud.folders.deleteError'));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleChangeVisibility = async (fileId: string, visibility: FileVisibility) => {
    try {
      await updateFileMutation.mutateAsync({
        fileId,
        data: { visibility, website_id: visibility === 'website' ? currentWebsiteId : null }
      });
      toast.success(t('dashboard:cloud.operations.visibilitySuccess'));
    } catch {
      toast.error(t('common:errors.generic'));
    }
  };

  const handleRenameFile = async (fileId: string, newName: string) => {
    if (!newName.trim()) return;
    try {
      await updateFileMutation.mutateAsync({ fileId, data: { filename: newName.trim() } });
      toast.success(t('dashboard:cloud.operations.renameSuccess'));
    } catch {
      toast.error(t('common:errors.generic'));
    }
  };

  const copyToClipboard = async (fileId: string) => {
    await navigator.clipboard.writeText(getFileUrl(fileId));
    setCopiedId(fileId);
    toast.success(t('dashboard:cloud.copy.success'));
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleSelection = (file: FileMetadata) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(file.id)) newSet.delete(file.id);
    else newSet.add(file.id);
    setSelectedIds(newSet);
  };

  const isLoading = filesLoading || foldersLoading;
  const currentFolder = folderPath[folderPath.length - 1];
  const isInFolder = folderPath.length > 0;

  // Quota info for badge
  const quotaLabel = quota 
    ? `${formatBytes(quota.total_size_used)} / ${formatBytes(quota.quota_limit)}`
    : undefined;

  return (
    <div className="flex flex-col gap-6 sm:gap-8 animate-fade-in">
      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" multiple onChange={handleUpload} className="hidden" />

      {/* Page Header */}
      <PageHeader
        title={isInFolder ? currentFolder.name : t('dashboard:cloud.title')}
        subtitle={isInFolder ? undefined : t('dashboard:cloud.subtitle')}
        icon={isInFolder ? (
          <div className="flex items-center justify-center h-10 w-10 rounded-lg bg-primary/10">
            <Folder className="h-5 w-5 text-primary" />
          </div>
        ) : (
          <PageIcon page="cloud" />
        )}
        badge={quotaLabel ? {
          label: quotaLabel,
          variant: 'secondary',
          icon: <HardDrive className="h-3 w-3 mr-1" />,
        } : undefined}
        actions={[
          {
            label: t('dashboard:cloud.upload.button'),
            icon: isUploading ? <Spinner className="h-4 w-4" /> : <Upload className="h-4 w-4" />,
            onClick: () => fileInputRef.current?.click(),
            disabled: isUploading,
            priority: 'primary',
          },
        ]}
        stickyContent={
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              {isInFolder ? (
                <>
                  <Button variant="ghost" size="sm" onClick={goBack} className="h-8 w-8 p-0">
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium truncate">{currentFolder.name}</span>
                </>
              ) : (
                <>
                  <PageIcon page="cloud" size="md" />
                  <span className="text-sm font-medium hidden sm:block">{t('dashboard:cloud.title')}</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <div className="flex border rounded-md">
                <Button 
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
                  size="sm" 
                  onClick={() => setViewMode('grid')} 
                  className="h-8 w-8 p-0 rounded-r-none"
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button 
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
                  size="sm" 
                  onClick={() => setViewMode('list')} 
                  className="h-8 w-8 p-0 rounded-l-none"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
              <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="h-8">
                {isUploading ? <Spinner className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
                <span className="hidden sm:inline ml-1.5">{t('dashboard:cloud.upload.button')}</span>
              </Button>
            </div>
          </div>
        }
      />

      {/* Toolbar */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('dashboard:cloud.search.placeholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-9 pr-9 w-full"
          />
          {search && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0" 
              onClick={() => setSearch('')}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>

        {/* View toggle - visible on mobile too */}
        <div className="flex border rounded-md sm:hidden">
          <Button 
            variant={viewMode === 'grid' ? 'secondary' : 'ghost'} 
            size="sm" 
            onClick={() => setViewMode('grid')} 
            className="h-9 w-9 p-0 rounded-r-none"
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
          <Button 
            variant={viewMode === 'list' ? 'secondary' : 'ghost'} 
            size="sm" 
            onClick={() => setViewMode('list')} 
            className="h-9 w-9 p-0 rounded-l-none"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>

        {/* Create folder */}
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setIsCreateFolderOpen(true)} 
          className="h-9 shrink-0"
        >
          <FolderPlus className="h-4 w-4" />
          <span className="hidden sm:inline ml-1.5">{t('dashboard:cloud.folders.create')}</span>
        </Button>
      </div>

      {/* Breadcrumb - when in folder */}
      {isInFolder && (
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground -mt-4">
          <button 
            onClick={() => navigateToFolder(null)} 
            className="hover:text-foreground transition-colors flex items-center gap-1"
          >
            <Home className="h-4 w-4" />
            <span className="hidden sm:inline">{currentWebsite?.title || t('dashboard:cloud.folders.root')}</span>
          </button>
          {folderPath.map((folder, idx) => (
            <span key={folder.id} className="flex items-center gap-1">
              <ChevronRight className="h-4 w-4" />
              {idx === folderPath.length - 1 ? (
                <span className="text-foreground font-medium">{folder.name}</span>
              ) : (
                <button 
                  onClick={() => navigateToFolder(folder.id)} 
                  className="hover:text-foreground transition-colors"
                >
                  {folder.name}
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Content */}
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div 
            className={`flex-1 min-h-screen relative transition-colors ${isDragging ? 'bg-primary/5' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            {/* Drop overlay */}
            {isDragging && (
              <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm border-2 border-dashed border-primary rounded-lg pointer-events-none">
                <div className="text-center">
                  <Upload className="h-12 w-12 text-primary mx-auto mb-3" />
                  <p className="text-lg font-medium">{t('dashboard:cloud.upload.dropHere')}</p>
                  <p className="text-sm text-muted-foreground">{t('dashboard:cloud.upload.dropHint')}</p>
                </div>
              </div>
            )}
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Spinner className="h-6 w-6" />
              </div>
            ) : folders.length === 0 && filteredFiles.length === 0 ? (
              <EmptyState onUploadClick={() => fileInputRef.current?.click()} />
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {/* Folders */}
                {folders.map((folder, idx) => (
                  <FolderCard
                    key={folder.id}
                    folder={folder}
                    index={idx}
                    isFocused={false}
                    onOpen={() => navigateToFolder(folder.id)}
                    onRename={() => {
                      const newName = prompt(t('common:prompts.enterNewName'), folder.name);
                      if (newName && newName.trim() !== folder.name) {
                        toast.info('Rename folder coming soon');
                      }
                    }}
                    onDelete={() => setFolderToDelete(folder)}
                    previewFiles={filesByFolder.get(folder.id) || []}
                    getFileUrl={getFileUrl}
                    onDropFiles={handleMoveFilesToFolder}
                    onDropFolder={handleMoveFolderToFolder}
                  />
                ))}
                {/* Files */}
                {filteredFiles.map((file, idx) => (
                  <FileCard
                    key={file.id}
                    file={file}
                    index={idx}
                    isSelected={selectedIds.has(file.id)}
                    isFocused={false}
                    onPreview={() => setPreviewFile(file)}
                    onDelete={() => setDeleteConfirm({ file })}
                    onCopyLink={() => copyToClipboard(file.id)}
                    onToggleSelection={() => toggleSelection(file)}
                    folders={rootFolders}
                    websiteTitle={currentWebsite?.title}
                    getItemProps={() => ({ 
                      tabIndex: 0, 
                      'data-focused': false, 
                      'data-selected': selectedIds.has(file.id), 
                      onFocus: () => {}, 
                      onClick: () => {}, 
                      onKeyDown: () => {} 
                    })}
                    getFileUrl={getFileUrl}
                    copiedId={copiedId}
                    onMoveToFolder={(fid) => handleMoveToFolder(file.id, fid)}
                    onChangeVisibility={(v) => handleChangeVisibility(file.id, v)}
                    onRename={(n) => handleRenameFile(file.id, n)}
                    selectedIds={selectedIds}
                  />
                ))}
              </div>
            ) : (
              /* List view */
              <Card>
                <CardContent className="p-0 divide-y">
                  {/* Folders */}
                  {folders.map((folder) => (
                    <ContextMenu key={folder.id}>
                      <ContextMenuTrigger asChild>
                        <div 
                          className="flex items-center gap-3 px-4 py-3 hover:bg-accent/50 cursor-pointer" 
                          onClick={() => navigateToFolder(folder.id)}
                        >
                          <Folder className="h-5 w-5 text-primary shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate text-sm">{folder.name}</p>
                          </div>
                          <span className="text-xs text-muted-foreground hidden sm:block">
                            {folder.file_count} {t('dashboard:cloud.folders.files')}
                          </span>
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        </div>
                      </ContextMenuTrigger>
                      <ContextMenuContent className="w-48">
                        <ContextMenuItem onClick={() => navigateToFolder(folder.id)}>
                          <FolderOpen className="mr-2 h-4 w-4" />
                          {t('dashboard:cloud.contextMenu.open')}
                        </ContextMenuItem>
                        <ContextMenuItem 
                          onClick={() => {
                            const newName = prompt(t('common:prompts.enterNewName'), folder.name);
                            if (newName && newName.trim() !== folder.name) {
                              // TODO: implement folder rename
                              toast.info('Rename folder coming soon');
                            }
                          }}
                        >
                          <Pencil className="mr-2 h-4 w-4" />
                          {t('common:actions.rename')}
                        </ContextMenuItem>
                        <ContextMenuSeparator />
                        <ContextMenuItem 
                          className="text-destructive focus:text-destructive"
                          onClick={() => {
                            // TODO: implement folder delete
                            toast.info('Delete folder coming soon');
                          }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t('common:actions.delete')}
                        </ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
                  ))}
                  {/* Files */}
                  {filteredFiles.map((file, idx) => (
                    <FileListItem
                      key={file.id}
                      file={file}
                      index={idx}
                      isSelected={selectedIds.has(file.id)}
                      isFocused={false}
                      onPreview={() => setPreviewFile(file)}
                      onDelete={() => setDeleteConfirm({ file })}
                      onCopyLink={() => copyToClipboard(file.id)}
                      onToggleSelection={() => toggleSelection(file)}
                      folders={rootFolders}
                      websiteTitle={currentWebsite?.title}
                      getItemProps={() => ({ 
                        tabIndex: 0, 
                        'data-focused': false, 
                        'data-selected': selectedIds.has(file.id), 
                        onFocus: () => {}, 
                        onClick: () => {}, 
                        onKeyDown: () => {} 
                      })}
                      getFileUrl={getFileUrl}
                      copiedId={copiedId}
                      onMoveToFolder={(fid) => handleMoveToFolder(file.id, fid)}
                      onChangeVisibility={(v) => handleChangeVisibility(file.id, v)}
                      onRename={(n) => handleRenameFile(file.id, n)}
                    />
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={() => fileInputRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" />
            {t('dashboard:cloud.upload.button')}
          </ContextMenuItem>
          <ContextMenuItem onClick={() => setIsCreateFolderOpen(true)}>
            <FolderPlus className="mr-2 h-4 w-4" />
            {t('dashboard:cloud.folders.create')}
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {/* Selection bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-1/2 sm:-translate-x-1/2 sm:right-auto sm:w-auto bg-background border rounded-lg shadow-lg px-4 py-3 flex items-center gap-3 z-50">
          <span className="text-sm font-medium">{selectedIds.size} {t('common:selected')}</span>
          <div className="flex-1" />
          <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set())}>
            {t('common:actions.cancel')}
          </Button>
          <Button variant="destructive" size="sm" onClick={() => setBulkDeleteConfirm(true)}>
            {t('common:actions.delete')}
          </Button>
        </div>
      )}

      {/* Dialogs */}
      <Dialog open={isCreateFolderOpen} onOpenChange={setIsCreateFolderOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('dashboard:cloud.folders.createTitle')}</DialogTitle>
          </DialogHeader>
          <Input
            placeholder={t('dashboard:cloud.folders.namePlaceholder')}
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
            autoFocus
          />
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" onClick={() => setIsCreateFolderOpen(false)} className="w-full sm:w-auto">
              {t('common:actions.cancel')}
            </Button>
            <Button onClick={handleCreateFolder} disabled={!newFolderName.trim() || createFolderMutation.isPending} className="w-full sm:w-auto">
              {t('common:actions.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <FilePreviewDialog
        file={previewFile}
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
        onDelete={() => { setPreviewFile(null); if (previewFile) setDeleteConfirm({ file: previewFile }); }}
        onCopyLink={() => previewFile && copyToClipboard(previewFile.id)}
        getFileUrl={getFileUrl}
        copiedId={copiedId}
      />

      <DeleteConfirmDialog
        deleteConfirm={deleteConfirm}
        isDeleting={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm(null)}
      />

      <BulkDeleteDialog
        isOpen={bulkDeleteConfirm}
        selectedCount={selectedIds.size}
        isDeleting={isDeleting}
        onConfirm={handleBulkDelete}
        onCancel={() => setBulkDeleteConfirm(false)}
      />

      <FolderDeleteDialog
        folder={folderToDelete}
        isDeleting={isDeleting}
        onConfirm={handleDeleteFolder}
        onCancel={() => setFolderToDelete(null)}
      />
    </div>
  );
}

export default CloudManager;
