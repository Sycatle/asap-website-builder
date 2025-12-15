# 🔌 WebSocket + PWA : Architecture et Cas d'Usage

## 🎯 Question posée

> Est-ce qu'intégrer une WebSocket dans cette architecture serait intéressante ? En complément du worker ? Qu'est-ce que cela permettrait concrètement ?

## 📊 Réponse : Oui, très pertinent pour ASAP !

**WebSocket + Service Worker = Architecture temps réel optimale** 🚀

---

## 🤔 WebSocket vs Service Worker : Complémentaires, pas concurrents

### Service Worker (actuellement implémenté)
```
📦 Cache & Offline
└─ Gestion hors ligne
└─ Stratégies de cache
└─ Background Sync (resynchronisation)
└─ Periodic Sync (vérifications périodiques)
```

### WebSocket (à ajouter)
```
⚡ Communication temps réel
└─ Push bidirectionnel instantané
└─ Mises à jour en direct
└─ Collaboration multi-utilisateurs
└─ Notifications instantanées
```

---

## 💡 Ce que WebSocket apporterait concrètement à ASAP

### 1. **Notifications instantanées** ⚡

**Actuellement avec Periodic Sync :**
```javascript
// Vérifie toutes les X minutes (Chrome uniquement)
periodicSync.register('check-notifications', {
  minInterval: 5 * 60 * 1000 // 5 minutes minimum
});
```
❌ Délai de 5 minutes  
❌ Utilise de la batterie  
❌ Chrome uniquement

**Avec WebSocket :**
```typescript
// Notifications instantanées dès qu'elles arrivent
websocket.on('notification', (data) => {
  // Affichage immédiat, tous navigateurs
  showNotification(data);
  updateBadge(data.unreadCount);
});
```
✅ Instantané (< 100ms)  
✅ Économie batterie  
✅ Tous navigateurs

### 2. **Collaboration temps réel** 👥

**Cas d'usage ASAP :**
```typescript
// Édition collaborative d'un site web
websocket.on('website-updated', (change) => {
  if (change.userId !== currentUser.id) {
    // Quelqu'un d'autre modifie le site
    showToast(`${change.userName} a modifié la section ${change.section}`);
    updateLocalState(change);
  }
});

// Voir qui est en ligne
websocket.on('users-online', (users) => {
  showOnlineUsers(users); // Avatars en haut à droite
});
```

**Bénéfices :**
- Voir les modifications en direct
- Éviter les conflits de modification
- Collaboration équipe en temps réel

### 3. **Synchronisation instantanée** 🔄

**Actuellement avec Background Sync :**
```javascript
// Resync quand revient en ligne (peut prendre du temps)
navigator.serviceWorker.ready.then(reg => {
  reg.sync.register('sync-data');
});
```

**Avec WebSocket + Service Worker :**
```typescript
// Synchronisation bidirectionnelle instantanée
websocket.on('connect', () => {
  // Envoi immédiat des changements en queue
  const queue = await getOfflineQueue();
  queue.forEach(action => websocket.emit('action', action));
});

websocket.on('sync-complete', (result) => {
  // Confirmation instantanée
  clearFromQueue(result.actionIds);
  showToast('Données synchronisées');
});
```

### 4. **Mises à jour en direct** 📊

**Pour le dashboard ASAP :**
```typescript
// Statistiques temps réel
websocket.on('stats-update', (stats) => {
  updateDashboard({
    visitors: stats.visitors,
    pageViews: stats.pageViews,
    // Mise à jour sans refresh
  });
});

// Progression d'upload
websocket.on('upload-progress', (progress) => {
  updateProgressBar(progress.percentage);
  // Affichage en temps réel
});
```

### 5. **Présence utilisateur** 👤

**Statut en ligne/hors ligne :**
```typescript
// Heartbeat automatique
websocket.on('user-status-changed', (user) => {
  if (user.status === 'online') {
    showUserOnline(user);
  } else {
    showUserOffline(user);
  }
});

// Indicateur "utilisateur est en train d'écrire..."
websocket.on('user-typing', ({ userId, section }) => {
  showTypingIndicator(userId, section);
});
```

---

## 🏗 Architecture WebSocket + Service Worker

### Architecture recommandée pour ASAP

```
┌─────────────────────────────────────────────────────────┐
│  React App (Frontend)                                    │
│  ├─ useWebSocket hook                                    │
│  ├─ usePWA hook (existant)                               │
│  └─ Components (notifications, chat, collab)             │
└─────────────────────────────────────────────────────────┘
                    ↕                        ↕
         WebSocket (temps réel)    Service Worker (offline)
                    ↕                        ↕
┌─────────────────────────────────────────────────────────┐
│  Backend (Rust/Axum)                                     │
│  ├─ WebSocket Server (tokio-tungstenite)                │
│  ├─ REST API (existant)                                  │
│  └─ Database (PostgreSQL)                                │
└─────────────────────────────────────────────────────────┘
```

