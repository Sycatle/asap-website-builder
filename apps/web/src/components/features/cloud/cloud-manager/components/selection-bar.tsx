"use client"

import { useTranslation } from 'react-i18next';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  CheckCircle2,
  Download,
  Trash2,
  X,
} from "lucide-react";
import type { SelectionBarProps } from "../types";

/**
 * Floating selection action bar
 */
export function SelectionBar({
  selectedCount,
  onSelectAll,
  onDownloadSelected,
  onDeleteSelected,
  onClearSelection,
}: SelectionBarProps) {
  const { t } = useTranslation(['common', 'dashboard']);

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up">
      <Card className="shadow-2xl border-primary bg-background/95 backdrop-blur-sm">
        <CardContent className="flex items-center gap-2 sm:gap-4 p-2 sm:p-3">
          {/* Selection count */}
          <div className="flex items-center gap-2 px-2 sm:px-3 py-1 bg-primary/10 rounded-lg">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <span className="text-xs sm:text-sm font-medium">
              {selectedCount} <span className="hidden sm:inline">{t('dashboard:cloud.selection.count', { count: selectedCount })}</span>
            </span>
          </div>
          
          <div className="h-6 w-px bg-border hidden sm:block" />
          
          {/* Actions */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 sm:px-3 text-xs gap-1"
              onClick={onSelectAll}
              title={t('dashboard:cloud.selection.selectAll')}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('dashboard:cloud.selection.all')}</span>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 sm:px-3 text-xs gap-1"
              onClick={onDownloadSelected}
              title={t('dashboard:cloud.selection.downloadSelection')}
            >
              <Download className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('dashboard:cloud.contextMenu.download')}</span>
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 sm:px-3 text-xs text-destructive hover:text-destructive hover:bg-destructive/10 gap-1"
              onClick={onDeleteSelected}
              title={t('dashboard:cloud.selection.deleteSelection')}
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('common:actions.delete')}</span>
            </Button>
          </div>
          
          <div className="h-6 w-px bg-border" />
          
          {/* Close */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={onClearSelection}
            title={t('dashboard:cloud.selection.clearSelection')}
          >
            <X className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
