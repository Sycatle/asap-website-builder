import { useEffect, useState } from 'react';
import { modulesAPI } from '../lib/api';
import type { Module, TenantModule } from '../lib/api/modules';

export default function ModulesManager() {
  const [catalogModules, setCatalogModules] = useState<Module[]>([]);
  const [activeModules, setActiveModules] = useState<TenantModule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activatingModule, setActivatingModule] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load module catalog
      const catalog = await modulesAPI.catalog();
      setCatalogModules(catalog);

      // Load active modules for tenant
      try {
        const tenantModules = await modulesAPI.listForTenant();
        setActiveModules(tenantModules);
      } catch (err) {
        console.error('Failed to load tenant modules:', err);
        setActiveModules([]);
      }
    } catch (err) {
      console.error('Failed to load modules:', err);
      setError('Erreur lors du chargement des modules');
    } finally {
      setIsLoading(false);
    }
  };

  const handleActivateModule = async (module: Module) => {
    try {
      setActivatingModule(module.id);
      await modulesAPI.activateForTenant({
        module_id: module.id,
        settings: module.default_settings,
      });
      // Reload data to get updated active modules
      await loadData();
    } catch (err) {
      console.error('Failed to activate module:', err);
      setError(`Erreur lors de l'activation du module ${module.name}`);
    } finally {
      setActivatingModule(null);
    }
  };

  const handleDeactivateModule = async (moduleSlug: string) => {
    try {
      setActivatingModule(moduleSlug);
      await modulesAPI.updateTenantModuleSettings(moduleSlug, {
        settings: {},
        enabled: false,
      });
      await loadData();
    } catch (err) {
      console.error('Failed to deactivate module:', err);
      setError('Erreur lors de la désactivation du module');
    } finally {
      setActivatingModule(null);
    }
  };

  // Get module icon based on category
  const getModuleIcon = (category: string) => {
    const iconClass = "w-6 h-6";
    switch (category) {
      case 'integration':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
          </svg>
        );
      case 'content':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
          </svg>
        );
      case 'engagement':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
          </svg>
        );
      case 'analytics':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
          </svg>
        );
      case 'appearance':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"/>
          </svg>
        );
      default:
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
          </svg>
        );
    }
  };

  // Get category color
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'integration': return 'bg-gray-900';
      case 'content': return 'bg-indigo-600';
      case 'engagement': return 'bg-green-600';
      case 'analytics': return 'bg-purple-600';
      case 'appearance': return 'bg-pink-600';
      default: return 'bg-blue-600';
    }
  };

  // Get category label in French
  const getCategoryLabel = (category: string) => {
    switch (category) {
      case 'integration': return 'Intégration';
      case 'content': return 'Contenu';
      case 'engagement': return 'Engagement';
      case 'analytics': return 'Analytics';
      case 'appearance': return 'Apparence';
      default: return category;
    }
  };

  // Check if a module is active
  const isModuleActive = (moduleId: string) => {
    return activeModules.some(m => m.module_id === moduleId && m.enabled);
  };

  // Get active module by module_id
  const getActiveModule = (moduleId: string) => {
    return activeModules.find(m => m.module_id === moduleId && m.enabled);
  };

  // Get suggested modules (catalog modules that are not active)
  const suggestedModules = catalogModules.filter(m => !isModuleActive(m.id));

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Modules</h1>
        <p className="mt-2 text-gray-600">
          Activez des modules pour débloquer de nouvelles fonctionnalités sur votre site
        </p>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 text-red-700">
          {error}
          <button 
            onClick={() => setError(null)} 
            className="ml-4 text-red-500 hover:text-red-700"
          >
            ✕
          </button>
        </div>
      )}

      {/* Active Modules */}
      {activeModules.filter(m => m.enabled).length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
            Modules activés ({activeModules.filter(m => m.enabled).length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {activeModules.filter(m => m.enabled).map((tenantModule) => {
              const catalogModule = catalogModules.find(cm => cm.id === tenantModule.module_id);
              if (!catalogModule) return null;

              return (
                <div
                  key={tenantModule.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className={`w-12 h-12 ${getCategoryColor(catalogModule.category)} rounded-lg flex items-center justify-center text-white`}>
                      {getModuleIcon(catalogModule.category)}
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      Actif
                    </span>
                  </div>
                  <h3 className="mt-4 text-lg font-semibold text-gray-900">{catalogModule.name}</h3>
                  <p className="mt-1 text-sm text-gray-600 line-clamp-2">{catalogModule.description}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getCategoryColor(catalogModule.category)} bg-opacity-10 text-gray-700`}>
                      {getCategoryLabel(catalogModule.category)}
                    </span>
                    <span className="text-xs text-gray-500">v{catalogModule.version}</span>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <a
                      href={`/app/modules/${catalogModule.slug}`}
                      className="flex-1 px-3 py-2 text-sm font-medium text-center text-primary-600 bg-primary-50 rounded-lg hover:bg-primary-100 transition-colors"
                    >
                      Configurer
                    </a>
                    <button
                      onClick={() => handleDeactivateModule(tenantModule.module_slug)}
                      disabled={activatingModule === tenantModule.module_slug}
                      className="px-3 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                    >
                      {activatingModule === tenantModule.module_slug ? '...' : 'Désactiver'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Suggested Modules */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
          </svg>
          Modules suggérés ({suggestedModules.length})
        </h2>
        {suggestedModules.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>Tous les modules disponibles sont déjà activés !</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {suggestedModules.map((module) => (
              <div
                key={module.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className={`w-12 h-12 ${getCategoryColor(module.category)} rounded-lg flex items-center justify-center text-white`}>
                    {getModuleIcon(module.category)}
                  </div>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-gray-900">{module.name}</h3>
                <p className="mt-1 text-sm text-gray-600 line-clamp-2">{module.description}</p>
                <div className="mt-3 flex items-center gap-2">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getCategoryColor(module.category)} bg-opacity-10 text-gray-700`}>
                    {getCategoryLabel(module.category)}
                  </span>
                  <span className="text-xs text-gray-500">v{module.version}</span>
                </div>
                <button
                  onClick={() => handleActivateModule(module)}
                  disabled={activatingModule === module.id}
                  className="mt-4 w-full px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {activatingModule === module.id ? 'Activation...' : 'Activer'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
