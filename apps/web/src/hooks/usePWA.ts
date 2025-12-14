import { useState, useEffect, useCallback } from 'react';

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

interface UsePWAReturn {
  isInstallable: boolean;
  isInstalled: boolean;
  isOnline: boolean;
  isUpdateAvailable: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isSafari: boolean;
  isChrome: boolean;
  isFirefox: boolean;
  isEdge: boolean;
  isSamsungInternet: boolean;
  displayMode: 'browser' | 'standalone' | 'minimal-ui' | 'fullscreen';
  install: () => Promise<boolean>;
  update: () => void;
  clearCache: () => Promise<void>;
  showIOSInstallInstructions: boolean;
}

// Detect browser and platform
function getBrowserInfo() {
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream;
  const isAndroid = /Android/.test(ua);
  const isSafari = /Safari/.test(ua) && !/Chrome/.test(ua) && !/CriOS/.test(ua);
  const isChrome = /Chrome/.test(ua) && !/Edge/.test(ua) && !/Edg/.test(ua);
  const isFirefox = /Firefox/.test(ua);
  const isEdge = /Edg/.test(ua);
  const isSamsungInternet = /SamsungBrowser/.test(ua);
  
  return { isIOS, isAndroid, isSafari, isChrome, isFirefox, isEdge, isSamsungInternet };
}

// Get current display mode
function getDisplayMode(): 'browser' | 'standalone' | 'minimal-ui' | 'fullscreen' {
  if (window.matchMedia('(display-mode: fullscreen)').matches) return 'fullscreen';
  if (window.matchMedia('(display-mode: standalone)').matches) return 'standalone';
  if (window.matchMedia('(display-mode: minimal-ui)').matches) return 'minimal-ui';
  // iOS Safari standalone check
  if ((window.navigator as any).standalone === true) return 'standalone';
  return 'browser';
}

export function usePWA(): UsePWAReturn {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [displayMode, setDisplayMode] = useState<'browser' | 'standalone' | 'minimal-ui' | 'fullscreen'>('browser');
  
  const browserInfo = getBrowserInfo();

  useEffect(() => {
    // Initialize from global state if available (set by inline script)
    const globalState = (window as any).__ASAP_PWA__ as PWAState | undefined;
    if (globalState) {
      setIsInstalled(globalState.isInstalled);
      setIsOnline(globalState.isOnline);
      if (globalState.installPrompt) {
        setInstallPrompt(globalState.installPrompt);
      }
    }

    // Get initial display mode
    setDisplayMode(getDisplayMode());

    // Listen for display mode changes
    const displayModeQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = () => {
      const newMode = getDisplayMode();
      setDisplayMode(newMode);
      if (newMode !== 'browser') {
        setIsInstalled(true);
      }
    };
    
    // Use addListener for older browsers, addEventListener for modern
    if (displayModeQuery.addEventListener) {
      displayModeQuery.addEventListener('change', handleDisplayModeChange);
    } else if (displayModeQuery.addListener) {
      displayModeQuery.addListener(handleDisplayModeChange);
    }

    // Listen for custom PWA events from inline script
    const handleInstallAvailable = () => {
      const globalState = (window as any).__ASAP_PWA__ as PWAState | undefined;
      if (globalState?.installPrompt) {
        setInstallPrompt(globalState.installPrompt);
      }
    };

    const handleInstalled = () => {
      setInstallPrompt(null);
      setIsInstalled(true);
    };

    const handleUpdateAvailable = () => {
      setIsUpdateAvailable(true);
    };

    const handleOnlineStatus = (event: CustomEvent<{ online: boolean }>) => {
      setIsOnline(event.detail.online);
    };

    window.addEventListener('pwa-install-available', handleInstallAvailable);
    window.addEventListener('pwa-installed', handleInstalled);
    window.addEventListener('pwa-update-available', handleUpdateAvailable);
    window.addEventListener('pwa-online-status', handleOnlineStatus as EventListener);

    // Also listen to standard events for redundancy
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setInstallPrompt(null);
      setIsInstalled(true);
    };

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    setIsOnline(navigator.onLine);

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      if (displayModeQuery.removeEventListener) {
        displayModeQuery.removeEventListener('change', handleDisplayModeChange);
      } else if (displayModeQuery.removeListener) {
        displayModeQuery.removeListener(handleDisplayModeChange);
      }
      
      window.removeEventListener('pwa-install-available', handleInstallAvailable);
      window.removeEventListener('pwa-installed', handleInstalled);
      window.removeEventListener('pwa-update-available', handleUpdateAvailable);
      window.removeEventListener('pwa-online-status', handleOnlineStatus as EventListener);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const install = useCallback(async (): Promise<boolean> => {
    if (!installPrompt) {
      return false;
    }

    try {
      await installPrompt.prompt();
      const { outcome } = await installPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setInstallPrompt(null);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Installation failed:', error);
      return false;
    }
  }, [installPrompt]);

  const update = useCallback(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        // Tell SW to skip waiting
        if (registration.waiting) {
          registration.waiting.postMessage({ action: 'skipWaiting' });
        }
        registration.update();
      });
    }
    // Reload will happen automatically when controller changes
  }, []);

  const clearCache = useCallback(async (): Promise<void> => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      return new Promise((resolve) => {
        const channel = new MessageChannel();
        channel.port1.onmessage = () => resolve();
        navigator.serviceWorker.controller.postMessage(
          { action: 'clearCache' },
          [channel.port2]
        );
      });
    }
    // Fallback: clear caches directly
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map((name) => caches.delete(name)));
    }
  }, []);

  // iOS needs manual install instructions (no beforeinstallprompt)
  const showIOSInstallInstructions = browserInfo.isIOS && browserInfo.isSafari && !isInstalled && displayMode === 'browser';

  return {
    isInstallable: !!installPrompt && !isInstalled,
    isInstalled,
    isOnline,
    isUpdateAvailable,
    displayMode,
    ...browserInfo,
    showIOSInstallInstructions,
    install,
    update,
    clearCache,
  };
}
