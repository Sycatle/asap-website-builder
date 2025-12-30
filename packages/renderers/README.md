# @asap/renderers - Single Source of Truth for Site Rendering

## Overview

This package is the **single source of truth** for all section renderers in the ASAP platform.
Both applications use the exact same components:

- `apps/web` - Studio preview system
- `apps/sites` - Public published sites

This architecture **guarantees 100% visual parity** between what users see in the preview and what visitors see on published sites.

## Architecture

```
packages/renderers/src/
├── index.ts                 # Main exports
├── types.ts                 # Type definitions (re-exported from @asap/shared)
├── utils.ts                 # Helper functions (getData, cn, etc.)
├── components/
│   ├── index.ts             # Component exports
│   ├── ui.tsx               # Shared UI primitives (Button, Card, Badge, etc.)
│   └── icons.tsx            # Centralized icon definitions
├── renderers.tsx            # Main registry and SectionRenderer component
├── saas-adapters.tsx        # SaaS landing page section renderers
└── freelance-renderer.tsx   # Portfolio/Freelance full page renderer
```

## Section Types

### SaaS Landing Page Sections
- `navigation` - Sticky header with logo, nav links, and auth buttons
- `hero` - Hero section with headline, CTAs, and social proof
- `features` - Feature grid with icons and descriptions
- `how-it-works` - Step-by-step process explanation
- `pricing` - Pricing plans comparison
- `testimonials` - Customer testimonials
- `cta` - Call-to-action section
- `footer` - Footer with links and social icons

### Portfolio / Freelance Sections
- `portfolio-hero` - Hero section for portfolios
- `about` - About section with bio and highlights
- `skills` - Skills grid by category
- `projects` - Project showcase gallery
- `experience` - Work experience timeline
- `education` - Education timeline
- `contact` - Contact form and social links
- `services` - Services offered
- `gallery` - Image gallery
- `blog` - Blog posts list
- `faq` - Frequently asked questions

## Usage

### In React Components (Studio)

```tsx
import { SectionRenderer, hasRenderer } from '@asap/renderers';

function Preview({ sections, website }) {
  return (
    <div>
      {sections.map((section) => (
        <SectionRenderer
          key={section.id}
          section={section}
          website={website}
        />
      ))}
    </div>
  );
}
```

### In Astro Components (Sites)

```astro
---
import SectionsWrapper from '@/components/rendering/SectionsWrapper';
---

<SectionsWrapper 
  sections={sections} 
  website={website} 
  client:only="react" 
/>
```

## Adding New Section Types

1. Create the renderer in `packages/renderers/src/`:
   - For SaaS sections: add to `saas-adapters.tsx`
   - For portfolio sections: add to `renderers.tsx`

2. Register it in `renderers.tsx`:
   ```tsx
   const renderers = {
     // ... existing renderers
     'my-new-section': MyNewSectionRenderer,
   };
   ```

3. Export from `index.ts` if needed for direct import

4. Both apps will automatically use the new renderer!

## Theming

All renderers use CSS variables for theming, compatible with shadcn/ui:

```css
:root {
  --background: 0 0% 100%;
  --foreground: 240 10% 3.9%;
  --primary: 239 84% 67%;
  --primary-foreground: 0 0% 100%;
  /* ... */
}
```

This ensures consistent theming across both studio and public sites.

## Why This Architecture?

1. **Single Source of Truth**: One place to maintain renderers
2. **Visual Parity**: Preview matches published site exactly
3. **Type Safety**: Shared types across all apps
4. **Easy Maintenance**: Fix once, works everywhere
5. **Consistency**: Same design system for all sections
