-- ============================================
-- Seed: Default Portfolio Dev Preset
-- ============================================
-- This migration adds a default preset template for developer portfolios
-- with all essential sections pre-configured.

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
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890'::uuid,
    'Portfolio Développeur',
    'portfolio-dev',
    'Template complet pour développeurs avec toutes les sections essentielles : hero, à propos, compétences, projets, expérience, formation et contact.',
    'professional',
    '{
        "modules": ["portfolio-core", "contact-form"],
        "sections": [
            {
                "section_type": "hero",
                "slug": "hero",
                "title": "Accueil",
                "layout": "full",
                "settings": {
                    "headline": "Développeur Full-Stack",
                    "subheadline": "Je crée des applications web modernes et performantes",
                    "cta_text": "Voir mes projets",
                    "cta_link": "#projects",
                    "show_social_links": true,
                    "background_type": "gradient"
                }
            },
            {
                "section_type": "about",
                "slug": "about",
                "title": "À propos",
                "layout": "split",
                "settings": {
                    "show_photo": true,
                    "photo_position": "right",
                    "content_placeholder": "Passionné par le développement web depuis plus de X années, je me spécialise dans la création d''applications modernes et performantes. Mon approche combine expertise technique et sens du design pour créer des expériences utilisateur exceptionnelles."
                }
            },
            {
                "section_type": "skills",
                "slug": "skills",
                "title": "Compétences",
                "layout": "grid",
                "settings": {
                    "show_proficiency": true,
                    "group_by_category": true,
                    "categories": ["Frontend", "Backend", "DevOps", "Tools"],
                    "default_skills": [
                        {"name": "TypeScript", "category": "Frontend", "proficiency": 90},
                        {"name": "React", "category": "Frontend", "proficiency": 95},
                        {"name": "Node.js", "category": "Backend", "proficiency": 85},
                        {"name": "PostgreSQL", "category": "Backend", "proficiency": 80},
                        {"name": "Docker", "category": "DevOps", "proficiency": 75},
                        {"name": "Git", "category": "Tools", "proficiency": 90}
                    ]
                }
            },
            {
                "section_type": "projects",
                "slug": "projects",
                "title": "Projets",
                "layout": "grid",
                "settings": {
                    "show_technologies": true,
                    "show_links": true,
                    "items_per_row": 3,
                    "show_featured_first": true,
                    "default_projects": [
                        {
                            "title": "Projet Exemple 1",
                            "description": "Description de votre projet phare",
                            "technologies": ["React", "TypeScript", "Node.js"],
                            "featured": true
                        },
                        {
                            "title": "Projet Exemple 2",
                            "description": "Un autre projet impressionnant",
                            "technologies": ["Vue.js", "Python", "PostgreSQL"],
                            "featured": false
                        },
                        {
                            "title": "Projet Exemple 3",
                            "description": "Votre contribution open source",
                            "technologies": ["Go", "Docker", "Kubernetes"],
                            "featured": false
                        }
                    ]
                }
            },
            {
                "section_type": "experience",
                "slug": "experience",
                "title": "Expérience",
                "layout": "timeline",
                "settings": {
                    "show_company_logo": true,
                    "show_duration": true,
                    "default_experiences": [
                        {
                            "position": "Senior Developer",
                            "company": "Entreprise Actuelle",
                            "location": "Paris, France",
                            "start_date": "2022-01",
                            "end_date": null,
                            "current": true,
                            "description": "Développement d''applications web full-stack..."
                        },
                        {
                            "position": "Developer",
                            "company": "Entreprise Précédente",
                            "location": "Lyon, France",
                            "start_date": "2020-01",
                            "end_date": "2021-12",
                            "current": false,
                            "description": "Participation au développement de la plateforme..."
                        }
                    ]
                }
            },
            {
                "section_type": "education",
                "slug": "education",
                "title": "Formation",
                "layout": "timeline",
                "settings": {
                    "show_school_logo": true,
                    "show_gpa": false,
                    "default_education": [
                        {
                            "degree": "Master Informatique",
                            "school": "Université / École",
                            "location": "Ville, France",
                            "start_date": "2018",
                            "end_date": "2020",
                            "description": "Spécialisation en développement logiciel"
                        },
                        {
                            "degree": "Licence Informatique",
                            "school": "Université",
                            "location": "Ville, France",
                            "start_date": "2015",
                            "end_date": "2018",
                            "description": "Fondamentaux de l''informatique"
                        }
                    ]
                }
            },
            {
                "section_type": "contact",
                "slug": "contact",
                "title": "Contact",
                "layout": "split",
                "settings": {
                    "show_form": true,
                    "show_social_links": true,
                    "show_email": true,
                    "show_location": true,
                    "form_fields": ["name", "email", "subject", "message"],
                    "social_links": ["github", "linkedin", "twitter"],
                    "cta_text": "Envoyez-moi un message",
                    "email_placeholder": "votre@email.com"
                }
            }
        ],
        "theme": {
            "primary_color": "#3b82f6",
            "accent_color": "#10b981",
            "dark_mode": true,
            "font_heading": "Inter",
            "font_body": "Inter"
        },
        "meta": {
            "target_audience": "developers",
            "difficulty": "beginner",
            "estimated_setup_time": "15min"
        }
    }'::jsonb,
    '/images/presets/portfolio-dev-thumbnail.png',
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
-- Additional presets for variety
-- ============================================

