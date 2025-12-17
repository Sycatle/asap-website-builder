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
        // HMR WebSocket configuration for Docker
        // The client connects from the browser (localhost:4321)
        // The server runs inside Docker container
        protocol: 'ws',
        host: 'localhost',
        port: 4321,
        clientPort: 4321,
      },
      watch: {
        usePolling: true, // Required for Docker file watching
        interval: 100,
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
