"use client"

import { useTranslation } from 'react-i18next';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { 
  Search, 
  Filter, 
  X,
  Globe,
  Lock,
  Eye,
  Image,
  FileText,
  Video,
  Music,
  Archive,
} from "lucide-react";
import type { FileVisibility } from '@/lib/types';

interface FileFiltersProps {
  search: string;
  visibility: FileVisibility | 'all';
  mimeTypeFilter: string | 'all';
  onSearchChange: (value: string) => void;
  onVisibilityChange: (value: FileVisibility | 'all') => void;
  onMimeTypeChange: (value: string | 'all') => void;
  activeFiltersCount: number;
  onClearFilters: () => void;
}

const MIME_TYPE_GROUPS = [
  { value: 'all', label: 'All Types', icon: FileText },
  { value: 'image/', label: 'Images', icon: Image },
  { value: 'video/', label: 'Videos', icon: Video },
  { value: 'audio/', label: 'Audio', icon: Music },
  { value: 'application/pdf', label: 'PDFs', icon: FileText },
  { value: 'application/zip', label: 'Archives', icon: Archive },
];

/**
 * File filtering controls
 */
export function FileFilters({
  search,
  visibility,
  mimeTypeFilter,
  onSearchChange,
  onVisibilityChange,
  onMimeTypeChange,
  activeFiltersCount,
  onClearFilters,
}: FileFiltersProps) {
  const { t } = useTranslation(['common', 'dashboard']);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Search Input */}
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t('dashboard:cloud.search.placeholder')}
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9 pr-8"
        />
        {search && (
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
            onClick={() => onSearchChange('')}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Visibility Filter */}
      <Select value={visibility} onValueChange={(v) => onVisibilityChange(v as FileVisibility | 'all')}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder={t('dashboard:cloud.filters.visibility')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">
            <span className="flex items-center gap-2">
              <Filter className="h-4 w-4" />
              {t('dashboard:cloud.filters.all')}
            </span>
          </SelectItem>
          <SelectItem value="private">
            <span className="flex items-center gap-2">
              <Lock className="h-4 w-4" />
              {t('dashboard:cloud.visibility.private')}
            </span>
          </SelectItem>
          <SelectItem value="public">
            <span className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-green-500" />
              {t('dashboard:cloud.visibility.public')}
            </span>
          </SelectItem>
          <SelectItem value="website">
            <span className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-blue-500" />
              {t('dashboard:cloud.visibility.website')}
            </span>
          </SelectItem>
        </SelectContent>
      </Select>

      {/* MIME Type Filter */}
      <Select value={mimeTypeFilter} onValueChange={onMimeTypeChange}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder={t('dashboard:cloud.filters.type')} />
        </SelectTrigger>
        <SelectContent>
          {MIME_TYPE_GROUPS.map((group) => (
            <SelectItem key={group.value} value={group.value}>
              <span className="flex items-center gap-2">
                <group.icon className="h-4 w-4" />
                {group.label}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Active Filters Badge */}
      {activeFiltersCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearFilters}
          className="gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <Badge variant="secondary" className="h-5 px-1.5">
            {activeFiltersCount}
          </Badge>
          {t('dashboard:cloud.filters.clear')}
          <X className="h-3 w-3" />
        </Button>
      )}
    </div>
  );
}
