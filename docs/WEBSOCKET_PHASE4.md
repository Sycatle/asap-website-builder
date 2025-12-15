# 🚀 WebSocket Phase 4: Backend Integration & Resource Access Control

## 📋 Vue d'ensemble

Phase 4 complète l'infrastructure WebSocket avec l'intégration backend complète, le contrôle d'accès basé sur les ressources, et les fonctionnalités avancées pour un système de temps réel en production.

**Status:** ✅ En cours d'implémentation

---

## 🎯 Objectifs Phase 4

### Objectifs principaux

1. **✅ Système d'événements de synchronisation** - Events typés pour websites, modules, fichiers
2. **✅ Contrôle d'accès basé sur les comptes** - Seuls les propriétaires reçoivent les mises à jour
3. **🔄 Intégration API** - Publishers dans tous les endpoints critiques
4. **🔄 Tracking de présence** - Système de présence côté backend
5. **🔄 Rate limiting** - Protection contre les abus
6. **🔄 Résolution de conflits** - Gestion des modifications concurrentes

---

## 🏗 Architecture Phase 4

### Vue d'ensemble

```
┌─────────────────────────────────────────────────────────┐
│  API Endpoints (create/update/delete)                    │
│  ├─ websites.rs                                          │
│  ├─ modules.rs                                           │
│  ├─ files.rs                                             │
│  └─ SyncPublisher.publish(event) ────────────┐          │
└───────────────────────────────────────────────┼─────────┘
                                                 │
                                                 ↓
┌─────────────────────────────────────────────────────────┐
│  Redis Pub/Sub (distribution multi-instances)           │
│  Channels:                                               │
│  ├─ asap:sync:website                                   │
│  ├─ asap:sync:module                                    │
│  ├─ asap:sync:file                                      │
│  └─ asap:presence                                       │
└───────────────────────────────────────────────┼─────────┘
                                                 │
                                                 ↓
┌─────────────────────────────────────────────────────────┐
│  WebSocket Subscribers (receive from Redis)             │
│  └─ RedisSyncSubscriber                                 │
│     └─ handle_event(event) ──────────────┐              │
└───────────────────────────────────────────┼─────────────┘
                                             │
                                             ↓
┌─────────────────────────────────────────────────────────┐
│  Account-Filtered Broadcast                             │
│  └─ ws_state.broadcast_to_account(account_id, msg)     │
│     └─ Check authenticated_clients registry             │
│        └─ Add __account_id metadata                     │
└───────────────────────────────────────────┼─────────────┘
                                             │
                                             ↓
┌─────────────────────────────────────────────────────────┐
│  WebSocket Send Task (per client)                       │
│  └─ Filter by account_id                                │
│     └─ Only send if __account_id matches                │
│        └─ Remove metadata before sending                │
└───────────────────────────────────────────┼─────────────┘
                                             │
                                             ↓
┌─────────────────────────────────────────────────────────┐
│  Connected Clients (receive relevant updates only)      │
└─────────────────────────────────────────────────────────┘
```

---

## 🔧 Composants implémentés

### 1. Types d'événements de synchronisation ✅

**Fichier:** `core/shared/src/pubsub.rs`

#### Types d'événements

**Website Events (4):**
```rust
SyncPubSubEvent::WebsiteUpdated {
    account_id: String,
    website_id: String,
    website: serde_json::Value,
    user_name: Option<String>,
}

SyncPubSubEvent::WebsiteDeleted {
    account_id: String,
    website_id: String,
    user_name: Option<String>,
}

SyncPubSubEvent::WebsitePublished {
    account_id: String,
    website_id: String,
    public_url: String,
    user_name: Option<String>,
}

SyncPubSubEvent::WebsiteUnpublished {
    account_id: String,
    website_id: String,
    user_name: Option<String>,
}
```

**Module Events (4):**
```rust
SyncPubSubEvent::ModuleActivated {
    account_id: String,
    website_id: String,
    module_slug: String,
    user_name: Option<String>,
}

SyncPubSubEvent::ModuleDeactivated { ... }
SyncPubSubEvent::ModuleConfigured { ... }
SyncPubSubEvent::ModuleCatalogUpdated { ... }
```

**File Events (5):**
```rust
SyncPubSubEvent::FileUploaded {
    account_id: String,
    website_id: String,
    file_id: String,
    file_name: String,
    file_size: u64,
    user_name: Option<String>,
}

SyncPubSubEvent::FileDeleted { ... }
SyncPubSubEvent::UploadProgress { ... }
SyncPubSubEvent::UploadComplete { ... }
SyncPubSubEvent::UploadFailed { ... }
```

