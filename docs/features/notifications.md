<!-- translation-pending -->
> **Note:** this document is a legacy design doc retained in French. A translation pass is planned — see GitHub Issues. Open a PR or an issue if you need it sooner.

# Module Notifications - Documentation

## Vue d'ensemble

Le module de notifications permet de gérer les notifications utilisateur avec support pour :
- Notifications in-app avec dropdown
- Notifications push (PWA)
- État lu/non lu
- Catégorisation et priorités
- Paramètres personnalisables par utilisateur

## Architecture

### Backend (Rust)

**Module**: `modules/notifications/`
- `types.rs` - Types et structures de données
- `service.rs` - Service de gestion des notifications

**API Core**: `core/api/src/notifications.rs`
- Endpoints REST pour la gestion des notifications

### Frontend (React/TypeScript)

**Composants**:
- `notifications-dropdown.tsx` - Dropdown dans le header
- `NotificationsPage.tsx` - Page de gestion des notifications

**API Client**: `lib/api/notifications.ts`
**Hooks**: `hooks/useNotifications.ts`

### Base de données

Tables créées par la migration `20251214100000_add_notifications.sql`:
- `notifications` - Notifications utilisateur
- `push_subscriptions` - Abonnements push
- `notification_settings` - Préférences utilisateur
- `vapid_keys` - Clés VAPID pour Web Push

## API Endpoints

### Notifications

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/notifications` | Liste des notifications (avec filtres) |
| GET | `/notifications/unread-count` | Nombre de notifications non lues |
| GET | `/notifications/:id` | Détail d'une notification |
| POST | `/notifications/mark-read` | Marquer comme lu (plusieurs ou toutes) |
| POST | `/notifications/:id/read` | Marquer une notification comme lue |
| DELETE | `/notifications/:id` | Supprimer une notification |

### Push Notifications

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/notifications/push/subscribe` | S'abonner aux notifications push |
| POST | `/notifications/push/unsubscribe` | Se désabonner |
| GET | `/notifications/push/vapid-key` | Récupérer la clé publique VAPID |

### Paramètres

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/notifications/settings` | Récupérer les paramètres |
| PUT | `/notifications/settings` | Mettre à jour les paramètres |

## Catégories de notifications

| Catégorie | Description |
|-----------|-------------|
| `system` | Annonces système et mises à jour |
| `account` | Notifications liées au compte |
| `website` | Mises à jour du site web |
| `module` | Notifications des modules |
| `billing` | Facturation et paiements |
| `analytics` | Statistiques et analytics |
| `security` | Alertes de sécurité |

## Priorités

| Priorité | Description |
|----------|-------------|
| `low` | Basse priorité |
| `normal` | Priorité normale (défaut) |
| `high` | Haute priorité |
| `urgent` | Urgente (reste visible) |

## Types de notifications prédéfinis

### Système
- `welcome_message` - Message de bienvenue
- `system_update` - Mise à jour système
- `maintenance_scheduled` - Maintenance planifiée

### Compte
- `password_changed` - Mot de passe changé
- `email_verified` - Email vérifié
- `profile_updated` - Profil mis à jour

### Site web
- `website_published` - Site publié
- `website_unpublished` - Site dépublié
- `new_visitor` - Nouveau visiteur

### Module
- `module_activated` - Module activé
- `module_deactivated` - Module désactivé

### Facturation
- `payment_successful` - Paiement réussi
- `payment_failed` - Paiement échoué
- `subscription_renewed` - Abonnement renouvelé
- `subscription_expiring` - Abonnement expirant
- `plan_upgraded` - Plan mis à niveau

### Sécurité
- `new_login_detected` - Nouvelle connexion détectée
- `suspicious_activity` - Activité suspecte

## Intégration PWA

### Service Worker

Le service worker (`sw.js`) gère :
- Réception des notifications push
- Affichage des notifications système
- Gestion des clics sur les notifications
- Renouvellement automatique des abonnements

### Configuration VAPID

Pour activer les notifications push, configurez les variables d'environnement :
```env
VAPID_PUBLIC_KEY=votre_cle_publique
VAPID_PRIVATE_KEY=votre_cle_privee
```

Générer des clés VAPID :
```bash
npx web-push generate-vapid-keys
```

## Utilisation dans le code

### Créer une notification (Backend)

```rust
use crate::notifications::create_notification_internal;

// Créer une notification personnalisée
create_notification_internal(
    &pool,
    user_id,
    "Titre",
    "Message",
    "notification_type",
    "category",
    "priority",
    Some("/action-url"),
    Some("icon-name"),
).await?;

// Utiliser les helpers
use crate::notifications::create_welcome_notification;
create_welcome_notification(&pool, user_id).await?;
```

### Utiliser les hooks (Frontend)

```tsx
import { useNotifications, useUnreadCount, usePushNotifications } from '@/hooks/useNotifications';

function MyComponent() {
  // Liste complète avec gestion
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  
  // Juste le compteur (léger)
  const { count } = useUnreadCount();
  
  // Gestion push
  const { isSupported, isSubscribed, subscribe } = usePushNotifications();
}
```

## Dépendances à installer

```bash
# Frontend
npm install @radix-ui/react-popover
```

## Tests

### Backend
Les tests unitaires sont dans les modules respectifs.

### Frontend
Tester les hooks et composants avec Jest/Vitest.

## Évolutions futures

- [ ] Notifications par email
- [ ] Digest quotidien/hebdomadaire
- [ ] Templates de notifications personnalisables
- [ ] Webhooks pour intégrations tierces
- [ ] Analytics des notifications (taux d'ouverture, etc.)
