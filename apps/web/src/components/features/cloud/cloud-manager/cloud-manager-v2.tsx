"use client"

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { FileMetadata, FileFolder, FileVisibility } from '@/lib/types';
import { formatBytes } from '@/lib/utils/formatters';
import { PageHeader } from '@/components/shared/page-header';
import { PageIcon } from '@/lib/navigation-config';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  Upload, 
  LayoutGrid,
  List,
  Globe,
  Folder,
  ChevronRight,
  FolderPlus,
} from "lucide-react";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { 
  useWebsiteFilesQuery, 
  useQuotaQuery, 
  useUploadFileMutation, 
  useDeleteFileMutation, 
  useDeleteFilesMutation,
  useFoldersQuery,
  useCreateFolderMutation,
  useUpdateFileMutation,
} from '@/lib/query';
import { useWebsiteContext } from '@/contexts/WebsiteContext';
import { useGridNavigation, KeyboardHint } from '@/hooks/useGridNavigation';
import { loggers } from '@/lib/logger';

import type { ViewMode, DeleteConfirmState } from "./types";
import { getFileUrl } from "@/components/shared/file-utils";
import { CloudManagerSkeleton } from "./components/cloud-manager-skeleton";
import { QuotaCard } from "./components/quota-card";
import { FileCard } from "./components/file-card";
import { FileListItem } from "./components/file-list-item";
import { FilePreviewDialog } from "./components/file-preview-dialog";
import { DeleteConfirmDialog, BulkDeleteDialog } from "./components/delete-dialogs";
import { SelectionBar } from "./components/selection-bar";
import { EmptyState } from "./components/empty-state";
import { FolderNavigation } from "./components/folder-navigation";
import { FolderCard } from "./components/folder-card";
import { FileFilters } from "./components/file-filters";

const filesLogger = loggers.files;

/**
 * CloudManager - File management dashboard
 * 
 * Features:
 * - Website-scoped file browsing
 * - Folder navigation with breadcrumbs
 * - File upload with folder/visibility options
 * - Grid and list view modes
 * - File preview for images, videos, audio
 * - Bulk selection and actions
 * - Filtering by visibility, type, search
 * - Keyboard navigation
 * - Storage quota display
 */
