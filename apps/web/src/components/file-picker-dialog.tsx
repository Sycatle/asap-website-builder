"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { Image as ImageIcon, File as FileIcon, Check, Loader2 } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { filesAPI, type FileMetadata } from "@/lib/api"
import { formatBytes } from "@/lib/utils/formatters"
import { cn } from "@/lib/utils"

interface FilePickerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSelect: (file: FileMetadata) => void
  accept?: string // e.g., "image/*"
  title?: string
  description?: string
}

export function FilePickerDialog({
  open,
  onOpenChange,
  onSelect,
  accept = "*/*",
  title = "Sélectionner un fichier",
  description = "Choisissez un fichier depuis votre stockage cloud.",
}: FilePickerDialogProps) {
  const [files, setFiles] = useState<FileMetadata[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      loadFiles()
    }
  }, [open])

  const loadFiles = async () => {
    setIsLoading(true)
    try {
      const allFiles = await filesAPI.list()
      
      // Filter files based on accept pattern
      const filteredFiles = accept === "*/*" 
        ? allFiles 
        : allFiles.filter(file => {
            if (accept.endsWith("/*")) {
              const type = accept.split("/")[0]
              return file.mime_type.startsWith(type + "/")
            }
            return file.mime_type === accept
          })
      
      setFiles(filteredFiles)
    } catch (error) {
      console.error("Failed to load files:", error)
      setFiles([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSelect = () => {
    const selectedFile = files.find(f => f.id === selectedFileId)
    if (selectedFile) {
      onSelect(selectedFile)
      onOpenChange(false)
    }
  }

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith("image/")) {
      return <ImageIcon className="h-4 w-4" />
    }
    return <FileIcon className="h-4 w-4" />
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              Aucun fichier trouvé
            </div>
          ) : (
            <ScrollArea className="h-[400px] pr-4">
              <div className="grid grid-cols-2 gap-3">
                {files.map((file) => (
                  <button
                    key={file.id}
                    onClick={() => setSelectedFileId(file.id)}
                    className={cn(
                      "relative flex flex-col items-start gap-2 p-3 rounded-lg border-2 transition-colors text-left",
                      selectedFileId === file.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                    )}
                  >
                    {selectedFileId === file.id && (
                      <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                        <Check className="h-3 w-3" />
                      </div>
                    )}
                    
                    {file.mime_type.startsWith("image/") ? (
                      <div className="w-full aspect-video bg-muted rounded overflow-hidden">
                        <img 
                          src={`${import.meta.env.PUBLIC_API_URL || 'http://localhost:3000/api'}/files/${file.id}`}
                          alt={file.filename}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-full aspect-video bg-muted rounded flex items-center justify-center">
                        {getFileIcon(file.mime_type)}
                      </div>
                    )}
                    
                    <div className="w-full min-w-0">
                      <p className="text-sm font-medium truncate">{file.filename}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatBytes(file.size_bytes)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button onClick={handleSelect} disabled={!selectedFileId}>
              Sélectionner
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
