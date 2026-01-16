"use client";

import * as React from "react";
import { useState } from "react";
import type { WebsiteElement } from "@/lib/types/element";
import type { UpdateElementRequest } from "@/lib/types/element";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { 
  X, 
  MousePointerClick, 
  Palette, 
  Settings2,
  Variable,
  Database,
  FileText,
  Sparkles,
  Type,
  LayoutGrid,
} from "lucide-react";
import { GeneralProperties } from "./general-properties";
import { ContentProperties } from "./content-properties";
import { cn } from "@/lib/utils";

// ============================================
// Types
// ============================================

interface PropertiesPanelProps {
  element: WebsiteElement | null;
  onUpdate: (elementId: string, data: UpdateElementRequest) => Promise<void>;
  onClose?: () => void;
}

// ============================================
// Element Type Labels & Icons
// ============================================

const ELEMENT_TYPE_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  landing_hero: { label: "Hero", icon: Sparkles, color: "bg-amber-500/10 text-amber-600" },
  landing_features: { label: "Fonctionnalités", icon: LayoutGrid, color: "bg-blue-500/10 text-blue-600" },
  landing_pricing: { label: "Tarifs", icon: FileText, color: "bg-green-500/10 text-green-600" },
  landing_testimonials: { label: "Témoignages", icon: FileText, color: "bg-purple-500/10 text-purple-600" },
  landing_cta: { label: "Call to Action", icon: Sparkles, color: "bg-rose-500/10 text-rose-600" },
  landing_faq: { label: "FAQ", icon: FileText, color: "bg-cyan-500/10 text-cyan-600" },
  landing_footer: { label: "Pied de page", icon: FileText, color: "bg-slate-500/10 text-slate-600" },
  landing_about: { label: "À propos", icon: Type, color: "bg-indigo-500/10 text-indigo-600" },
  landing_services: { label: "Services", icon: LayoutGrid, color: "bg-teal-500/10 text-teal-600" },
  landing_contact: { label: "Contact", icon: FileText, color: "bg-orange-500/10 text-orange-600" },
  landing_process: { label: "Processus", icon: FileText, color: "bg-violet-500/10 text-violet-600" },
  landing_how_it_works: { label: "Comment ça marche", icon: FileText, color: "bg-emerald-500/10 text-emerald-600" },
  landing_proof: { label: "Preuves sociales", icon: FileText, color: "bg-pink-500/10 text-pink-600" },
  navigation: { label: "Navigation", icon: FileText, color: "bg-gray-500/10 text-gray-600" },
};

function getElementTypeConfig(elementType: string) {
  return ELEMENT_TYPE_CONFIG[elementType] || {
    label: elementType.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
    icon: FileText,
    color: "bg-muted text-muted-foreground",
  };
}

// ============================================
// Quick Tips Component
// ============================================

function QuickTips() {
  return (
    <div className="p-3 bg-muted/30 rounded-lg border border-dashed space-y-2">
      <p className="text-xs font-medium flex items-center gap-1.5">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        Astuces
      </p>
      <div className="space-y-1.5 text-xs text-muted-foreground">
        <p className="flex items-center gap-2">
          <Variable className="h-3 w-3 shrink-0" />
          <span>Utilisez <code className="bg-muted px-1 rounded">{"{{variable}}"}</code> dans les textes</span>
        </p>
        <p className="flex items-center gap-2">
          <Database className="h-3 w-3 shrink-0" />
          <span>Liez les listes à vos collections de données</span>
        </p>
      </div>
    </div>
  );
}

// ============================================
// Empty State Component
// ============================================

