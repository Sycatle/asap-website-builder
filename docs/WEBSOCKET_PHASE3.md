# 🔄 WebSocket Phase 3 - Synchronisation Temps Réel

## 📋 Phase 3 Objectives

**Synchronisation et collaboration temps réel :**
- Synchronisation bidirectionnelle des données
- Présence utilisateur (qui est en ligne)
- Conflits de modification
- Mises à jour temps réel des ressources

---

## 🎯 Cas d'Usage pour ASAP

### 1. **Synchronisation Website** 🌐
- Mise à jour temps réel quand un site est modifié
- Synchronisation des changements entre onglets/appareils
- Notification des conflits potentiels

### 2. **Synchronisation Modules** 📦
- État d'activation/désactivation en temps réel
- Configuration partagée entre utilisateurs
- Mise à jour instantanée du catalogue

### 3. **Synchronisation Cloud** ☁️
- Upload/delete de fichiers en temps réel
- Progression des uploads visible
- Synchronisation multi-appareils

### 4. **Présence Utilisateur** 👤
- Qui est en ligne maintenant
- Qui travaille sur quelle ressource
- Indicateurs "en train de modifier"

---

## 🏗 Architecture Phase 3

```
┌─────────────────────────────────────────────────────────┐
│  React Frontend                                          │
│  ├─ useSyncStore (general sync)                         │
│  ├─ useWebsiteSync (website sync)                       │
│  ├─ useModuleSync (module sync)                         │
│  ├─ usePresence (user presence)                         │
│  └─ Sync Event Handlers                                 │
└─────────────────────────────────────────────────────────┘
                    ↕ WebSocket Events
┌─────────────────────────────────────────────────────────┐
│  Backend (Rust)                                          │
│  ├─ Sync Event Publisher (Redis Pub/Sub)               │
│  ├─ Resource Change Detection                           │
│  ├─ Conflict Resolution Logic                           │
│  └─ Presence Tracking                                   │
└─────────────────────────────────────────────────────────┘
```

---

## 📦 Implementation

### 1. Sync Event Types

```typescript
// apps/web/src/lib/websocket/syncEvents.ts

export type SyncEventType =
  // Website events
  | 'sync:website:updated'
  | 'sync:website:deleted'
  | 'sync:website:published'
  
  // Module events
  | 'sync:module:activated'
  | 'sync:module:deactivated'
  | 'sync:module:configured'
  
  // Cloud events
  | 'sync:file:uploaded'
  | 'sync:file:deleted'
  | 'sync:upload:progress'
  
  // Presence events
  | 'presence:user:online'
  | 'presence:user:offline'
  | 'presence:user:editing';
```

### 2. Website Synchronization

**Hook: `useWebsiteSync`**

```typescript
export function useWebsiteSync(websiteId?: string) {
  const ws = useWebSocket({ url: WS_URL });
  const queryClient = useQueryClient();
  
  useEffect(() => {
    if (!websiteId) return;
    
    // Listen for website updates
    const handleWebsiteUpdated = (data: WebsiteUpdatedEvent) => {
      if (data.website_id === websiteId) {
        // Invalidate cache to refetch
        queryClient.invalidateQueries(['website', websiteId]);
        
        toast.info('Site mis à jour', {
          description: `Par ${data.updated_by}`
        });
      }
    };
    
    ws.on('sync:website:updated', handleWebsiteUpdated);
    
    return () => {
      ws.off('sync:website:updated', handleWebsiteUpdated);
    };
  }, [websiteId, ws, queryClient]);
}
```

### 3. Module Synchronization

**Hook: `useModuleSync`**

```typescript
export function useModuleSync() {
  const ws = useWebSocket({ url: WS_URL });
  const queryClient = useQueryClient();
  
  useEffect(() => {
    const handleModuleActivated = (data: ModuleActivatedEvent) => {
      // Update module list cache
      queryClient.setQueryData(['modules'], (old: Module[]) => {
        return old.map(m => 
          m.id === data.module_id 
            ? { ...m, is_active: true } 
            : m
        );
      });
      
      toast.success(`Module ${data.module_name} activé`);
    };
    
    const handleModuleDeactivated = (data: ModuleDeactivatedEvent) => {
      queryClient.setQueryData(['modules'], (old: Module[]) => {
        return old.map(m => 
          m.id === data.module_id 
            ? { ...m, is_active: false } 
            : m
        );
      });
      
      toast.info(`Module ${data.module_name} désactivé`);
    };
    
    ws.on('sync:module:activated', handleModuleActivated);
    ws.on('sync:module:deactivated', handleModuleDeactivated);
    
    return () => {
      ws.off('sync:module:activated', handleModuleActivated);
      ws.off('sync:module:deactivated', handleModuleDeactivated);
    };
  }, [ws, queryClient]);
}
```

