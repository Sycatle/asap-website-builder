# Notifications

ASAP delivers notifications through three channels:

- **In-app**, surfaced in the dashboard header dropdown.
- **Web Push** (PWA), delivered by the user's browser even when the dashboard is closed.
- **Email**, for billing and account-critical events.

The notifications subsystem lives in `core/notifications`. It is invoked by other parts of the codebase via events; it does not poll.

## Backend

| Component | Location |
|---|---|
| Types and DTOs | `core/notifications/src/types.rs` |
| Service (CRUD, fanout, push delivery) | `core/notifications/src/service.rs` |
| HTTP handlers | `core/api/src/notifications.rs` |
| Database tables | migration `20251214100000_add_notifications.sql` |

Tables:

- `notifications` — one row per delivered notification.
- `notification_settings` — per-user channel preferences.
- `push_subscriptions` — Web Push endpoints.
- `vapid_keys` — VAPID key pair used to sign Web Push payloads.

## API

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/notifications` | List notifications (filters: `unread`, `category`, `limit`). |
| `GET` | `/notifications/unread-count` | Badge counter. |
| `PATCH` | `/notifications/:id/read` | Mark a single notification as read. |
| `PATCH` | `/notifications/read-all` | Mark every notification as read. |
| `DELETE` | `/notifications/:id` | Hide a notification. |
| `GET` | `/notifications/settings` | Read user preferences. |
| `PATCH` | `/notifications/settings` | Update channel preferences. |
| `POST` | `/notifications/push/subscribe` | Register a Web Push subscription. |
| `POST` | `/notifications/push/unsubscribe` | Deregister a subscription. |

## Frontend

| Component | Location |
|---|---|
| Header dropdown | `apps/web/src/components/notifications/notifications-dropdown.tsx` |
| Full-page list | `apps/web/src/pages/app/notifications/` |
| API client | `apps/web/src/lib/api/notifications.ts` |
| React hook | `apps/web/src/hooks/useNotifications.ts` |

The dropdown subscribes to a WebSocket topic and updates in real time when a new notification is delivered to the user.

## Categories and priority

Notifications carry a `category` (`billing`, `system`, `ai`, `team`, `analytics`, …) and a `priority` (`low`, `normal`, `high`). The user can disable any category per channel without affecting the others.

## Web Push setup

1. Generate VAPID keys: `scripts/generate-vapid-keys.sh`.
2. Set `VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` in `infra/.env.prod`.
3. Restart the API. The public key is exposed at `/notifications/push/vapid-public-key`.
4. The client requests permission on first login and posts the subscription to `/notifications/push/subscribe`.

For PWA details and offline considerations, see [`./pwa.md`](./pwa.md).
