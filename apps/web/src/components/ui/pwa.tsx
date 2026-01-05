import { useState } from 'react';
import { usePWA } from '../../hooks/usePWA';
import { Button } from './button';
import { Download, Wifi, WifiOff, RefreshCw, Share2, X } from 'lucide-react';

export function PWAInstallButton() {
  const { isInstallable, isInstalled, showIOSInstallInstructions, install } = usePWA();
  const [showIOSModal, setShowIOSModal] = useState(false);

  if (isInstalled) {
    return null;
  }

  // Show iOS install instructions
  if (showIOSInstallInstructions) {
    return (
      <>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowIOSModal(true)}
          className="gap-2"
        >
          <Download className="h-4 w-4" />
          Installer l'app
        </Button>
        
        {showIOSModal && (
          <IOSInstallModal onClose={() => setShowIOSModal(false)} />
        )}
      </>
    );
  }

  // Standard install button for Chrome, Edge, etc.
  if (!isInstallable) {
    return null;
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={install}
      className="gap-2"
    >
      <Download className="h-4 w-4" />
      Installer l'app
    </Button>
  );
}

export function IOSInstallModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div className="relative w-full max-w-md rounded-t-2xl bg-background p-6 shadow-xl sm:rounded-2xl">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full p-1 hover:bg-muted"
          aria-label="Fermer"
        >
          <X className="h-5 w-5" />
        </button>
        
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Download className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold">Installer ASAP</h3>
            <p className="text-sm text-muted-foreground">Sur votre écran d'accueil</p>
          </div>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-lg bg-muted/50 p-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
              1
            </div>
            <div>
              <p className="font-medium">Touchez le bouton Partager</p>
              <p className="text-sm text-muted-foreground">
                En bas de l'écran Safari
              </p>
              <div className="mt-2 flex items-center gap-2 text-primary">
                <Share2 className="h-5 w-5" />
                <span className="text-sm">Icône Partager</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-start gap-3 rounded-lg bg-muted/50 p-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
              2
            </div>
            <div>
              <p className="font-medium">Sélectionnez "Sur l'écran d'accueil"</p>
              <p className="text-sm text-muted-foreground">
                Faites défiler et touchez l'option
              </p>
            </div>
          </div>
          
          <div className="flex items-start gap-3 rounded-lg bg-muted/50 p-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
              3
            </div>
            <div>
              <p className="font-medium">Touchez "Ajouter"</p>
              <p className="text-sm text-muted-foreground">
                En haut à droite de l'écran
              </p>
            </div>
          </div>
        </div>
        
        <Button onClick={onClose} className="mt-6 w-full">
          J'ai compris
        </Button>
      </div>
    </div>
  );  
}

export function PWAStatus() {
  const { isOnline, isUpdateAvailable, update } = usePWA();

  return (
    <div className="flex items-center gap-2">
      {!isOnline && (
        <div className="flex items-center gap-1 text-sm text-yellow-500">
          <WifiOff className="h-4 w-4" />
          <span>Hors ligne</span>
        </div>
      )}
      
      {isOnline && (
        <div className="flex items-center gap-1 text-sm text-green-500">
          <Wifi className="h-4 w-4" />
        </div>
      )}

      {isUpdateAvailable && (
        <Button
          variant="ghost"
          size="sm"
          onClick={update}
          className="gap-1 text-blue-500"
        >
          <RefreshCw className="h-4 w-4" />
          Mise à jour disponible
        </Button>
      )}
    </div>
  );
}

export function PWAPrompt() {
  const { isInstallable, showIOSInstallInstructions, install } = usePWA();
  const [dismissed, setDismissed] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);

  if (dismissed) {
    return null;
  }

  // iOS needs special handling
  if (showIOSInstallInstructions) {
    return (
      <>
        <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-lg border bg-background p-4 shadow-lg md:left-auto md:right-4">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Download className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold">Installer ASAP</h3>
              <p className="text-sm text-muted-foreground">
                Ajoutez l'application à votre écran d'accueil pour un accès rapide.
              </p>
              <div className="mt-3 flex gap-2">
                <Button size="sm" onClick={() => setShowIOSModal(true)}>
                  Comment faire
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setDismissed(true)}>
                  Plus tard
                </Button>
              </div>
            </div>
          </div>
        </div>
        
        {showIOSModal && (
          <IOSInstallModal onClose={() => setShowIOSModal(false)} />
        )}
      </>
    );
  }

  if (!isInstallable) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md rounded-lg border bg-background p-4 shadow-lg md:left-auto md:right-4">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <Download className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold">Installer ASAP</h3>
          <p className="text-sm text-muted-foreground">
            Installez l'application pour un accès rapide et une meilleure expérience.
          </p>
          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={install}>
              Installer
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setDismissed(true)}>
              Plus tard
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Offline indicator banner
export function OfflineBanner() {
  const { isOnline } = usePWA();

  if (isOnline) {
    return null;
  }

  return (
    <div className="fixed left-0 right-0 top-0 z-50 bg-yellow-500 px-4 py-2 text-center text-sm font-medium text-yellow-950">
      <WifiOff className="mr-2 inline-block h-4 w-4" />
      Vous êtes hors ligne. Certaines fonctionnalités peuvent être limitées.
    </div>
  );
}

// Update notification toast
export function UpdateToast() {
  const { isUpdateAvailable, update } = usePWA();
  const [dismissed, setDismissed] = useState(false);

  if (!isUpdateAvailable || dismissed) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex max-w-sm items-center gap-3 rounded-lg border bg-background p-4 shadow-lg">
      <RefreshCw className="h-5 w-5 text-blue-500" />
      <div className="flex-1">
        <p className="text-sm font-medium">Mise à jour disponible</p>
        <p className="text-xs text-muted-foreground">Une nouvelle version est prête</p>
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={update}>
          Actualiser
        </Button>
        <Button size="sm" variant="ghost" onClick={() => setDismissed(true)}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
