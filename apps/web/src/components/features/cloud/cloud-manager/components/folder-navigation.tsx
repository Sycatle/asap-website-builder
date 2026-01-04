"use client"

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  FolderPlus, 
  Home, 
  ChevronDown,
  Folder,
  Globe,
  Lock,
  Eye,
} from "lucide-react";
import type { FileFolder, FileVisibility } from '@/lib/types';

interface FolderNavigationProps {
  currentFolder: FileFolder | null;
  folders: FileFolder[];
  breadcrumbPath: FileFolder[];
  websiteName?: string;
  onNavigate: (folderId: string | null) => void;
  onCreateFolder: (name: string) => void;
  isCreating?: boolean;
}

/**
 * Folder navigation with breadcrumbs and creation dialog
 */
export function FolderNavigation({
  currentFolder,
  folders,
  breadcrumbPath,
  websiteName,
  onNavigate,
  onCreateFolder,
  isCreating = false,
}: FolderNavigationProps) {
  const { t } = useTranslation(['common', 'dashboard']);
  const [newFolderName, setNewFolderName] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      onCreateFolder(newFolderName.trim());
      setNewFolderName('');
      setIsDialogOpen(false);
    }
  };

  const getVisibilityIcon = (visibility?: FileVisibility) => {
    switch (visibility) {
      case 'public':
        return <Eye className="h-3 w-3 text-green-500" />;
      case 'website':
        return <Globe className="h-3 w-3 text-blue-500" />;
      default:
        return <Lock className="h-3 w-3 text-muted-foreground" />;
    }
  };

  return (
    <div className="flex items-center justify-between gap-4 py-2">
      {/* Breadcrumb Navigation */}
      <Breadcrumb className="flex-1">
        <BreadcrumbList>
          {/* Root / Website name */}
          <BreadcrumbItem>
            <BreadcrumbLink 
              onClick={() => onNavigate(null)}
              className="flex items-center gap-1.5 cursor-pointer hover:text-foreground transition-colors"
            >
              {websiteName ? (
                <>
                  <Globe className="h-4 w-4" />
                  <span className="hidden sm:inline">{websiteName}</span>
                </>
              ) : (
                <>
                  <Home className="h-4 w-4" />
                  <span className="hidden sm:inline">{t('dashboard:cloud.folders.root')}</span>
                </>
              )}
            </BreadcrumbLink>
          </BreadcrumbItem>

          {/* Path segments */}
          {breadcrumbPath.map((folder, index) => (
            <span key={folder.id} className="contents">
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {index === breadcrumbPath.length - 1 ? (
                  <BreadcrumbPage className="flex items-center gap-1.5">
                    <Folder className="h-4 w-4" />
                    {folder.name}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink
                    onClick={() => onNavigate(folder.id)}
                    className="flex items-center gap-1.5 cursor-pointer hover:text-foreground transition-colors"
                  >
                    <Folder className="h-4 w-4" />
                    {folder.name}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </span>
          ))}
        </BreadcrumbList>
      </Breadcrumb>

      {/* Folder selector dropdown for mobile */}
      {folders.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="sm:hidden">
              <Folder className="h-4 w-4 mr-1" />
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => onNavigate(null)}>
              <Home className="h-4 w-4 mr-2" />
              {t('dashboard:cloud.folders.root')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {folders.map((folder) => (
              <DropdownMenuItem 
                key={folder.id} 
                onClick={() => onNavigate(folder.id)}
                className="flex items-center justify-between"
              >
                <span className="flex items-center gap-2">
                  <Folder className="h-4 w-4" />
                  {folder.name}
                </span>
                <span className="text-xs text-muted-foreground">
                  {folder.file_count}
                </span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {/* Create Folder Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <FolderPlus className="h-4 w-4" />
            <span className="hidden sm:inline">{t('dashboard:cloud.folders.create')}</span>
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('dashboard:cloud.folders.createTitle')}</DialogTitle>
            <DialogDescription>
              {currentFolder 
                ? t('dashboard:cloud.folders.createIn', { folder: currentFolder.name })
                : t('dashboard:cloud.folders.createInRoot')
              }
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder={t('dashboard:cloud.folders.namePlaceholder')}
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleCreateFolder();
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              {t('common:actions.cancel')}
            </Button>
            <Button 
              onClick={handleCreateFolder} 
              disabled={!newFolderName.trim() || isCreating}
            >
              {isCreating ? t('common:status.creating') : t('common:actions.create')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
