import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import react from '@astrojs/react';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: node({
    mode: 'standalone'
  }),
  integrations: [react()],
  server: {
    port: 4323,
    host: true
  },
  vite: {
    server: {
      hmr: {
        protocol: 'ws',
        host: 'localhost',
        port: 4323,
        clientPort: 4323,
      },
      watch: {
        usePolling: true,
        interval: 100,
      },
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@asap/shared': path.resolve(__dirname, '../../packages/shared/src'),
      },
      dedupe: ['react', 'react-dom'],
    },
    optimizeDeps: {
      include: ['react', 'react-dom'],
    },
  },
});