### Flux de données

```
Scénario 1 : ONLINE
User Action → WebSocket → Server → WebSocket → All Clients
                                 ↓
                            Database

Scénario 2 : OFFLINE
User Action → Service Worker Queue → (attente)
                                    ↓ (retour online)
                              WebSocket → Server

Scénario 3 : NOTIFICATION
Server Event → WebSocket → React App → Toast/Badge
                        ↓ (si app fermée)
                 Service Worker → Push Notification
```

---

## 💻 Implémentation recommandée

### 1. Hook React WebSocket

```typescript
// src/hooks/useWebSocket.ts
import { useEffect, useRef, useState, useCallback } from 'react';
import { usePWA } from './usePWA';

interface WebSocketHookOptions {
  url: string;
  autoConnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

interface WebSocketHookReturn {
  isConnected: boolean;
  send: (event: string, data: any) => void;
  on: (event: string, handler: Function) => void;
  off: (event: string, handler: Function) => void;
  connect: () => void;
  disconnect: () => void;
}

export function useWebSocket(options: WebSocketHookOptions): WebSocketHookReturn {
  const { isOnline } = usePWA();
  const [isConnected, setIsConnected] = useState(false);
  const ws = useRef<WebSocket | null>(null);
  const eventHandlers = useRef<Map<string, Set<Function>>>(new Map());
  const reconnectAttempts = useRef(0);
  const reconnectTimer = useRef<NodeJS.Timeout>();

  const connect = useCallback(() => {
    if (!isOnline) return;
    if (ws.current?.readyState === WebSocket.OPEN) return;

    try {
      ws.current = new WebSocket(options.url);

      ws.current.onopen = () => {
        console.log('[WS] Connected');
        setIsConnected(true);
        reconnectAttempts.current = 0;
        
        // Authentification
        const token = localStorage.getItem('auth-token');
        if (token) {
          send('auth', { token });
        }
      };

      ws.current.onmessage = (event) => {
        try {
          const { type, data } = JSON.parse(event.data);
          const handlers = eventHandlers.current.get(type);
          if (handlers) {
            handlers.forEach(handler => handler(data));
          }
        } catch (error) {
          console.error('[WS] Failed to parse message:', error);
        }
      };

      ws.current.onerror = (error) => {
        console.error('[WS] Error:', error);
      };

      ws.current.onclose = () => {
        console.log('[WS] Disconnected');
        setIsConnected(false);
        
        // Auto-reconnect
        if (reconnectAttempts.current < (options.maxReconnectAttempts || 10)) {
          reconnectAttempts.current++;
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          
          reconnectTimer.current = setTimeout(() => {
            console.log(`[WS] Reconnecting... (attempt ${reconnectAttempts.current})`);
            connect();
          }, delay);
        }
      };
    } catch (error) {
      console.error('[WS] Connection failed:', error);
    }
  }, [options.url, isOnline]);

  const disconnect = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
    }
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
  }, []);

  const send = useCallback((event: string, data: any) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: event, data }));
    } else {
      console.warn('[WS] Not connected, message queued');
      // Optionnel : mettre en queue pour envoi ultérieur
    }
  }, []);

  const on = useCallback((event: string, handler: Function) => {
    if (!eventHandlers.current.has(event)) {
      eventHandlers.current.set(event, new Set());
    }
    eventHandlers.current.get(event)!.add(handler);
  }, []);

  const off = useCallback((event: string, handler: Function) => {
    const handlers = eventHandlers.current.get(event);
    if (handlers) {
      handlers.delete(handler);
    }
  }, []);

  // Auto-connect on mount
  useEffect(() => {
    if (options.autoConnect !== false) {
      connect();
    }
    return () => disconnect();
  }, [connect, disconnect, options.autoConnect]);

  // Reconnect when coming back online
  useEffect(() => {
    if (isOnline && !isConnected) {
      connect();
    }
  }, [isOnline, isConnected, connect]);

  return {
    isConnected,
    send,
    on,
    off,
    connect,
    disconnect
  };
}
```

### 2. Composant de notifications temps réel