### 4. Presence Tracking

**Hook: `usePresence`**

```typescript
export function usePresence(resourceType?: string, resourceId?: string) {
  const ws = useWebSocket({ url: WS_URL });
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([]);
  const [editingUsers, setEditingUsers] = useState<PresenceUser[]>([]);
  
  // Send presence update when editing
  const startEditing = useCallback(() => {
    if (resourceType && resourceId) {
      ws.send('presence:start-editing', {
        resource_type: resourceType,
        resource_id: resourceId
      });
    }
  }, [ws, resourceType, resourceId]);
  
  const stopEditing = useCallback(() => {
    if (resourceType && resourceId) {
      ws.send('presence:stop-editing', {
        resource_type: resourceType,
        resource_id: resourceId
      });
    }
  }, [ws, resourceType, resourceId]);
  
  useEffect(() => {
    const handleUserOnline = (data: UserOnlineEvent) => {
      setOnlineUsers(prev => [...prev, data.user]);
    };
    
    const handleUserOffline = (data: UserOfflineEvent) => {
      setOnlineUsers(prev => prev.filter(u => u.id !== data.user_id));
    };
    
    const handleUserEditing = (data: UserEditingEvent) => {
      if (data.resource_type === resourceType && data.resource_id === resourceId) {
        setEditingUsers(prev => {
          if (prev.some(u => u.id === data.user.id)) return prev;
          return [...prev, data.user];
        });
      }
    };
    
    ws.on('presence:user:online', handleUserOnline);
    ws.on('presence:user:offline', handleUserOffline);
    ws.on('presence:user:editing', handleUserEditing);
    
    return () => {
      ws.off('presence:user:online', handleUserOnline);
      ws.off('presence:user:offline', handleUserOffline);
      ws.off('presence:user:editing', handleUserEditing);
      stopEditing();
    };
  }, [ws, resourceType, resourceId]);
  
  return {
    onlineUsers,
    editingUsers,
    startEditing,
    stopEditing
  };
}
```

### 5. Upload Progress Tracking

**Hook: `useUploadProgress`**

```typescript
export function useUploadProgress() {
  const ws = useWebSocket({ url: WS_URL });
  const [uploads, setUploads] = useState<Map<string, UploadProgress>>(new Map());
  
  useEffect(() => {
    const handleUploadProgress = (data: UploadProgressEvent) => {
      setUploads(prev => {
        const next = new Map(prev);
        next.set(data.upload_id, {
          filename: data.filename,
          progress: data.progress,
          speed: data.speed,
          eta: data.eta
        });
        return next;
      });
    };
    
    const handleUploadComplete = (data: UploadCompleteEvent) => {
      setUploads(prev => {
        const next = new Map(prev);
        next.delete(data.upload_id);
        return next;
      });
      
      toast.success(`${data.filename} uploadé avec succès`);
    };
    
    ws.on('sync:upload:progress', handleUploadProgress);
    ws.on('sync:upload:complete', handleUploadComplete);
    
    return () => {
      ws.off('sync:upload:progress', handleUploadProgress);
      ws.off('sync:upload:complete', handleUploadComplete);
    };
  }, [ws]);
  
  return { uploads };
}
```

---

## 🔧 Backend Implementation

### 1. Sync Event Publisher

