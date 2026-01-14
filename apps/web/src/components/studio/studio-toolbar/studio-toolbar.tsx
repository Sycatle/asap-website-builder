"use client";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Undo2,
  Redo2,
  Save,
  Upload,
  Copy,
  Trash2,
  MoveUp,
  MoveDown,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { KeyboardShortcutsDialog } from "./keyboard-shortcuts-dialog";

interface StudioToolbarProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
  onPublish: () => void;
  isSaving?: boolean;
  isPublishing?: boolean;
  // Quick actions
  selectedElementId: string | null;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  canMoveUp?: boolean;
  canMoveDown?: boolean;
}

export function StudioToolbar({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onSave,
  onPublish,
  isSaving = false,
  isPublishing = false,
  selectedElementId,
  onDuplicate,
  onDelete,
  onMoveUp,
  onMoveDown,
  canMoveUp = false,
  canMoveDown = false,
}: StudioToolbarProps) {
  return (
    <TooltipProvider>
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center gap-2 px-4">
          {/* History Actions */}
          <div className="flex items-center gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onUndo}
                  disabled={!canUndo}
                >
                  <Undo2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Annuler (Ctrl+Z)</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onRedo}
                  disabled={!canRedo}
                >
                  <Redo2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Refaire (Ctrl+Y)</p>
              </TooltipContent>
            </Tooltip>
          </div>

          <Separator orientation="vertical" className="h-6" />

          {/* Quick Actions - Only shown when element is selected */}
          {selectedElementId && (
            <>
              <div className="flex items-center gap-1">
                {onDuplicate && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onDuplicate}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Dupliquer (Ctrl+D)</p>
                    </TooltipContent>
                  </Tooltip>
                )}

                {onDelete && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onDelete}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Supprimer (Del)</p>
                    </TooltipContent>
                  </Tooltip>
                )}

                {onMoveUp && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onMoveUp}
                        disabled={!canMoveUp}
                      >
                        <MoveUp className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Monter (Ctrl+↑)</p>
                    </TooltipContent>
                  </Tooltip>
                )}

                {onMoveDown && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={onMoveDown}
                        disabled={!canMoveDown}
                      >
                        <MoveDown className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Descendre (Ctrl+↓)</p>
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>

              <Separator orientation="vertical" className="h-6" />
            </>
          )}

          {/* Save & Publish */}
          <div className="ml-auto flex items-center gap-2">
            {/* Keyboard shortcuts help */}
            <KeyboardShortcutsDialog />
            
            <Separator orientation="vertical" className="h-6" />
            
            <Button
              variant="ghost"
              size="sm"
              onClick={onSave}
              disabled={isSaving}
            >
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? "Sauvegarde..." : "Sauvegarder"}
            </Button>

            <Button
              size="sm"
              onClick={onPublish}
              disabled={isPublishing}
            >
              <Upload className="mr-2 h-4 w-4" />
              {isPublishing ? "Publication..." : "Publier"}
            </Button>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