function EmptyState() {
  return (
    <div className="flex h-full items-center justify-center p-6">
      <div className="text-center space-y-4 max-w-xs">
        <div className="mx-auto w-14 h-14 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
          <MousePointerClick className="h-7 w-7 text-primary" />
        </div>
        <div>
          <p className="text-sm font-medium">Aucun élément sélectionné</p>
          <p className="text-xs text-muted-foreground mt-1">
            Cliquez sur un élément dans la preview ou la sidebar pour modifier ses propriétés
          </p>
        </div>
        
        {/* Keyboard Shortcuts */}
        <div className="pt-4 border-t text-xs text-muted-foreground space-y-2">
          <p className="font-medium">Raccourcis clavier</p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">Ctrl+Z</kbd>
              <span>Annuler</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">Del</kbd>
              <span>Supprimer</span>
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">Ctrl+D</kbd>
              <span>Dupliquer</span>
            </span>
          </div>
        </div>
        
        {/* Quick Tips */}
        <div className="pt-4">
          <QuickTips />
        </div>
      </div>
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function PropertiesPanel({
  element,
  onUpdate,
  onClose,
}: PropertiesPanelProps) {
  const [activeTab, setActiveTab] = useState<string>("content");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  // Animate in when element is selected
  React.useEffect(() => {
    if (element) {
      // Small delay to ensure DOM is ready for animation
      const timer = setTimeout(() => setIsVisible(true), 10);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [element?.id]);

  if (!element) {
    return <EmptyState />;
  }

  const elementConfig = getElementTypeConfig(element.element_type);
  const ElementIcon = elementConfig.icon;

  const handleUpdate = async (updates: Partial<UpdateElementRequest>) => {
    setIsUpdating(true);
    try {
      await onUpdate(element.id, updates as UpdateElementRequest);
    } catch (error) {
      console.error("Failed to update element:", error);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div 
      className={cn(
        "absolute inset-0 flex flex-col transition-all duration-300 ease-out",
        isVisible 
          ? "opacity-100 translate-x-0" 
          : "opacity-0 translate-x-4"
      )}
    >
      {/* Header */}
      <div 
        className={cn(
          "flex-none border-b px-4 py-3 transition-all duration-300 delay-75",
          isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div 
              className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center transition-transform duration-300 delay-100",
                elementConfig.color,
                isVisible ? "scale-100" : "scale-90"
              )}
            >
              <ElementIcon className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold">{elementConfig.label}</h3>
              <p className="text-xs text-muted-foreground">
                {element.title || "Sans titre"}
              </p>
            </div>
          </div>
          {onClose && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
        <div 
          className={cn(
            "flex-none border-b px-2 transition-all duration-300 delay-100",
            isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
          )}
        >
          <TabsList className="w-full h-10 bg-transparent p-0 gap-1">
            <TabsTrigger 
              value="content" 
              className="flex-1 h-9 data-[state=active]:bg-muted rounded-md gap-1.5"
            >
              <Type className="h-3.5 w-3.5" />
              Contenu
            </TabsTrigger>
            <TabsTrigger 
              value="style" 
              className="flex-1 h-9 data-[state=active]:bg-muted rounded-md gap-1.5" 
              disabled
            >
              <Palette className="h-3.5 w-3.5" />
              Style
            </TabsTrigger>
            <TabsTrigger 
              value="settings" 
              className="flex-1 h-9 data-[state=active]:bg-muted rounded-md gap-1.5" 
              disabled
            >
              <Settings2 className="h-3.5 w-3.5" />
              Options
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Scrollable content area */}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {/* Content Tab */}
          <TabsContent value="content" className="mt-0 data-[state=inactive]:hidden">
            <div className="p-4 space-y-6 pb-8">
              {/* Quick Tips (collapsible) */}
              <QuickTips />
              
              {/* General Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Général
                  </h4>
                </div>
                <GeneralProperties
                  element={element}
                  onUpdate={handleUpdate}
                  isUpdating={isUpdating}
                />
              </div>

              {/* Content Section - Dynamic based on element type */}
              <div className="space-y-3">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Propriétés
                </h4>
                <ContentProperties
                  element={element}
                  onUpdate={handleUpdate}
                  isUpdating={isUpdating}
                />
              </div>
            </div>
          </TabsContent>

          {/* Style Tab (Placeholder for future) */}
          <TabsContent value="style" className="mt-0">
            <div className="flex h-full items-center justify-center p-6">
              <div className="text-center space-y-3">
                <div className="mx-auto w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <Palette className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Personnalisation du style</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Couleurs, espacements et typographie — bientôt disponible
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* Settings Tab (Placeholder for future) */}
          <TabsContent value="settings" className="mt-0">
            <div className="flex h-full items-center justify-center p-6">
              <div className="text-center space-y-3">
                <div className="mx-auto w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <Settings2 className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Paramètres avancés</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Animations, visibilité conditionnelle — bientôt disponible
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