```rust
// core/shared/src/websocket/sync_events.rs

use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum SyncEvent {
    #[serde(rename = "sync:website:updated")]
    WebsiteUpdated {
        website_id: String,
        updated_by: String,
        changes: serde_json::Value,
    },
    
    #[serde(rename = "sync:module:activated")]
    ModuleActivated {
        module_id: String,
        module_name: String,
        activated_by: String,
    },
    
    #[serde(rename = "sync:file:uploaded")]
    FileUploaded {
        file_id: String,
        filename: String,
        size: u64,
        uploaded_by: String,
    },
    
    #[serde(rename = "presence:user:online")]
    UserOnline {
        user_id: String,
        username: String,
    },
}

pub async fn publish_sync_event(
    redis: &mut redis::aio::Connection,
    event: SyncEvent,
) -> Result<(), anyhow::Error> {
    let json = serde_json::to_string(&event)?;
    redis.publish("sync:events", json).await?;
    Ok(())
}
```

### 2. WebSocket Sync Handler

```rust
// apps/api/src/websocket.rs

async fn handle_sync_message(
    msg: WsMessage,
    state: Arc<WsState>,
    authenticated: Arc<RwLock<bool>>,
) {
    if !*authenticated.read().await {
        return;
    }
    
    match msg.msg_type.as_str() {
        "presence:start-editing" => {
            // Broadcast to all clients
            let event = WsMessage {
                msg_type: "presence:user:editing".to_string(),
                data: msg.data,
            };
            state.broadcast(event);
        }
        "presence:stop-editing" => {
            let event = WsMessage {
                msg_type: "presence:user:stopped-editing".to_string(),
                data: msg.data,
            };
            state.broadcast(event);
        }
        _ => {}
    }
}
```

---

## 🧪 Testing Phase 3

### Test Scenarios

#### 1. Website Sync Test
```bash
# Terminal 1: Open website editor
# Terminal 2: Open same website in another tab
# Terminal 1: Make a change
# Expected: Terminal 2 shows update notification
```

#### 2. Module Sync Test
```bash
# Terminal 1: Module list page
# Terminal 2: Activate a module
# Expected: Terminal 1 shows module activated without refresh
```

#### 3. Presence Test
```bash
# Terminal 1: Start editing a resource
# Terminal 2: Open same resource
# Expected: Terminal 2 shows "User X is editing this"
```

#### 4. Multi-Device Sync
```bash
# Device 1: Desktop browser
# Device 2: Mobile browser (same account)
# Device 1: Make changes
# Expected: Device 2 receives updates instantly
```

---

## 📊 Performance Considerations

### Optimization Strategies

1. **Debouncing**
   - Avoid sending too many updates
   - Batch changes within 500ms window

2. **Selective Sync**
   - Only sync relevant resources
   - Filter by user permissions

3. **Conflict Resolution**
   - Last-write-wins strategy
   - Optimistic updates with rollback

4. **Caching**
   - Cache presence data (5s TTL)
   - Invalidate on disconnect

---

## 🎯 Implementation Checklist

### Frontend ✅
- [ ] Create syncEvents.ts with event types
- [ ] Implement useWebsiteSync hook
- [ ] Implement useModuleSync hook
- [ ] Implement useCloudSync hook
- [ ] Implement usePresence hook
- [ ] Implement useUploadProgress hook
- [ ] Add sync indicators to UI
- [ ] Add presence avatars
- [ ] Add conflict warnings

### Backend ✅
- [ ] Create sync event types (Rust)
- [ ] Implement Redis Pub/Sub for sync
- [ ] Add sync event publishers in endpoints
- [ ] Add presence tracking
- [ ] Add conflict detection
- [ ] Add WebSocket sync handlers
- [ ] Add tests

### Integration ✅
- [ ] Integrate in website editor
- [ ] Integrate in module manager
- [ ] Integrate in cloud storage
- [ ] Add to dashboard for live stats
- [ ] Multi-tab testing
- [ ] Multi-device testing

---

## 🚀 Next Steps After Phase 3

### Phase 4 - Advanced Features
- Real-time analytics
- Chat support
- Video calls (WebRTC)
- Screen sharing
- Advanced collaboration tools

---

## 📚 Resources

- [WebSocket Sync Patterns](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
- [Conflict Resolution Strategies](https://en.wikipedia.org/wiki/Conflict-free_replicated_data_type)
- [Presence Best Practices](https://www.pubnub.com/guides/presence/)

---

**Status:** 🚧 Phase 3 In Progress  
**Started:** 2025-12-15  
**Estimated Completion:** 2 weeks  
**Dependencies:** Phase 1 ✅, Phase 2 ✅
