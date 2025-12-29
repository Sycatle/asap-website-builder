-- ============================================
-- Seed: Landing Page SaaS Preset
-- ============================================
-- This migration adds a landing page template for SaaS products
-- with all essential marketing sections pre-configured.

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
    'b2c3d4e5-f6a7-8901-bcde-f23456789012'::uuid,
    'Landing Page SaaS',
    'landing-saas',
    'Template de page d''atterrissage moderne pour SaaS avec navigation, hero, fonctionnalités, tarification, témoignages et CTA. Idéal pour présenter un produit ou service.',
    'marketing',
    '{
        "extensions": ["landing-core", "contact-form"],
        "pages": [
            {
                "slug": "",
                "title": "Accueil",
                "description": "Page d''atterrissage principale",
                "is_homepage": true,
                "sections": [
                    {
                        "section_type": "navigation",
                        "slug": "navigation",
                        "title": "Navigation",
                        "layout": "sticky",
                        "order": 0,
                        "settings": {
                            "show_logo": true,
                            "logo_icon": "zap",
                            "brand_name": "ASAP",
                            "nav_links": [
                                {"label": "Fonctionnalités", "href": "#features"},
                                {"label": "Tarifs", "href": "#pricing"},
                                {"label": "Témoignages", "href": "#testimonials"}
                            ],
                            "show_auth_buttons": true,
                            "login_text": "Connexion",
                            "login_href": "/login",
                            "signup_text": "Commencer gratuitement",
                            "signup_href": "/signup",
                            "mobile_menu": true
                        }
                    },
                    {
                        "section_type": "hero",
                        "slug": "hero",
                        "title": "Hero",
                        "layout": "full",
                        "order": 1,
                        "settings": {
                            "show_badge": true,
                            "badge_icon": "sparkles",
                            "badge_text": "Nouvelle version disponible",
                            "headline_line1": "Créez votre site web",
                            "headline_line2": "en quelques minutes",
                            "subheadline": "La plateforme tout-en-un pour créer, gérer et faire évoluer votre présence en ligne.",
                            "subheadline_bold": "Sans coder.",
                            "cta_primary_text": "Commencer gratuitement",
                            "cta_primary_href": "/signup",
                            "cta_primary_icon": "arrow-right",
                            "cta_secondary_text": "Voir la démo",
                            "cta_secondary_href": "#demo",
                            "cta_secondary_icon": "play",
                            "show_social_proof": true,
                            "social_proof_avatars_count": 5,
                            "social_proof_text": "+500 créateurs nous font confiance",
                            "social_proof_rating": "4.9/5 sur 200+ avis",
                            "show_dashboard_preview": true,
                            "dashboard_url": "app.asap.cool/dashboard",
                            "dashboard_stats": [
                                {"icon": "globe", "value": "3", "label": "Sites actifs"},
                                {"icon": "cloud", "value": "2.4 GB", "label": "Stockage utilisé"},
                                {"icon": "sparkles", "value": "8,500", "label": "Tokens IA"}
                            ],
                            "background_type": "gradient",
                            "background_decorations": true
                        }
                    },
                    {
                        "section_type": "features",
                        "slug": "features",
                        "title": "Fonctionnalités",
                        "layout": "grid",
                        "order": 2,
                        "settings": {
                            "badge_text": "Fonctionnalités",
                            "headline_line1": "Tout ce dont vous avez besoin",
                            "headline_line2": "pour réussir en ligne",
                            "subheadline": "Des outils puissants et simples d''utilisation pour créer des sites web professionnels.",
                            "columns": 3,
                            "show_badges": true,
                            "show_icons": true,
                            "hover_effect": true,
                            "features": [
                                {
                                    "icon": "github",
                                    "title": "Sync GitHub",
                                    "description": "Importez automatiquement vos projets et contributions depuis GitHub pour un portfolio toujours à jour.",
                                    "badge": "Populaire"
                                },
                                {
                                    "icon": "globe",
                                    "title": "Multi-sites",
                                    "description": "Créez plusieurs sites depuis un seul compte : portfolio, blog, landing pages..."
                                },
                                {
                                    "icon": "cloud",
                                    "title": "Hébergement inclus",
                                    "description": "Hébergement rapide et sécurisé avec SSL gratuit. Domaine personnalisé disponible."
                                },
                                {
                                    "icon": "sparkles",
                                    "title": "Assistant IA",
                                    "description": "Générez du contenu, optimisez vos textes et obtenez des suggestions intelligentes.",
                                    "badge": "Nouveau"
                                },
                                {
                                    "icon": "puzzle",
                                    "title": "Extensions",
                                    "description": "Ajoutez des fonctionnalités avec notre marketplace d''extensions : analytics, formulaires, blog..."
                                },
                                {
                                    "icon": "bar-chart-3",
                                    "title": "Analytics",
                                    "description": "Suivez vos visiteurs, pages vues et performances avec des statistiques détaillées."
                                }
                            ]
                        }
                    },
                    {
                        "section_type": "how-it-works",
                        "slug": "demo",
                        "title": "Comment ça marche",
                        "layout": "timeline",
                        "order": 3,
                        "settings": {
                            "badge_text": "Simple comme bonjour",
                            "headline_line1": "Lancez-vous",
                            "headline_line2": "en 4 étapes",
                            "subheadline": "De l''inscription à la publication, tout est fait pour aller vite.",
                            "show_numbers": true,
                            "show_connectors": true,
                            "steps": [
                                {
                                    "number": "01",
                                    "title": "Créez votre compte",
                                    "description": "Inscription gratuite en 30 secondes avec email ou GitHub."
                                },
                                {
                                    "number": "02",
                                    "title": "Choisissez un template",
                                    "description": "Sélectionnez parmi nos templates professionnels et personnalisez-le."
                                },
                                {
                                    "number": "03",
                                    "title": "Ajoutez votre contenu",
                                    "description": "Importez vos projets, rédigez vos textes ou laissez l''IA vous aider."
                                },
                                {
                                    "number": "04",
                                    "title": "Publiez en un clic",
                                    "description": "Votre site est en ligne instantanément avec un domaine gratuit."
                                }
                            ]
                        }
                    },
                    {
                        "section_type": "pricing",
                        "slug": "pricing",
                        "title": "Tarification",
                        "layout": "cards",
                        "order": 4,
                        "settings": {
                            "badge_text": "Tarifs",
                            "headline_line1": "Des prix simples",
                            "headline_line2": "et transparents",
                            "subheadline": "Commencez gratuitement, évoluez quand vous êtes prêt.",
                            "currency": "€",
                            "currency_position": "after",
                            "billing_period": "monthly",
                            "show_popular_badge": true,
                            "popular_badge_text": "Le plus populaire",
                            "plans": [
                                {
                                    "name": "Gratuit",
                                    "description": "Pour débuter et tester",
                                    "price": "0",
                                    "period": "pour toujours",
                                    "popular": false,
                                    "features": [
                                        "1 site web",
                                        "500 MB de stockage",
                                        "1,000 tokens IA/mois",
                                        "Sous-domaine asap.cool",
                                        "Analytics basiques",
                                        "Support communauté"
                                    ],
                                    "cta_text": "Commencer gratuitement",
                                    "cta_variant": "outline"
                                },
                                {
                                    "name": "Pro",
                                    "description": "Pour les créateurs sérieux",
                                    "price": "9",
                                    "period": "/mois",
                                    "popular": true,
                                    "features": [
                                        "5 sites web",
                                        "10 GB de stockage",
                                        "10,000 tokens IA/mois",
                                        "Domaines personnalisés",
                                        "Analytics avancés",
                                        "Thèmes premium",
                                        "Support prioritaire",
                                        "Sans publicité"
                                    ],
                                    "cta_text": "Passer à Pro",
                                    "cta_variant": "default"
                                },
                                {
                                    "name": "Team",
                                    "description": "Pour les équipes et agences",
                                    "price": "29",
                                    "period": "/mois",
                                    "popular": false,
                                    "features": [
                                        "Sites illimités",
                                        "100 GB de stockage",
                                        "50,000 tokens IA/mois",
                                        "Multi-utilisateurs",
                                        "API complète",
                                        "White-label",
                                        "Account manager dédié",
                                        "SLA 99.9%"
                                    ],
                                    "cta_text": "Contacter les ventes",
                                    "cta_variant": "outline"
                                }
                            ]
                        }
                    },
                    {
                        "section_type": "testimonials",
                        "slug": "testimonials",
                        "title": "Témoignages",
                        "layout": "grid",
                        "order": 5,
                        "settings": {
                            "badge_text": "Témoignages",
                            "headline_line1": "Ils nous font",
                            "headline_line2": "confiance",
                            "subheadline": "Découvrez ce que nos utilisateurs disent de leur expérience.",
                            "columns": 3,
                            "show_avatars": true,
                            "show_quotes": true,
                            "testimonials": [
                                {
                                    "quote": "ASAP m''a permis de créer mon portfolio en une soirée. L''import GitHub est magique, tous mes projets étaient là en un clic !",
                                    "author": "Marie L.",
                                    "role": "Développeuse Full-Stack",
                                    "avatar_initials": "ML"
                                },
                                {
                                    "quote": "En tant que freelance, j''avais besoin d''un site pro rapidement. ASAP a dépassé mes attentes avec son assistant IA.",
                                    "author": "Thomas R.",
                                    "role": "Designer UX/UI",
                                    "avatar_initials": "TR"
                                },
                                {
                                    "quote": "Notre agence utilise ASAP pour créer les portfolios de nos clients. Le gain de temps est considérable.",
                                    "author": "Kevin M.",
                                    "role": "Directeur d''agence",
                                    "avatar_initials": "KM"
                                }
                            ]
                        }
                    },
                    {
                        "section_type": "cta",
                        "slug": "cta",
                        "title": "Appel à l''action",
                        "layout": "full",
                        "order": 6,
                        "settings": {
                            "background_style": "primary",
                            "headline": "Prêt à créer votre site ?",
                            "subheadline_line1": "Rejoignez des centaines de créateurs qui font confiance à ASAP.",
                            "subheadline_line2": "Commencez gratuitement, sans carte bancaire.",
                            "cta_primary_text": "Créer mon site gratuitement",
                            "cta_primary_href": "/signup",
                            "cta_primary_icon": "rocket",
                            "cta_primary_variant": "secondary",
                            "cta_secondary_text": "Voir les tarifs",
                            "cta_secondary_href": "#pricing",
                            "cta_secondary_icon": "chevron-right",
                            "cta_secondary_variant": "outline"
                        }
                    },
                    {
                        "section_type": "footer",
                        "slug": "footer",
                        "title": "Pied de page",
                        "layout": "columns",
                        "order": 7,
                        "settings": {
                            "show_logo": true,
                            "logo_icon": "zap",
                            "brand_name": "ASAP",
                            "tagline": "La plateforme la plus simple pour créer votre présence en ligne professionnelle.",
                            "show_badges": true,
                            "badges": [
                                {"icon": "shield", "text": "RGPD"},
                                {"text": "🇫🇷 Made in France"}
                            ],
                            "columns": [
                                {
                                    "title": "Produit",
                                    "links": [
                                        {"label": "Fonctionnalités", "href": "#features"},
                                        {"label": "Tarifs", "href": "#pricing"},
                                        {"label": "Documentation", "href": "/docs"},
                                        {"label": "Changelog", "href": "/changelog"}
                                    ]
                                },
                                {
                                    "title": "Entreprise",
                                    "links": [
                                        {"label": "À propos", "href": "/about"},
                                        {"label": "Blog", "href": "/blog"},
                                        {"label": "Contact", "href": "/contact"},
                                        {"label": "Partenaires", "href": "/partners"}
                                    ]
                                },
                                {
                                    "title": "Légal",
                                    "links": [
                                        {"label": "Confidentialité", "href": "/privacy"},
                                        {"label": "CGU", "href": "/terms"},
                                        {"label": "Mentions légales", "href": "/legal"},
                                        {"label": "Cookies", "href": "/cookies"}
                                    ]
                                }
                            ],
                            "show_social_links": true,
                            "social_links": [
                                {"platform": "github", "href": "https://github.com"},
                                {"platform": "twitter", "href": "https://twitter.com"}
                            ],
                            "copyright": "© 2025 ASAP. Tous droits réservés."
                        }
                    }
                ]
            }
        ],
        "theme": {
            "primary_color": "#3b82f6",
            "accent_color": "#8b5cf6",
            "dark_mode": false,
            "font_heading": "Inter",
            "font_body": "Inter"
        },
        "meta": {
            "target_audience": "saas-founders",
            "difficulty": "beginner",
            "estimated_setup_time": "20min"
        }
    }'::jsonb,
    NULL,
    true
)
ON CONFLICT (slug) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    category = EXCLUDED.category,
    config = EXCLUDED.config,
    enabled = EXCLUDED.enabled,
    updated_at = now();
