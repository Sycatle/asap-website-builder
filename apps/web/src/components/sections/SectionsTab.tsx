"use client"

import { useState, useCallback } from 'react';
import type { Section, CreateSectionRequest, UpdateSectionRequest } from '@/lib/api';
import { useSections } from '@/hooks/useSections';
import { SectionCard } from '@/components/sections/SectionCard';
import { AddSectionModal } from '@/components/sections/AddSectionModal';
import { SectionEditor } from '@/components/sections/SectionEditor';
import { EmptyState } from '@/components/EmptyState';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Plus,
  Layers,
  Loader2,
  RefreshCw,
  ArrowUpDown,
} from "lucide-react";

interface SectionsTabProps {
  websiteId: string | null;
}

export function SectionsTab({ websiteId }: SectionsTabProps) {
  const {
    sections,
    isLoading,
    error,
    refetch,
    createSection,
    updateSection,
    deleteSection,
    reorderSections,
    isReordering,
  } = useSections(websiteId);

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  // Add section handler
  const handleAddSection = useCallback(async (data: CreateSectionRequest) => {
    try {
      await createSection(data);
    } catch (error) {
      throw error; // Re-throw to let modal handle error
    }
  }, [createSection]);

  // Edit section handler
  const handleEditSection = useCallback((section: Section) => {
    setEditingSection(section);
  }, []);

  // Save section handler
  const handleSaveSection = useCallback(async (sectionId: string, data: UpdateSectionRequest) => {
    await updateSection(sectionId, data);
    setEditingSection(null);
  }, [updateSection]);

  // Delete section handler
  const handleDeleteSection = useCallback(async (sectionId: string) => {
    await deleteSection(sectionId);
    toast.success('Section supprimée');
  }, [deleteSection]);

  // Visibility change handler
  const handleVisibilityChange = useCallback(async (sectionId: string, visible: boolean) => {
    await updateSection(sectionId, { visible });
    toast.success(visible ? 'Section affichée' : 'Section masquée');
  }, [updateSection]);

  // Drag and drop state
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Drag and drop handlers
  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDragLeave = () => {
    setDragOverIndex(null);
  };

  const handleDrop = async (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    setDragOverIndex(null);

    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      return;
    }

    // Calculate new order
    const newSections = [...sections];
    const [removed] = newSections.splice(draggedIndex, 1);
    newSections.splice(targetIndex, 0, removed);

    // Get new order of IDs
    const newOrder = newSections.map(s => s.id);

    try {
      await reorderSections(newOrder);
      toast.success('Ordre mis à jour');
    } catch (error) {
      toast.error("Erreur lors du réordonnement");
    }

    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-5 w-5" />
                  <Skeleton className="h-10 w-10 rounded-lg" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-6 w-10 rounded-full" />
                  <Skeleton className="h-8 w-8 rounded" />
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <EmptyState
        icon={<Layers className="h-12 w-12" />}
        title="Erreur de chargement"
        description={error}
        action={
          <Button onClick={() => refetch()} variant="outline" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Réessayer
          </Button>
        }
      />
    );
  }

  // No website selected
  if (!websiteId) {
    return (
      <EmptyState
        icon={<Layers className="h-12 w-12" />}
        title="Aucun site sélectionné"
        description="Sélectionnez un site pour gérer ses sections"
      />
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold">Sections</h3>
          <Badge variant="outline" className="text-xs">
            {sections.length} section{sections.length !== 1 ? 's' : ''}
          </Badge>
          {isReordering && (
            <Badge variant="secondary" className="gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Réorganisation...
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => refetch()}
            disabled={isLoading}
            className="h-9 w-9"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button onClick={() => setShowAddModal(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Ajouter une section</span>
            <span className="sm:hidden">Ajouter</span>
          </Button>
        </div>
      </div>

      {/* Sections List */}
      {sections.length === 0 ? (
        <EmptyState
          icon={<Layers className="h-12 w-12" />}
          title="Aucune section"
          description="Ajoutez votre première section pour commencer à construire votre site"
          action={
            <Button onClick={() => setShowAddModal(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Ajouter une section
            </Button>
          }
        />
      ) : (
        <div className="space-y-2">
          {/* Drag hint */}
          <p className="text-xs text-muted-foreground flex items-center gap-1.5">
            <ArrowUpDown className="h-3 w-3" />
            Glissez-déposez les sections pour les réordonner
          </p>

          {/* Section cards */}
          <div className="space-y-2">
            {sections.map((section, index) => (
              <div
                key={section.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`transition-transform ${
                  dragOverIndex === index ? 'border-t-2 border-primary pt-2' : ''
                }`}
              >
                <SectionCard
                  section={section}
                  onEdit={handleEditSection}
                  onDelete={handleDeleteSection}
                  onVisibilityChange={handleVisibilityChange}
                  isDragging={draggedIndex === index}
                  dragHandleProps={{
                    onMouseDown: () => {},
                    style: { cursor: 'grab' },
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Section Modal */}
      <AddSectionModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddSection}
        existingSectionsCount={sections.length}
      />

      {/* Section Editor Sheet */}
      <SectionEditor
        section={editingSection}
        isOpen={!!editingSection}
        onClose={() => setEditingSection(null)}
        onSave={handleSaveSection}
      />
    </div>
  );
}
