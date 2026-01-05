"use client"

import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
} from "@/components/ui/responsive-dialog";
import { 
  Trash2,
  Download,
  Copy,
  CheckCircle2,
} from "lucide-react";
import { formatBytes } from "@/lib/utils/formatters";
import { isImage, isVideo, isAudio, getFileIcon, getFileTypeLabel } from "@/components/shared/file-utils";
import type { FilePreviewDialogProps } from "../types";

/**
 * File preview dialog with media player support
 */
export function FilePreviewDialog({
  file,
  isOpen,
  onClose,
  onDelete,
  onCopyLink,
  getFileUrl,
  copiedId,
}: FilePreviewDialogProps) {
  const { t } = useTranslation(['common', 'dashboard']);

  return (
    <ResponsiveDialog open={isOpen} onOpenChange={onClose}>
      <ResponsiveDialogContent className="w-screen h-screen max-h-screen max-w-none rounded-none p-4 sm:w-auto sm:h-auto sm:max-h-[90vh] sm:max-w-4xl sm:rounded-lg sm:p-6 flex flex-col">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="flex items-center gap-2 text-sm sm:text-base">
            {file && getFileIcon(file.mime_type, "h-4 w-4 sm:h-5 sm:w-5")}
            <span className="truncate">{file?.filename}</span>
          </ResponsiveDialogTitle>
          <ResponsiveDialogDescription className="text-xs sm:text-sm">
            {file && `${getFileTypeLabel(file.mime_type)} · ${formatBytes(file.original_size)}`}
          </ResponsiveDialogDescription>
        </ResponsiveDialogHeader>
        
        {/* Preview Content */}
        {file && (
          <div className="flex-1 flex items-center justify-center overflow-hidden">
            {isImage(file.mime_type) && (
              <img
                src={getFileUrl(file.id)}
                alt={file.filename}
                className="max-h-full max-w-full rounded-lg object-contain"
              />
            )}
            {isVideo(file.mime_type) && (
              <video
                src={getFileUrl(file.id)}
                controls
                className="max-h-full max-w-full rounded-lg"
              />
            )}
            {isAudio(file.mime_type) && (
              <audio
                src={getFileUrl(file.id)}
                controls
                className="w-full"
              />
            )}
            {!isImage(file.mime_type) && !isVideo(file.mime_type) && !isAudio(file.mime_type) && (
              <div className="flex flex-col items-center justify-center py-8 sm:py-12 bg-muted rounded-lg">
                {getFileIcon(file.mime_type, "h-12 w-12 sm:h-16 sm:w-16")}
                <p className="mt-3 sm:mt-4 text-sm text-muted-foreground">{t('dashboard:cloud.preview.notAvailable')}</p>
              </div>
            )}
          </div>
        )}

        <ResponsiveDialogFooter className="flex-col gap-2 mt-4 sm:mt-0">
          <Button
            variant="outline"
            onClick={onCopyLink}
            className="w-full sm:w-auto h-9 text-sm"
          >
            {copiedId === file?.id ? (
              <>
                <CheckCircle2 className="h-4 w-4 mr-1.5 text-green-600" />
                {t('dashboard:cloud.preview.copied')}
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-1.5" />
                {t('dashboard:cloud.preview.copyUrl')}
              </>
            )}
          </Button>
          <Button
            variant="outline"
            asChild
            className="w-full sm:w-auto h-9 text-sm"
          >
            <a href={file ? getFileUrl(file.id) : '#'} download>
              <Download className="h-4 w-4 mr-1.5" />
              {t('dashboard:cloud.contextMenu.download')}
            </a>
          </Button>
          <Button
            variant="destructive"
            onClick={onDelete}
            className="w-full sm:w-auto h-9 text-sm"
          >
            <Trash2 className="h-4 w-4 mr-1.5" />
            {t('common:actions.delete')}
          </Button>
        </ResponsiveDialogFooter>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  );
}
