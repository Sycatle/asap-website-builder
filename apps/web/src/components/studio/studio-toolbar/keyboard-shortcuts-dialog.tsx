"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Keyboard } from "lucide-react";

interface ShortcutItem {
  keys: string[];
  description: string;
  category: string;
}

const SHORTCUTS: ShortcutItem[] = [
  // General
  { keys: ["Ctrl", "S"], description: "Sauvegarder", category: "Général" },
  { keys: ["Ctrl", "Z"], description: "Annuler", category: "Général" },
  { keys: ["Ctrl", "Y"], description: "Refaire", category: "Général" },
  { keys: ["Ctrl", "Shift", "Z"], description: "Refaire (alt)", category: "Général" },
  { keys: ["Esc"], description: "Désélectionner", category: "Général" },
  
  // Element actions
  { keys: ["Del"], description: "Supprimer l'élément", category: "Éléments" },
  { keys: ["⌫"], description: "Supprimer l'élément", category: "Éléments" },
  { keys: ["Ctrl", "D"], description: "Dupliquer l'élément", category: "Éléments" },
  { keys: ["Ctrl", "H"], description: "Masquer/Afficher", category: "Éléments" },
  { keys: ["Ctrl", "↑"], description: "Monter l'élément", category: "Éléments" },
  { keys: ["Ctrl", "↓"], description: "Descendre l'élément", category: "Éléments" },
];

// Group shortcuts by category
function groupByCategory(shortcuts: ShortcutItem[]): Record<string, ShortcutItem[]> {
  return shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, ShortcutItem[]>);
}

function KeyboardKey({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center min-w-[24px] h-6 px-1.5 text-xs font-medium text-foreground bg-muted border border-border rounded shadow-sm">
      {children}
    </kbd>
  );
}

export function KeyboardShortcutsDialog() {
  const [open, setOpen] = useState(false);
  const grouped = groupByCategory(SHORTCUTS);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          title="Raccourcis clavier"
        >
          <Keyboard className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            Raccourcis clavier
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          {Object.entries(grouped).map(([category, shortcuts]) => (
            <div key={category} className="space-y-3">
              <h4 className="text-sm font-medium text-muted-foreground">
                {category}
              </h4>
              <div className="space-y-2">
                {shortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between"
                  >
                    <span className="text-sm">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, keyIndex) => (
                        <React.Fragment key={keyIndex}>
                          {keyIndex > 0 && (
                            <span className="text-muted-foreground text-xs">+</span>
                          )}
                          <KeyboardKey>{key}</KeyboardKey>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="text-xs text-muted-foreground text-center pt-2 border-t">
          Appuyez sur <KeyboardKey>?</KeyboardKey> pour afficher ce dialogue
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default KeyboardShortcutsDialog;