export function CloudManager() {
  const { t } = useTranslation(['common', 'dashboard']);
  const { currentWebsiteId, currentWebsite } = useWebsiteContext();
  
  // Navigation state
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  
  // Filter state
  const [search, setSearch] = useState('');
  const [visibilityFilter, setVisibilityFilter] = useState<FileVisibility | 'all'>('all');
  const [mimeTypeFilter, setMimeTypeFilter] = useState<string | 'all'>('all');
  
  // React Query hooks - scoped to current website
  const { data: files = [], isLoading: filesLoading } = useWebsiteFilesQuery(
    currentWebsiteId,
    { folder_id: currentFolderId || undefined }
  );
  const { data: folders = [], isLoading: foldersLoading } = useFoldersQuery(
    { website_id: currentWebsiteId || undefined, parent_id: currentFolderId || undefined }
  );
  const { data: quota = null, isLoading: quotaLoading } = useQuotaQuery();
  
  // Mutations
  const uploadFileMutation = useUploadFileMutation();
  const deleteFileMutation = useDeleteFileMutation();
  const deleteFilesMutation = useDeleteFilesMutation();
  const createFolderMutation = useCreateFolderMutation();
  const updateFileMutation = useUpdateFileMutation();
  
  // Local UI state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ total: number; completed: number; current: string }>({ total: 0, completed: 0, current: '' });
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [previewFile, setPreviewFile] = useState<FileMetadata | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Context menu state for creating folder
  const [isCreateFolderDialogOpen, setIsCreateFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  
  // Track folder path for breadcrumb navigation
  const [folderPath, setFolderPath] = useState<FileFolder[]>([]);
  
  // Update folder path when navigating
  const navigateToFolder = useCallback((folderId: string | null) => {
    if (folderId === null) {
      // Going to root
      setFolderPath([]);
      setCurrentFolderId(null);
    } else {
      // Check if we're going back in the path
      const existingIndex = folderPath.findIndex(f => f.id === folderId);
      if (existingIndex !== -1) {
        // Navigating to a parent folder in the breadcrumb
        setFolderPath(folderPath.slice(0, existingIndex + 1));
      } else {
        // Going into a new folder - find it in current folders list
        const folder = folders.find(f => f.id === folderId);
        if (folder) {
          setFolderPath([...folderPath, folder]);
        }
      }
      setCurrentFolderId(folderId);
    }
  }, [folderPath, folders]);

  // Filter files based on search and filters
  const filteredFiles = useMemo(() => {
    return files.filter((file) => {
      // Search filter
      if (search && !file.filename.toLowerCase().includes(search.toLowerCase())) {
        return false;
      }
      // Visibility filter
      if (visibilityFilter !== 'all' && file.visibility !== visibilityFilter) {
        return false;
      }
      // MIME type filter
      if (mimeTypeFilter !== 'all' && !file.mime_type.startsWith(mimeTypeFilter)) {
        return false;
      }
      return true;
    });
  }, [files, search, visibilityFilter, mimeTypeFilter]);

  // Calculate active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (search) count++;
    if (visibilityFilter !== 'all') count++;
    if (mimeTypeFilter !== 'all') count++;
    return count;
  }, [search, visibilityFilter, mimeTypeFilter]);

  // Breadcrumb path from tracked folder path
  const breadcrumbPath = folderPath;

  // Detect number of columns based on container width
  const [columns, setColumns] = useState(2);
  
  useEffect(() => {
    const updateColumns = () => {
      if (typeof window === 'undefined') return;
      const width = window.innerWidth;
      if (width >= 1280) setColumns(5);
      else if (width >= 1024) setColumns(4);
      else if (width >= 640) setColumns(3);
      else setColumns(2);
    };
    
    updateColumns();
    window.addEventListener('resize', updateColumns);
    return () => window.removeEventListener('resize', updateColumns);
  }, []);

  // Combined items for grid navigation (folders first, then files)
  const allItems = useMemo(() => [...folders, ...filteredFiles], [folders, filteredFiles]);

  // Memoized callbacks for keyboard navigation
  const getItemId = useCallback((item: FileFolder | FileMetadata) => item.id, []);
  const handleOpenItem = useCallback((item: FileFolder | FileMetadata) => {
    if ('file_count' in item) {
      // It's a folder
      navigateToFolder(item.id);
    } else {
      // It's a file
      setPreviewFile(item);
    }
  }, [navigateToFolder]);

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
    items: filteredFiles, // Only files are selectable
    getItemId: (f: FileMetadata) => f.id,
    columns: viewMode === 'grid' ? columns : 1,
    onOpen: (file: FileMetadata) => setPreviewFile(file),
    enabled: filteredFiles.length > 0,
  });

  const isLoading = filesLoading || foldersLoading || quotaLoading;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = e.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;

    const filesArray = Array.from(selectedFiles);
    setIsUploading(true);
    setUploadProgress({ total: filesArray.length, completed: 0, current: filesArray[0].name });

    const results: { success: string[]; failed: string[] } = { success: [], failed: [] };

    for (const file of filesArray) {
      try {
        setUploadProgress(prev => ({ ...prev, current: file.name }));
        await uploadFileMutation.mutateAsync({ 
          file,
          options: {
            website_id: currentWebsiteId || undefined,
            folder_id: currentFolderId || undefined,
            visibility: 'website', // Default to website visibility
          }
        });
        results.success.push(file.name);
      } catch (error) {
        filesLogger.error(`Failed to upload ${file.name}:`, error);
        results.failed.push(file.name);
      } finally {
        setUploadProgress(prev => ({ ...prev, completed: prev.completed + 1 }));
      }
    }

    // Show results
    if (results.success.length > 0 && results.failed.length === 0) {
      toast.success(
        results.success.length === 1
          ? t('dashboard:cloud.upload.success', { filename: results.success[0] })
          : t('dashboard:cloud.upload.successMultiple', { count: results.success.length })
      );
    } else if (results.failed.length > 0 && results.success.length === 0) {
      toast.error(
        results.failed.length === 1
          ? t('dashboard:cloud.upload.error', { filename: results.failed[0] })
          : t('dashboard:cloud.upload.errorMultiple', { count: results.failed.length })
      );
    } else if (results.success.length > 0 && results.failed.length > 0) {
      toast.warning(
        t('dashboard:cloud.upload.partial', { success: results.success.length, failed: results.failed.length })
      );
    }

    setIsUploading(false);
    setUploadProgress({ total: 0, completed: 0, current: '' });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCreateFolder = async (name: string) => {
    try {
      await createFolderMutation.mutateAsync({
        name,
        parent_folder_id: currentFolderId || undefined,
        website_id: currentWebsiteId || undefined,
      });
      toast.success(t('dashboard:cloud.folders.createSuccess', { name }));
    } catch (error) {
      filesLogger.error('Failed to create folder:', error);
      toast.error(t('dashboard:cloud.folders.createError'));
    }
  };

  // Handle folder creation from context menu
  const handleCreateFolderFromDialog = async () => {
    if (!newFolderName.trim()) return;
    await handleCreateFolder(newFolderName.trim());
    setNewFolderName('');
    setIsCreateFolderDialogOpen(false);
  };

  const handleDelete = (file: FileMetadata) => {
    setDeleteConfirm({ file });
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    
    const { file } = deleteConfirm;
    setIsDeleting(true);

    try {
      await deleteFileMutation.mutateAsync(file.id);
      setPreviewFile(null);
      toast.success(t('dashboard:cloud.delete.success'));
    } catch (error) {
      filesLogger.error('Failed to delete file:', error);
      toast.error(t('dashboard:cloud.delete.error'));
    } finally {
      setIsDeleting(false);
      setDeleteConfirm(null);
    }
  };

  const handleBulkDelete = async () => {
    const selectedFileIds = filteredFiles.filter(f => selectedIds.has(f.id)).map(f => f.id);
    if (selectedFileIds.length === 0) return;
    
    setIsDeleting(true);
    
    try {
      await deleteFilesMutation.mutateAsync(selectedFileIds);
      toast.success(t('dashboard:cloud.delete.successMultiple', { count: selectedFileIds.length }));
      clearSelection();
    } catch (error) {
      filesLogger.error('Failed to delete files:', error);
      toast.error(t('dashboard:cloud.delete.error'));
    } finally {
      setIsDeleting(false);
      setBulkDeleteConfirm(false);
    }
  };

  // File operations from context menu
  const handleMoveToFolder = async (fileId: string, folderId: string | null) => {
    try {
      await updateFileMutation.mutateAsync({
        fileId,
        data: { folder_id: folderId ?? 'root' }
      });
      toast.success(t('dashboard:cloud.operations.moveSuccess'));
    } catch (error) {
      filesLogger.error('Failed to move file:', error);
      toast.error(t('common:errors.generic'));
    }
  };

  const handleChangeVisibility = async (fileId: string, visibility: FileVisibility) => {
    try {
      await updateFileMutation.mutateAsync({
        fileId,
        data: { 
          visibility,
          website_id: visibility === 'website' ? currentWebsiteId : null
        }
      });
      toast.success(t('dashboard:cloud.operations.visibilitySuccess'));
    } catch (error) {
      filesLogger.error('Failed to change visibility:', error);
      toast.error(t('common:errors.generic'));
    }
  };

  const handleRenameFile = async (fileId: string, newName: string) => {
    if (!newName.trim()) return;
    try {
      await updateFileMutation.mutateAsync({
        fileId,
        data: { filename: newName.trim() }
      });
      toast.success(t('dashboard:cloud.operations.renameSuccess'));
    } catch (error) {
      filesLogger.error('Failed to rename file:', error);
      toast.error(t('common:errors.generic'));
    }
  };

  const copyToClipboard = async (fileId: string) => {
    const url = getFileUrl(fileId);
    await navigator.clipboard.writeText(url);
    setCopiedId(fileId);
    toast.success(t('dashboard:cloud.copy.success'));
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownloadSelected = () => {
    const selectedFiles = filteredFiles.filter(f => selectedIds.has(f.id));
    selectedFiles.forEach(file => {
      const link = document.createElement('a');
      link.href = getFileUrl(file.id);
      link.download = file.filename;
      link.click();
    });
    toast.success(t('dashboard:cloud.download.started', { count: selectedFiles.length }));
  };

  const clearFilters = () => {
    setSearch('');
    setVisibilityFilter('all');
    setMimeTypeFilter('all');
  };

  if (isLoading) {
    return <CloudManagerSkeleton />;
  }

  const currentFolder = currentFolderId ? folders.find(f => f.id === currentFolderId) || null : null;

  return (
    <div className="flex flex-col gap-4 sm:gap-6 animate-fade-in">
      {/* Page Header */}
      <PageHeader
        title={currentWebsite?.title ? `${t('dashboard:cloud.title')} - ${currentWebsite.title}` : t('dashboard:cloud.title')}
        subtitle={t('dashboard:cloud.websiteSubtitle')}
        icon={<PageIcon page="cloud" />}
        badge={quota ? {
          label: `${formatBytes(quota.total_size_used)} / ${formatBytes(quota.quota_limit)}`,
          variant: 'outline',
        } : undefined}
        backHref={currentWebsiteId ? `/${currentWebsiteId}` : '/'}
        actions={[
          {
            label: isUploading 
              ? (uploadProgress.total > 1 ? `${uploadProgress.completed}/${uploadProgress.total}` : t('dashboard:cloud.upload.uploading')) 
              : t('dashboard:cloud.upload.button'),
            icon: isUploading ? <Spinner className="h-4 w-4" /> : <Upload className="h-4 w-4" />,
            onClick: () => fileInputRef.current?.click(),
            disabled: isUploading,
          }
        ]}
        stickyContent={
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <PageIcon page="cloud" size="md" />
              <div className="hidden sm:block">
                <p className="text-sm font-semibold flex items-center gap-1.5">
                  {currentWebsite?.title && (
                    <>
                      <Globe className="h-3.5 w-3.5 text-blue-500" />
                      {currentWebsite.title}
                    </>
                  )}
                </p>
                {quota && (
                  <p className="text-[11px] text-muted-foreground">
                    {formatBytes(quota.total_size_used)} / {formatBytes(quota.quota_limit)}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <div className="flex items-center border rounded-lg p-0.5">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('grid')}
                        className="h-7 w-7 p-0"
                      >
                        <LayoutGrid className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{t('dashboard:cloud.view.grid')}</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => setViewMode('list')}
                        className="h-7 w-7 p-0"
                      >
                        <List className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{t('dashboard:cloud.view.list')}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </TooltipProvider>
              <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="h-8">
                {isUploading ? <Spinner className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
                <span className="hidden sm:inline ml-1.5">{t('dashboard:cloud.upload.button')}</span>
              </Button>
            </div>
          </div>
        }
      >
        {/* View Toggle */}
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <div className="flex items-center border rounded-lg p-1">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                    className="h-8 w-8 p-0 transition-all duration-200"
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('dashboard:cloud.view.grid')}</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                    className="h-8 w-8 p-0 transition-all duration-200"
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{t('dashboard:cloud.view.list')}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </div>
      </PageHeader>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleUpload}
        className="hidden"
        id="file-upload"
      />

      {/* Folder Navigation */}
      <FolderNavigation
        currentFolder={currentFolder}
        folders={folders}
        breadcrumbPath={breadcrumbPath}
        websiteName={currentWebsite?.title}
        onNavigate={navigateToFolder}
        onCreateFolder={handleCreateFolder}
        isCreating={createFolderMutation.isPending}
      />

      {/* Filters */}
      <FileFilters
        search={search}
        visibility={visibilityFilter}
        mimeTypeFilter={mimeTypeFilter}
        onSearchChange={setSearch}
        onVisibilityChange={setVisibilityFilter}
        onMimeTypeChange={setMimeTypeFilter}
        activeFiltersCount={activeFiltersCount}
        onClearFilters={clearFilters}
      />

      {/* Quota Card */}
      {quota && <QuotaCard quota={quota} />}

      {/* Content with context menu for upload/create folder */}
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <div className="flex-1 min-h-[200px]">
            {folders.length === 0 && filteredFiles.length === 0 ? (
              <EmptyState onUploadClick={() => fileInputRef.current?.click()} />
            ) : viewMode === 'grid' ? (
              /* Grid View */
              <div 
                ref={containerRef as React.RefObject<HTMLDivElement>}
                className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-4"
                role="grid"
                aria-label={t('dashboard:cloud.filesLabel')}
              >
                {/* Folders first */}
                {folders.map((folder, index) => (
                  <FolderCard
                    key={folder.id}
                    folder={folder}
                    index={index}
                    isFocused={false}
                    onOpen={() => navigateToFolder(folder.id)}
                    onRename={() => {/* TODO: Implement rename */}}
              onDelete={() => {/* TODO: Implement delete */}}
            />
          ))}
          
          {/* Files */}
          {filteredFiles.map((file, index) => (
            <FileCard
              key={file.id}
              file={file}
              index={folders.length + index}
              isSelected={isSelected(file)}
              isFocused={isFocused(index)}
              onPreview={() => setPreviewFile(file)}
              onDelete={() => handleDelete(file)}
              onCopyLink={() => copyToClipboard(file.id)}
              onToggleSelection={() => toggleSelection(file)}
              folders={folders}
              getItemProps={getItemProps}
              getFileUrl={getFileUrl}
              copiedId={copiedId}
              onMoveToFolder={(folderId) => handleMoveToFolder(file.id, folderId)}
              onChangeVisibility={(visibility) => handleChangeVisibility(file.id, visibility)}
              onRename={(newName) => handleRenameFile(file.id, newName)}
            />
          ))}
        </div>
      ) : (
        /* List View */
        <Card className="animate-fade-in">
          <CardContent className="p-0">
            <div 
              ref={containerRef as React.RefObject<HTMLDivElement>}
              className="divide-y"
              role="list"
              aria-label={t('dashboard:cloud.filesLabel')}
            >
              {/* Folders first in list view */}
              {folders.map((folder) => (
                <div
                  key={folder.id}
                  className="flex items-center gap-3 sm:gap-4 p-3 sm:p-4 hover:bg-accent/50 cursor-pointer transition-all duration-200"
                  onClick={() => navigateToFolder(folder.id)}
                  role="listitem"
                >
                  <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                    <Folder className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm sm:text-base font-medium truncate">{folder.name}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {t('dashboard:cloud.folders.files', { count: folder.file_count || 0 })}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              ))}
              {filteredFiles.map((file, index) => (
                <FileListItem
                  key={file.id}
                  file={file}
                  index={index}
                  isSelected={isSelected(file)}
                  isFocused={isFocused(index)}
                  onPreview={() => setPreviewFile(file)}
                  onDelete={() => handleDelete(file)}
                  onCopyLink={() => copyToClipboard(file.id)}
                  onToggleSelection={() => toggleSelection(file)}
                  folders={folders}
                  getItemProps={getItemProps}
                  getFileUrl={getFileUrl}
                  copiedId={copiedId}
                  onMoveToFolder={(folderId) => handleMoveToFolder(file.id, folderId)}
                  onChangeVisibility={(visibility) => handleChangeVisibility(file.id, visibility)}
                  onRename={(newName) => handleRenameFile(file.id, newName)}
                />
              ))}
            </div>
          </CardContent>
        </Card>
            )}
          </div>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-48">
          <ContextMenuItem onClick={() => fileInputRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" />
            {t('dashboard:cloud.upload.button')}
          </ContextMenuItem>
          <ContextMenuItem onClick={() => setIsCreateFolderDialogOpen(true)}>
            <FolderPlus className="mr-2 h-4 w-4" />
            {t('dashboard:cloud.folders.create')}
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      {/* Create Folder Dialog (for context menu) */}
      <Dialog open={isCreateFolderDialogOpen} onOpenChange={setIsCreateFolderDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('dashboard:cloud.folders.createTitle')}</DialogTitle>
            <DialogDescription>
              {currentFolder 
                ? t('dashboard:cloud.folders.createIn', { folder: currentFolder.name })
                : t('dashboard:cloud.folders.createInRoot')
              }
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder={t('dashboard:cloud.folders.namePlaceholder')}
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateFolderFromDialog();
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateFolderDialogOpen(false)}>
              {t('common:actions.cancel')}
            </Button>
            <Button 
              onClick={handleCreateFolderFromDialog} 
              disabled={!newFolderName.trim() || createFolderMutation.isPending}
            >
              {createFolderMutation.isPending ? t('common:status.creating') : t('common:actions.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Selection Action Bar */}
      {selectedIds.size > 0 && (
        <SelectionBar
          selectedCount={selectedIds.size}
          onSelectAll={selectAll}
          onDownloadSelected={handleDownloadSelected}
          onDeleteSelected={() => setBulkDeleteConfirm(true)}
          onClearSelection={clearSelection}
        />
      )}

      {/* Keyboard Hint */}
      {filteredFiles.length > 0 && selectedIds.size === 0 && (
        <KeyboardHint className="text-center mt-4" />
      )}

      {/* Preview Dialog */}
      <FilePreviewDialog
        file={previewFile}
        isOpen={!!previewFile}
        onClose={() => setPreviewFile(null)}
        onDelete={() => {
          if (previewFile) {
            setPreviewFile(null);
            handleDelete(previewFile);
          }
        }}
        onCopyLink={() => previewFile && copyToClipboard(previewFile.id)}
        getFileUrl={getFileUrl}
        copiedId={copiedId}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmDialog
        deleteConfirm={deleteConfirm}
        isDeleting={isDeleting}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm(null)}
      />

      {/* Bulk Delete Confirmation Dialog */}
      <BulkDeleteDialog
        isOpen={bulkDeleteConfirm}
        selectedCount={selectedIds.size}
        isDeleting={isDeleting}
        onConfirm={handleBulkDelete}
        onCancel={() => setBulkDeleteConfirm(false)}
      />
    </div>
  );
}

export default CloudManager;
