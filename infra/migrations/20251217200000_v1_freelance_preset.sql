-- ============================================
-- Migration: Archive Legacy Presets & Create V1 Preset
-- ============================================
-- This migration:
-- 1. Archives all existing presets (sets enabled = false)
-- 2. Creates the single canonical "Dev Freelance — Classic" preset
-- 3. Adds activation_metrics tracking

-- ============================================
-- STEP 1: Archive all existing presets
-- ============================================

UPDATE presets 
SET 
    enabled = false,
    name = '[LEGACY] ' || name,
    updated_at = now()
WHERE enabled = true;

-- ============================================
-- STEP 2: Create V1 Canonical Preset
-- ============================================

INSERT INTO presets (
    id,
    name,
    slug,
    description,
    category,
    config,
    thumbnail_url,
    enabled
) VALUES (
    'a0000001-0001-4001-8001-000000000001'::uuid,
    'Dev Freelance — Classic',
    'dev-freelance-classic',
    'Le template unique ASAP V1 pour les développeurs freelances. Landing page optimisée pour la conversion avec sections pré-ordonnées : Hero, Services, Projets, Process, Stack, Preuves, À propos, Contact.',
    'freelance',
    '{
        "version": 1,
        "type": "freelance-dev-profile",
        "frozen": true,
        "extensions": ["github-sync"],
        "sections": [
            {
                "element_type": "hero",
                "slug": "hero",
                "title": "Hero",
                "order_index": 0,
                "layout": "full",
                "visible": true,
                "data": {
                    "name": "Alex Martin",
                    "title": "Développeur Full-Stack Freelance",
                    "tagline": "Je transforme vos idées en applications web performantes et modernes.",
                    "availability": "available",
                    "cta_primary_text": "Discutons de votre projet",
                    "cta_primary_action": "scroll",
                    "cta_primary_target": "#contact",
                    "cta_secondary_text": "Voir mes projets",
                    "cta_secondary_action": "scroll",
                    "cta_secondary_target": "#projects"
                }
            },
            {
                "element_type": "services",
                "slug": "services",
                "title": "Ce que je fais",
                "order_index": 1,
                "layout": "grid",
                "visible": true,
                "data": {
                    "services": [
                        {
                            "title": "Applications Web",
                            "description": "Développement d''applications web sur mesure avec les technologies modernes.",
                            "icon": "globe"
                        },
                        {
                            "title": "APIs & Backend",
                            "description": "Conception et développement d''APIs RESTful robustes et scalables.",
                            "icon": "server"
                        },
                        {
                            "title": "Consulting Tech",
                            "description": "Audit de code, choix d''architecture et accompagnement technique.",
                            "icon": "consulting"
                        }
                    ]
                }
            },
            {
                "element_type": "projects",
                "slug": "projects",
                "title": "Mes projets",
                "order_index": 2,
                "layout": "grid",
                "visible": true,
                "data": {
                    "projects": [
                        {
                            "id": "placeholder-1",
                            "title": "Projet E-commerce",
                            "description": "Plateforme e-commerce moderne avec panier, paiement Stripe et dashboard admin.",
                            "technologies": ["React", "Node.js", "PostgreSQL", "Stripe"],
                            "featured": true,
                            "type": "client"
                        },
                        {
                            "id": "placeholder-2",
                            "title": "Dashboard Analytics",
                            "description": "Dashboard temps réel pour visualiser les métriques business.",
                            "technologies": ["Next.js", "TypeScript", "Recharts", "Prisma"],
                            "featured": true,
                            "type": "client"
                        },
                        {
                            "id": "placeholder-3",
                            "title": "API Open Source",
                            "description": "Contribution à un projet open source populaire sur GitHub.",
                            "technologies": ["Rust", "Docker", "GitHub Actions"],
                            "featured": false,
                            "type": "opensource",
                            "stars": 150
                        }
                    ]
                }
            },
            {
                "element_type": "process",
                "slug": "process",
                "title": "Comment je travaille",
                "order_index": 3,
                "layout": "steps",
                "visible": true,
                "data": {
                    "steps": [
                        {
                            "step": 1,
                            "title": "Découverte",
                            "description": "On échange sur votre projet et vos objectifs pour définir le périmètre.",
                            "icon": "chat"
                        },
                        {
                            "step": 2,
                            "title": "Proposition",
                            "description": "Je vous envoie un devis détaillé avec planning et livrables.",
                            "icon": "pencil"
                        },
                        {
                            "step": 3,
                            "title": "Développement",
                            "description": "Développement itératif avec points réguliers pour valider l''avancement.",
                            "icon": "code"
                        },
                        {
                            "step": 4,
                            "title": "Livraison",
                            "description": "Mise en production, documentation et transfert de compétences.",
                            "icon": "rocket"
                        }
                    ]
                }
            },
            {
                "element_type": "skills",
                "slug": "stack",
                "title": "Ma stack",
                "order_index": 4,
                "layout": "grid",
                "visible": true,
                "data": {
                    "categories": [
                        {
                            "name": "Frontend",
                            "skills": ["React", "Next.js", "TypeScript", "TailwindCSS"]
                        },
                        {
                            "name": "Backend",
                            "skills": ["Node.js", "Express", "Rust", "GraphQL"]
                        },
                        {
                            "name": "Base de données",
                            "skills": ["PostgreSQL", "Redis", "MongoDB"]
                        },
                        {
                            "name": "DevOps",
                            "skills": ["Docker", "GitHub Actions", "Vercel", "AWS"]
                        }
                    ]
                }
            },
            {
                "element_type": "proof",
                "slug": "proof",
                "title": "Ils me font confiance",
                "order_index": 5,
                "layout": "cards",
                "visible": true,
                "data": {
                    "items": [
                        {
                            "type": "metric",
                            "value": "50+",
                            "label": "Projets livrés"
                        },
                        {
                            "type": "metric",
                            "value": "30+",
                            "label": "Clients satisfaits"
                        },
                        {
                            "type": "testimonial",
                            "author": "Marie Dupont",
                            "authorRole": "CEO, StartupXYZ",
                            "content": "Alex a livré notre MVP en 3 semaines avec une qualité exceptionnelle. Je recommande vivement."
                        }
                    ]
                }
            },
            {
                "element_type": "about",
                "slug": "about",
                "title": "À propos",
                "order_index": 6,
                "layout": "split",
                "visible": true,
                "data": {
                    "bio": "Passionné par le développement web depuis plus de 5 ans, je me spécialise dans la création d''applications modernes avec React, Node.js et TypeScript.\n\nMon approche : comprendre vos besoins business pour livrer des solutions techniques qui créent de la valeur.\n\nDisponible pour des missions freelance de 2 à 6 mois.",
                    "location": "Paris, France",
                    "yearsOfExperience": 5
                }
            },
            {
                "element_type": "contact",
                "slug": "contact",
                "title": "Contactez-moi",
                "order_index": 7,
                "layout": "full",
                "visible": true,
                "data": {
                    "email": "contact@example.com",
                    "cta_text": "Envoyer un message",
                    "socials": {
                        "github": "https://github.com/username",
                        "linkedin": "https://linkedin.com/in/username",
                        "twitter": "https://twitter.com/username"
                    }
                }
            }
        ],
        "theme": {
            "mode": "dark",
            "primaryColor": "#6366f1",
            "avatarStyle": "rounded"
        },
        "seo": {
            "title": "{{name}} — {{title}}",
            "description": "{{title}} basé à {{location}}. {{tagline}}",
            "keywords": ["développeur freelance", "full-stack", "react", "node.js"]
        },
        "meta": {
            "target_audience": "freelance-developers",
            "difficulty": "beginner",
            "estimated_setup_time": "5min",
            "happy_path": "github-import"
        }
    }'::jsonb,
    '/images/presets/dev-freelance-classic.png',
    true
)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    config = EXCLUDED.config,
    thumbnail_url = EXCLUDED.thumbnail_url,
    enabled = EXCLUDED.enabled,
    updated_at = now();

