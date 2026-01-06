# Collections & Variables Architecture

> **Status**: RFC (Request for Comments)  
> **Author**: ASAP Team  
> **Created**: January 6, 2026  
> **Last Updated**: January 6, 2026

---

## Executive Summary

This document outlines the architecture for a **Collections & Variables** system that bridges the gap between **Extensions** (data providers) and the **Studio** (visual editor). This abstraction layer enables dynamic, reusable data across website components while maintaining a clean separation of concerns.

**Key Benefits:**
- 🔌 **Decoupled Architecture** — Extensions produce data, Studio consumes it
- ♻️ **Data Reusability** — One collection powers multiple components
- 🎯 **Type Safety** — Schema-defined collections with validation
- ⚡ **Real-time Updates** — WebSocket sync when collections change
- 🧮 **Computed Values** — Variables derived from collection aggregations

---

## Table of Contents

1. [Problem Statement](#1-problem-statement)
2. [Architecture Overview](#2-architecture-overview)
3. [Core Concepts](#3-core-concepts)
4. [Data Model](#4-data-model)
5. [Extension Integration](#5-extension-integration)
6. [Studio Integration](#6-studio-integration)
7. [API Design](#7-api-design)
8. [Database Schema](#8-database-schema)
9. [Implementation Phases](#9-implementation-phases)
10. [Security Considerations](#10-security-considerations)

---

## 1. Problem Statement

### Current Limitations

The existing architecture stores extension data in a flat `website_data` JSONB column with several limitations:

| Issue | Impact |
|-------|--------|
| **Tight Coupling** | Studio components hardcoded to specific data shapes |
| **No Schema** | Data structure varies, causing runtime errors |
| **Single Use** | Data fetched by extension used in one place only |
| **No Metadata** | No sync timestamps, source tracking, or versioning |
| **Limited Queries** | No filtering/sorting at the component level |

### User Stories

> *"As a user, I want my GitHub projects displayed in a Projects Grid AND a Stats section without syncing twice."*

> *"As a user, I want to filter my blog posts by category in one section and show 'latest posts' in another."*

> *"As a user, I want dynamic variables like `{{total_stars}}` available in my text blocks."*

---

## 2. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              DATA FLOW                                       │
└─────────────────────────────────────────────────────────────────────────────┘

  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
  │   EXTENSIONS    │     │   EXTENSIONS    │     │   EXTENSIONS    │
  │   ───────────   │     │   ───────────   │     │   ───────────   │
  │   GitHub Sync   │     │   Blog Engine   │     │   Notion Sync   │
  │   RSS Reader    │     │   Contact Form  │     │   Analytics     │
  └────────┬────────┘     └────────┬────────┘     └────────┬────────┘
           │                       │                       │
           │ produces              │ produces              │ produces
           ▼                       ▼                       ▼
  ┌─────────────────────────────────────────────────────────────────────────┐
  │                         COLLECTIONS LAYER                                │
  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐          │
  │  │  github_repos   │  │   blog_posts    │  │  contact_msgs   │          │
  │  │  ─────────────  │  │  ─────────────  │  │  ─────────────  │          │
  │  │  Schema ✓       │  │  Schema ✓       │  │  Schema ✓       │          │
  │  │  Items: 24      │  │  Items: 12      │  │  Items: 156     │          │
  │  │  Synced: 2h ago │  │  Synced: now    │  │  Synced: 5m ago │          │
  │  └─────────────────┘  └─────────────────┘  └─────────────────┘          │
  │                                                                          │
  │  ┌─────────────────────────────────────────────────────────────┐        │
  │  │                      VARIABLES                               │        │
  │  │  github_username = "sycatle"                                │        │
  │  │  total_repos = 24          (computed)                       │        │
  │  │  total_stars = 1,847       (computed)                       │        │
  │  │  blog_post_count = 12      (computed)                       │        │
  │  │  site_title = "My Portfolio" (manual)                       │        │
  │  └─────────────────────────────────────────────────────────────┘        │
  └─────────────────────────────────────────────────────────────────────────┘
           │                       │                       │
           │ consumes              │ consumes              │ consumes
           ▼                       ▼                       ▼
  ┌─────────────────────────────────────────────────────────────────────────┐
  │                            STUDIO                                        │
  │                                                                          │
  │   ┌──────────────┐   ┌──────────────┐   ┌──────────────┐                │
  │   │ Projects     │   │ Blog Feed    │   │ Stats Card   │                │
  │   │ Grid         │   │              │   │              │                │
  │   │ ──────────── │   │ ──────────── │   │ ──────────── │                │
  │   │ source:      │   │ source:      │   │ variables:   │                │
  │   │ github_repos │   │ blog_posts   │   │ total_stars  │                │
  │   │ limit: 6     │   │ filter: new  │   │ total_repos  │                │
  │   │ sort: stars  │   │ limit: 3     │   │              │                │
  │   └──────────────┘   └──────────────┘   └──────────────┘                │
  │                                                                          │
  └─────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Core Concepts

### 3.1 Collections

A **Collection** is a typed array of items produced by an extension. Think of it as a "data table" with a defined schema.

```typescript
interface Collection {
  // Identity
  slug: string;                    // "github_repos"
  name: string;                    // "GitHub Repositories"
  description: string;
  
  // Source
  source_extension: string;        // "github-sync"
  sync_mode: "manual" | "auto";
  sync_frequency?: string;         // "hourly", "daily", "weekly"
  
  // Schema
  schema: CollectionSchema;
  
  // Capabilities
  filterable_fields: string[];     // Fields that can be filtered
  sortable_fields: string[];       // Fields that can be sorted
  searchable_fields: string[];     // Fields included in full-text search
}
```

### 3.2 Collection Schema

Each collection has a **strict schema** defining its fields:

```typescript
interface CollectionSchema {
  fields: CollectionField[];
  primary_key: string;             // Usually "id"
  display_field: string;           // Field used as title (e.g., "name")
  preview_fields: string[];        // Fields shown in previews
}

interface CollectionField {
  key: string;                     // "stars"
  type: FieldType;                 // "number"
  label: string;                   // "GitHub Stars"
  description?: string;
  required: boolean;
  default_value?: any;
  
  // Validation
  validation?: FieldValidation;
  
  // Display hints
  format?: string;                 // "currency", "percentage", "date"
  icon?: string;                   // Icon to show with field
}

type FieldType = 
  | "string" 
  | "number" 
  | "boolean" 
  | "date" 
  | "datetime"
  | "url" 
  | "email"
  | "image" 
  | "rich_text"
  | "json"
  | "array"
  | "reference";                   // Reference to another collection
```

### 3.3 Variables

**Variables** are single values (not arrays) that can be:

1. **Manual** — Set by user (e.g., `site_title`)
2. **Synced** — Pulled from extension settings (e.g., `github_username`)  
3. **Computed** — Derived from collections (e.g., `total_stars = SUM(github_repos.stars)`)

```typescript
interface Variable {
  key: string;                     // "total_stars"
  type: "string" | "number" | "boolean" | "date";
  value: any;
  
  // Source
  source: VariableSource;
  
  // For computed variables
  computation?: {
    collection: string;            // "github_repos"
    operation: "count" | "sum" | "avg" | "min" | "max" | "first" | "last";
    field?: string;                // "stars" (for sum/avg/min/max)
    filter?: FilterClause[];       // Optional filter before computation
  };
}

type VariableSource = 
  | { type: "manual" }
  | { type: "extension"; extension: string; setting: string }
  | { type: "computed"; formula: string };
```

### 3.4 Data Bindings

**Bindings** connect Studio components to Collections/Variables:

```typescript
interface DataBinding {
  // Collection binding
  collection?: {
    slug: string;                  // "github_repos"
    filter?: FilterClause[];
    sort?: SortClause;
    limit?: number;
    offset?: number;
  };
  
  // Field mapping (collection field → component prop)
  mapping?: Record<string, string>;
  
  // Variable bindings (for simple values)
  variables?: Record<string, string>;
}

interface FilterClause {
  field: string;
  operator: FilterOperator;
  value: any;
}

type FilterOperator = 
  | "eq" | "neq"                   // Equal, Not equal
  | "gt" | "gte" | "lt" | "lte"   // Comparisons
  | "in" | "nin"                   // In array, Not in array
  | "contains" | "starts" | "ends" // String operations
  | "exists" | "not_exists";       // Null checks

interface SortClause {
  field: string;
  order: "asc" | "desc";
}
```

---

## 4. Data Model

### 4.1 Collection Instance (per Website)

When a collection is populated for a specific website:

```typescript
interface WebsiteCollection {
  id: string;                      // UUID
  website_id: string;
  collection_slug: string;         // "github_repos"
  
  // Data
  items: CollectionItem[];
  
  // Metadata
  metadata: {
    total_count: number;
    source_extension: string;
    source_version: string;        // Extension version that synced
  };
  
  // Timestamps
  created_at: string;
  updated_at: string;
  synced_at: string | null;
  
  // Sync status
  sync_status: "idle" | "syncing" | "error";
  sync_error?: string;
}

interface CollectionItem {
  id: string;                      // Unique within collection
  data: Record<string, any>;       // Actual field values
  
  // Metadata
  _created_at: string;
  _updated_at: string;
  _source_id?: string;             // Original ID from source (e.g., GitHub repo ID)
}
```

### 4.2 Variable Instance (per Website)

```typescript
interface WebsiteVariable {
  id: string;
  website_id: string;
  key: string;                     // "total_stars"
  
  value: any;
  type: "string" | "number" | "boolean" | "date";
  
  source: "manual" | "extension" | "computed";
  source_ref?: string;             // Extension slug or computation ID
  
  // For computed variables
  stale: boolean;                  // Needs recomputation
  
  created_at: string;
  updated_at: string;
}
```

---

## 5. Extension Integration

### 5.1 Collection Definition in Extension

Extensions declare their collections in the catalog:

```rust
// core/shared/src/extension_catalog.rs

fn github_sync_extension() -> ExtensionDefinition {
    ExtensionDefinition {
        slug: "github-sync".to_string(),
        // ... existing fields ...
        
        // NEW: Collections this extension provides
        collections: vec![
            CollectionDefinition {
                slug: "github_repos".to_string(),
                name: "GitHub Repositories".to_string(),
                description: "Your public GitHub repositories".to_string(),
                sync_mode: SyncMode::Manual, // or Auto with frequency
                schema: CollectionSchema {
                    primary_key: "id".to_string(),
                    display_field: "name".to_string(),
                    preview_fields: vec!["description", "language", "stars"],
                    fields: vec![
                        field("id", FieldType::String).required(),
                        field("name", FieldType::String).required().sortable().searchable(),
                        field("full_name", FieldType::String),
                        field("description", FieldType::String).searchable(),
                        field("url", FieldType::Url).required(),
                        field("homepage", FieldType::Url),
                        field("language", FieldType::String).filterable(),
                        field("stars", FieldType::Number).sortable(),
                        field("forks", FieldType::Number).sortable(),
                        field("open_issues", FieldType::Number),
                        field("topics", FieldType::Array),
                        field("is_fork", FieldType::Boolean).filterable(),
                        field("is_archived", FieldType::Boolean).filterable(),
                        field("created_at", FieldType::DateTime).sortable(),
                        field("updated_at", FieldType::DateTime).sortable(),
                        field("pushed_at", FieldType::DateTime).sortable(),
                    ],
                },
            },
        ],
        
        // NEW: Variables this extension provides
        variables: vec![
            VariableDefinition::synced("github_username", FieldType::String, "github_username"),
            VariableDefinition::computed("github_total_repos", FieldType::Number)
                .count("github_repos"),
            VariableDefinition::computed("github_total_stars", FieldType::Number)
                .sum("github_repos", "stars"),
            VariableDefinition::computed("github_top_language", FieldType::String)
                .mode("github_repos", "language"), // Most common value
        ],
    }
}
```

### 5.2 Sync Implementation

When an extension syncs, it populates collections:

```rust
// extensions/github-sync/src/sync.rs

impl GitHubSyncExtension {
    pub async fn sync(&self, ctx: &ExtensionContext) -> Result<SyncResult> {
        let username = ctx.get_setting::<String>("github_username")?;
        
        // Fetch from GitHub API
        let repos = self.github_client.list_repos(&username).await?;
        
        // Transform to collection items
        let items: Vec<CollectionItem> = repos.into_iter().map(|repo| {
            CollectionItem {
                id: repo.id.to_string(),
                data: json!({
                    "id": repo.id.to_string(),
                    "name": repo.name,
                    "full_name": repo.full_name,
                    "description": repo.description,
                    "url": repo.html_url,
                    "homepage": repo.homepage,
                    "language": repo.language,
                    "stars": repo.stargazers_count,
                    "forks": repo.forks_count,
                    "open_issues": repo.open_issues_count,
                    "topics": repo.topics,
                    "is_fork": repo.fork,
                    "is_archived": repo.archived,
                    "created_at": repo.created_at,
                    "updated_at": repo.updated_at,
                    "pushed_at": repo.pushed_at,
                }),
                _source_id: Some(repo.id.to_string()),
            }
        }).collect();
        
        // Update collection
        ctx.upsert_collection("github_repos", items).await?;
        
        // Variables are auto-computed by the system
        
        Ok(SyncResult::success(items.len()))
    }
}
```

---

## 6. Studio Integration

### 6.1 Component Data Source Configuration

In the Studio, each section can bind to a collection:

```typescript
// Section configuration in Studio
interface SectionConfig {
  id: string;
  type: "projects" | "blog" | "stats" | "testimonials" | ...;
  
  // NEW: Data binding
  data_source?: {
    type: "collection" | "static";
    
    // Collection binding
    collection?: string;           // "github_repos"
    filter?: FilterClause[];
    sort?: SortClause;
    limit?: number;
    
    // Field mapping
    mapping?: {
      // Component prop → Collection field
      title: "name",
      description: "description", 
      link: "url",
      image: "homepage",           // Could be used as screenshot URL
      badge: "language",
      stats: {
        stars: "stars",
        forks: "forks",
      },
    };
  };
  
  // Variable interpolation in text fields
  // "I have {{github_total_repos}} projects with {{github_total_stars}} stars"
}
```

### 6.2 UI for Data Source Selection

```
┌─────────────────────────────────────────────────────────────────┐
│  📊 Data Source                                         [Edit]  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Source Type:  ○ Static (manual items)                         │
│                ● Collection                                     │
│                                                                 │
│  Collection:   [▼ github_repos                          ]      │
│                "GitHub Repositories" • 24 items • Synced 2h ago│
│                                                                 │
│  ┌─ Filters ──────────────────────────────────────────────────┐│
│  │  + Add filter                                               ││
│  │  ┌────────────────────────────────────────────────────────┐││
│  │  │ language  [equals ▼]  [TypeScript          ]    [×]   │││
│  │  └────────────────────────────────────────────────────────┘││
│  │  ┌────────────────────────────────────────────────────────┐││
│  │  │ is_fork   [equals ▼]  [false               ]    [×]   │││
│  │  └────────────────────────────────────────────────────────┘││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌─ Sorting ───────────────────────────────────────────────────┐│
│  │  Sort by: [stars ▼]  Order: [● Desc ○ Asc]                 ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌─ Limit ─────────────────────────────────────────────────────┐│
│  │  Show: [6] items                                            ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  Preview: 6 items matching filters                              │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ 1. asap         ★ 847   TypeScript                         ││
│  │ 2. portfolio    ★ 234   TypeScript                         ││
│  │ 3. cli-tools    ★ 156   TypeScript                         ││
│  │ ...                                                         ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 6.3 Variable Interpolation

Text fields support variable interpolation:

```
┌─────────────────────────────────────────────────────────────────┐
│  Hero Section - Subtitle                                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Developer with {{github_total_repos}} open source projects  ││
│  │ and {{github_total_stars}} GitHub stars ⭐                  ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  Preview: "Developer with 24 open source projects and 1,847    │
│            GitHub stars ⭐"                                     │
│                                                                 │
│  Available variables:                                           │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ {{github_username}}      sycatle                            ││
│  │ {{github_total_repos}}   24                                 ││
│  │ {{github_total_stars}}   1,847                              ││
│  │ {{github_top_language}}  TypeScript                         ││
│  │ {{blog_post_count}}      12                                 ││
│  │ {{site_title}}           My Portfolio                       ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7. API Design

### 7.1 Collection Endpoints

```
# List available collection schemas
GET /api/collections/schemas
→ Returns all collection definitions from extensions

# Get website collections
GET /api/websites/:id/collections
→ Returns all populated collections for a website

# Get specific collection with items
GET /api/websites/:id/collections/:slug
GET /api/websites/:id/collections/:slug?filter[language]=TypeScript&sort=-stars&limit=10
→ Returns collection items with optional filtering/sorting

# Trigger collection sync
POST /api/websites/:id/collections/:slug/sync
→ Triggers extension sync for this collection

# Manual collection management (for manual collections)
POST /api/websites/:id/collections/:slug/items
PUT /api/websites/:id/collections/:slug/items/:itemId
DELETE /api/websites/:id/collections/:slug/items/:itemId
```

### 7.2 Variable Endpoints

```
# Get all variables for a website
GET /api/websites/:id/variables
→ Returns all variables with current values

# Get specific variable
GET /api/websites/:id/variables/:key

# Set manual variable
PUT /api/websites/:id/variables/:key
{ "value": "My Portfolio" }

# Recompute all computed variables
POST /api/websites/:id/variables/recompute
```

### 7.3 WebSocket Events

```typescript
// Collection synced
{
  type: "sync:collection:updated",
  payload: {
    website_id: "...",
    collection_slug: "github_repos",
    items_count: 24,
    synced_at: "2026-01-06T12:00:00Z"
  }
}

// Variable changed
{
  type: "sync:variable:updated", 
  payload: {
    website_id: "...",
    key: "github_total_stars",
    value: 1847,
    previous_value: 1820
  }
}
```

---

## 8. Database Schema

### 8.1 Collections Table

```sql
-- Collection instances per website
CREATE TABLE website_collections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
    collection_slug VARCHAR(100) NOT NULL,
    
    -- Data stored as JSONB array
    items JSONB NOT NULL DEFAULT '[]',
    
    -- Metadata
    source_extension VARCHAR(100) NOT NULL,
    source_version VARCHAR(20),
    total_count INTEGER NOT NULL DEFAULT 0,
    
    -- Sync tracking
    sync_status VARCHAR(20) NOT NULL DEFAULT 'idle',  -- idle, syncing, error
    sync_error TEXT,
    synced_at TIMESTAMPTZ,
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_website_collection UNIQUE(website_id, collection_slug)
);

-- Index for fast lookups
CREATE INDEX idx_collections_website_id ON website_collections(website_id);
CREATE INDEX idx_collections_slug ON website_collections(collection_slug);

-- GIN index for JSONB queries on items
CREATE INDEX idx_collections_items ON website_collections USING GIN (items);
```

### 8.2 Variables Table

```sql
-- Variables per website
CREATE TABLE website_variables (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    website_id UUID NOT NULL REFERENCES websites(id) ON DELETE CASCADE,
    key VARCHAR(100) NOT NULL,
    
    -- Value (stored as JSONB for flexibility)
    value JSONB NOT NULL,
    type VARCHAR(20) NOT NULL,  -- string, number, boolean, date
    
    -- Source tracking
    source VARCHAR(20) NOT NULL DEFAULT 'manual',  -- manual, extension, computed
    source_ref VARCHAR(200),  -- Extension slug or computation definition
    
    -- For computed variables
    stale BOOLEAN NOT NULL DEFAULT FALSE,
    computation JSONB,  -- Computation definition if computed
    
    -- Timestamps
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT unique_website_variable UNIQUE(website_id, key)
);

-- Index for fast lookups
CREATE INDEX idx_variables_website_id ON website_variables(website_id);
CREATE INDEX idx_variables_key ON website_variables(key);
CREATE INDEX idx_variables_stale ON website_variables(stale) WHERE stale = TRUE;
```

### 8.3 Migration

```sql
-- Migration: 20260107000000_add_collections_system.sql

-- Create collections table
CREATE TABLE IF NOT EXISTS website_collections (
    -- ... as above
);

-- Create variables table  
CREATE TABLE IF NOT EXISTS website_variables (
    -- ... as above
);

-- Migrate existing extension data to collections
-- This would be a one-time migration script
```

---

## 9. Implementation Phases

### Phase 1: Foundation (Week 1-2)

**Goal:** Core infrastructure for collections and variables

- [ ] Database migrations for `website_collections` and `website_variables`
- [ ] Rust types in `core/domain` for Collection, Variable, Schema
- [ ] API endpoints for CRUD operations
- [ ] Basic sync mechanism in worker

**Deliverables:**
- Collections can be created and queried
- Variables can be set and retrieved
- GitHub Sync populates `github_repos` collection

### Phase 2: Extension Integration (Week 3)

**Goal:** Extensions declare and populate collections

- [ ] Add `collections` and `variables` to `ExtensionDefinition`
- [ ] Update GitHub Sync to use new collection system
- [ ] Implement computed variables (COUNT, SUM, etc.)
- [ ] Auto-recompute variables when collection changes

**Deliverables:**
- Extension catalog shows available collections
- Computed variables work (total_stars, etc.)

### Phase 3: Studio Integration (Week 4-5)

**Goal:** Studio can consume collections and variables

- [ ] Data source selector UI component
- [ ] Filter/Sort builder UI
- [ ] Field mapping configuration
- [ ] Variable interpolation in text fields (`{{var}}`)
- [ ] Preview with live data

**Deliverables:**
- Sections can bind to collections
- Text supports variable interpolation

### Phase 4: Advanced Features (Week 6+)

**Goal:** Power user features

- [ ] Manual collections (user-created)
- [ ] Collection references (blog post → github repo)
- [ ] Webhooks for external sync triggers
- [ ] Collection versioning / history
- [ ] Export/Import collections

---

## 10. Security Considerations

### 10.1 Data Isolation

- Collections are **strictly scoped to website_id**
- All queries MUST include `WHERE website_id = $1`
- RLS policies as defense-in-depth

### 10.2 Schema Validation

- Items are validated against collection schema before storage
- Unknown fields are stripped (schema-defined only)
- Type coercion with strict validation

### 10.3 Rate Limiting

- Sync operations rate-limited per website
- Collection size limits (max items per collection)
- Query complexity limits (max filters, sorts)

### 10.4 Variable Interpolation

- Variables escaped in output (XSS prevention)
- Only allowed variable keys can be interpolated
- No arbitrary code execution in computed variables

---

## Appendix A: Example Collection Schemas

### GitHub Repositories

```json
{
  "slug": "github_repos",
  "name": "GitHub Repositories",
  "source_extension": "github-sync",
  "schema": {
    "primary_key": "id",
    "display_field": "name",
    "fields": [
      { "key": "id", "type": "string", "required": true },
      { "key": "name", "type": "string", "required": true, "sortable": true },
      { "key": "description", "type": "string", "searchable": true },
      { "key": "url", "type": "url", "required": true },
      { "key": "language", "type": "string", "filterable": true },
      { "key": "stars", "type": "number", "sortable": true },
      { "key": "forks", "type": "number", "sortable": true },
      { "key": "topics", "type": "array" },
      { "key": "updated_at", "type": "datetime", "sortable": true }
    ]
  }
}
```

### Blog Posts

```json
{
  "slug": "blog_posts",
  "name": "Blog Posts",
  "source_extension": "blog-engine",
  "schema": {
    "primary_key": "id",
    "display_field": "title",
    "fields": [
      { "key": "id", "type": "string", "required": true },
      { "key": "title", "type": "string", "required": true, "searchable": true },
      { "key": "slug", "type": "string", "required": true },
      { "key": "content", "type": "rich_text" },
      { "key": "excerpt", "type": "string" },
      { "key": "cover_image", "type": "image" },
      { "key": "category", "type": "string", "filterable": true },
      { "key": "tags", "type": "array", "filterable": true },
      { "key": "author", "type": "string" },
      { "key": "status", "type": "string", "filterable": true },
      { "key": "published_at", "type": "datetime", "sortable": true }
    ]
  }
}
```

---

## Appendix B: Variable Computation Examples

```typescript
// Count items
{ operation: "count", collection: "github_repos" }
// → 24

// Count with filter
{ operation: "count", collection: "github_repos", filter: [{ field: "language", operator: "eq", value: "TypeScript" }] }
// → 12

// Sum field
{ operation: "sum", collection: "github_repos", field: "stars" }
// → 1847

// Average
{ operation: "avg", collection: "github_repos", field: "stars" }
// → 77

// Mode (most common)
{ operation: "mode", collection: "github_repos", field: "language" }
// → "TypeScript"

// First/Last (requires sort)
{ operation: "first", collection: "github_repos", field: "name", sort: { field: "stars", order: "desc" } }
// → "asap" (highest starred repo)
```

---

## Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1 | 2026-01-06 | ASAP Team | Initial draft |
