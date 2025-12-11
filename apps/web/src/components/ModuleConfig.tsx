import { useEffect, useState } from 'react';
import { modulesAPI, websitesAPI, authAPI } from '../lib/api';
import type { Module, TenantModule, ModuleData, ConfigSchema } from '../lib/api/modules';
import SchemaRenderer from './SchemaRenderer';

interface ModuleConfigProps {
  slug: string;
}

// Default schema for modules without config_schema (fallback)
const getDefaultSchema = (module: Module): ConfigSchema => {
  const defaultSettings = module.default_settings || {};
  const fields = Object.entries(defaultSettings).map(([key, value]) => ({
    key,
    label: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    type: typeof value === 'boolean' ? 'boolean' as const : 
          typeof value === 'number' ? 'number' as const : 'text' as const,
    default: value,
  }));

  return { fields };
};

export default function ModuleConfig({ slug }: ModuleConfigProps) {
  const [module, setModule] = useState<Module | null>(null);
  const [tenantModule, setTenantModule] = useState<TenantModule | null>(null);
  const [isModuleEnabled, setIsModuleEnabled] = useState(false);
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [moduleData, setModuleData] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [executingAction, setExecutingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [slug]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get module by slug (includes config_schema)
      let foundModule: Module | null = null;
      
      try {
        foundModule = await modulesAPI.getBySlug(slug);
      } catch {
        // Fallback to catalog search
        const catalog = await modulesAPI.catalog();
        foundModule = catalog.find(m => m.slug === slug) || null;
      }
      
      if (!foundModule) {
        setError('Module non trouvé');
        setIsLoading(false);
        return;
      }
      
      setModule(foundModule);

      // Load tenant modules to check if this one is activated
      try {
        const tenantModules = await modulesAPI.listForTenant();
        const activeModule = tenantModules.find(m => m.module_slug === slug);
        
        if (activeModule) {
          setTenantModule(activeModule);
          setIsModuleEnabled(activeModule.enabled);
          setSettings(activeModule.settings || foundModule.default_settings || {});
        } else {
          setSettings(foundModule.default_settings || {});
          setIsModuleEnabled(false);
        }
      } catch {
        setSettings(foundModule.default_settings || {});
        setIsModuleEnabled(false);
      }

      // Try to load module-specific data
      try {
        const data = await modulesAPI.getTenantModuleData(slug);
        setModuleData(data.data || {});
        // Update enabled status from API response
        if (data.enabled !== undefined) {
          setIsModuleEnabled(data.enabled);
        }
      } catch {
        // Module data endpoint may not exist yet
        setModuleData({});
      }
    } catch (err) {
      console.error('Failed to load module config:', err);
      setError('Erreur lors du chargement de la configuration');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!module) return;

    try {
      setIsSaving(true);
      setError(null);
      setSuccess(null);

      if (tenantModule) {
        // Update existing tenant module
        await modulesAPI.updateTenantModuleSettings(slug, { settings });
      } else {
        // Activate module for tenant
        await modulesAPI.activateForTenant({
          module_id: module.id,
          settings,
        });
      }

      setSuccess('Configuration enregistrée avec succès');
      await loadData();
    } catch (err) {
      console.error('Failed to save settings:', err);
      setError('Erreur lors de l\'enregistrement');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAction = async (actionKey: string) => {
    const action = module?.config_schema?.actions?.find(a => a.key === actionKey);
    
    try {
      setExecutingAction(actionKey);
      setError(null);
      setSuccess(null);

      await modulesAPI.executeTenantAction(slug, actionKey, settings);
      
      setSuccess(`Action "${action?.label || actionKey}" exécutée avec succès`);
      
      // Reload data if action requires refresh
      if (action?.refreshAfter !== false) {
        setTimeout(loadData, 2000);
      }
    } catch (err) {
      console.error('Failed to execute action:', err);
      setError(`Erreur lors de l'exécution de l'action`);
    } finally {
      setExecutingAction(null);
    }
  };

  const handleDeactivate = async () => {
    if (!module) return;
    
    if (!confirm('Êtes-vous sûr de vouloir désactiver ce module ?')) return;

    try {
      await modulesAPI.updateTenantModuleSettings(slug, {
        settings: {},
        enabled: false,
      });
      window.location.href = '/app/modules';
    } catch (err) {
      setError('Erreur lors de la désactivation');
    }
  };

  // Get category helpers
  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'integration': 'bg-gray-900',
      'content': 'bg-indigo-600',
      'engagement': 'bg-green-600',
      'analytics': 'bg-purple-600',
      'appearance': 'bg-pink-600',
    };
    return colors[category] || 'bg-blue-600';
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      'integration': 'Intégration',
      'content': 'Contenu',
      'engagement': 'Engagement',
      'analytics': 'Analytics',
      'appearance': 'Apparence',
    };
    return labels[category] || category;
  };

  const getModuleIcon = (category: string) => {
    const iconClass = "w-8 h-8";
    const icons: Record<string, React.ReactNode> = {
      'integration': (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
        </svg>
      ),
      'content': (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
        </svg>
      ),
      'engagement': (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/>
        </svg>
      ),
      'analytics': (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/>
        </svg>
      ),
      'appearance': (
        <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"/>
        </svg>
      ),
    };
    return icons[category] || (
      <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
      </svg>
    );
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  // Module not found
  if (!module) {
    return (
      <div className="text-center py-12">
        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 className="mt-4 text-lg font-medium text-gray-900">Module non trouvé</h3>
        <p className="mt-2 text-gray-500">Le module "{slug}" n'existe pas.</p>
        <a href="/app/modules" className="mt-4 inline-block text-primary-600 hover:text-primary-700">
          ← Retour aux modules
        </a>
      </div>
    );
  }

  // Get schema (from module or generate default)
  const schema = module.config_schema || getDefaultSchema(module);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back link */}
      <a href="/app/modules" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900">
        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
        </svg>
        Retour aux modules
      </a>

      {/* Module Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-start gap-4">
          <div className={`w-16 h-16 ${getCategoryColor(module.category)} rounded-xl flex items-center justify-center text-white`}>
            {getModuleIcon(module.category)}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{module.name}</h1>
              {isModuleEnabled ? (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Actif
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                  Non activé
                </span>
              )}
            </div>
            <p className="mt-1 text-gray-600">{module.description}</p>
            <div className="mt-3 flex items-center gap-3">
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getCategoryColor(module.category)} bg-opacity-10 text-gray-700`}>
                {getCategoryLabel(module.category)}
              </span>
              <span className="text-xs text-gray-500">v{module.version}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-4 rounded-lg bg-red-50 text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">✕</button>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-lg bg-green-50 text-green-700 flex items-center justify-between">
          <span>{success}</span>
          <button onClick={() => setSuccess(null)} className="text-green-500 hover:text-green-700">✕</button>
        </div>
      )}

      {/* Schema-driven UI */}
      <SchemaRenderer
        schema={schema}
        settings={settings}
        data={moduleData}
        onSettingsChange={setSettings}
        onAction={handleAction}
        isExecutingAction={executingAction}
      />

      {/* Save Button */}
      {schema.fields && schema.fields.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-end gap-3">
            <a
              href="/app/modules"
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Annuler
            </a>
            <button
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </div>
      )}

      {/* Danger Zone */}
      {isModuleEnabled && (
        <div className="bg-white rounded-xl shadow-sm border border-red-200 p-6">
          <h2 className="text-lg font-semibold text-red-600 mb-2">Zone dangereuse</h2>
          <p className="text-sm text-gray-600 mb-4">
            La désactivation du module supprimera toutes ses données et configurations.
          </p>
          <button
            onClick={handleDeactivate}
            className="px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors"
          >
            Désactiver le module
          </button>
        </div>
      )}
    </div>
  );
}
