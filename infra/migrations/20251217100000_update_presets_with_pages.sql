-- ============================================
-- Migration: Update Presets to Use Pages
-- ============================================
-- This migration updates preset configurations to use the new page-based
-- structure where sections belong to pages, not directly to websites.

-- Update Portfolio Développeur preset
UPDATE presets 
SET config = '{
    "modules": ["portfolio-core", "contact-form"],
    "pages": [
        {
            "slug": "",
            "title": "Accueil",
            "description": "Page d''accueil du portfolio",
            "is_homepage": true,
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
                        "content_placeholder": "Passionné par le développement web depuis plus de X années, je me spécialise dans la création d''applications modernes et performantes."
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
                            {"name": "PostgreSQL", "category": "Backend", "proficiency": 80}
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
                        "show_featured_first": true
                    }
                },
                {
                    "section_type": "experience",
                    "slug": "experience",
                    "title": "Expérience",
                    "layout": "timeline",
                    "settings": {
                        "show_company_logo": true,
                        "show_duration": true
                    }
                },
                {
                    "section_type": "education",
                    "slug": "education",
                    "title": "Formation",
                    "layout": "timeline",
                    "settings": {
                        "show_school_logo": true,
                        "show_gpa": false
                    }
                }
            ]
        },
        {
            "slug": "contact",
            "title": "Contact",
            "description": "Page de contact",
            "is_homepage": false,
            "sections": [
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
                        "cta_text": "Envoyez-moi un message"
                    }
                }
            ]
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
updated_at = now()
WHERE slug = 'portfolio-dev';

-- Update Portfolio Minimaliste preset
UPDATE presets 
SET config = '{
    "modules": ["portfolio-core"],
    "pages": [
        {
            "slug": "",
            "title": "Accueil",
            "description": "Page d''accueil minimaliste",
            "is_homepage": true,
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
            ]
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
updated_at = now()
WHERE slug = 'portfolio-minimal';

-- Update Portfolio Freelance preset
UPDATE presets 
SET config = '{
    "modules": ["portfolio-core", "contact-form"],
    "pages": [
        {
            "slug": "",
            "title": "Accueil",
            "description": "Page d''accueil freelance",
            "is_homepage": true,
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
                }
            ]
        },
        {
            "slug": "services",
            "title": "Services & Tarifs",
            "description": "Services et tarification",
            "is_homepage": false,
            "sections": [
                {
                    "section_type": "services",
                    "slug": "services-detail",
                    "title": "Mes Services",
                    "layout": "grid",
                    "settings": {
                        "show_icons": true,
                        "detailed_view": true
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
                }
            ]
        },
        {
            "slug": "contact",
            "title": "Contact",
            "description": "Page de contact",
            "is_homepage": false,
            "sections": [
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
            ]
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
updated_at = now()
WHERE slug = 'portfolio-freelance';
