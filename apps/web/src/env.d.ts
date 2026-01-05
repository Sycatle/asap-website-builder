/// <reference types="astro/client" />

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface PWAState {
  isInstalled: boolean;
  isOnline: boolean;
  isServiceWorkerSupported: boolean;
  installPrompt?: BeforeInstallPromptEvent;
  registration?: ServiceWorkerRegistration;
}

interface Navigator {
  standalone?: boolean;
  setAppBadge?: (count?: number) => Promise<void>;
  clearAppBadge?: () => Promise<void>;
}

interface Window {
  __ASAP_PWA__: PWAState;
}

interface WindowEventMap {
  'pwa-install-available': CustomEvent<void>;
  'pwa-installed': CustomEvent<void>;
  'pwa-update-available': CustomEvent<void>;
  'pwa-online-status': CustomEvent<{ online: boolean }>;
  'pwa-new-notifications': CustomEvent<{ count: number }>;
  'beforeinstallprompt': BeforeInstallPromptEvent;
}