**Presence Events (5):**
```rust
SyncPubSubEvent::UserOnline {
    account_id: String,
    user_id: String,
    user_name: String,
    user_avatar: Option<String>,
}

SyncPubSubEvent::UserOffline { ... }
SyncPubSubEvent::UserStartedEditing { ... }
SyncPubSubEvent::UserStoppedEditing { ... }
SyncPubSubEvent::OnlineUsersList { ... }
```

#### Méthodes utilitaires

```rust
impl SyncPubSubEvent {
    /// Extrait l'account_id de n'importe quel événement
    pub fn account_id(&self) -> &str;
    
    /// Retourne le channel Redis approprié
    pub fn channel(&self) -> &'static str;
    
    /// Convertit en message WebSocket
    pub fn to_ws_message(&self) -> serde_json::Value;
}
```

### 2. Trait SyncPublisher ✅

**Fichier:** `core/shared/src/pubsub.rs`

```rust
#[async_trait::async_trait]
pub trait SyncPublisher: Send + Sync {
    /// Publier un événement de sync
    async fn publish(&self, event: SyncPubSubEvent) -> anyhow::Result<()>;
    
    /// Méthodes helper pour chaque type d'événement
    async fn publish_website_updated(...) -> anyhow::Result<()>;
    async fn publish_website_deleted(...) -> anyhow::Result<()>;
    async fn publish_module_activated(...) -> anyhow::Result<()>;
    async fn publish_file_uploaded(...) -> anyhow::Result<()>;
    async fn publish_user_online(...) -> anyhow::Result<()>;
    // ... etc
}

/// Type partagé
pub type SharedSyncPublisher = Arc<dyn SyncPublisher>;

/// No-op publisher (fallback sans Redis)
pub struct NoOpSyncPublisher;
```

### 3. RedisSyncPublisher ✅

**Fichier:** `apps/api/src/redis_pubsub.rs`

```rust
pub struct RedisSyncPublisher {
    redis: redis::aio::ConnectionManager,
}

impl SyncPublisher for RedisSyncPublisher {
    async fn publish(&self, event: SyncPubSubEvent) -> anyhow::Result<()> {
        let payload = serde_json::to_string(&event)?;
        let channel = event.channel(); // Routing automatique
        
        let mut conn = self.redis.clone();
        let _: () = conn.publish(channel, &payload).await?;
        
        tracing::debug!("Published sync event to Redis channel: {}", channel);
        Ok(())
    }
}
```

### 4. RedisSyncSubscriber ✅

**Fichier:** `apps/api/src/redis_pubsub.rs`

```rust
pub struct RedisSyncSubscriber {
    ws_state: Arc<WsState>,
}

impl RedisSyncSubscriber {
    pub async fn run(&self, redis_url: &str) -> anyhow::Result<()> {
        // Subscribe to all sync channels
        let mut pubsub = conn.into_pubsub();
        pubsub.subscribe(CHANNEL_SYNC_WEBSITE).await?;
        pubsub.subscribe(CHANNEL_SYNC_MODULE).await?;
        pubsub.subscribe(CHANNEL_SYNC_FILE).await?;
        pubsub.subscribe(CHANNEL_PRESENCE).await?;
        
        // Process messages with account filtering
        loop {
            if let Some(msg) = pubsub.on_message().next().await {
                let event: SyncPubSubEvent = serde_json::from_str(&payload)?;
                self.handle_event(event).await;
            }
        }
    }
    
    async fn handle_event(&self, event: SyncPubSubEvent) {
        let account_id = event.account_id().to_string();
        let msg = /* convert to WsMessage */;
        
        // ✅ Broadcast UNIQUEMENT aux clients de ce compte
        self.ws_state.broadcast_to_account(&account_id, msg).await;
    }
}

/// Start as background task
pub fn spawn_redis_sync_subscriber(ws_state: Arc<WsState>, redis_url: String);
```

### 5. Contrôle d'accès basé sur les comptes ✅

**Fichier:** `apps/api/src/websocket.rs`

#### Registry des clients authentifiés

```rust
pub struct WsState {
    pub tx: broadcast::Sender<WsMessage>,
    pub config: Arc<SharedConfig>,
    /// Map des clients authentifiés: account_id -> Vec<ClientInfo>
    pub authenticated_clients: Arc<RwLock<HashMap<String, Vec<ClientInfo>>>>,
}

impl WsState {
    /// Enregistrer un client authentifié
    pub async fn register_client(&self, account_id: String, client_id: uuid::Uuid);
    
    /// Désenregistrer un client
    pub async fn unregister_client(&self, account_id: &str, client_id: uuid::Uuid);
    
    /// Vérifier si un compte a des clients connectés
    pub async fn has_connected_clients(&self, account_id: &str) -> bool;
}
```

#### Broadcast filtré par compte

