"use client"

import React, { Fragment } from 'react';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { getElementIcon, getElementLabel } from "@/lib/constants/elements";
import {
  EyeOff,
  GripVertical,
  Layers,
  Plus,
  Home,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ElementListProps } from "../types";

/**
 * ElementList - Sidebar component showing all elements for the current page
 * Supports drag and drop reordering (desktop only)
 */
export function ElementList({
  elements,
  currentPage,
  selectedElementId,
  dragOverIndex,
  isLoading,
  isMobile,
  onElementClick,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onAddClick,
}: ElementListProps) {
  // Sort elements and filter out any invalid ones
  const sortedElements = [...elements]
    .filter(e => e && e.id)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  return (
    <div className="flex flex-col h-full" role="region" aria-label="Liste des éléments">
      {/* Header */}
      <div className="sticky top-0 z-10 p-3 sm:p-4 border-b bg-background flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-sm flex items-center gap-2" id="elements-title">
            <Layers className="h-4 w-4" aria-hidden="true" />
            Éléments
          </h3>
          {currentPage && (
            <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
              {currentPage.is_homepage && <Home className="h-3 w-3" aria-hidden="true" />}
              {currentPage.title || (currentPage.slug === '' ? 'Accueil' : `/${currentPage.slug}`)}
            </p>
          )}
        </div>
        <Button
          variant="default"
          size="sm"
          onClick={onAddClick}
          className="h-8"
          aria-label="Ajouter un nouvel élément"
        >
          <Plus className="h-4 w-4 mr-1" aria-hidden="true" />
          <span className="hidden sm:inline">Ajouter</span>
        </Button>
      </div>
      
      {/* Element list */}
      <ScrollArea className="flex-1 p-2">
        {isLoading ? (
          <ElementListSkeleton />
        ) : sortedElements.length === 0 ? (
          <EmptyElementList onAddClick={onAddClick} />
        ) : (
          <ElementItems
            elements={sortedElements}
            selectedElementId={selectedElementId}
            dragOverIndex={dragOverIndex}
            isMobile={isMobile}
            onElementClick={onElementClick}
            onDragStart={onDragStart}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
          />
        )}
      </ScrollArea>
    </div>
  );
}

/**
 * ElementListSkeleton - Loading state for element list
 */
function ElementListSkeleton() {
  return (
    <div className="space-y-2" role="status" aria-label="Chargement des éléments">
      {[1, 2, 3].map(i => (
        <Skeleton key={i} className="h-14 w-full rounded-lg" />
      ))}
      <span className="sr-only">Chargement des éléments...</span>
    </div>
  );
}

/**
 * EmptyElementList - Empty state when no elements exist
 */
function EmptyElementList({ onAddClick }: { onAddClick: () => void }) {
  return (
    <div className="text-center py-12 text-muted-foreground" role="status">
      <Layers className="h-10 w-10 mx-auto mb-3 opacity-50" aria-hidden="true" />
      <p className="text-sm font-medium">Aucun élément</p>
      <p className="text-xs mt-1 mb-4">Commencez par ajouter votre premier élément</p>
      <Button
        variant="outline"
        size="sm"
        onClick={onAddClick}
        aria-label="Ajouter votre premier élément"
      >
        <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
        Ajouter un élément
      </Button>
    </div>
  );
}

/**
 * ElementItems - List of element items with drag and drop
 */
function ElementItems({
  elements,
  selectedElementId,
  dragOverIndex,
  isMobile,
  onElementClick,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
}: {
  elements: ElementListProps['elements'];
  selectedElementId: string | null;
  dragOverIndex: number | null;
  isMobile: boolean;
  onElementClick: ElementListProps['onElementClick'];
  onDragStart: ElementListProps['onDragStart'];
  onDragOver: ElementListProps['onDragOver'];
  onDragLeave: ElementListProps['onDragLeave'];
  onDrop: ElementListProps['onDrop'];
}) {
  return (
    <div className="space-y-1" role="listbox" aria-labelledby="elements-title" aria-activedescendant={selectedElementId || undefined}>
      {elements.map((element, index) => {
        const Icon = getElementIcon(element.element_type);
        const isSelected = selectedElementId === element.id;
        const isDragOver = dragOverIndex === index;
        const elementLabel = element.title || getElementLabel(element.element_type);
        
        return (
          <Fragment key={element.id}>
            <button
              id={element.id}
              role="option"
              aria-selected={isSelected}
              aria-label={`${elementLabel}${!element.visible ? ' (masqué)' : ''}, ${getElementLabel(element.element_type)}`}
              draggable={!isMobile}
              onDragStart={(e) => onDragStart(e, element.id)}
              onDragOver={(e) => onDragOver(e, index)}
              onDragLeave={onDragLeave}
              onDrop={(e) => onDrop(e, index)}
              onClick={() => onElementClick(element)}
              className={cn(
                "w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left",
                "hover:bg-accent/50 active:scale-[0.98]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
                isSelected && "bg-accent ring-2 ring-primary shadow-sm",
                isDragOver && "border-t-2 border-primary",
                !element.visible && "opacity-50"
              )}
            >
              {!isMobile && (
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab shrink-0" aria-hidden="true" />
              )}
              <div className={cn(
                "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
                isSelected ? "bg-primary text-primary-foreground" : "bg-muted"
              )} aria-hidden="true">
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">
                  {elementLabel}
                </p>
                <p className="text-xs text-muted-foreground capitalize">
                  {getElementLabel(element.element_type)}
                </p>
              </div>
              {!element.visible && (
                <EyeOff className="h-4 w-4 text-muted-foreground shrink-0" aria-label="Élément masqué" />
              )}
            </button>
          </Fragment>
        );
      })}
      
      {/* Desktop drag hint */}
      {!isMobile && elements.length > 1 && (
        <p key="drag-hint" className="text-[10px] text-muted-foreground text-center mt-3 px-2">
          <GripVertical className="h-3 w-3 inline mr-1" aria-hidden="true" />
          Glissez pour réorganiser
        </p>
      )}
    </div>
  );
}

export default ElementList;
