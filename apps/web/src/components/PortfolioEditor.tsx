import { useEffect, useState } from 'react';
import { websitesAPI, authAPI, type Website, type UpdateWebsiteRequest } from '../lib/api';

export default function PortfolioEditor() {
  const [portfolio, setPortfolio] = useState<Website | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [tagline, setTagline] = useState('');
  const [githubUsername, setGithubUsername] = useState('');

  useEffect(() => {
    loadPortfolio();
  }, []);

  const loadPortfolio = async () => {
    try {
      const websites = await websitesAPI.list();
      if (websites.length > 0) {
        const p = websites[0];
        setPortfolio(p);
        setTitle(p.title || '');
        setTagline(p.tagline || '');
      }
    } catch (error) {
      console.error('Failed to load portfolio:', error);
      setMessage({ type: 'error', text: 'Erreur lors du chargement du portfolio' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!portfolio) return;

    setIsSaving(true);
    setMessage(null);

    try {
      const data: UpdateWebsiteRequest = { title, tagline };
      await websitesAPI.update(portfolio.id, data);
      setMessage({ type: 'success', text: 'Portfolio mis à jour avec succès !' });
      
      // Reload portfolio
      await loadPortfolio();
    } catch (error) {
      console.error('Failed to save portfolio:', error);
      setMessage({ type: 'error', text: 'Erreur lors de la sauvegarde' });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!portfolio) return;

    setIsSaving(true);
    setMessage(null);

    try {
      await websitesAPI.publish(portfolio.id);
      setMessage({ type: 'success', text: 'Portfolio publié avec succès !' });
      await loadPortfolio();
    } catch (error) {
      console.error('Failed to publish portfolio:', error);
      setMessage({ type: 'error', text: 'Erreur lors de la publication' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleGitHubConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!portfolio || !githubUsername.trim()) return;

    setIsSaving(true);
    setMessage(null);

    try {
      // Get user ID from token
      const token = localStorage.getItem('auth_token');
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        await authAPI.updateGitHubIntegration(payload.sub, {
          github_username: githubUsername.trim(),
        });
        setMessage({ type: 'success', text: 'GitHub connecté ! Vos projets seront synchronisés.' });
      }
    } catch (error) {
      console.error('Failed to connect GitHub:', error);
      setMessage({ type: 'error', text: 'Erreur lors de la connexion GitHub' });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!portfolio) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600">Aucun portfolio trouvé</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Mon Portfolio</h1>
          <p className="mt-2 text-gray-600">
            Personnalisez les informations de votre portfolio
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            portfolio.status === 'published' 
              ? 'bg-green-100 text-green-800' 
              : 'bg-yellow-100 text-yellow-800'
          }`}>
            {portfolio.status === 'published' ? '● Publié' : '○ Brouillon'}
          </span>
          {portfolio.status === 'draft' && (
            <button
              onClick={handlePublish}
              disabled={isSaving}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              Publier
            </button>
          )}
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg ${
          message.type === 'success' 
            ? 'bg-green-50 text-green-800 border border-green-200' 
            : 'bg-red-50 text-red-800 border border-red-200'
        }`}>
          {message.text}
        </div>
      )}

      {/* Portfolio Info Form */}
      <form onSubmit={handleSave} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6">Informations générales</h2>
        
        <div className="space-y-6">
          <div>
            <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-1">
              URL du portfolio
            </label>
            <div className="flex items-center gap-2">
              <span className="text-gray-500">asap.cool/</span>
              <input
                type="text"
                id="slug"
                value={portfolio.slug}
                disabled
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
              />
            </div>
            <p className="mt-1 text-sm text-gray-500">L'URL ne peut pas être modifiée</p>
          </div>

          <div>
            <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
              Titre
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Votre nom ou titre"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <label htmlFor="tagline" className="block text-sm font-medium text-gray-700 mb-1">
              Tagline
            </label>
            <input
              type="text"
              id="tagline"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="Développeur Full Stack | Designer | ..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 transition-colors"
            >
              {isSaving ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </div>
      </form>

      {/* GitHub Integration */}
      <form onSubmit={handleGitHubConnect} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <svg className="w-8 h-8" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
          <h2 className="text-lg font-semibold text-gray-900">Intégration GitHub</h2>
        </div>
        
        <p className="text-gray-600 mb-4">
          Connectez votre compte GitHub pour afficher automatiquement vos projets sur votre portfolio.
        </p>

        <div className="flex gap-3">
          <input
            type="text"
            value={githubUsername}
            onChange={(e) => setGithubUsername(e.target.value)}
            placeholder="Votre nom d'utilisateur GitHub"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
          <button
            type="submit"
            disabled={isSaving || !githubUsername.trim()}
            className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            Connecter
          </button>
        </div>
      </form>

      {/* Preview Link */}
      <div className="bg-gradient-to-r from-primary-50 to-purple-50 rounded-lg p-6 border border-primary-100">
        <h3 className="font-semibold text-gray-900 mb-2">Prévisualiser votre portfolio</h3>
        <p className="text-gray-600 mb-4">
          Voyez à quoi ressemble votre portfolio pour les visiteurs.
        </p>
        <a
          href={`/${portfolio.slug}`}
          target="_blank"
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
          </svg>
          Ouvrir le portfolio
        </a>
      </div>
    </div>
  );
}