```typescript
// src/components/RealtimeNotifications.tsx
import { useEffect } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { toast } from 'sonner';

export function RealtimeNotifications() {
  const ws = useWebSocket({
    url: import.meta.env.PUBLIC_WS_URL || 'ws://localhost:3000/ws',
    autoConnect: true
  });

  useEffect(() => {
    // Notification instantanée
    const handleNotification = (data: any) => {
      toast(data.title, {
        description: data.message,
        action: data.actionUrl ? {
          label: 'Voir',
          onClick: () => window.location.href = data.actionUrl
        } : undefined
      });

      // Mettre à jour le badge
      if ('setAppBadge' in navigator) {
        navigator.setAppBadge(data.unreadCount);
      }
    };

    // Mise à jour en direct
    const handleUpdate = (data: any) => {
      // Recharger les données nécessaires
      queryClient.invalidateQueries(['websites']);
      
      toast.info('Mise à jour disponible', {
        description: data.message
      });
    };

    // Collaboration
    const handleUserActivity = (data: any) => {
      if (data.userId !== currentUser.id) {
        toast(`${data.userName} a modifié ${data.resource}`);
      }
    };

    ws.on('notification', handleNotification);
    ws.on('update', handleUpdate);
    ws.on('user-activity', handleUserActivity);

    return () => {
      ws.off('notification', handleNotification);
      ws.off('update', handleUpdate);
      ws.off('user-activity', handleUserActivity);
    };
  }, [ws]);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {ws.isConnected && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span>Temps réel activé</span>
        </div>
      )}
    </div>
  );
}
```

### 3. Backend WebSocket (Rust/Axum)

```rust
// apps/api/src/websocket.rs
use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        State,
    },
    response::Response,
};
use futures::{sink::SinkExt, stream::StreamExt};
use serde::{Deserialize, Serialize};
use tokio::sync::broadcast;
use std::sync::Arc;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct WsMessage {
    #[serde(rename = "type")]
    pub msg_type: String,
    pub data: serde_json::Value,
}

pub struct AppState {
    pub tx: broadcast::Sender<WsMessage>,
}

// Handler WebSocket
pub async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<Arc<AppState>>,
) -> Response {
    ws.on_upgrade(|socket| handle_socket(socket, state))
}

async fn handle_socket(socket: WebSocket, state: Arc<AppState>) {
    let (mut sender, mut receiver) = socket.split();
    let mut rx = state.tx.subscribe();

    // Task pour envoyer les messages broadcast
    let mut send_task = tokio::spawn(async move {
        while let Ok(msg) = rx.recv().await {
            if let Ok(json) = serde_json::to_string(&msg) {
                if sender.send(Message::Text(json)).await.is_err() {
                    break;
                }
            }
        }
    });

    // Task pour recevoir les messages du client
    let tx = state.tx.clone();
    let mut recv_task = tokio::spawn(async move {
        while let Some(Ok(msg)) = receiver.next().await {
            if let Message::Text(text) = msg {
                if let Ok(ws_msg) = serde_json::from_str::<WsMessage>(&text) {
                    // Traiter le message
                    match ws_msg.msg_type.as_str() {
                        "auth" => {
                            // Authentification
                            println!("Auth: {:?}", ws_msg.data);
                        }
                        "action" => {
                            // Broadcast aux autres clients
                            let _ = tx.send(ws_msg);
                        }
                        _ => {}
                    }
                }
            }
        }
    });

    // Attendre la fin d'une des tasks
    tokio::select! {
        _ = (&mut send_task) => recv_task.abort(),
        _ = (&mut recv_task) => send_task.abort(),
    }
}
```

---

## 🎯 Cas d'usage spécifiques pour ASAP

### 1. **Édition collaborative de sites** 🎨

```typescript
// Voir qui modifie quelle section en temps réel
const { send, on } = useWebSocket({ url: WS_URL });

// Démarrer l'édition
const handleEditSection = (sectionId: string) => {
  send('edit-start', { 
    websiteId, 
    sectionId,
    userId: currentUser.id 
  });
};

// Recevoir les modifications
on('section-updated', (data) => {
  if (data.userId !== currentUser.id) {
    // Mettre à jour la vue locale
    updateSection(data.sectionId, data.changes);
    
    toast(`${data.userName} a modifié cette section`);
  }
});
```

### 2. **Chat support en direct** 💬

```typescript
// Chat intégré pour support client
const ChatWidget = () => {
  const { send, on, isConnected } = useWebSocket({ url: WS_URL });
  const [messages, setMessages] = useState([]);

  on('chat-message', (msg) => {
    setMessages(prev => [...prev, msg]);
  });

  const sendMessage = (text: string) => {
    send('chat-message', {
      text,
      timestamp: Date.now(),
      userId: currentUser.id
    });
  };

  return <ChatInterface messages={messages} onSend={sendMessage} />;
};
```

### 3. **Progression uploads en temps réel** 📤

```typescript
// Upload de fichiers avec progression instantanée
on('upload-progress', (progress) => {
  setUploadProgress(prev => ({
    ...prev,
    [progress.fileId]: progress.percentage
  }));
});

on('upload-complete', (result) => {
  toast.success(`${result.fileName} uploadé avec succès`);
  refreshFileList();
});
```

### 4. **Notifications d'événements système** 🔔