```rust
impl WsState {
    /// Broadcast à tous les clients d'un compte spécifique
    pub async fn broadcast_to_account(&self, account_id: &str, mut msg: WsMessage) {
        // Ajouter metadata pour le filtrage
        if let Some(data) = msg.data.as_object_mut() {
            data.insert("__account_id".to_string(), serde_json::json!(account_id));
        }
        
        // Vérifier si le compte a des clients connectés
        if self.has_connected_clients(account_id).await {
            self.broadcast(msg);
        }
    }
}
```

#### Filtrage côté client

```rust
// Dans la task d'envoi de chaque client WebSocket
Ok(mut msg) = broadcast_rx.recv() => {
    if let Some(account_id) = auth_clone.read().await.as_ref() {
        // Vérifier si le message est pour ce compte
        let should_send = if let Some(target_account) = msg.data.get("__account_id") {
            target_account.as_str() == Some(account_id)
        } else {
            true // Pas de filtre, envoyer à tous
        };
        
        if should_send {
            // Retirer la metadata interne
            if let Some(data) = msg.data.as_object_mut() {
                data.remove("__account_id");
            }
            
            sender.send(Message::Text(json)).await?;
        }
    }
}
```

---

## 📝 Exemple d'intégration dans les endpoints

### Website endpoint

```rust
use asap_core_api::SharedSyncPublisher;

pub async fn update_website(
    State(sync_publisher): State<SharedSyncPublisher>,
    Extension(claims): Extension<Claims>,
    Json(payload): Json<UpdateWebsiteRequest>,
) -> Result<Json<Website>, StatusCode> {
    // 1. Mettre à jour en base de données
    let website = update_website_in_db(&payload).await?;
    
    // 2. Publier l'événement de sync
    sync_publisher
        .publish_website_updated(
            &claims.sub, // account_id
            &website.id,
            serde_json::to_value(&website)?,
            Some(user.name.clone()),
        )
        .await
        .ok(); // Ne pas fail si Redis est down
    
    Ok(Json(website))
}
```

### Module endpoint

```rust
pub async fn activate_module(
    State(sync_publisher): State<SharedSyncPublisher>,
    Extension(claims): Extension<Claims>,
    Path((website_id, module_slug)): Path<(String, String)>,
) -> Result<StatusCode, StatusCode> {
    // 1. Activer le module
    activate_module_in_db(&website_id, &module_slug).await?;
    
    // 2. Publier l'événement
    sync_publisher
        .publish_module_activated(
            &claims.sub,
            &website_id,
            &module_slug,
            Some(user.name),
        )
        .await
        .ok();
    
    Ok(StatusCode::OK)
}
```

### File upload endpoint

```rust
pub async fn upload_file(
    State(sync_publisher): State<SharedSyncPublisher>,
    Extension(claims): Extension<Claims>,
    multipart: Multipart,
) -> Result<Json<FileUploadResponse>, StatusCode> {
    // 1. Upload le fichier
    let file = process_upload(multipart).await?;
    
    // 2. Publier l'événement
    sync_publisher
        .publish_file_uploaded(
            &claims.sub,
            &file.website_id,
            &file.id,
            file.name.clone(),
            file.size,
            Some(user.name),
        )
        .await
        .ok();
    
    Ok(Json(FileUploadResponse { file }))
}
```

---

## 🔒 Sécurité et contrôle d'accès

### Niveaux de sécurité

1. **Authentification JWT** ✅
   - Validation signature + expiration
   - Extraction account_id des claims

2. **Contrôle d'accès basé sur le compte** ✅
   - Metadata `__account_id` sur chaque message
   - Filtrage côté receiver WebSocket
   - Seuls les propriétaires reçoivent leurs événements

3. **Registry des clients** ✅
   - Tracking de tous les clients par account_id
   - Nettoyage automatique à la déconnexion
   - Vérification avant broadcast

4. **Rate limiting** 🔄 (À implémenter)
   - Limite de connexions par compte
   - Limite de messages par seconde
   - Throttling automatique

5. **Validation des ressources** 🔄 (À implémenter)
   - Vérifier que l'utilisateur possède la ressource
   - Rejeter les événements non autorisés

### Logs de sécurité

```rust
info!("Client {} authenticated successfully for account: {}", client_id, account_id);
warn!("Client {} attempted to send action without authentication", client_id);
debug!("Broadcast to account: {} ({} clients connected)", account_id, client_count);
```

---

## 🧪 Tests

### Tests unitaires