-- ============================================
-- STEP 3: Add activation_metrics column to websites
-- ============================================

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'websites' AND column_name = 'activation_metrics'
    ) THEN
        ALTER TABLE websites ADD COLUMN activation_metrics JSONB DEFAULT '{
            "published": false,
            "hasMinProjects": false,
            "ctaConfigured": false,
            "contactConfigured": false,
            "score": 0,
            "activated": false
        }'::jsonb;
    END IF;
END $$;

-- ============================================
-- STEP 4: Add product_events table for metrics tracking
-- ============================================

CREATE TABLE IF NOT EXISTS product_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    website_id UUID REFERENCES websites(id) ON DELETE CASCADE,
    account_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    event_data JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for querying events
CREATE INDEX IF NOT EXISTS idx_product_events_website_id ON product_events(website_id);
CREATE INDEX IF NOT EXISTS idx_product_events_event_type ON product_events(event_type);
CREATE INDEX IF NOT EXISTS idx_product_events_created_at ON product_events(created_at DESC);

-- ============================================
-- STEP 5: Add onboarding_step column to websites
-- ============================================

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'websites' AND column_name = 'onboarding_step'
    ) THEN
        ALTER TABLE websites ADD COLUMN onboarding_step TEXT DEFAULT 'github_connect' 
            CHECK (onboarding_step IN ('github_connect', 'import_projects', 'review_profile', 'publish', 'completed'));
    END IF;
END $$;

-- ============================================
-- Comments
-- ============================================

COMMENT ON TABLE product_events IS 'V1 MVP: Track product events for activation metrics';
COMMENT ON COLUMN websites.activation_metrics IS 'V1 MVP: Activation score and checklist';
COMMENT ON COLUMN websites.onboarding_step IS 'V1 MVP: Current step in the GitHub → Publish flow';