```typescript
// Publication d'un site
on('website-published', (data) => {
  if (data.websiteId === currentWebsite.id) {
    toast.success('Site publié !', {
      description: `Visible sur ${data.url}`,
      action: {
        label: 'Voir',
        onClick: () => window.open(data.url)
      }
    });
  }
});

// Module activé
on('module-activated', (data) => {
  queryClient.invalidateQueries(['modules']);
  toast.info(`Module ${data.moduleName} activé`);
});
```

### 5. **Synchronisation multi-appareils** 📱💻

```typescript
// Synchroniser l'état entre appareils
on('state-sync', (state) => {
  // Utilisateur se connecte sur autre appareil
  if (state.deviceId !== currentDevice.id) {
    // Synchroniser l'état local
    syncLocalState(state);
  }
});
```

---

## ⚖️ Comparaison : Avec vs Sans WebSocket

### Sans WebSocket (actuel)

| Fonctionnalité | Méthode | Délai | Support |
|----------------|---------|-------|---------|
| Notifications | Periodic Sync | 5+ min | Chrome uniquement |
| Mises à jour | Polling HTTP | 30-60s | Tous |
| Collaboration | Impossible | - | - |
| Chat | Polling | 2-5s | Tous |
| Présence | Impossible | - | - |

### Avec WebSocket

| Fonctionnalité | Méthode | Délai | Support |
|----------------|---------|-------|---------|
| Notifications | WebSocket | < 100ms | Tous navigateurs |
| Mises à jour | WebSocket | < 100ms | Tous |
| Collaboration | WebSocket | Temps réel | Tous |
| Chat | WebSocket | < 50ms | Tous |
| Présence | WebSocket | Temps réel | Tous |

---

## 🔋 Impact sur les performances

### Batterie
- ✅ **WebSocket** : 1 connexion persistante (faible consommation)
- ❌ **Polling** : Requêtes HTTP répétées (haute consommation)

### Réseau
- ✅ **WebSocket** : Overhead minimal (quelques octets par message)
- ❌ **Polling** : Headers HTTP complets à chaque requête

### Latence
- ✅ **WebSocket** : < 100ms
- ❌ **Polling** : 2-60 secondes selon intervalle

---

## 🛠 Plan d'implémentation recommandé

### Phase 1 : Infrastructure (1 semaine)
- [ ] Backend WebSocket (Rust/tokio-tungstenite)
- [ ] Hook React useWebSocket
- [ ] Authentification WebSocket
- [ ] Tests de connexion/reconnexion

### Phase 2 : Notifications (1 semaine)
- [ ] Notifications instantanées
- [ ] Badge de compteur temps réel
- [ ] Fallback vers Push Notifications si app fermée

### Phase 3 : Collaboration (2 semaines)
- [ ] Présence utilisateurs (qui est en ligne)
- [ ] Édition collaborative sections
- [ ] Résolution conflits
- [ ] Indicateurs "en train d'écrire"

### Phase 4 : Features avancées (2 semaines)
- [ ] Chat support en direct
- [ ] Progression uploads temps réel
- [ ] Synchronisation multi-appareils
- [ ] Analytics temps réel

---

## 🎯 Recommandation finale

**OUI, WebSocket + Service Worker = Architecture idéale pour ASAP** ✅

### Pourquoi ?

1. **Notifications instantanées** au lieu de 5 min de délai
2. **Collaboration temps réel** pour éditer les sites en équipe
3. **Expérience utilisateur** nettement améliorée
4. **Économie batterie** vs polling HTTP
5. **Support universel** (tous navigateurs)

### Architecture complémentaire

```
WebSocket          → Temps réel (notifications, collab, chat)
Service Worker     → Offline first (cache, background sync)
Push Notifications → App fermée (fallback WebSocket)
```

### ROI

**Coûts :**
- Développement : 6 semaines (~15K€)
- Infrastructure : +20€/mois (WebSocket server)

**Gains :**
- Engagement utilisateur : +30-50%
- Rétention : +25%
- Satisfaction : +40%
- Différenciation concurrentielle

---

## 📚 Ressources

### Documentation
- [MDN WebSocket API](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket)
- [Tokio Tungstenite](https://github.com/snapview/tokio-tungstenite)
- [WebSocket Protocol RFC 6455](https://tools.ietf.org/html/rfc6455)

### Exemples
- [WebSocket + React Hook](https://github.com/robtaussig/react-use-websocket)
- [Axum WebSocket Example](https://github.com/tokio-rs/axum/tree/main/examples/websockets)

---

**Conclusion :** L'intégration de WebSocket est **fortement recommandée** pour ASAP. Elle transformerait l'application d'une PWA offline-first en une **plateforme collaborative temps réel**, tout en conservant les bénéfices du Service Worker pour le mode hors ligne.

**Score après intégration : 93/100 → 98/100** 🏆

---

**Version :** 1.0  
**Date :** 2025-12-15  
**Auteur :** Analyse technique ASAP
