import { useState, useEffect } from 'react';
import { modulesAPI, websitesAPI, type WebsiteModule } from '../lib/api';

// Icon mapping for common module icons
const moduleIcons: Record<string, React.ReactNode> = {
  'github': (
    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
      <path fillRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.87 8.17 6.84 9.5.5.08.66-.23.66-.5v-1.69c-2.77.6-3.36-1.34-3.36-1.34-.46-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.87 1.52 2.34 1.07 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.92 0-1.11.38-2 1.03-2.71-.1-.25-.45-1.29.1-2.64 0 0 .84-.27 2.75 1.02.79-.22 1.65-.33 2.5-.33.85 0 1.71.11 2.5.33 1.91-1.29 2.75-1.02 2.75-1.02.55 1.35.2 2.39.1 2.64.65.71 1.03 1.6 1.03 2.71 0 3.82-2.34 4.66-4.57 4.91.36.31.69.92.69 1.85V21c0 .27.16.59.67.5C19.14 20.16 22 16.42 22 12A10 10 0 0012 2z" clipRule="evenodd"/>
    </svg>
  ),
  'blog': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
    </svg>
  ),
  'contact': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  'analytics': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  'theme': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
    </svg>
  ),
  'default': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/>
    </svg>
  ),
};

// Get icon for module (website module doesn't have icon field, guess from slug)
function getModuleIcon(moduleSlug: string): React.ReactNode {
  // Guess from slug
  if (moduleSlug.includes('github')) return moduleIcons['github'];
  if (moduleSlug.includes('blog')) return moduleIcons['blog'];
  if (moduleSlug.includes('contact')) return moduleIcons['contact'];
  if (moduleSlug.includes('analytics')) return moduleIcons['analytics'];
  if (moduleSlug.includes('theme')) return moduleIcons['theme'];
  
  return moduleIcons['default'];
}

export default function DynamicSidebar() {
  const [modules, setModules] = useState<WebsiteModule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadModules = async () => {
      try {
        // Get current website first
        const websites = await websitesAPI.list();
        if (websites.length > 0) {
          const data = await modulesAPI.listForWebsite(websites[0].id);
          // Filter only enabled modules
          const enabledModules = data.filter(m => m.enabled);
          setModules(enabledModules);
        }
      } catch (err) {
        console.error('Failed to load website modules:', err);
        setError('Erreur de chargement');
      } finally {
        setLoading(false);
      }
    };

    loadModules();
  }, []);

  // Don't render anything if loading or no modules
  if (loading || error || modules.length === 0) {
    return null;
  }

  return (
    <div className="mt-4">
      <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
        Modules
      </div>
      <nav className="space-y-1">
        {modules.map((module) => (
          <a
            key={module.id}
            href={`/app/modules/${module.module_slug}`}
            className="flex items-center gap-3 px-4 py-2 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <span className="text-gray-600">
              {getModuleIcon(module.module_slug)}
            </span>
            <span>{module.module_name}</span>
          </a>
        ))}
      </nav>
    </div>
  );
}
