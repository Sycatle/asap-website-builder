import { createRoot } from 'react-dom/client';
import { Toaster } from '@/components/ui/sonner';
import AppRouter from '@/components/app-router';
import { initSentry } from '@/lib/sentry';

import '@/styles/global.css';
import '@/styles/studio-design-system.css';
import '@/styles/studio-animations.css';

initSentry();

function bootstrapPwa() {
  const isServiceWorkerSupported = 'serviceWorker' in navigator;
  const isIOSStandalone = window.navigator.standalone === true;
  const isAndroidStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const isPWA = isIOSStandalone || isAndroidStandalone;

  window.__ASAP_PWA__ = {
    isInstalled: isPWA,
    isOnline: navigator.onLine,
    isServiceWorkerSupported,
  };

  const updateOnlineStatus = () => {
    window.__ASAP_PWA__.isOnline = navigator.onLine;
    document.body.classList.toggle('is-offline', !navigator.onLine);
    window.dispatchEvent(
      new CustomEvent('pwa-online-status', { detail: { online: navigator.onLine } })
    );
  };

  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  updateOnlineStatus();

  if (isServiceWorkerSupported) {
    const registerSW = () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((registration) => {
          window.__ASAP_PWA__.registration = registration;

          // Hourly update check
          setInterval(() => {
            registration.update().catch(() => {});
          }, 60 * 60 * 1000);

          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (!newWorker) return;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                window.dispatchEvent(new CustomEvent('pwa-update-available'));
              }
            });
          });

          let refreshing = false;
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            if (!refreshing) {
              refreshing = true;
              window.location.reload();
            }
          });
        })
        .catch((error) => {
          console.warn('[PWA] Service Worker registration failed:', error);
        });
    };

    window.addEventListener('load', () => {
      if ('requestIdleCallback' in window) {
        (window as Window & { requestIdleCallback: (cb: () => void, opts?: { timeout: number }) => void })
          .requestIdleCallback(registerSW, { timeout: 2000 });
      } else {
        setTimeout(registerSW, 1000);
      }
    });
  }

  if (isIOSStandalone) {
    document.documentElement.classList.add('ios-standalone');
    document.body.style.overscrollBehavior = 'none';
  }

  window.addEventListener('beforeinstallprompt', (e: BeforeInstallPromptEvent) => {
    e.preventDefault();
    window.__ASAP_PWA__.installPrompt = e;
    window.dispatchEvent(new CustomEvent('pwa-install-available'));
  });

  window.addEventListener('appinstalled', () => {
    window.__ASAP_PWA__.isInstalled = true;
    window.__ASAP_PWA__.installPrompt = undefined;
    window.dispatchEvent(new CustomEvent('pwa-installed'));
  });
}

bootstrapPwa();

const container = document.getElementById('app-root');
if (!container) throw new Error('#app-root not found');

createRoot(container).render(
  <>
    <AppRouter />
    <Toaster />
  </>
);
