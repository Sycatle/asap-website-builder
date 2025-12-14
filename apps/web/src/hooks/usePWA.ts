import { useState, useEffect, useCallback, useRef } from 'react';

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
  // Installation
  isInstallable: boolean;
  isInstalled: boolean;
  install: () => Promise<boolean>;
  showIOSInstallInstructions: boolean;
  
  // Network status
  isOnline: boolean;
  
  // Updates
  isUpdateAvailable: boolean;
  update: () => void;
  
  // Cache management
  clearCache: () => Promise<void>;
  getCacheStats: () => Promise<CacheStats | null>;
  
  // Platform detection
  isIOS: boolean;
  isAndroid: boolean;
  isSafari: boolean;
  isChrome: boolean;
  isFirefox: boolean;
  isEdge: boolean;
  isSamsungInternet: boolean;
  isStandalone: boolean;
  
  // Display mode
  displayMode: 'browser' | 'standalone' | 'minimal-ui' | 'fullscreen' | 'window-controls-overlay';
  
  // Service Worker
  swVersion: string | null;
  swRegistration: ServiceWorkerRegistration | null;
  
  // Capabilities
  capabilities: PWACapabilities;
  
  // Offline queue
  queueOfflineAction: (action: OfflineAction) => Promise<void>;
}

interface CacheStats {
  version: string;
  caches: Record<string, { count: number; name: string }>;
  totalItems: number;
}

interface OfflineAction {
  id?: string;
  url: string;
  method: string;
  headers?: Record<string, string>;
  body?: string;
}

interface PWACapabilities {
  pushNotifications: boolean;
  backgroundSync: boolean;
  periodicSync: boolean;
  shareTarget: boolean;
  fileHandling: boolean;
  protocolHandling: boolean;
  badging: boolean;
  persistentStorage: boolean;
  wakeLock: boolean;
  bluetooth: boolean;
  usb: boolean;
  nfc: boolean;
  geolocation: boolean;
  camera: boolean;
  microphone: boolean;
}

// Detect browser and platform
function getBrowserInfo() {
  if (typeof navigator === 'undefined') {
    return {
      isIOS: false,
      isAndroid: false,
      isSafari: false,
      isChrome: false,
      isFirefox: false,
      isEdge: false,
      isSamsungInternet: false,
    };
  }
  
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
function getDisplayMode(): 'browser' | 'standalone' | 'minimal-ui' | 'fullscreen' | 'window-controls-overlay' {
  if (typeof window === 'undefined') return 'browser';
  
  if (window.matchMedia('(display-mode: window-controls-overlay)').matches) return 'window-controls-overlay';
  if (window.matchMedia('(display-mode: fullscreen)').matches) return 'fullscreen';
  if (window.matchMedia('(display-mode: standalone)').matches) return 'standalone';
  if (window.matchMedia('(display-mode: minimal-ui)').matches) return 'minimal-ui';
  // iOS Safari standalone check
  if ((window.navigator as any).standalone === true) return 'standalone';
  return 'browser';
}

// Detect PWA capabilities
function detectCapabilities(): PWACapabilities {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      pushNotifications: false,
      backgroundSync: false,
      periodicSync: false,
      shareTarget: false,
      fileHandling: false,
      protocolHandling: false,
      badging: false,
      persistentStorage: false,
      wakeLock: false,
      bluetooth: false,
      usb: false,
      nfc: false,
      geolocation: false,
      camera: false,
      microphone: false,
    };
  }
  
  return {
    pushNotifications: 'PushManager' in window && 'Notification' in window,
    backgroundSync: 'serviceWorker' in navigator && 'SyncManager' in window,
    periodicSync: 'serviceWorker' in navigator && 'PeriodicSyncManager' in window,
    shareTarget: 'share' in navigator,
    fileHandling: 'launchQueue' in window,
    protocolHandling: 'registerProtocolHandler' in navigator,
    badging: 'setAppBadge' in navigator,
    persistentStorage: 'storage' in navigator && 'persist' in navigator.storage,
    wakeLock: 'wakeLock' in navigator,
    bluetooth: 'bluetooth' in navigator,
    usb: 'usb' in navigator,
    nfc: 'NDEFReader' in window,
    geolocation: 'geolocation' in navigator,
    camera: 'mediaDevices' in navigator,
    microphone: 'mediaDevices' in navigator,
  };
}

