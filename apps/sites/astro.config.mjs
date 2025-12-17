// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';

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
        '@asap/renderers': '../../packages/renderers/src',
      },
    },
  },
});
