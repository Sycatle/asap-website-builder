/**
 * V1 MVP: Onboarding Modal
 * 
 * Full-screen modal that launches the preset-based onboarding flow.
 * All site creation MUST go through this modal.
 */

"use client"

import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { PresetOnboardingRouter } from './presets';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (websiteId: string) => void;
}

export function OnboardingModal({ isOpen, onClose, onSuccess }: OnboardingModalProps) {
  const handleComplete = (websiteId: string) => {
    onSuccess?.(websiteId);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className="max-w-4xl w-full h-[90vh] max-h-[900px] p-0 overflow-hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <VisuallyHidden>
          <DialogTitle>Créer un nouveau site</DialogTitle>
        </VisuallyHidden>
        <div className="h-full overflow-y-auto">
          <PresetOnboardingRouter onComplete={handleComplete} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default OnboardingModal;
