# 🚀 Guide de Démarrage Rapide PWA - ASAP

Guide pratique pour exploiter immédiatement les fonctionnalités PWA d'ASAP.

## 📱 Installation rapide

### Sur Chrome/Edge Desktop

1. Ouvrir l'application
2. Cliquer sur l'icône ⊕ dans la barre d'adresse
3. Cliquer "Installer ASAP"

### Sur Android

1. Ouvrir l'application dans Chrome/Firefox
2. Appuyer sur Menu (⋮) → "Installer l'application"

### Sur iOS

1. Ouvrir l'application dans Safari
2. Appuyer sur Partager 📤
3. "Sur l'écran d'accueil"
4. "Ajouter"

---

## 🎯 Fonctionnalités clés

### 1. Mode Hors Ligne ✅

**Déjà fonctionnel !** L'application fonctionne automatiquement hors ligne.

**Test :**
```bash
# 1. Ouvrir l'app
# 2. Naviguer sur quelques pages
# 3. Désactiver le réseau (Mode Avion)
# 4. Rafraîchir la page → ça fonctionne !
```

**Que faire hors ligne :**
- Consulter les pages visitées
- Voir les données en cache
- Les modifications sont mises en queue
- Synchronisation automatique au retour en ligne

### 2. Notifications Push 🔔

**Activation :**
```typescript
// Dans votre composant
import { useNotifications } from '@/utils/pwa/notifications';

function MyComponent() {
  const { requestPermission, showNotification } = useNotifications();

  const handleEnable = async () => {
    const granted = await requestPermission();
    if (granted) {
      showNotification({
        title: 'Notifications activées !',
        body: 'Vous recevrez les mises à jour importantes'
      });
    }
  };

  return <button onClick={handleEnable}>Activer notifications</button>;
}
```

### 3. Partage de Contenu 🔗

**Partager depuis ASAP :**
```typescript
import { useShare } from '@/utils/pwa/shareHandler';

function ShareButton() {
  const { share } = useShare();

  const handleShare = () => {
    share({
      title: 'Mon site ASAP',
      text: 'Regarde mon site !',
      url: 'https://monsite.asap.cool'
    });
  };

  return <button onClick={handleShare}>Partager</button>;
}
```

**Recevoir des partages :**
- Autre app → Partager → ASAP
- Les fichiers arrivent dans `/app/cloud`

### 4. Cache Intelligent 💾

**Voir l'état du cache :**
```typescript
import { usePWA } from '@/hooks/usePWA';

function CacheInfo() {
  const { getCacheStats } = usePWA();
  
  const [stats, setStats] = useState(null);
  
  useEffect(() => {
    getCacheStats().then(setStats);
  }, []);
  
  return (
    <div>
      Cache: {stats?.totalItems} items
      Version: {stats?.version}
    </div>
  );
}
```

**Vider le cache :**
```typescript
const { clearCache } = usePWA();

const handleClear = async () => {
  await clearCache();
  window.location.reload();
};
```

---

## 🔧 Configuration rapide

### Ajouter des composants PWA à votre layout

```astro
---
// src/layouts/AppLayout.astro
import { PWAProvider } from '@/components/pwa-manager';
---

<PWAProvider client:load>
  <!-- Votre contenu -->
  <slot />
</PWAProvider>
```

Cela active automatiquement :
- ✅ Banner d'installation
- ✅ Prompt de mise à jour
- ✅ Indicateur réseau
- ✅ Status de la file d'attente offline

### Désactiver certaines fonctionnalités

```astro
<PWAProvider
  client:load
  showInstallBanner={false}
  showNetworkStatus={true}
  showUpdatePrompt={true}
  showOfflineQueue={true}
>
  <slot />
</PWAProvider>
```

### Ajouter le panneau de statut PWA

```tsx
// Dans vos paramètres
import { PWAStatusPanel } from '@/components/pwa-manager';

<PWAStatusPanel />
```

Affiche :
- État d'installation
- Mode d'affichage
- Navigateur/plateforme
- Stats du cache
- Actions (installer, vider cache)

---

## 📊 Monitoring et Analytics

### Tracker les événements PWA

```typescript
// src/hooks/usePWAAnalytics.ts (déjà fourni dans PWA_EXAMPLES.md)
import { usePWAAnalytics } from '@/hooks/usePWAAnalytics';

function App() {
  usePWAAnalytics(); // Active le tracking automatique
  
  return <YourApp />;
}
```

**Événements trackés automatiquement :**
- Installation de l'app
- Mode d'affichage (standalone/browser)
- Passage offline/online
- Platform/navigateur utilisé

### Ajouter des métriques personnalisées

```typescript
// Dans votre composant
const { displayMode, isOnline, isInstalled } = usePWA();

useEffect(() => {
  if (window.gtag) {
    window.gtag('event', 'pwa_feature_used', {
      feature: 'offline_mode',
      display_mode: displayMode,
      is_installed: isInstalled
    });
  }
}, []);
```

---

## 🎨 Personnalisation

### Changer les couleurs du thème

```json
// apps/web/public/manifest.json
{
  "theme_color": "#6366f1",        // Votre couleur principale
  "background_color": "#ffffff"    // Fond de splash screen
}
```

### Modifier les raccourcis d'app

```json
// apps/web/public/manifest.json
{
  "shortcuts": [
    {
      "name": "Nouvelle fonctionnalité",
      "url": "/app/nouvelle-page?source=shortcut",
      "icons": [{ "src": "/icons/custom-icon.png", "sizes": "192x192" }]
    }
  ]
}
```

