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
    server: {
      hmr: {
        // Use the same port as the dev server for HMR WebSocket
        port: 4321,
        clientPort: 4321,
        host: 'localhost',
      },
      watch: {
        usePolling: true, // Required for Docker file watching
      },
    },
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
