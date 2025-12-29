"use client"

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Trash2,
  Download,
  Copy,
  CheckCircle2,
} from "lucide-react";
import { formatBytes } from "@/lib/utils/formatters";
import { isImage, isVideo, isAudio, getFileIcon, getFileTypeLabel } from "../utils";
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
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] sm:max-w-3xl p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm sm:text-base">
            {file && getFileIcon(file.mime_type, "h-4 w-4 sm:h-5 sm:w-5")}
            <span className="truncate">{file?.filename}</span>
          </DialogTitle>
          <DialogDescription className="text-xs sm:text-sm">
            {file && `${getFileTypeLabel(file.mime_type)} · ${formatBytes(file.original_size)}`}
          </DialogDescription>
        </DialogHeader>
        
        {/* Preview Content */}
        {file && (
          <div className="mt-3 sm:mt-4">
            {isImage(file.mime_type) && (
              <img
                src={getFileUrl(file.id)}
                alt={file.filename}
                className="max-h-[50vh] sm:max-h-[60vh] mx-auto rounded-lg"
              />
            )}
            {isVideo(file.mime_type) && (
              <video
                src={getFileUrl(file.id)}
                controls
                className="max-h-[50vh] sm:max-h-[60vh] w-full mx-auto rounded-lg"
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
                <p className="mt-3 sm:mt-4 text-sm text-muted-foreground">Aperçu non disponible</p>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex-col gap-2 mt-4 sm:mt-0">
          <Button
            variant="outline"
            onClick={onCopyLink}
            className="w-full sm:w-auto h-9 text-sm"
          >
            {copiedId === file?.id ? (
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
            <a href={file ? getFileUrl(file.id) : '#'} download>
              <Download className="h-4 w-4 mr-1.5" />
              Télécharger
            </a>
          </Button>
          <Button
            variant="destructive"
            onClick={onDelete}
            className="w-full sm:w-auto h-9 text-sm"
          >
            <Trash2 className="h-4 w-4 mr-1.5" />
            Supprimer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
