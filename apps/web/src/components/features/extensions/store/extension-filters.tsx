/**
 * Extension Filters Component
 * 
 * Search and filter controls for the extension store.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Search, X, SlidersHorizontal } from 'lucide-react';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import type { StoreListParams } from '@/lib/api/store';

// Simple debounce hook
function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

interface ExtensionFiltersProps {
  filters: StoreListParams;
  onChange: (filters: StoreListParams) => void;
  categories?: { slug: string; name: string }[];
}

const SORT_OPTIONS = [
  { value: 'popular', label: 'Most Popular' },
  { value: 'newest', label: 'Newest' },
  { value: 'rating', label: 'Top Rated' },
  { value: 'name', label: 'Alphabetical' },
] as const;

const PLAN_OPTIONS = [
  { value: '', label: 'All Plans' },
  { value: 'free', label: 'Free' },
  { value: 'starter', label: 'Starter & below' },
  { value: 'pro', label: 'Pro & below' },
  { value: 'business', label: 'Business' },
] as const;

export function ExtensionFilters({
  filters,
  onChange,
  categories = [],
}: ExtensionFiltersProps) {
  const [searchValue, setSearchValue] = useState(filters.search || '');
  const debouncedSearchValue = useDebouncedValue(searchValue, 300);
  const prevSearchRef = useRef(searchValue);

  // Apply debounced search value
  useEffect(() => {
    // Only trigger change if debounced value actually changed
    if (prevSearchRef.current !== debouncedSearchValue) {
      prevSearchRef.current = debouncedSearchValue;
      onChange({ ...filters, search: debouncedSearchValue || undefined, page: 1 });
    }
  }, [debouncedSearchValue, filters, onChange]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchValue(e.target.value);
  };

  const handleClearSearch = () => {
    setSearchValue('');
    onChange({ ...filters, search: undefined, page: 1 });
  };

  const handleSortChange = (value: string) => {
    onChange({ ...filters, sort: value as StoreListParams['sort'], page: 1 });
  };

  const handleCategoryChange = (value: string) => {
    onChange({ ...filters, category: value || undefined, page: 1 });
  };

  const handlePlanChange = (value: string) => {
    onChange({ ...filters, plan: value || undefined, page: 1 });
  };

  const handleBetaChange = (checked: boolean) => {
    onChange({ ...filters, include_beta: checked || undefined });
  };

  const handleFeaturedChange = (checked: boolean) => {
    onChange({ ...filters, featured: checked || undefined, page: 1 });
  };

  const hasActiveFilters = !!(
    filters.category || 
    filters.plan || 
    filters.featured || 
    filters.include_beta
  );

  const clearAllFilters = () => {
    setSearchValue('');
    onChange({ sort: 'popular', page: 1 });
  };

  return (
    <div className="space-y-4">
      {/* Main controls row */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search extensions..."
            value={searchValue}
            onChange={handleSearchChange}
            className="pl-9 pr-9"
          />
          {searchValue && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
              onClick={handleClearSearch}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Sort */}
        <Select value={filters.sort || 'popular'} onValueChange={handleSortChange}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Advanced Filters Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <SlidersHorizontal className="w-4 h-4" />
              Filters
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-primary" />
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80" align="end">
            <div className="space-y-4">
              <h4 className="font-medium">Filters</h4>
              
              {/* Category */}
              {categories.length > 0 && (
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select 
                    value={filters.category || ''} 
                    onValueChange={handleCategoryChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All categories</SelectItem>
                      {categories.map(cat => (
                        <SelectItem key={cat.slug} value={cat.slug}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Plan */}
              <div className="space-y-2">
                <Label>Plan Required</Label>
                <Select 
                  value={filters.plan || ''} 
                  onValueChange={handlePlanChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All Plans" />
                  </SelectTrigger>
                  <SelectContent>
                    {PLAN_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Toggles */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="featured" className="cursor-pointer">
                    Featured only
                  </Label>
                  <Switch
                    id="featured"
                    checked={filters.featured || false}
                    onCheckedChange={handleFeaturedChange}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="beta" className="cursor-pointer">
                    Include beta
                  </Label>
                  <Switch
                    id="beta"
                    checked={filters.include_beta || false}
                    onCheckedChange={handleBetaChange}
                  />
                </div>
              </div>

              {/* Clear all */}
              {hasActiveFilters && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full"
                  onClick={clearAllFilters}
                >
                  Clear all filters
                </Button>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
