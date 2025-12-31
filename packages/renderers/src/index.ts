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
 * - components/ui/: Atomic UI primitives (Button, Card, Badge, etc.)
 * - components/icons.tsx: Icon components library
 * - components/saas/: Modular SaaS section components (self-contained)
 * - renderers.tsx: Main registry and SectionRenderer component
 * 
 * Component Architecture:
 * - Atomic Design: ui/ contains basic building blocks
 * - Self-contained: saas/ components handle their own data extraction
 * - Single registry: renderers.tsx maps section types to components
 */

// Core types
export * from './types';

// Utility functions
export * from './utils';

// Shared UI components (atomic + composed)
export * from './components';

// Main renderer and registry
export * from './renderers';
