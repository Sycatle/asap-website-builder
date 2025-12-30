/**
 * @asap/renderers - Single Source of Truth for Site Rendering
 * 
 * This package is the ONLY place where section renderers are defined.
 * Both apps use these exact same components:
 * - apps/web (studio preview system)
 * - apps/sites (public published sites)
 * 
 * This architecture guarantees 100% visual parity between preview and production.
 * 
 * Structure:
 * - types.ts: Shared type definitions (re-exported from @asap/shared)
 * - utils.ts: Helper functions (getData, cn, etc.)
 * - components/: Shared UI primitives (Button, Card, Badge, Icons)
 * - saas-adapters.tsx: SaaS landing page section renderers
 * - freelance-renderer.tsx: Portfolio/Freelance full page renderer
 * - renderers.tsx: Main registry and SectionRenderer component
 */

// Core types
export * from './types';

// Utility functions
export * from './utils';

// Shared UI components
export * from './components';

// Main renderers and registry
export * from './renderers';

// V1 MVP: Freelance Portfolio Renderer (full page)
export * from './freelance-renderer';

// SaaS Section Renderers (modular, uses CSS variables)
export * from './saas-adapters';
