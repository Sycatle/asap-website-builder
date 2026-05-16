import { defineConfig, type PluginOption } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const plugins: PluginOption[] = [react()];
if (process.env.ANALYZE) {
  plugins.push(
    visualizer({
      filename: 'dist/stats.html',
      open: true,
      gzipSize: true,
      brotliSize: true,
    }) as PluginOption
  );
}

export default defineConfig({
  plugins,
  // Match the prior Astro convention: PUBLIC_* env vars are exposed to the
  // client bundle. Without this Vite only surfaces VITE_* prefixed vars.
  envPrefix: ['VITE_', 'PUBLIC_'],
  server: {
    port: 4321,
    host: true,
    // Polling watch for Docker bind-mounts
    watch: {
      usePolling: true,
      interval: 100,
    },
  },
  preview: {
    port: 4321,
    host: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@asap/renderers': path.resolve(__dirname, '../../packages/renderers/src'),
      '@asap/shared': path.resolve(__dirname, '../../packages/shared/src'),
      '@asap/extension-github-sync': path.resolve(__dirname, '../../extensions/github-sync/frontend/src'),
      dompurify: path.resolve(__dirname, 'node_modules/dompurify'),
    },
    dedupe: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'dompurify'],
  },
  build: {
    target: 'es2020',
    minify: 'esbuild',
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: {
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
        },
      },
    },
  },
});
