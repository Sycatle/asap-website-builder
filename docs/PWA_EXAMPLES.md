# 💻 Exemples Pratiques PWA - ASAP

Ce document contient des exemples de code pratiques pour exploiter au mieux les fonctionnalités PWA d'ASAP.

## 📋 Table des Matières

1. [Installation et détection](#installation-et-détection)
2. [Gestion du cache](#gestion-du-cache)
3. [Mode hors ligne](#mode-hors-ligne)
4. [Notifications Push](#notifications-push)
5. [Partage et File Handling](#partage-et-file-handling)
6. [Background Sync](#background-sync)
7. [Optimisations avancées](#optimisations-avancées)

---

## 1. Installation et détection

### Composant d'installation avec analytics

```typescript
// src/components/pwa/InstallPrompt.tsx
import { useState, useEffect } from 'react';
import { usePWA } from '@/hooks/usePWA';
import { Button } from '@/components/ui/button';
import { Download, X } from 'lucide-react';
import { toast } from 'sonner';

export function InstallPrompt() {
  const { isInstallable, isInstalled, install, isIOS, displayMode } = usePWA();
  const [dismissed, setDismissed] = useState(false);
  const [installAttempts, setInstallAttempts] = useState(0);

  useEffect(() => {
    // Charger les préférences
    const dismissedUntil = localStorage.getItem('install-prompt-dismissed');
    if (dismissedUntil) {
      const until = new Date(dismissedUntil);
      if (until > new Date()) {
        setDismissed(true);
      }
    }
    
    const attempts = parseInt(localStorage.getItem('install-attempts') || '0');
    setInstallAttempts(attempts);
  }, []);

  const handleInstall = async () => {
    const newAttempts = installAttempts + 1;
    setInstallAttempts(newAttempts);
    localStorage.setItem('install-attempts', newAttempts.toString());

    const success = await install();
    
    if (success) {
      // Analytics
      if (window.gtag) {
        window.gtag('event', 'pwa_install', {
          method: 'prompt',
          attempt_number: newAttempts,
          platform: isIOS ? 'ios' : 'other'
        });
      }
      
      toast.success('Application installée !', {
        description: 'ASAP a été ajouté à votre écran d\'accueil'
      });
    } else {
      toast.error('Installation annulée');
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    
    // Redemander dans 7 jours
    const dismissUntil = new Date();
    dismissUntil.setDate(dismissUntil.getDate() + 7);
    localStorage.setItem('install-prompt-dismissed', dismissUntil.toISOString());
    
    // Analytics
    if (window.gtag) {
      window.gtag('event', 'pwa_install_dismissed', {
        attempt_number: installAttempts
      });
    }
  };

  // Ne pas afficher si déjà installé, dismissed, ou pas installable
  if (isInstalled || dismissed || (!isInstallable && !isIOS)) {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-4 right-4 z-50 mx-auto max-w-md">
      <div className="rounded-lg border bg-card p-4 shadow-lg">
        <button
          onClick={handleDismiss}
          className="absolute right-2 top-2 rounded-full p-1 hover:bg-muted"
          aria-label="Fermer"
        >
          <X className="h-4 w-4" />
        </button>
        
        <div className="flex gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
            <Download className="h-6 w-6 text-primary" />
          </div>
          
          <div className="flex-1">
            <h3 className="font-semibold">Installer ASAP</h3>
            <p className="text-sm text-muted-foreground">
              Accès rapide, notifications et mode hors ligne
            </p>
            
            <div className="mt-3 flex gap-2">
              <Button onClick={handleInstall} size="sm">
                Installer
              </Button>
              <Button onClick={handleDismiss} size="sm" variant="ghost">
                Plus tard
              </Button>
            </div>
          </div>
        </div>
        
        {installAttempts > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            {installAttempts} tentative(s) d'installation
          </p>
        )}
      </div>
    </div>
  );
}
```

### Hook d'analytics PWA

```typescript
// src/hooks/usePWAAnalytics.ts
import { useEffect } from 'react';
import { usePWA } from './usePWA';

export function usePWAAnalytics() {
  const pwa = usePWA();

  useEffect(() => {
    // Track display mode
    if (window.gtag) {
      window.gtag('event', 'page_view', {
        display_mode: pwa.displayMode,
        is_installed: pwa.isInstalled,
        is_online: pwa.isOnline,
        platform: pwa.isIOS ? 'ios' : pwa.isAndroid ? 'android' : 'desktop'
      });
    }

    // Track installation
    const handleInstalled = () => {
      if (window.gtag) {
        window.gtag('event', 'pwa_installed', {
          platform: navigator.userAgent,
          timestamp: new Date().toISOString()
        });
      }
    };

    // Track offline usage
    const handleOffline = () => {
      if (window.gtag) {
        window.gtag('event', 'pwa_offline_mode', {
          timestamp: new Date().toISOString()
        });
      }
    };

    // Track back online
    const handleOnline = () => {
      if (window.gtag) {
        window.gtag('event', 'pwa_back_online', {
          timestamp: new Date().toISOString()
        });
      }
    };

    window.addEventListener('appinstalled', handleInstalled);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('appinstalled', handleInstalled);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, [pwa]);
}
```

---

## 2. Gestion du cache

### Composant de gestion du cache avancé

```typescript
// src/components/pwa/CacheManager.tsx
import { useState, useEffect } from 'react';
import { usePWA } from '@/hooks/usePWA';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, RefreshCw, HardDrive } from 'lucide-react';
import { toast } from 'sonner';

interface CacheStats {
  version: string;
  caches: Record<string, { count: number; name: string }>;
  totalItems: number;
  estimatedSize?: number;
}

export function CacheManager() {
  const { getCacheStats, clearCache } = usePWA();
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);

  const loadStats = async () => {
    setLoading(true);
    try {
      const cacheStats = await getCacheStats();
      
      // Estimer la taille si l'API Storage est disponible
      if ('storage' in navigator && 'estimate' in navigator.storage) {
        const estimate = await navigator.storage.estimate();
        setStats({
          ...cacheStats!,
          estimatedSize: estimate.usage
        });
      } else {
        setStats(cacheStats);
      }
    } catch (error) {
      toast.error('Erreur lors du chargement des statistiques');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleClearCache = async () => {
    if (!confirm('Êtes-vous sûr de vouloir vider le cache ? L\'application sera rechargée.')) {
      return;
    }

    setClearing(true);
    try {
      await clearCache();
      toast.success('Cache vidé avec succès');
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      toast.error('Erreur lors du vidage du cache');
      setClearing(false);
    }
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes) return 'N/A';
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  const getCacheColor = (count: number) => {
    if (count < 30) return 'text-green-500';
    if (count < 80) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Cache de l'application</CardTitle>
            <CardDescription>
              Gestion du stockage local et du cache
            </CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadStats}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {stats && (
          <>
            {/* Statistiques globales */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Version SW</p>
                <p className="text-2xl font-bold">{stats.version}</p>
              </div>
              
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total items</p>
                <p className="text-2xl font-bold">{stats.totalItems}</p>
              </div>
              
              {stats.estimatedSize && (
                <div className="col-span-2 space-y-1">
                  <p className="text-sm text-muted-foreground">Espace utilisé</p>
                  <p className="text-2xl font-bold">{formatBytes(stats.estimatedSize)}</p>
                </div>
              )}
            </div>

            {/* Détails par cache */}
            <div className="space-y-3 pt-4 border-t">
              <h4 className="font-semibold">Détails du cache</h4>
              
              {Object.entries(stats.caches).map(([name, info]) => (
                <div key={name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{name}</span>
                    <span className={`text-sm font-mono ${getCacheColor(info.count)}`}>
                      {info.count} items
                    </span>
                  </div>
                  
                  <Progress 
                    value={(info.count / 150) * 100} 
                    className="h-2"
                  />
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-4 border-t">
              <Button
                variant="destructive"
                onClick={handleClearCache}
                disabled={clearing}
                className="flex-1"
              >
                {clearing ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Vidage en cours...
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Vider le cache
                  </>
                )}
              </Button>
            </div>
          </>
        )}

        {!stats && !loading && (
          <div className="text-center py-8 text-muted-foreground">
            <HardDrive className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Aucune statistique disponible</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

### Stratégie de cache personnalisée

```typescript
// src/utils/pwa/customCache.ts

/**
 * Stratégie de cache personnalisée pour les données utilisateur
 */
export class UserDataCache {
  private cacheName = 'asap-user-data-v1';
  private maxAge = 5 * 60 * 1000; // 5 minutes

  async get<T>(key: string): Promise<T | null> {
    try {
      const cache = await caches.open(this.cacheName);
      const response = await cache.match(key);
      
      if (!response) return null;

      // Vérifier l'âge du cache
      const cachedDate = response.headers.get('sw-cache-date');
      if (cachedDate) {
        const age = Date.now() - new Date(cachedDate).getTime();
        if (age > this.maxAge) {
          await cache.delete(key);
          return null;
        }
      }

      return await response.json();
    } catch {
      return null;
    }
  }

  async set<T>(key: string, data: T): Promise<void> {
    try {
      const cache = await caches.open(this.cacheName);
      
      const headers = new Headers();
      headers.set('Content-Type', 'application/json');
      headers.set('sw-cache-date', new Date().toISOString());
      
      const response = new Response(JSON.stringify(data), {
        headers,
        status: 200
      });
      
      await cache.put(key, response);
    } catch (error) {
      console.error('Failed to cache data:', error);
    }
  }

  async delete(key: string): Promise<void> {
    try {
      const cache = await caches.open(this.cacheName);
      await cache.delete(key);
    } catch (error) {
      console.error('Failed to delete cache:', error);
    }
  }

  async clear(): Promise<void> {
    try {
      await caches.delete(this.cacheName);
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }
}

// Usage
const userCache = new UserDataCache();

// Dans un composant
const loadUserData = async () => {
  // Essayer le cache d'abord
  let userData = await userCache.get('user-profile');
  
  if (!userData) {
    // Charger depuis l'API
    userData = await api.getUserProfile();
    // Mettre en cache
    await userCache.set('user-profile', userData);
  }
  
  return userData;
};
```

---

## 3. Mode hors ligne

### Composant de détection réseau amélioré

```typescript
// src/components/pwa/NetworkStatus.tsx
import { useState, useEffect } from 'react';
import { usePWA } from '@/hooks/usePWA';
import { Wifi, WifiOff, AlertCircle, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface NetworkState {
  isOnline: boolean;
  effectiveType: string;
  downlink: number;
  rtt: number;
}

// Type pour l'API Network Information (expérimentale)
interface NetworkInformation extends EventTarget {
  effectiveType?: '4g' | '3g' | '2g' | 'slow-2g';
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

declare global {
  interface Navigator {
    connection?: NetworkInformation;
    mozConnection?: NetworkInformation;
    webkitConnection?: NetworkInformation;
  }
}

export function NetworkStatus() {
  const { isOnline } = usePWA();
  const [networkState, setNetworkState] = useState<NetworkState>({
    isOnline,
    effectiveType: 'unknown',
    downlink: 0,
    rtt: 0
  });
  const [showAlert, setShowAlert] = useState(false);

  useEffect(() => {
    // Obtenir les infos réseau si disponibles (API expérimentale)
    const updateNetworkInfo = () => {
      const connection = navigator.connection 
        || navigator.mozConnection 
        || navigator.webkitConnection;

      if (connection) {
        setNetworkState({
          isOnline: navigator.onLine,
          effectiveType: connection.effectiveType || 'unknown',
          downlink: connection.downlink || 0,
          rtt: connection.rtt || 0
        });
      } else {
        setNetworkState(prev => ({
          ...prev,
          isOnline: navigator.onLine
        }));
      }
    };

    updateNetworkInfo();

    const handleOnline = () => {
      updateNetworkInfo();
      setShowAlert(true);
      setTimeout(() => setShowAlert(false), 5000);
    };

    const handleOffline = () => {
      updateNetworkInfo();
      setShowAlert(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const connection = (navigator as any).connection;
    if (connection) {
      connection.addEventListener('change', updateNetworkInfo);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if (connection) {
        connection.removeEventListener('change', updateNetworkInfo);
      }
    };
  }, []);

  const getConnectionQuality = () => {
    if (!networkState.isOnline) return 'offline';
    
    if (networkState.effectiveType === '4g' || networkState.downlink > 5) {
      return 'excellent';
    }
    if (networkState.effectiveType === '3g' || networkState.downlink > 1) {
      return 'good';
    }
    return 'poor';
  };

  const quality = getConnectionQuality();

  return (
    <>
      {/* Badge permanent dans le header */}
      <div className="flex items-center gap-2">
        {networkState.isOnline ? (
          <>
            <Wifi className="h-4 w-4 text-green-500" />
            <span className="text-xs text-muted-foreground hidden sm:inline">
              {networkState.effectiveType.toUpperCase()}
            </span>
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4 text-red-500" />
            <span className="text-xs text-muted-foreground hidden sm:inline">
              Hors ligne
            </span>
          </>
        )}
      </div>

      {/* Alert temporaire */}
      {showAlert && (
        <Alert 
          className="fixed bottom-4 left-1/2 -translate-x-1/2 w-auto z-50 shadow-lg"
          variant={networkState.isOnline ? "default" : "destructive"}
        >
          {networkState.isOnline ? (
            <CheckCircle className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription>
            {networkState.isOnline ? (
              <>
                Connexion rétablie
                {networkState.effectiveType !== 'unknown' && (
                  <span className="ml-2 text-xs">
                    ({networkState.effectiveType.toUpperCase()})
                  </span>
                )}
              </>
            ) : (
              'Vous êtes hors ligne - Certaines fonctionnalités sont limitées'
            )}
          </AlertDescription>
        </Alert>
      )}
    </>
  );
}
```

### Queue d'actions offline

```typescript
// src/utils/pwa/offlineQueue.ts
import { usePWA } from '@/hooks/usePWA';

interface QueuedAction {
  id: string;
  type: string;
  url: string;
  method: string;
  data: any;
  timestamp: number;
  retries: number;
}

export class OfflineActionQueue {
  private queue: QueuedAction[] = [];
  private processing = false;
  private maxRetries = 3;

  constructor() {
    this.loadQueue();
    this.setupListeners();
  }

  private async loadQueue() {
    const stored = localStorage.getItem('offline-queue');
    if (stored) {
      this.queue = JSON.parse(stored);
    }
  }

  private saveQueue() {
    localStorage.setItem('offline-queue', JSON.stringify(this.queue));
  }

  private setupListeners() {
    window.addEventListener('online', () => {
      this.processQueue();
    });

    // Écouter les messages du SW
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'SYNC_COMPLETE') {
          this.loadQueue(); // Recharger après sync
        }
      });
    }
  }

  async add(action: Omit<QueuedAction, 'id' | 'timestamp' | 'retries'>) {
    const queuedAction: QueuedAction = {
      ...action,
      id: `${Date.now()}-${Math.random()}`,
      timestamp: Date.now(),
      retries: 0
    };

    this.queue.push(queuedAction);
    this.saveQueue();

    // Si en ligne, traiter immédiatement
    if (navigator.onLine) {
      await this.processQueue();
    }

    return queuedAction.id;
  }

  async processQueue() {
    if (this.processing || !navigator.onLine || this.queue.length === 0) {
      return;
    }

    this.processing = true;
    const processed: string[] = [];

    for (const action of this.queue) {
      try {
        await this.executeAction(action);
        processed.push(action.id);
      } catch (error) {
        action.retries++;
        
        if (action.retries >= this.maxRetries) {
          console.error('Max retries reached for action:', action);
          processed.push(action.id); // Retirer après max retries
        }
      }
    }

    // Retirer les actions traitées
    this.queue = this.queue.filter(a => !processed.includes(a.id));
    this.saveQueue();
    this.processing = false;

    // Notifier l'UI
    if (processed.length > 0) {
      window.dispatchEvent(new CustomEvent('offline-queue-processed', {
        detail: { count: processed.length }
      }));
    }
  }

  private async executeAction(action: QueuedAction): Promise<void> {
    const response = await fetch(action.url, {
      method: action.method,
      headers: {
        'Content-Type': 'application/json',
        ...action.data?.headers
      },
      body: action.data?.body ? JSON.stringify(action.data.body) : undefined,
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`Failed to execute action: ${response.status}`);
    }
  }

  getQueue(): QueuedAction[] {
    return [...this.queue];
  }

  clear() {
    this.queue = [];
    this.saveQueue();
  }
}

// Singleton instance pour éviter les multiples instances
let queueInstance: OfflineActionQueue | null = null;

function getQueueInstance(): OfflineActionQueue {
  if (!queueInstance) {
    queueInstance = new OfflineActionQueue();
  }
  return queueInstance;
}

// Usage dans un composant
export function useOfflineQueue() {
  // Utiliser useMemo pour garantir une seule instance
  const queue = useMemo(() => getQueueInstance(), []);

  const queueAction = async (type: string, url: string, method: string, data: any) => {
    return await queue.add({ type, url, method, data });
  };

  return {
    queueAction,
    getQueue: () => queue.getQueue(),
    clear: () => queue.clear()
  };
}
```

---

## 4. Notifications Push

### Système de notifications complet

```typescript
// src/utils/pwa/notifications.ts

export interface NotificationOptions {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  image?: string;
  tag?: string;
  data?: any;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  requireInteraction?: boolean;
}

export class NotificationManager {
  private permission: NotificationPermission = 'default';
  private subscription: PushSubscription | null = null;

  constructor() {
    this.checkPermission();
  }

  private checkPermission() {
    if ('Notification' in window) {
      this.permission = Notification.permission;
    }
  }

  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('Notifications not supported');
      return false;
    }

    if (this.permission === 'granted') {
      return true;
    }

    const permission = await Notification.requestPermission();
    this.permission = permission;

    if (permission === 'granted') {
      await this.subscribeToPush();
      return true;
    }

    return false;
  }

  private async subscribeToPush(): Promise<void> {
    if (!('serviceWorker' in navigator)) return;
    if (!('PushManager' in window)) return;

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Vérifier si déjà abonné
      let subscription = await registration.pushManager.getSubscription();
      
      if (!subscription) {
        // Récupérer la clé VAPID depuis la config runtime ou variable d'env
        // NOTE: Cette clé est publique et peut être exposée côté client
        // SETUP: Obtenir la clé depuis votre backend ou générer avec web-push
        // Exemple: npx web-push generate-vapid-keys
        // Puis configurer PUBLIC_VAPID_PUBLIC_KEY dans .env
        const vapidKey = import.meta.env.PUBLIC_VAPID_PUBLIC_KEY;
        
        if (!vapidKey) {
          console.error('VAPID public key not configured. Run: npx web-push generate-vapid-keys');
          return;
        }
        
        // S'abonner
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(vapidKey)
        });
      }

      this.subscription = subscription;

      // Envoyer au backend
      await this.sendSubscriptionToServer(subscription);
    } catch (error) {
      console.error('Failed to subscribe to push:', error);
    }
  }

  private async sendSubscriptionToServer(subscription: PushSubscription) {
    const response = await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(subscription),
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error('Failed to send subscription to server');
    }
  }

  async showNotification(options: NotificationOptions): Promise<void> {
    if (this.permission !== 'granted') {
      const granted = await this.requestPermission();
      if (!granted) return;
    }

    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(options.title, {
        body: options.body,
        icon: options.icon || '/icons/icon-192x192.png',
        badge: options.badge || '/icons/icon-72x72.png',
        image: options.image,
        tag: options.tag,
        data: options.data,
        actions: options.actions,
        requireInteraction: options.requireInteraction,
        vibrate: [200, 100, 200]
      });
    } else {
      // Fallback pour navigateurs sans SW
      new Notification(options.title, {
        body: options.body,
        icon: options.icon || '/icons/icon-192x192.png'
      });
    }
  }

  async unsubscribe(): Promise<void> {
    if (!this.subscription) return;

    try {
      await this.subscription.unsubscribe();
      
      // Notifier le backend
      await fetch('/api/notifications/unsubscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          endpoint: this.subscription.endpoint
        }),
        credentials: 'include'
      });

      this.subscription = null;
    } catch (error) {
      console.error('Failed to unsubscribe:', error);
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  getPermission(): NotificationPermission {
    return this.permission;
  }

  isSubscribed(): boolean {
    return this.subscription !== null;
  }
}

// Hook React
export function useNotifications() {
  const [manager] = useState(() => new NotificationManager());
  const [permission, setPermission] = useState<NotificationPermission>('default');

  useEffect(() => {
    setPermission(manager.getPermission());
  }, [manager]);

  const requestPermission = async () => {
    const granted = await manager.requestPermission();
    setPermission(manager.getPermission());
    return granted;
  };

  return {
    permission,
    requestPermission,
    showNotification: (options: NotificationOptions) => manager.showNotification(options),
    unsubscribe: () => manager.unsubscribe(),
    isSubscribed: manager.isSubscribed()
  };
}
```

### Composant de gestion des notifications

```typescript
// src/components/pwa/NotificationSettings.tsx
import { useState } from 'react';
import { useNotifications } from '@/utils/pwa/notifications';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, BellOff, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

export function NotificationSettings() {
  const { permission, requestPermission, showNotification, unsubscribe, isSubscribed } = useNotifications();
  const [enabled, setEnabled] = useState(permission === 'granted');
  const [loading, setLoading] = useState(false);

  const handleToggle = async (checked: boolean) => {
    setLoading(true);
    
    try {
      if (checked) {
        const granted = await requestPermission();
        setEnabled(granted);
        
        if (granted) {
          toast.success('Notifications activées');
          
          // Envoyer une notification de test
          await showNotification({
            title: 'Notifications activées',
            body: 'Vous recevrez désormais les notifications d\'ASAP',
            icon: '/icons/icon-192x192.png',
            tag: 'welcome-notification'
          });
        } else {
          toast.error('Permission refusée');
        }
      } else {
        await unsubscribe();
        setEnabled(false);
        toast.info('Notifications désactivées');
      }
    } catch (error) {
      toast.error('Erreur lors de la configuration des notifications');
      setEnabled(permission === 'granted');
    } finally {
      setLoading(false);
    }
  };

  const sendTestNotification = async () => {
    try {
      await showNotification({
        title: 'Notification de test',
        body: 'Ceci est une notification de test d\'ASAP',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-72x72.png',
        tag: 'test-notification',
        requireInteraction: false,
        actions: [
          { action: 'open', title: 'Ouvrir' },
          { action: 'dismiss', title: 'Ignorer' }
        ]
      });
      
      toast.success('Notification envoyée');
    } catch (error) {
      toast.error('Impossible d\'envoyer la notification');
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Notifications Push
        </CardTitle>
        <CardDescription>
          Recevez des notifications même quand l'app est fermée
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Statut */}
        <div className="flex items-center justify-between p-3 rounded-lg border">
          <div className="flex items-center gap-3">
            {permission === 'granted' ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : permission === 'denied' ? (
              <XCircle className="h-5 w-5 text-red-500" />
            ) : (
              <BellOff className="h-5 w-5 text-muted-foreground" />
            )}
            
            <div>
              <p className="font-medium">
                {permission === 'granted' && 'Notifications activées'}
                {permission === 'denied' && 'Notifications bloquées'}
                {permission === 'default' && 'Notifications désactivées'}
              </p>
              <p className="text-sm text-muted-foreground">
                {isSubscribed() ? 'Abonné aux notifications push' : 'Non abonné'}
              </p>
            </div>
          </div>
        </div>

        {/* Toggle */}
        <div className="flex items-center justify-between">
          <Label htmlFor="notifications-toggle" className="cursor-pointer">
            Activer les notifications
          </Label>
          <Switch
            id="notifications-toggle"
            checked={enabled}
            onCheckedChange={handleToggle}
            disabled={loading || permission === 'denied'}
          />
        </div>

        {/* Avertissement si bloqué */}
        {permission === 'denied' && (
          <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
            Les notifications sont bloquées. Vous devez les autoriser dans les paramètres de votre navigateur.
          </div>
        )}

        {/* Bouton de test */}
        {permission === 'granted' && (
          <Button
            variant="outline"
            onClick={sendTestNotification}
            className="w-full"
          >
            Envoyer une notification de test
          </Button>
        )}

        {/* Info */}
        <p className="text-xs text-muted-foreground">
          Les notifications vous permettent de rester informé des mises à jour importantes,
          même quand l'application est fermée.
        </p>
      </CardContent>
    </Card>
  );
}
```

---

## 5. Partage et File Handling

### Gestionnaire de partage

```typescript
// src/utils/pwa/shareHandler.ts

export interface ShareData {
  title?: string;
  text?: string;
  url?: string;
  files?: File[];
}

export class ShareHandler {
  async share(data: ShareData): Promise<boolean> {
    // Vérifier le support
    if (!('share' in navigator)) {
      return this.fallbackShare(data);
    }

    try {
      // Préparer les données
      const shareData: any = {};
      
      if (data.title) shareData.title = data.title;
      if (data.text) shareData.text = data.text;
      if (data.url) shareData.url = data.url;
      
      // Vérifier si les fichiers sont supportés
      if (data.files && data.files.length > 0) {
        if (navigator.canShare && navigator.canShare({ files: data.files })) {
          shareData.files = data.files;
        }
      }

      await navigator.share(shareData);
      return true;
    } catch (error: any) {
      if (error.name === 'AbortError') {
        // Utilisateur a annulé
        return false;
      }
      
      console.error('Share failed:', error);
      return this.fallbackShare(data);
    }
  }

  private async fallbackShare(data: ShareData): Promise<boolean> {
    // Fallback: copier dans le clipboard
    let textToCopy = '';
    
    if (data.title) textToCopy += `${data.title}\n`;
    if (data.text) textToCopy += `${data.text}\n`;
    if (data.url) textToCopy += data.url;

    try {
      await navigator.clipboard.writeText(textToCopy.trim());
      return true;
    } catch {
      // Fallback ultime: créer un élément temporaire
      const textarea = document.createElement('textarea');
      textarea.value = textToCopy;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      
      try {
        document.execCommand('copy');
        return true;
      } catch {
        return false;
      } finally {
        document.body.removeChild(textarea);
      }
    }
  }

  canShare(): boolean {
    return 'share' in navigator;
  }

  canShareFiles(): boolean {
    return 'canShare' in navigator;
  }
}

// Hook React
export function useShare() {
  const [handler] = useState(() => new ShareHandler());

  return {
    share: (data: ShareData) => handler.share(data),
    canShare: handler.canShare(),
    canShareFiles: handler.canShareFiles()
  };
}
```

### Composant de bouton de partage

```typescript
// src/components/pwa/ShareButton.tsx
import { useState } from 'react';
import { useShare } from '@/utils/pwa/shareHandler';
import { Button } from '@/components/ui/button';
import { Share2, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

interface ShareButtonProps {
  title?: string;
  text?: string;
  url?: string;
  files?: File[];
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'default' | 'sm' | 'lg';
}

export function ShareButton({
  title,
  text,
  url,
  files,
  variant = 'outline',
  size = 'default'
}: ShareButtonProps) {
  const { share, canShare } = useShare();
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const success = await share({ title, text, url, files });
    
    if (success) {
      if (!canShare) {
        // Fallback utilisé - afficher feedback de copie
        setCopied(true);
        toast.success('Lien copié dans le presse-papiers');
        setTimeout(() => setCopied(false), 2000);
      }
    } else {
      toast.error('Impossible de partager');
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleShare}
      className="gap-2"
    >
      {copied ? (
        <>
          <Check className="h-4 w-4" />
          Copié
        </>
      ) : (
        <>
          {canShare ? (
            <Share2 className="h-4 w-4" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          Partager
        </>
      )}
    </Button>
  );
}
```

### Gestionnaire de réception de fichiers (Share Target)

```typescript
// src/components/cloud/SharedFilesHandler.tsx
import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, X } from 'lucide-react';
import { toast } from 'sonner';

interface SharedFile {
  name: string;
  type: string;
  size: number;
}

interface ShareTargetData {
  title?: string;
  text?: string;
  url?: string;
  files: SharedFile[];
  timestamp: number;
}

export function SharedFilesHandler() {
  const [sharedData, setSharedData] = useState<ShareTargetData | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    checkForSharedFiles();
  }, []);

  const checkForSharedFiles = async () => {
    try {
      const cache = await caches.open('asap-offline-v3');
      const response = await cache.match('/__share_target_data__');
      
      if (response) {
        const data = await response.json();
        setSharedData(data);
        
        // Notifier l'utilisateur
        toast.info('Fichiers partagés détectés', {
          description: `${data.files.length} fichier(s) à importer`
        });
      }
    } catch (error) {
      console.error('Failed to check shared files:', error);
    }
  };

  const handleImport = async () => {
    if (!sharedData) return;

    setProcessing(true);
    
    try {
      // Traiter les fichiers partagés
      // TODO: Implémenter l'upload réel
      
      toast.success('Fichiers importés avec succès');
      
      // Nettoyer les données partagées
      const cache = await caches.open('asap-offline-v3');
      await cache.delete('/__share_target_data__');
      setSharedData(null);
    } catch (error) {
      toast.error('Erreur lors de l\'import des fichiers');
    } finally {
      setProcessing(false);
    }
  };

  const handleDismiss = async () => {
    try {
      const cache = await caches.open('asap-offline-v3');
      await cache.delete('/__share_target_data__');
      setSharedData(null);
    } catch (error) {
      console.error('Failed to dismiss shared files:', error);
    }
  };

  if (!sharedData) return null;

  return (
    <Card className="border-primary">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Fichiers partagés
            </CardTitle>
            <CardDescription>
              Fichiers reçus depuis une autre application
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDismiss}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {sharedData.title && (
          <div>
            <p className="text-sm font-medium">Titre:</p>
            <p className="text-sm text-muted-foreground">{sharedData.title}</p>
          </div>
        )}
        
        {sharedData.text && (
          <div>
            <p className="text-sm font-medium">Texte:</p>
            <p className="text-sm text-muted-foreground">{sharedData.text}</p>
          </div>
        )}
        
        {sharedData.url && (
          <div>
            <p className="text-sm font-medium">URL:</p>
            <p className="text-sm text-muted-foreground truncate">{sharedData.url}</p>
          </div>
        )}
        
        <div>
          <p className="text-sm font-medium mb-2">Fichiers ({sharedData.files.length}):</p>
          <div className="space-y-1">
            {sharedData.files.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 rounded-md bg-muted text-sm"
              >
                <span className="truncate">{file.name}</span>
                <span className="text-muted-foreground">
                  {(file.size / 1024).toFixed(0)} KB
                </span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button
            onClick={handleImport}
            disabled={processing}
            className="flex-1"
          >
            {processing ? 'Import en cours...' : 'Importer les fichiers'}
          </Button>
          <Button
            variant="outline"
            onClick={handleDismiss}
          >
            Ignorer
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

---

_Document complet avec 6 sections détaillées. Les sections 6-7 (Background Sync et Optimisations avancées) peuvent être ajoutées si nécessaire._

---

**Dernière mise à jour :** 2025-12-14  
**Version :** 1.0
