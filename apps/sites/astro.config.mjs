// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import { fileURLToPath } from 'url';
import path from 'path';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: node({
    mode: 'standalone'
  }),
  site: 'https://asap.cool',
  integrations: [
    react(),
    tailwind(),
  ],
  server: {
    port: 4322,
  },
  vite: {
    resolve: {
      alias: {
        '@': '/src',
        // Resolve workspace packages to absolute paths to avoid duplicate module issues
        '@asap/shared': fileURLToPath(new URL('../../packages/shared/src/index.ts', import.meta.url)),
        '@asap/renderers': fileURLToPath(new URL('../../packages/renderers/src/index.ts', import.meta.url)),
      },
    },
    // Ensure workspace packages are bundled for SSR (so Node never imports .ts files)
    ssr: {
      noExternal: ['@asap/shared', '@asap/renderers'],
    },
    optimizeDeps: {
      include: ['@asap/shared', '@asap/renderers'],
    },
  },
});