-- Preset: Portfolio Minimaliste
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
    'b2c3d4e5-f6a7-8901-bcde-f12345678901'::uuid,
    'Portfolio Minimaliste',
    'portfolio-minimal',
    'Template épuré et moderne avec un focus sur l''essentiel : présentation, projets et contact.',
    'creative',
    '{
        "modules": ["portfolio-core"],
        "sections": [
            {
                "section_type": "hero",
                "slug": "hero",
                "title": "Accueil",
                "layout": "full",
                "settings": {
                    "headline": "Bonjour, je suis",
                    "subheadline": "Développeur passionné",
                    "minimal_style": true,
                    "show_scroll_indicator": true
                }
            },
            {
                "section_type": "projects",
                "slug": "work",
                "title": "Travaux",
                "layout": "cards",
                "settings": {
                    "show_technologies": false,
                    "show_links": true,
                    "items_per_row": 2,
                    "large_images": true
                }
            },
            {
                "section_type": "contact",
                "slug": "contact",
                "title": "Contact",
                "layout": "full",
                "settings": {
                    "show_form": false,
                    "show_email": true,
                    "show_social_links": true,
                    "minimal_style": true
                }
            }
        ],
        "theme": {
            "primary_color": "#000000",
            "accent_color": "#666666",
            "dark_mode": false,
            "font_heading": "Space Grotesk",
            "font_body": "Inter"
        },
        "meta": {
            "target_audience": "designers",
            "difficulty": "beginner",
            "estimated_setup_time": "10min"
        }
    }'::jsonb,
    '/images/presets/portfolio-minimal-thumbnail.png',
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

-- Preset: Portfolio Freelance
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
    'c3d4e5f6-a7b8-9012-cdef-123456789012'::uuid,
    'Portfolio Freelance',
    'portfolio-freelance',
    'Template optimisé pour les freelances avec sections services, tarifs, témoignages et contact.',
    'business',
    '{
        "modules": ["portfolio-core", "contact-form"],
        "sections": [
            {
                "section_type": "hero",
                "slug": "hero",
                "title": "Accueil",
                "layout": "full",
                "settings": {
                    "headline": "Freelance Développeur Web",
                    "subheadline": "Je transforme vos idées en solutions digitales",
                    "cta_text": "Discutons de votre projet",
                    "cta_link": "#contact",
                    "show_availability": true
                }
            },
            {
                "section_type": "services",
                "slug": "services",
                "title": "Services",
                "layout": "grid",
                "settings": {
                    "show_icons": true,
                    "default_services": [
                        {"title": "Développement Web", "description": "Sites web modernes et responsive", "icon": "globe"},
                        {"title": "Applications", "description": "Applications web sur mesure", "icon": "app"},
                        {"title": "Conseil", "description": "Audit et accompagnement technique", "icon": "lightbulb"}
                    ]
                }
            },
            {
                "section_type": "projects",
                "slug": "portfolio",
                "title": "Réalisations",
                "layout": "grid",
                "settings": {
                    "show_technologies": true,
                    "show_client": true,
                    "items_per_row": 3
                }
            },
            {
                "section_type": "testimonials",
                "slug": "testimonials",
                "title": "Témoignages",
                "layout": "carousel",
                "settings": {
                    "show_company": true,
                    "show_rating": true
                }
            },
            {
                "section_type": "pricing",
                "slug": "pricing",
                "title": "Tarifs",
                "layout": "cards",
                "settings": {
                    "show_features": true,
                    "highlight_recommended": true,
                    "default_plans": [
                        {"name": "Site Vitrine", "price": "À partir de 1500€", "features": ["Design sur mesure", "Responsive", "SEO de base"]},
                        {"name": "Application Web", "price": "Sur devis", "features": ["Architecture moderne", "API REST", "Dashboard admin"], "recommended": true},
                        {"name": "Accompagnement", "price": "500€/jour", "features": ["Conseil technique", "Code review", "Formation équipe"]}
                    ]
                }
            },
            {
                "section_type": "contact",
                "slug": "contact",
                "title": "Contact",
                "layout": "split",
                "settings": {
                    "show_form": true,
                    "show_availability_calendar": true,
                    "cta_text": "Démarrer un projet"
                }
            }
        ],
        "theme": {
            "primary_color": "#6366f1",
            "accent_color": "#f59e0b",
            "dark_mode": false,
            "font_heading": "Poppins",
            "font_body": "Inter"
        },
        "meta": {
            "target_audience": "freelancers",
            "difficulty": "intermediate",
            "estimated_setup_time": "20min"
        }
    }'::jsonb,
    '/images/presets/portfolio-freelance-thumbnail.png',
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
