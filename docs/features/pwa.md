# Progressive Web App

ASAP ships as a Progressive Web App so end users can install the dashboard and any published site on desktop or mobile.

## Capabilities

- Installable from any modern browser (Chrome, Edge, Safari iOS 16.4+, Firefox).
- Offline-first shell for the dashboard via service worker.
- Web Push notifications for builds, analytics alerts, and team events.
- App icons, splash screens, and theme color generated per workspace.
- Background sync for draft changes when the network is intermittent.

## Implementation

- Service worker registered in `apps/web/src/sw/`.
- Manifest generated at build time per workspace from the user's branding.
- Push subscription lifecycle handled by `core/notifications` and exposed via the API.
- Workbox-based runtime caching with stale-while-revalidate for static assets and network-first for API calls.

## Configuring push notifications

1. Generate a VAPID key pair and set `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` in `infra/.env`.
2. Restart the API and worker.
3. The client requests permission on first login; tokens are persisted in `push_subscriptions`.

## Testing locally

- `make dev` serves the PWA at `http://localhost:4321` with the service worker registered in production-like mode behind a feature flag.
- Use Chrome DevTools → Application → Service Workers to inspect cache state.
- Lighthouse PWA audit is part of the CI pipeline; aim for >90.

## Known limitations

- iOS still has tight quotas on push and background sync — degrade gracefully.
- Custom domains require their own manifest scope to be installable on Safari.
- Offline mode covers the dashboard shell; the site editor still needs the network.
