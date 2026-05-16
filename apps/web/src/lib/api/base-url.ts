/**
 * Resolves the API base URL.
 *
 * PUBLIC_API_URL is inlined at build time by Astro/Vite. We accept the dev
 * default only when neither production nor a value is set; in production
 * builds without the env var, we throw so the misconfiguration is loud
 * rather than silently shipping a bundle that points to localhost.
 */
const DEV_DEFAULT = 'http://localhost:3000/api';

function resolveApiBaseUrl(): string {
  const env = (import.meta as ImportMeta).env;
  const fromEnv = env?.PUBLIC_API_URL;
  if (typeof fromEnv === 'string' && fromEnv.length > 0) {
    return fromEnv.replace(/\/+$/, '');
  }
  if (env?.PROD) {
    throw new Error(
      'PUBLIC_API_URL must be set at build time for production builds',
    );
  }
  return DEV_DEFAULT;
}

let cached: string | undefined;

export function getApiBaseUrl(): string {
  if (cached === undefined) cached = resolveApiBaseUrl();
  return cached;
}