### Personnaliser les notifications

```typescript
// apps/web/public/sw.js
// Modifier les options de notification par défaut
var options = {
  vibrate: [200, 100, 200],           // Pattern de vibration
  requireInteraction: false,           // Fermeture auto ou non
  badge: '/icons/custom-badge.png'    // Badge personnalisé
};
```

---

## 🐛 Débogage

### Vérifier le Service Worker

```javascript
// Console du navigateur
navigator.serviceWorker.getRegistration().then(reg => {
  console.log('SW State:', reg.active?.state);
  console.log('SW Script:', reg.active?.scriptURL);
  console.log('Scope:', reg.scope);
});
```

### Voir le cache

```javascript
// Console du navigateur
caches.keys().then(names => {
  console.log('Caches:', names);
  
  names.forEach(name => {
    caches.open(name).then(cache => {
      cache.keys().then(keys => {
        console.log(`${name}: ${keys.length} items`);
      });
    });
  });
});
```

### Forcer une mise à jour du SW

```javascript
// Console du navigateur
navigator.serviceWorker.getRegistration().then(reg => {
  reg.update().then(() => {
    console.log('Update triggered');
  });
});
```

### Désinstaller le Service Worker

```javascript
// Console du navigateur
navigator.serviceWorker.getRegistration().then(reg => {
  reg.unregister().then(() => {
    console.log('SW unregistered');
    window.location.reload();
  });
});
```

---

## ✅ Checklist de vérification

Avant de déployer en production :

### Installation
- [ ] L'app s'installe sur Chrome Desktop
- [ ] L'app s'installe sur Chrome Android
- [ ] Les instructions iOS s'affichent sur Safari
- [ ] L'icône de l'app est correcte (192x192 et 512x512)
- [ ] Le nom de l'app est correct dans le launcher

### Offline
- [ ] Les pages visitées fonctionnent hors ligne
- [ ] La page `/offline` s'affiche si page non cachée
- [ ] Les actions offline sont mises en queue
- [ ] Synchronisation au retour en ligne

### Notifications
- [ ] Demande de permission fonctionne
- [ ] Notification de test s'affiche
- [ ] Les actions de notification fonctionnent
- [ ] Badge de compteur fonctionne (si implémenté)

### Performance
- [ ] Lighthouse PWA score > 90
- [ ] Temps de chargement < 3s
- [ ] Cache se remplit correctement
- [ ] Pas d'erreurs dans la console

### UX
- [ ] Banner d'installation s'affiche (non installé)
- [ ] Banner se cache après install
- [ ] Prompt de mise à jour fonctionne
- [ ] Indicateur réseau s'affiche correctement

---

## 🆘 Problèmes courants

### "Service Worker not registered"

**Solution :**
```bash
# Vérifier que l'app tourne en HTTPS (localhost OK)
# Vérifier que sw.js est accessible
curl http://localhost:4321/sw.js

# Vérifier la console pour les erreurs
```

### "Install button not showing"

**Causes possibles :**
- Déjà installé (vérifier en standalone)
- Manifest invalide (vérifier DevTools → Application → Manifest)
- HTTPS requis (sauf localhost)
- Navigateur ne supporte pas (Safari iOS = manuel)

**Vérification :**
```javascript
window.addEventListener('beforeinstallprompt', (e) => {
  console.log('Install prompt available!');
});
```

### "Cache not working offline"

**Solutions :**
1. Vérifier que les URLs sont bien en cache
2. Vérifier la stratégie de cache (Network-first vs Cache-first)
3. Nettoyer le cache et réessayer
4. Vérifier les blacklist URLs dans sw.js

### "Notifications not working on iOS"

**Normal !** iOS Safari a un support limité des notifications push.

**Alternatives :**
- Utiliser les notifications Web sur iOS 16.4+
- Demander l'ajout à l'écran d'accueil
- Utiliser des badges visuels dans l'app

---

## 📚 Prochaines étapes

1. **Lire la documentation complète**
   - `docs/PWA_ANALYSIS.md` - Analyse approfondie
   - `docs/PWA_EXAMPLES.md` - Exemples de code détaillés

2. **Créer les screenshots**
   - Suivre `apps/web/public/screenshots/README.md`

3. **Tester sur différents appareils**
   - Chrome Desktop, Android
   - Firefox Desktop, Android
   - Safari iOS, macOS
   - Edge Desktop

4. **Implémenter les fonctionnalités avancées**
   - Badging API pour compteur
   - Web Share API pour partage
   - Background Fetch pour gros fichiers

5. **Optimiser les performances**
   - Précacher les assets critiques
   - Optimiser les images
   - Compression Brotli

---

## 🎓 Ressources

### Documentation officielle
- [MDN - PWA](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [web.dev - PWA](https://web.dev/progressive-web-apps/)
- [Chrome PWA](https://developer.chrome.com/docs/workbox/)

### Outils
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)
- [PWA Builder](https://www.pwabuilder.com/)
- [Workbox](https://developers.google.com/web/tools/workbox)

### Communauté
- [PWA Slack](https://bit.ly/join-pwa-slack)
- [PWA on Twitter](https://twitter.com/hashtag/PWA)

---

**Version :** 1.0  
**Dernière mise à jour :** 2025-12-14  
**Auteur :** Documentation ASAP PWA
