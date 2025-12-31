"use client"

import { useState, useRef, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import type { FileMetadata } from '@/lib/api';
import { formatBytes } from '@/lib/utils/formatters';
import { PageHeader } from '@/components/shared/page-header';
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
  HardDrive,
} from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { useFilesQuery, useQuotaQuery, useUploadFileMutation, useDeleteFileMutation, useDeleteFilesMutation } from '@/lib/query';
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

const filesLogger = loggers.files;

/**
 * CloudManager - File management dashboard
 * 
 * Features:
 * - File upload with progress
 * - Grid and list view modes
 * - File preview for images, videos, audio
 * - Bulk selection and actions
 * - Keyboard navigation
 * - Storage quota display
 */
export function CloudManager() {
  const { t } = useTranslation(['common', 'dashboard']);
  const { currentWebsiteId } = useWebsiteContext();
  
  // React Query hooks
  const { data: files = [], isLoading: filesLoading } = useFilesQuery();
  const { data: quota = null, isLoading: quotaLoading } = useQuotaQuery();
  const uploadFileMutation = useUploadFileMutation();
  const deleteFileMutation = useDeleteFileMutation();
  const deleteFilesMutation = useDeleteFilesMutation();
  
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

  const isLoading = filesLoading || quotaLoading;

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
        await uploadFileMutation.mutateAsync(file);
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
    const selectedFileIds = files.filter(f => selectedIds.has(f.id)).map(f => f.id);
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

  const copyToClipboard = async (fileId: string) => {
    const url = getFileUrl(fileId);
    await navigator.clipboard.writeText(url);
    setCopiedId(fileId);
    toast.success(t('dashboard:cloud.copy.success'));
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownloadSelected = () => {
    const selectedFiles = files.filter(f => selectedIds.has(f.id));
    selectedFiles.forEach(file => {
      const link = document.createElement('a');
      link.href = getFileUrl(file.id);
      link.download = file.filename;
      link.click();
    });
    toast.success(t('dashboard:cloud.download.started', { count: selectedFiles.length }));
  };

  if (isLoading) {
    return <CloudManagerSkeleton />;
  }

  return (
    <div className="flex flex-col gap-6 sm:gap-8 animate-fade-in">
      {/* Page Header */}
      <PageHeader
        title={t('dashboard:cloud.title')}
        subtitle={t('dashboard:cloud.subtitle')}
        icon={
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
            <HardDrive className="h-5 w-5 text-white" />
          </div>
        }
        badge={quota ? {
          label: `${formatBytes(quota.total_size_used)} / ${formatBytes(quota.quota_limit)}`,
          variant: 'outline',
        } : undefined}
        backHref={currentWebsiteId ? `/${currentWebsiteId}` : '/'}
        actions={[
          {
            label: isUploading ? (uploadProgress.total > 1 ? `${uploadProgress.completed}/${uploadProgress.total}` : t('dashboard:cloud.upload.uploading')) : t('dashboard:cloud.upload.button'),
            icon: isUploading ? <Spinner className="h-4 w-4" /> : <Upload className="h-4 w-4" />,
            onClick: () => fileInputRef.current?.click(),
            disabled: isUploading,
          }
        ]}
        stickyContent={
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <HardDrive className="h-4 w-4 text-white" />
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-semibold">{t('dashboard:cloud.filesLabel')}</p>
                {quota && <p className="text-[11px] text-muted-foreground">{formatBytes(quota.total_size_used)} / {formatBytes(quota.quota_limit)}</p>}
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
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="h-8">
                      {isUploading ? <Spinner className="h-4 w-4" /> : <Upload className="h-4 w-4" />}
                      <span className="hidden sm:inline ml-1.5">{t('dashboard:cloud.upload.button')}</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{t('dashboard:cloud.uploadTooltip')}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
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

      {/* Quota Card */}
      {quota && <QuotaCard quota={quota} />}

      {/* Files */}
      {files.length === 0 ? (
        <EmptyState onUploadClick={() => fileInputRef.current?.click()} />
      ) : viewMode === 'grid' ? (
        /* Grid View */
        <div 
          ref={containerRef as React.RefObject<HTMLDivElement>}
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 sm:gap-4"
          role="grid"
          aria-label={t('dashboard:cloud.filesLabel')}
        >
          {files.map((file, index) => (
            <FileCard
              key={file.id}
              file={file}
              index={index}
              isSelected={isSelected(file)}
              isFocused={isFocused(index)}
              onPreview={() => setPreviewFile(file)}
              onDelete={() => handleDelete(file)}
              onCopyLink={() => copyToClipboard(file.id)}
              onToggleSelection={() => toggleSelection(file)}
              getItemProps={getItemProps}
              getFileUrl={getFileUrl}
              copiedId={copiedId}
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
              {files.map((file, index) => (
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
                  getItemProps={getItemProps}
                  getFileUrl={getFileUrl}
                  copiedId={copiedId}
                />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
      {files.length > 0 && selectedIds.size === 0 && (
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
