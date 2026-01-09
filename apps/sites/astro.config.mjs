// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';
import react from '@astrojs/react';
import tailwind from '@astrojs/tailwind';
import sitemap from '@astrojs/sitemap';
import compressor from 'astro-compressor';
import { fileURLToPath } from 'url';
import path from 'path';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: node({
    mode: 'standalone'
  }),
  site: 'https://asap.cool',
  
  // Compression and performance
  compressHTML: true,
  
  // Prefetch configuration for faster navigation
  prefetch: {
    prefetchAll: false, // Don't prefetch everything, use selective prefetch
    defaultStrategy: 'hover', // Prefetch on hover for better UX
  },
  
  integrations: [
    react(),
    tailwind({
      // Disable injecting base styles (we handle them in global.css)
      applyBaseStyles: false,
    }),
    // Generate sitemaps
    sitemap({
      changefreq: 'weekly',
      priority: 0.7,
      lastmod: new Date(),
    }),
    // Compress HTML, CSS, JS at build time
    compressor({
      gzip: true,
      brotli: true,
    }),
  ],
  
  server: {
    port: 4322,
  },
  
  // Build optimizations
  build: {
    // Inline small CSS for faster FCP
    inlineStylesheets: 'auto',
    // Concurrent build for faster builds
    concurrency: 4,
  },
  
  vite: {
    server: {
      // Allow Docker internal hostname for screenshot service
      allowedHosts: ['sites', 'localhost', '.asap.cool'],
    },
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
    build: {
      // Optimize chunk splitting for better caching
      rollupOptions: {
        output: {
          manualChunks: {
            'react-vendor': ['react', 'react-dom'],
          },
          // Add hash to filenames for cache busting
          entryFileNames: 'assets/[name].[hash].js',
          chunkFileNames: 'assets/[name].[hash].js',
          assetFileNames: 'assets/[name].[hash].[ext]',
        },
      },
      // Enable CSS code splitting
      cssCodeSplit: true,
      // Minify output
      minify: 'esbuild',
      // Target modern browsers for smaller bundles
      target: 'es2022',
      // Enable source maps for production debugging (optional)
      sourcemap: false,
      // Reduce chunk size warnings threshold
      chunkSizeWarningLimit: 500,
    },
  },
});
