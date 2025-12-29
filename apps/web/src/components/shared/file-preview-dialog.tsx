"use client"

import { useState } from "react";
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
  ExternalLink,
} from "lucide-react";
import { formatBytes } from "@/lib/utils/formatters";
import { isImage, isVideo, isAudio, getFileIcon, getFileTypeLabel, getFileUrl } from "./file-utils";
import type { FileMetadata } from "@/lib/types";
import { toast } from "sonner";

// ============================================================================
// Types
// ============================================================================

export interface FilePreviewDialogProps {
  /** The file to preview */
  file: FileMetadata | null;
  /** Whether the dialog is open */
  isOpen: boolean;
  /** Callback when closing the dialog */
  onClose: () => void;
  /** Optional callback for delete action - if not provided, delete button is hidden */
  onDelete?: () => void;
  /** Whether the file is being deleted */
  isDeleting?: boolean;
  /** Show actions (copy link, download, delete) - default true */
  showActions?: boolean;
  /** Custom file URL getter - uses default if not provided */
  customGetFileUrl?: (fileId: string) => string;
}

// ============================================================================
// Component
// ============================================================================

/**
 * Shared file preview dialog with media player support
 * 
 * Can be used in:
 * - CloudManager (full actions)
 * - CloudPreviewCard (preview only, no delete)
 * - FilePickerDialog (preview before selection)
 * - Settings (avatar preview)
 */
export function FilePreviewDialog({
  file,
  isOpen,
  onClose,
  onDelete,
  isDeleting = false,
  showActions = true,
  customGetFileUrl,
}: FilePreviewDialogProps) {
  const [copied, setCopied] = useState(false);

  const fileUrl = file ? (customGetFileUrl ? customGetFileUrl(file.id) : getFileUrl(file.id)) : '';

  const handleCopyLink = async () => {
    if (!file) return;
    try {
      await navigator.clipboard.writeText(fileUrl);
      setCopied(true);
      toast.success('Lien copié !');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Erreur lors de la copie');
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setCopied(false);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
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
                src={fileUrl}
                alt={file.filename}
                className="max-h-[50vh] sm:max-h-[60vh] mx-auto rounded-lg"
              />
            )}
            {isVideo(file.mime_type) && (
              <video
                src={fileUrl}
                controls
                className="max-h-[50vh] sm:max-h-[60vh] w-full mx-auto rounded-lg"
              />
            )}
            {isAudio(file.mime_type) && (
              <audio
                src={fileUrl}
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

        {showActions && (
          <DialogFooter className="flex-col sm:flex-row gap-2 mt-4 sm:mt-0">
            <Button
              variant="outline"
              onClick={handleCopyLink}
              className="w-full sm:w-auto h-9 text-sm"
            >
              {copied ? (
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
              <a href={fileUrl} download={file?.filename} target="_blank" rel="noopener noreferrer">
                <Download className="h-4 w-4 mr-1.5" />
                Télécharger
              </a>
            </Button>
            <Button
              variant="outline"
              asChild
              className="w-full sm:w-auto h-9 text-sm"
            >
              <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-1.5" />
                Ouvrir
              </a>
            </Button>
            {onDelete && (
              <Button
                variant="destructive"
                onClick={onDelete}
                disabled={isDeleting}
                className="w-full sm:w-auto h-9 text-sm"
              >
                <Trash2 className="h-4 w-4 mr-1.5" />
                {isDeleting ? 'Suppression...' : 'Supprimer'}
              </Button>
            )}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default FilePreviewDialog;
