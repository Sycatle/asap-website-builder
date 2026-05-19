/**
 * Sentry bootstrap for the studio SPA.
 *
 * No-op when `VITE_SENTRY_DSN` is not set — keeps dev builds free of network
 * chatter and avoids a hard dependency on the Sentry account being configured.
 */
import * as Sentry from '@sentry/react';

export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: (import.meta.env.MODE as string) || 'production',
    tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? '0.05'),
    sendDefaultPii: false,
    beforeSend(event: Sentry.ErrorEvent) {
      // Strip request headers that may carry tokens.
      if (event.request?.headers) {
        delete event.request.headers.authorization;
        delete event.request.headers.cookie;
      }
      return event;
    },
  });
}
