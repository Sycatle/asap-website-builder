import { useEffect, useState } from 'react';
import { portfoliosAPI, filesAPI, type Portfolio, type QuotaUsage } from '../lib/api';
import { formatBytes } from '../lib/utils/formatters';

export default function Dashboard() {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [quota, setQuota] = useState<QuotaUsage | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const portfolios = await portfoliosAPI.list();
        if (portfolios.length > 0) {
          setPortfolio(portfolios[0]);
        }
        
        const quotaData = await filesAPI.getQuota();
        setQuota(quotaData);
      } catch (error) {
        console.error('Failed to load data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Bienvenue ! 👋
        </h1>
        <p className="mt-2 text-gray-600">
          Gérez votre portfolio et vos fichiers depuis un seul endroit
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        {/* Portfolio Status */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Portfolio</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {portfolio?.status === 'published' ? (
                  <span className="text-green-600">Publié</span>
                ) : (
                  <span className="text-yellow-600">Brouillon</span>
                )}
              </p>
            </div>
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
              </svg>
            </div>
          </div>
          <div className="mt-4">
            <a
              href="/app/portfolio"
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              Gérer le portfolio →
            </a>
          </div>
        </div>

        {/* Storage Quota */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Stockage</p>
              <p className="mt-2 text-3xl font-bold text-gray-900">
                {quota ? `${quota.used_percentage.toFixed(0)}%` : '0%'}
              </p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"/>
              </svg>
            </div>
          </div>
          <div className="mt-2">
            <p className="text-sm text-gray-600">
              {quota ? formatBytes(quota.used_bytes) : '0 Bytes'} / {quota ? formatBytes(quota.total_bytes) : '1 GB'}
            </p>
          </div>
          <div className="mt-4">
            <a
              href="/app/files"
              className="text-sm text-primary-600 hover:text-primary-700 font-medium"
            >
              Gérer les fichiers →
            </a>
          </div>
        </div>

        {/* Portfolio URL */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">URL publique</p>
              <p className="mt-2 text-lg font-semibold text-gray-900 truncate">
                {portfolio?.slug || 'N/A'}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"/>
              </svg>
            </div>
          </div>
          <div className="mt-4">
            {portfolio && (
              <a
                href={`/${portfolio.slug}`}
                target="_blank"
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                Voir le portfolio →
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions rapides</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <a
            href="/app/portfolio"
            className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
          >
            <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/>
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Éditer mon portfolio</h3>
              <p className="text-sm text-gray-600">Mettre à jour les informations</p>
            </div>
          </a>

          <a
            href="/app/files"
            className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:border-primary-300 hover:bg-primary-50 transition-colors"
          >
            <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-gray-900">Upload des fichiers</h3>
              <p className="text-sm text-gray-600">Ajouter des images et documents</p>
            </div>
          </a>
        </div>
      </div>

      {/* Portfolio Info */}
      {portfolio && (
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Informations du portfolio</h2>
          <dl className="grid md:grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-600">Titre</dt>
              <dd className="mt-1 text-sm text-gray-900">{portfolio.title || 'Non défini'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-600">Tagline</dt>
              <dd className="mt-1 text-sm text-gray-900">{portfolio.tagline || 'Non défini'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-600">Slug</dt>
              <dd className="mt-1 text-sm text-gray-900">{portfolio.slug}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-600">Statut</dt>
              <dd className="mt-1">
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  portfolio.status === 'published' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {portfolio.status === 'published' ? 'Publié' : 'Brouillon'}
                </span>
              </dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}
