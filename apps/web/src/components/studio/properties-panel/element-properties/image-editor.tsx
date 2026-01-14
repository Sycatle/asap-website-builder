"use client";

import React, { useState, useRef, useCallback } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Image, Upload, X, Link, Loader2 } from "lucide-react";

interface ImageEditorProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  aspectRatio?: "square" | "video" | "wide" | "auto";
}

export function ImageEditor({
  value,
  onChange,
  label,
  placeholder = "URL de l'image ou glisser-déposer",
  disabled = false,
  aspectRatio = "auto",
}: ImageEditorProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState(value || "");
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const aspectRatioClass = {
    square: "aspect-square",
    video: "aspect-video",
    wide: "aspect-[2/1]",
    auto: "min-h-[120px]",
  }[aspectRatio];

  // Handle file processing - defined before callbacks that use it
  const processFile = useCallback(async (file: File) => {
    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Le fichier doit être une image");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("L'image ne doit pas dépasser 5MB");
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      // For now, create a local data URL
      // TODO: Integrate with actual upload API (S3/CloudFlare)
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        onChange(dataUrl);
        setIsUploading(false);
      };
      reader.onerror = () => {
        setError("Erreur lors de la lecture du fichier");
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setError("Erreur lors de l'upload");
      setIsUploading(false);
    }
  }, [onChange]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await processFile(files[0]);
    }
  }, [disabled, processFile]);

  const handleFileSelect = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await processFile(files[0]);
    }
  }, [processFile]);

  const handleUrlSubmit = () => {
    if (urlInput.trim()) {
      // Basic URL validation
      try {
        new URL(urlInput);
        onChange(urlInput);
        setShowUrlInput(false);
        setError(null);
      } catch {
        setError("URL invalide");
      }
    }
  };

  const handleRemove = () => {
    onChange("");
    setUrlInput("");
    setError(null);
  };

  return (
    <div className="space-y-2">
      {label && <Label className="text-xs">{label}</Label>}
      
      {/* Preview or upload zone */}
      <div
        className={cn(
          "relative rounded-lg border-2 border-dashed transition-colors",
          aspectRatioClass,
          isDragging && "border-primary bg-primary/5",
          !isDragging && "border-muted-foreground/25 hover:border-muted-foreground/50",
          disabled && "opacity-50 cursor-not-allowed",
          value && "border-solid border-border"
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {value ? (
          // Image preview
          <div className="relative w-full h-full group">
            <img
              src={value}
              alt="Preview"
              className="w-full h-full object-cover rounded-md"
              onError={() => setError("Impossible de charger l'image")}
            />
            {!disabled && (
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-md flex items-center justify-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-4 w-4 mr-1" />
                  Remplacer
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleRemove}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        ) : isUploading ? (
          // Uploading state
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
            <span className="text-sm text-muted-foreground">Upload en cours...</span>
          </div>
        ) : (
          // Empty state / upload zone
          <div 
            className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer p-4"
            onClick={() => !disabled && fileInputRef.current?.click()}
          >
            <Image className="h-8 w-8 text-muted-foreground mb-2" />
            <span className="text-sm text-muted-foreground text-center">
              {isDragging ? "Déposer l'image ici" : placeholder}
            </span>
            <span className="text-xs text-muted-foreground/60 mt-1">
              PNG, JPG, GIF • Max 5MB
            </span>
          </div>
        )}
        
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileSelect}
          disabled={disabled}
        />
      </div>

      {/* URL input toggle */}
      {!value && !showUrlInput && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs"
          onClick={() => setShowUrlInput(true)}
          disabled={disabled}
        >
          <Link className="h-3 w-3 mr-1" />
          Ou utiliser une URL
        </Button>
      )}

      {/* URL input */}
      {showUrlInput && (
        <div className="flex gap-2">
          <Input
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            placeholder="https://..."
            className="h-8 text-sm flex-1"
            disabled={disabled}
            onKeyDown={(e) => e.key === "Enter" && handleUrlSubmit()}
          />
          <Button
            size="sm"
            className="h-8"
            onClick={handleUrlSubmit}
            disabled={disabled || !urlInput.trim()}
          >
            OK
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8"
            onClick={() => {
              setShowUrlInput(false);
              setUrlInput(value || "");
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Error message */}
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  );
}

export default ImageEditor;
