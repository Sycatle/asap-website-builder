import { useEffect, useState } from 'react';
import { websitesAPI, integrationsAPI, authAPI, type Website, type GitHubProject, type IntegrationConfig } from '../lib/api';

interface GitHubStats {
  totalProjects: number;
  totalStars: number;
  totalForks: number;
  languages: { [key: string]: number };
  lastSync: string | null;
}

export default function IntegrationsManager() {
  const [website, setWebsite] = useState<Website | null>(null);
  const [projects, setProjects] = useState<GitHubProject[]>([]);
  const [integrationConfig, setIntegrationConfig] = useState<IntegrationConfig>({});
  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [newGitHubUsername, setNewGitHubUsername] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [stats, setStats] = useState<GitHubStats | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Get current user
      const me = await authAPI.me();
      setUserId(me.id);

      // Get websites
      const websites = await websitesAPI.list();
      if (websites.length > 0) {
        const ws = websites[0];
        setWebsite(ws);
        
        // Extract GitHub projects from website data
        if (ws.data && ws.data.projects) {
          setProjects(ws.data.projects);
          calculateStats(ws.data.projects, ws.data.generated_at);
        }
      }

      // Get integration config
      const configResponse = await integrationsAPI.getConfig(me.id);
      setIntegrationConfig(configResponse.integrations || {});
      if (configResponse.integrations?.github?.username) {
        setNewGitHubUsername(configResponse.integrations.github.username);
      }
    } catch (error) {
      console.error('Failed to load integrations data:', error);
      setMessage({ type: 'error', text: 'Erreur lors du chargement des intégrations' });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateStats = (projects: GitHubProject[], generatedAt?: string) => {
    const languages: { [key: string]: number } = {};
    let totalStars = 0;
    let totalForks = 0;

    projects.forEach(project => {
      totalStars += project.stars;
      totalForks += project.forks;
      if (project.language) {
        languages[project.language] = (languages[project.language] || 0) + 1;
      }
    });

    setStats({
      totalProjects: projects.length,
      totalStars,
      totalForks,
      languages,
      lastSync: generatedAt || null,
    });
  };

  const handleUpdateGitHub = async () => {
    if (!userId || !newGitHubUsername.trim()) {
      setMessage({ type: 'error', text: 'Le nom d\'utilisateur GitHub est requis' });
      return;
    }

    setIsSyncing(true);
    setMessage(null);

    try {
      await integrationsAPI.updateGitHub(userId, { github_username: newGitHubUsername.trim() });
      setMessage({ type: 'success', text: 'Intégration GitHub mise à jour ! La synchronisation va démarrer automatiquement.' });
      setIsEditing(false);
      
      // Reload data after a delay to allow worker to process
      setTimeout(loadData, 5000);
    } catch (error) {
      console.error('Failed to update GitHub integration:', error);
      setMessage({ type: 'error', text: 'Erreur lors de la mise à jour de l\'intégration GitHub' });
    } finally {
      setIsSyncing(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getLanguageColor = (language: string): string => {
    const colors: { [key: string]: string } = {
      'TypeScript': 'bg-blue-500',
      'JavaScript': 'bg-yellow-400',
      'Python': 'bg-green-500',
      'Rust': 'bg-orange-600',
      'Go': 'bg-cyan-500',
      'PHP': 'bg-purple-500',
      'Java': 'bg-red-500',
      'C++': 'bg-pink-500',
      'C': 'bg-gray-600',
      'Ruby': 'bg-red-600',
      'Swift': 'bg-orange-500',
      'Kotlin': 'bg-violet-500',
    };
    return colors[language] || 'bg-gray-400';
  };

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
        <h1 className="text-3xl font-bold text-gray-900">Intégrations</h1>
        <p className="mt-2 text-gray-600">
          Connectez vos services externes pour enrichir votre portfolio
        </p>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}
        >
          {message.text}
        </div>
      )}

      {/* GitHub Integration Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-900 rounded-lg flex items-center justify-center">
                <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">GitHub</h2>
                <p className="text-sm text-gray-600">
                  Synchronisez vos repositories publics
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {integrationConfig.github?.username ? (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                  Connecté
                </span>
              ) : (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-600">
                  Non configuré
                </span>
              )}
            </div>
          </div>
        </div>

        {/* GitHub Config Section */}
        <div className="p-6 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Nom d'utilisateur GitHub</p>
              {isEditing ? (
                <div className="mt-2 flex items-center gap-3">
                  <input
                    type="text"
                    value={newGitHubUsername}
                    onChange={(e) => setNewGitHubUsername(e.target.value)}
                    placeholder="ex: Sycatle"
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                  <button
                    onClick={handleUpdateGitHub}
                    disabled={isSyncing}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSyncing ? 'Synchronisation...' : 'Sauvegarder'}
                  </button>
                  <button
                    onClick={() => {
                      setIsEditing(false);
                      setNewGitHubUsername(integrationConfig.github?.username || '');
                    }}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Annuler
                  </button>
                </div>
              ) : (
                <div className="mt-1 flex items-center gap-3">
                  <p className="text-gray-900">
                    {integrationConfig.github?.username || (
                      <span className="text-gray-400 italic">Non configuré</span>
                    )}
                  </p>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="text-sm text-primary-600 hover:text-primary-700"
                  >
                    {integrationConfig.github?.username ? 'Modifier' : 'Configurer'}
                  </button>
                </div>
              )}
            </div>
            {stats?.lastSync && (
              <div className="text-right">
                <p className="text-sm font-medium text-gray-700">Dernière synchronisation</p>
                <p className="text-sm text-gray-600">{formatDate(stats.lastSync)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Stats Section */}
        {stats && stats.totalProjects > 0 && (
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Statistiques</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-gray-900">{stats.totalProjects}</p>
                <p className="text-sm text-gray-600">Projets</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-yellow-600">{stats.totalStars}</p>
                <p className="text-sm text-gray-600">Stars</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-blue-600">{stats.totalForks}</p>
                <p className="text-sm text-gray-600">Forks</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-purple-600">{Object.keys(stats.languages).length}</p>
                <p className="text-sm text-gray-600">Langages</p>
              </div>
            </div>

            {/* Languages breakdown */}
            {Object.keys(stats.languages).length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Langages utilisés</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(stats.languages)
                    .sort((a, b) => b[1] - a[1])
                    .map(([lang, count]) => (
                      <span
                        key={lang}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm bg-gray-100"
                      >
                        <span className={`w-2 h-2 rounded-full ${getLanguageColor(lang)}`}></span>
                        {lang} ({count})
                      </span>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Projects List */}
        {projects.length > 0 && (
          <div className="p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Repositories synchronisés ({projects.length})
            </h3>
            <div className="space-y-3">
              {projects.map((project) => (
                <div
                  key={project.name}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <a
                        href={project.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-gray-900 hover:text-primary-600 truncate"
                      >
                        {project.name}
                      </a>
                      {project.language && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-gray-200">
                          <span className={`w-2 h-2 rounded-full ${getLanguageColor(project.language)}`}></span>
                          {project.language}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-gray-600 truncate">
                      {project.description || 'Pas de description'}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 ml-4">
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                      </svg>
                      {project.stars}
                    </div>
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
                      </svg>
                      {project.forks}
                    </div>
                    <a
                      href={project.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-gray-400 hover:text-gray-600"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                      </svg>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {projects.length === 0 && integrationConfig.github?.username && (
          <div className="p-12 text-center">
            <svg className="mx-auto w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
            </svg>
            <p className="mt-4 text-gray-600">
              La synchronisation est en cours... Revenez dans quelques instants.
            </p>
          </div>
        )}

        {/* Not configured state */}
        {!integrationConfig.github?.username && (
          <div className="p-12 text-center">
            <svg className="mx-auto w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"/>
            </svg>
            <p className="mt-4 text-gray-600">
              Configurez votre nom d'utilisateur GitHub pour synchroniser vos repositories.
            </p>
            <button
              onClick={() => setIsEditing(true)}
              className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
            >
              Configurer GitHub
            </button>
          </div>
        )}
      </div>

      {/* Future Integrations Placeholder */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Autres intégrations</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {/* LinkedIn */}
          <div className="p-4 border border-gray-200 rounded-lg opacity-60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">LinkedIn</h3>
                <p className="text-sm text-gray-500">Bientôt disponible</p>
              </div>
            </div>
          </div>

          {/* Twitter/X */}
          <div className="p-4 border border-gray-200 rounded-lg opacity-60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-black rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">X (Twitter)</h3>
                <p className="text-sm text-gray-500">Bientôt disponible</p>
              </div>
            </div>
          </div>

          {/* Dribbble */}
          <div className="p-4 border border-gray-200 rounded-lg opacity-60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-pink-500 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" clipRule="evenodd" d="M12 24C5.372 24 0 18.627 0 12S5.372 0 12 0s12 5.373 12 12-5.372 12-12 12zm9.885-11.441c-.354-.115-3.195-.95-6.435-.438 1.35 3.71 1.9 6.732 2.006 7.38A10.22 10.22 0 0021.885 12.56zm-2.965 8.452c-.153-.946-.765-4.09-2.205-7.864-.02.007-.04.012-.06.018-5.825 2.03-7.92 6.075-8.108 6.464A10.15 10.15 0 0012 22.11c1.62 0 3.15-.38 4.51-1.055l-.59-1.044zM5.19 18.142c.236-.42 3.065-5.315 8.383-7.115.134-.045.27-.085.406-.124-.26-.59-.54-1.18-.832-1.762-5.075 1.52-9.994 1.46-10.444 1.45-.002.136-.005.273-.005.41a10.15 10.15 0 002.492 7.14zM2.073 9.392c.46.007 4.59.046 9.352-1.278a66.125 66.125 0 00-3.752-5.85 10.17 10.17 0 00-5.6 7.128zm7.83-8.268a54.622 54.622 0 013.773 5.932c3.78-1.42 5.384-3.574 5.58-3.856A10.1 10.1 0 0012 1.89c-.74 0-1.462.08-2.158.232l.06.002zm10.122 3.45c-.235.31-2.043 2.63-5.986 4.266.225.46.44.93.64 1.404.07.166.135.333.2.5 3.454-.434 6.885.265 7.227.34-.022-2.42-.89-4.643-2.08-6.51z"/>
                </svg>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Dribbble</h3>
                <p className="text-sm text-gray-500">Bientôt disponible</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