export function usePWA(): UsePWAReturn {
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [displayMode, setDisplayMode] = useState<'browser' | 'standalone' | 'minimal-ui' | 'fullscreen' | 'window-controls-overlay'>('browser');
  const [swVersion, setSwVersion] = useState<string | null>(null);
  const [swRegistration, setSwRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [capabilities] = useState<PWACapabilities>(detectCapabilities);
  
  const browserInfo = getBrowserInfo();
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    
    // Initialize from global state if available (set by inline script)
    const globalState = (window as any).__ASAP_PWA__ as PWAState | undefined;
    if (globalState) {
      setIsInstalled(globalState.isInstalled);
      setIsOnline(globalState.isOnline);
      if (globalState.installPrompt) {
        setInstallPrompt(globalState.installPrompt);
      }
      if (globalState.registration) {
        setSwRegistration(globalState.registration);
      }
    }

    // Get initial display mode
    setDisplayMode(getDisplayMode());
    setIsOnline(navigator.onLine);

    // Get SW version
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      const channel = new MessageChannel();
      channel.port1.onmessage = (event) => {
        if (mountedRef.current && event.data?.version) {
          setSwVersion(event.data.version);
        }
      };
      navigator.serviceWorker.controller.postMessage(
        { action: 'getVersion' },
        [channel.port2]
      );
    }

    // Listen for display mode changes
    const displayModes = [
      '(display-mode: standalone)',
      '(display-mode: fullscreen)',
      '(display-mode: minimal-ui)',
      '(display-mode: window-controls-overlay)',
    ];
    
    const handleDisplayModeChange = () => {
      const newMode = getDisplayMode();
      setDisplayMode(newMode);
      if (newMode !== 'browser') {
        setIsInstalled(true);
      }
    };
    
    const mediaQueries = displayModes.map(mode => {
      const mq = window.matchMedia(mode);
      if (mq.addEventListener) {
        mq.addEventListener('change', handleDisplayModeChange);
      } else if (mq.addListener) {
        mq.addListener(handleDisplayModeChange);
      }
      return mq;
    });

    // Listen for custom PWA events from inline script
    const handleInstallAvailable = () => {
      const globalState = (window as any).__ASAP_PWA__ as PWAState | undefined;
      if (globalState?.installPrompt && mountedRef.current) {
        setInstallPrompt(globalState.installPrompt);
      }
    };

    const handleInstalled = () => {
      if (mountedRef.current) {
        setInstallPrompt(null);
        setIsInstalled(true);
      }
    };

    const handleUpdateAvailable = () => {
      if (mountedRef.current) {
        setIsUpdateAvailable(true);
      }
    };

    const handleOnlineStatus = (event: CustomEvent<{ online: boolean }>) => {
      if (mountedRef.current) {
        setIsOnline(event.detail.online);
      }
    };

    const handleSWMessage = (event: MessageEvent) => {
      if (!mountedRef.current) return;
      
      if (event.data?.type === 'SW_ACTIVATED') {
        setSwVersion(event.data.version);
      } else if (event.data?.type === 'NEW_NOTIFICATIONS') {
        // Handle new notifications from periodic sync
        window.dispatchEvent(new CustomEvent('pwa-new-notifications', { 
          detail: { count: event.data.count } 
        }));
      }
    };

    window.addEventListener('pwa-install-available', handleInstallAvailable);
    window.addEventListener('pwa-installed', handleInstalled);
    window.addEventListener('pwa-update-available', handleUpdateAvailable);
    window.addEventListener('pwa-online-status', handleOnlineStatus as EventListener);

    // Service worker message listener
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', handleSWMessage);
    }

    // Also listen to standard events for redundancy
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      if (mountedRef.current) {
        setInstallPrompt(e as BeforeInstallPromptEvent);
      }
    };

    const handleAppInstalled = () => {
      if (mountedRef.current) {
        setInstallPrompt(null);
        setIsInstalled(true);
      }
    };

    const handleOnline = () => {
      if (mountedRef.current) setIsOnline(true);
    };
    const handleOffline = () => {
      if (mountedRef.current) setIsOnline(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Register for service worker updates
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        if (mountedRef.current) {
          setSwRegistration(registration);
        }
        
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                if (mountedRef.current) {
                  setIsUpdateAvailable(true);
                }
              }
            });
          }
        });
      });

      // Listen for controller change (after skipWaiting)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        // Reload the page when the new service worker takes over
        window.location.reload();
      });
    }

    return () => {
      mountedRef.current = false;
      
      mediaQueries.forEach(mq => {
        if (mq.removeEventListener) {
          mq.removeEventListener('change', handleDisplayModeChange);
        } else if (mq.removeListener) {
          mq.removeListener(handleDisplayModeChange);
        }
      });
      
      window.removeEventListener('pwa-install-available', handleInstallAvailable);
      window.removeEventListener('pwa-installed', handleInstalled);
      window.removeEventListener('pwa-update-available', handleUpdateAvailable);
      window.removeEventListener('pwa-online-status', handleOnlineStatus as EventListener);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSWMessage);
      }
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
        setIsInstalled(true);
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
    setIsUpdateAvailable(false);
  }, []);

  const clearCache = useCallback(async (): Promise<void> => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      return new Promise((resolve, reject) => {
        const channel = new MessageChannel();
        channel.port1.onmessage = (event) => {
          if (event.data?.success) {
            resolve();
          } else {
            reject(new Error('Failed to clear cache'));
          }
        };
        navigator.serviceWorker.controller!.postMessage(
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

  const getCacheStats = useCallback(async (): Promise<CacheStats | null> => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      return new Promise((resolve) => {
        const channel = new MessageChannel();
        channel.port1.onmessage = (event) => {
          resolve(event.data);
        };
        navigator.serviceWorker.controller!.postMessage(
          { action: 'getCacheStats' },
          [channel.port2]
        );
      });
    }
    return null;
  }, []);

  const queueOfflineAction = useCallback(async (action: OfflineAction): Promise<void> => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        action: 'queueOfflineAction',
        payload: action,
      });
    } else {
      // Fallback: store directly in cache
      if ('caches' in window) {
        const cache = await caches.open('asap-offline-v3');
        let queue: OfflineAction[] = [];
        
        try {
          const response = await cache.match('/__offline_queue__');
          if (response) {
            queue = await response.json();
          }
        } catch (e) {
          // Ignore errors
        }
        
        action.id = action.id || Date.now().toString();
        queue.push(action);
        
        await cache.put(
          new Request('/__offline_queue__'),
          new Response(JSON.stringify(queue))
        );
      }
    }
  }, []);

  // iOS needs manual install instructions (no beforeinstallprompt)
  const showIOSInstallInstructions = browserInfo.isIOS && browserInfo.isSafari && !isInstalled && displayMode === 'browser';
  const isStandalone = displayMode !== 'browser';

  return {
    isInstallable: !!installPrompt && !isInstalled,
    isInstalled,
    isOnline,
    isUpdateAvailable,
    displayMode,
    ...browserInfo,
    isStandalone,
    showIOSInstallInstructions,
    swVersion,
    swRegistration,
    capabilities,
    install,
    update,
    clearCache,
    getCacheStats,
    queueOfflineAction,
  };
}
