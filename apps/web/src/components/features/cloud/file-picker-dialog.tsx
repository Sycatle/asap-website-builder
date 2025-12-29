"use client"

import { useState, useEffect } from "react"
import { Image as ImageIcon, File as FileIcon, Check } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"

import {
  ResponsiveDialog,
  ResponsiveDialogContent,
  ResponsiveDialogHeader,
  ResponsiveDialogTitle,
  ResponsiveDialogDescription,
  ResponsiveDialogFooter,
} from "@/components/ui/responsive-dialog"
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

  // Helper to construct file URL with auth token
  const getFileUrl = (fileId: string) => {
    const token = localStorage.getItem('auth_token')
    return `${import.meta.env.PUBLIC_API_URL || 'http://localhost:3000/api'}/files/${fileId}?token=${token}`
  }

  return (
    <ResponsiveDialog open={open} onOpenChange={onOpenChange}>
      <ResponsiveDialogContent className="w-[calc(100%-2rem)] max-w-2xl">
        <ResponsiveDialogHeader>
          <ResponsiveDialogTitle className="text-base sm:text-lg">{title}</ResponsiveDialogTitle>
          <ResponsiveDialogDescription className="text-xs sm:text-sm">{description}</ResponsiveDialogDescription>
        </ResponsiveDialogHeader>

        <div className="space-y-3 sm:space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-6 sm:py-8">
              <Spinner className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" />
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-6 sm:py-8 text-xs sm:text-sm text-muted-foreground">
              Aucun fichier trouvé
            </div>
          ) : (
            <ScrollArea className="h-[280px] xs:h-[320px] sm:h-[400px] pr-3 sm:pr-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
                {files.map((file) => (
                  <button
                    key={file.id}
                    onClick={() => setSelectedFileId(file.id)}
                    className={cn(
                      "relative flex flex-col items-start gap-1.5 sm:gap-2 p-2 sm:p-3 rounded-lg border-2 transition-colors text-left",
                      selectedFileId === file.id
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/50 hover:bg-muted/50"
                    )}
                  >
                    {selectedFileId === file.id && (
                      <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 h-4 w-4 sm:h-5 sm:w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                        <Check className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                      </div>
                    )}
                    
                    {file.mime_type.startsWith("image/") ? (
                      <div className="w-full aspect-video bg-muted rounded overflow-hidden">
                        <img 
                          src={getFileUrl(file.id)}
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
                      <p className="text-xs sm:text-sm font-medium truncate">{file.filename}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">
                        {formatBytes(file.original_size)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}

          <ResponsiveDialogFooter className="flex-col-reverse xs:flex-row justify-end gap-2 pt-3 sm:pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="h-9 sm:h-10 text-sm">
              Annuler
            </Button>
            <Button onClick={handleSelect} disabled={!selectedFileId} className="h-9 sm:h-10 text-sm">
              Sélectionner
            </Button>
          </ResponsiveDialogFooter>
        </div>
      </ResponsiveDialogContent>
    </ResponsiveDialog>
  )
}
