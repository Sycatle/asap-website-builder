/**
 * Resolves API and WebSocket base URLs.
 *
 * PUBLIC_API_URL / PUBLIC_WS_URL are inlined at build time by Astro/Vite.
 * Dev defaults are used only when neither production nor a value is set;
 * production builds without the env var throw so the misconfiguration is
 * loud rather than silently shipping a bundle pointing to localhost.
 */
const API_DEV_DEFAULT = 'http://localhost:3000/api';
const WS_DEV_DEFAULT = 'ws://localhost:3000/ws';

function resolveFromEnv(varName: 'PUBLIC_API_URL' | 'PUBLIC_WS_URL', devDefault: string): string {
  const env = (import.meta as ImportMeta).env;
  const fromEnv = env?.[varName];
  if (typeof fromEnv === 'string' && fromEnv.length > 0) {
    return fromEnv.replace(/\/+$/, '');
  }
  if (env?.PROD) {
    throw new Error(`${varName} must be set at build time for production builds`);
  }
  return devDefault;
}

let apiCached: string | undefined;
let wsCached: string | undefined;

export function getApiBaseUrl(): string {
  if (apiCached === undefined) apiCached = resolveFromEnv('PUBLIC_API_URL', API_DEV_DEFAULT);
  return apiCached;
}

export function getWsBaseUrl(): string {
  if (wsCached === undefined) wsCached = resolveFromEnv('PUBLIC_WS_URL', WS_DEV_DEFAULT);
  return wsCached;
}
