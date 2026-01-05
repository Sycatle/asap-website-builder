"use client"

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
  Search, 
  LayoutGrid,
  List,
  Home,
  Folder,
  X,
} from "lucide-react";
import type { FileFolder } from '@/lib/types';
import type { ViewMode } from "../types";

interface ToolbarProps {
  breadcrumbPath: FileFolder[];
  websiteName?: string;
  search: string;
  viewMode: ViewMode;
  onNavigate: (folderId: string | null) => void;
  onSearchChange: (value: string) => void;
  onViewModeChange: (mode: ViewMode) => void;
}

/**
 * Simplified toolbar combining breadcrumb, search and view toggle
 */
export function Toolbar({
  breadcrumbPath,
  websiteName,
  search,
  viewMode,
  onNavigate,
  onSearchChange,
  onViewModeChange,
}: ToolbarProps) {
  const { t } = useTranslation(['common', 'dashboard']);

  return (
    <div className="flex items-center gap-3 py-2">
      {/* Breadcrumb Navigation */}
      <Breadcrumb className="hidden sm:flex flex-shrink-0">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink 
              onClick={() => onNavigate(null)}
              className="flex items-center gap-1.5 cursor-pointer hover:text-foreground"
            >
              <Home className="h-4 w-4" />
              <span className="max-w-[100px] truncate">{websiteName || t('dashboard:cloud.folders.root')}</span>
            </BreadcrumbLink>
          </BreadcrumbItem>
          {breadcrumbPath.map((folder, index) => (
            <span key={folder.id} className="contents">
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {index === breadcrumbPath.length - 1 ? (
                  <BreadcrumbPage className="flex items-center gap-1.5 max-w-[120px] truncate">
                    <Folder className="h-4 w-4 flex-shrink-0" />
                    {folder.name}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink
                    onClick={() => onNavigate(folder.id)}
                    className="flex items-center gap-1.5 cursor-pointer hover:text-foreground max-w-[100px] truncate"
                  >
                    <Folder className="h-4 w-4 flex-shrink-0" />
                    {folder.name}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </span>
          ))}
        </BreadcrumbList>
      </Breadcrumb>

      {/* Mobile: Back button */}
      {breadcrumbPath.length > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const parentIndex = breadcrumbPath.length - 2;
            onNavigate(parentIndex >= 0 ? breadcrumbPath[parentIndex].id : null);
          }}
          className="sm:hidden h-8 px-2"
        >
          ←
        </Button>
      )}

      {/* Search */}
      <div className="relative flex-1 max-w-xs">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t('dashboard:cloud.search.placeholder')}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-8 pl-8 pr-8 text-sm"
        />
        {search && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-0.5 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
            onClick={() => onSearchChange('')}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* View Toggle */}
      <div className="flex items-center border rounded-md">
        <Button
          variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => onViewModeChange('grid')}
          className="h-8 w-8 p-0 rounded-r-none"
        >
          <LayoutGrid className="h-4 w-4" />
        </Button>
        <Button
          variant={viewMode === 'list' ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => onViewModeChange('list')}
          className="h-8 w-8 p-0 rounded-l-none"
        >
          <List className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
