/**
 * Runtime types shared between the codegen pipeline, the section host, and the
 * apps that mount sites (apps/sites for production, apps/web for studio preview).
 */

export interface CollectionItem {
  id: string;
  [field: string]: unknown;
}

export interface CollectionData {
  /** Stable slug, e.g. "blog_posts". Matches the studio collection schema. */
  slug: string;
  items: CollectionItem[];
}

/**
 * The full data envelope handed to a generated section. Hooks pull from this
 * via React context — no global fetches inside generated code.
 */
export interface SiteData {
  collections: Record<string, CollectionData>;
  variables: Record<string, unknown>;
}

/**
 * Shape of a compiled section module produced by the AI-codegen pipeline.
 * The runtime dynamic-imports the compiled JS and renders the default export.
 *
 * The component MUST be a default export that takes no required props (data
 * arrives via hooks). Variant-style props re-emerge as "knobs" extracted from
 * the AST and passed at render time.
 */
export interface CompiledSectionModule {
  default: React.ComponentType<Record<string, unknown>>;
}

/**
 * Reference to a stored section. The compiled JS is loaded lazily by the host.
 */
export interface SectionRef {
  id: string;
  /** Loader for the compiled module; backend returns a URL or an inline string. */
  load: () => Promise<CompiledSectionModule>;
  /** Knobs (props) extracted from the AST at codegen time, persisted with the section. */
  knobs?: Record<string, unknown>;
}