```rust
#[tokio::test]
async fn test_sync_event_serialization() {
    let event = SyncPubSubEvent::WebsiteUpdated {
        account_id: "account-123".to_string(),
        website_id: "site-456".to_string(),
        website: json!({"name": "Test"}),
        user_name: Some("Alice".to_string()),
    };
    
    let json = serde_json::to_string(&event).unwrap();
    let parsed: SyncPubSubEvent = serde_json::from_str(&json).unwrap();
    
    assert_eq!(parsed.account_id(), "account-123");
    assert_eq!(parsed.channel(), CHANNEL_SYNC_WEBSITE);
}

#[tokio::test]
async fn test_account_filtering() {
    let ws_state = WsState::new(config);
    
    // Register clients
    ws_state.register_client("account-1".to_string(), uuid1).await;
    ws_state.register_client("account-2".to_string(), uuid2).await;
    
    // Broadcast to account-1
    let msg = WsMessage { /* ... */ };
    ws_state.broadcast_to_account("account-1", msg).await;
    
    // Only account-1 clients should receive
    // (test with mock receivers)
}
```

### Tests d'intégration

```bash
# Terminal 1: Start Redis
docker run -p 6379:6379 redis:alpine

# Terminal 2: Start API
cd apps/api
REDIS_URL=redis://localhost:6379 cargo run

# Terminal 3: Test sync events
curl -X POST http://localhost:3000/api/websites/123 \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "Updated Site"}'

# Terminal 4: Monitor WebSocket
websocat ws://localhost:3000/ws
# Send auth, then observe sync events
```

---

## 📊 Métriques et monitoring

### Métriques clés

```rust
// À implémenter avec prometheus-client

// Connexions
websocket_connections_total{account_id}
websocket_connections_active{account_id}

// Messages
websocket_messages_sent_total{account_id, type}
websocket_messages_received_total{account_id, type}
websocket_messages_dropped_total{account_id, reason}

// Sync events
sync_events_published_total{channel, account_id}
sync_events_delivered_total{channel, account_id}
sync_events_filtered_total{channel, account_id}

// Performance
websocket_message_duration_seconds{type}
sync_event_processing_duration_seconds{type}
```

### Logs structurés

```rust
tracing::info!(
    account_id = %account_id,
    event_type = %event_type,
    client_count = clients.len(),
    "Sync event published"
);

tracing::debug!(
    account_id = %account_id,
    client_id = %client_id,
    message_type = %msg_type,
    "Message sent to client"
);
```

---

## 🚀 Prochaines étapes

### Phase 4A: Intégration API complète (1 semaine)

- [ ] Ajouter `SharedSyncPublisher` aux routes websites
- [ ] Ajouter `SharedSyncPublisher` aux routes modules
- [ ] Ajouter `SharedSyncPublisher` aux routes files
- [ ] Tests d'intégration end-to-end

### Phase 4B: Presence tracking (1 semaine)

- [ ] État de présence en mémoire (HashMap)
- [ ] Heartbeat automatique (30s)
- [ ] Endpoints de query de présence
- [ ] Nettoyage automatique des utilisateurs inactifs

### Phase 4C: Rate limiting (3 jours)

- [ ] Connection rate limiter (max N connexions/minute)
- [ ] Message rate limiter (max M messages/seconde)
- [ ] Account connection limit (max X clients par compte)
- [ ] Throttling avec backpressure

### Phase 4D: Résolution de conflits (1 semaine)

- [ ] Versioning des ressources (etag/version)
- [ ] Détection de conflit automatique
- [ ] Stratégies de résolution (last-write-wins, merge, reject)
- [ ] UI pour résolution manuelle

### Phase 4E: Features avancées (2 semaines)

- [ ] `useUploadProgress` hook
- [ ] `useCloudSync` hook avec offline queue
- [ ] `useAnalytics` hook pour events temps réel
- [ ] `useChat` hook pour support client
- [ ] Composants UI:
  - `PresenceAvatars` - avatars utilisateurs en ligne
  - `EditingIndicator` - "X est en train d'éditer"
  - `UploadProgressBar` - barre de progression
  - `ConflictResolver` - UI résolution conflits

---

## 📚 Ressources

### Documentation

- [WebSocket Phase 1](./WEBSOCKET_PHASE1.md) - Infrastructure
- [WebSocket Phase 3](./WEBSOCKET_PHASE3.md) - Synchronisation frontend
- [WebSocket Security](./WEBSOCKET_SECURITY.md) - Sécurité

### Code

- `core/shared/src/pubsub.rs` - Types et traits
- `apps/api/src/redis_pubsub.rs` - Publishers et subscribers
- `apps/api/src/websocket.rs` - WebSocket handler avec filtering

### Configuration

```env
# .env
REDIS_URL=redis://localhost:6379
JWT_SECRET=your-secret-key
DATABASE_URL=postgresql://...
```

---

**Version:** 1.0  
**Date:** 2025-12-15  
**Statut:** ✅ Infrastructure complète, 🔄 Intégration en cours
