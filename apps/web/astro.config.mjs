import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: node({
    mode: 'standalone'
  }),
  integrations: [react()],
  server: {
    port: 4321,
    host: true
  },
  vite: {
    resolve: {
      alias: {
        '@': '/src',
        // In Docker: packages is mounted at /packages
        // Locally: use relative path
        '@asap/renderers': process.env.NODE_ENV === 'development' 
          ? '/packages/renderers/src' 
          : '../../packages/renderers/src',
      },
    },
  },
});
