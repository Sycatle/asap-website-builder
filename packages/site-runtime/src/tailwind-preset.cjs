/**
 * Tailwind preset for AI-generated sites.
 *
 * Every utility that touches "brand identity" (colors, fonts, radius) resolves
 * to a per-site CSS custom property emitted by `buildTokenStyles()`. The AI is
 * therefore physically incapable of producing off-brand output as long as it
 * stays inside this preset's class set.
 *
 * What's tokenized:
 *  - colors: bg-primary, text-foreground, border-muted, etc.
 *  - radius: rounded-sm/md/lg/full
 *  - typography: font-display, font-body
 *
 * What stays default Tailwind (intentional — these aren't brand-identity):
 *  - spacing (p-*, m-*, gap-*)
 *  - sizing (w-*, h-*)
 *  - layout (flex, grid, position)
 *  - effects (shadow-*, opacity-*)
 *  - responsive / state variants (md:, hover:, etc.)
 *
 * Token CSS contract: `buildTokenStyles()` emits values as space-separated RGB
 * triplets, e.g. `--color-primary: 99 102 241;`. That's what Tailwind v3 needs
 * to support `<alpha-value>` (e.g. `bg-primary/50`).
 */

const tokenColor = (cssVar) => `rgb(var(${cssVar}) / <alpha-value>)`;

module.exports = {
  // Sites scope is the studio iframe / the public site root. The host adds
  // its own `content` globs.
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: tokenColor('--color-primary'),
          foreground: tokenColor('--color-background'),
        },
        secondary: tokenColor('--color-secondary'),
        accent: tokenColor('--color-accent'),
        background: tokenColor('--color-background'),
        foreground: tokenColor('--color-foreground'),
        muted: {
          DEFAULT: tokenColor('--color-muted'),
          foreground: `rgb(var(--color-foreground) / 0.7)`,
        },
        border: tokenColor('--color-border'),
        surface: {
          DEFAULT: tokenColor('--color-surface'),
          foreground: tokenColor('--color-on-surface'),
        },
      },
      fontFamily: {
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        body: ['var(--font-body)', 'system-ui', 'sans-serif'],
        sans: ['var(--font-body)', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'calc(var(--radius-lg) * 1.5)',
        full: 'var(--radius-full, 9999px)',
      },
      letterSpacing: {
        tight: 'calc(var(--font-tracking, 0em) - 0.025em)',
        normal: 'var(--font-tracking, 0em)',
      },
      transitionTimingFunction: {
        token: 'var(--motion-easing, cubic-bezier(0.2, 0.8, 0.2, 1))',
      },
      transitionDuration: {
        token: 'calc(200ms * var(--motion-duration-scale, 1))',
      },
    },
  },
  // Hosts add their own plugins; keep the preset side-effect-free.
  plugins: [],
};
