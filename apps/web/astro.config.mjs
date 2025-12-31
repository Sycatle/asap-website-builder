import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import react from '@astrojs/react';
import { visualizer } from 'rollup-plugin-visualizer';
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
        '@': path.resolve(__dirname, 'src'),
        '@asap/renderers': path.resolve(__dirname, '../../packages/renderers/src'),
        '@asap/shared': path.resolve(__dirname, '../../packages/shared/src'),
        // Resolve dependencies from renderers package to this project's node_modules
        'dompurify': path.resolve(__dirname, 'node_modules/dompurify'),
      },
      dedupe: ['react', 'react-dom'],
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'dompurify'],
    },
    build: {
      // Optimize chunk splitting
      rollupOptions: {
        output: {
          manualChunks: {
            // Vendor chunks
            'vendor-react': ['react', 'react-dom'],
            'vendor-radix': [
              '@radix-ui/react-dialog',
              '@radix-ui/react-dropdown-menu',
              '@radix-ui/react-tooltip',
              '@radix-ui/react-popover',
              '@radix-ui/react-select',
              '@radix-ui/react-tabs',
            ],
            'vendor-dnd': [
              '@dnd-kit/core',
              '@dnd-kit/sortable',
              '@dnd-kit/utilities',
            ],
            'vendor-query': ['@tanstack/react-query'],
            'vendor-charts': ['recharts'],
            // Feature chunks
            'feature-studio': [
              './src/components/studio/StudioPage.tsx',
            ],
          },
        },
        plugins: [
          // Bundle analysis (only when ANALYZE=true)
          process.env.ANALYZE && visualizer({
            filename: 'dist/stats.html',
            open: true,
            gzipSize: true,
            brotliSize: true,
          }),
        ].filter(Boolean),
      },
      // Enable minification
      minify: 'esbuild',
      // Target modern browsers
      target: 'es2020',
      // Increase chunk size warning limit
      chunkSizeWarningLimit: 1000,
    },
  },
});
