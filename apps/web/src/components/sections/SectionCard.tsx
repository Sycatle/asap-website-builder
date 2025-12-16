"use client"

import { useState, useCallback } from 'react';
import type { Section } from '@/lib/api';
import { getSectionIcon, getSectionLabel } from '@/lib/constants/sections';
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  GripVertical,
  MoreVertical,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";

interface SectionCardProps {
  section: Section;
  onEdit: (section: Section) => void;
  onDelete: (sectionId: string) => Promise<void>;
  onVisibilityChange: (sectionId: string, visible: boolean) => Promise<void>;
  isDragging?: boolean;
  dragHandleProps?: Record<string, unknown>;
}

export function SectionCard({ 
  section, 
  onEdit, 
  onDelete, 
  onVisibilityChange,
  isDragging = false,
  dragHandleProps,
}: SectionCardProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isTogglingVisibility, setIsTogglingVisibility] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const SectionIcon = getSectionIcon(section.section_type);
  const sectionLabel = getSectionLabel(section.section_type);

  const handleDelete = useCallback(async () => {
    setIsDeleting(true);
    try {
      await onDelete(section.id);
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  }, [section.id, onDelete]);

  const handleVisibilityToggle = useCallback(async () => {
    setIsTogglingVisibility(true);
    try {
      await onVisibilityChange(section.id, !section.visible);
    } finally {
      setIsTogglingVisibility(false);
    }
  }, [section.id, section.visible, onVisibilityChange]);

  return (
    <>
      <Card 
        className={`group relative transition-all duration-200 ${
          isDragging ? 'shadow-lg ring-2 ring-primary/50 scale-[1.02]' : 'hover:shadow-md'
        } ${!section.visible ? 'opacity-60' : ''}`}
      >
        <CardHeader className="pb-2 px-3 sm:px-4 pt-3 sm:pt-4">
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Drag Handle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  {...dragHandleProps}
                  className="cursor-grab active:cursor-grabbing p-1 -ml-1 rounded hover:bg-muted transition-colors touch-none"
                  aria-label="Réordonner la section"
                >
                  <GripVertical className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="left">
                <p>Glisser pour réordonner</p>
              </TooltipContent>
            </Tooltip>

            {/* Section Icon & Info */}
            <div className="flex-1 flex items-center gap-2 sm:gap-3 min-w-0">
              <div className={`p-1.5 sm:p-2 rounded-lg transition-colors ${
                section.visible ? 'bg-primary/10' : 'bg-muted'
              }`}>
                <SectionIcon className={`h-4 w-4 sm:h-5 sm:w-5 ${
                  section.visible ? 'text-primary' : 'text-muted-foreground'
                }`} />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-sm sm:text-base truncate">
                    {section.title || sectionLabel}
                  </h4>
                  <Badge variant="outline" className="text-[10px] sm:text-xs shrink-0">
                    {sectionLabel}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  Layout: {section.layout}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 sm:gap-2">
              {/* Visibility Toggle */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center">
                    <Switch
                      checked={section.visible}
                      onCheckedChange={handleVisibilityToggle}
                      disabled={isTogglingVisibility}
                      className="scale-75 sm:scale-100"
                      aria-label={section.visible ? 'Masquer la section' : 'Afficher la section'}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{section.visible ? 'Masquer' : 'Afficher'}</p>
                </TooltipContent>
              </Tooltip>

              {/* Dropdown Menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    className="h-7 w-7 sm:h-8 sm:w-8 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
                    aria-label="Actions de la section"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onClick={() => onEdit(section)}>
                    <Edit className="h-4 w-4 mr-2" />
                    Modifier
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleVisibilityToggle} disabled={isTogglingVisibility}>
                    {section.visible ? (
                      <>
                        <EyeOff className="h-4 w-4 mr-2" />
                        Masquer
                      </>
                    ) : (
                      <>
                        <Eye className="h-4 w-4 mr-2" />
                        Afficher
                      </>
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="text-destructive focus:text-destructive"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Supprimer
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>

        {/* Hidden indicator */}
        {!section.visible && (
          <CardContent className="pt-0 pb-2 px-3 sm:px-4">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <EyeOff className="h-3 w-3" />
              <span>Cette section est masquée</span>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer la section ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La section <strong>"{section.title || sectionLabel}"</strong> sera définitivement supprimée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
