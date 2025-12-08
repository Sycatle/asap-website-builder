import { useEffect, useState, useRef } from 'react';
import { filesAPI, type FileMetadata, type QuotaUsage } from '../lib/api';
import { formatBytes } from '../lib/utils/formatters';

type ViewMode = 'grid' | 'list';

export default function CloudManager() {
  const [files, setFiles] = useState<FileMetadata[]>([]);
  const [quota, setQuota] = useState<QuotaUsage | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [previewFile, setPreviewFile] = useState<FileMetadata | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:3000/api';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [filesData, quotaData] = await Promise.all([
        filesAPI.list(),
        filesAPI.getQuota(),
      ]);
      setFiles(filesData);
      setQuota(quotaData);
    } catch (error) {
      console.error('Failed to load data:', error);
      setMessage({ type: 'error', text: 'Erreur lors du chargement des fichiers' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setMessage(null);

    try {
      await filesAPI.upload(file);
      setMessage({ type: 'success', text: `${file.name} uploadé avec succès !` });
      await loadData();
    } catch (error) {
      console.error('Failed to upload file:', error);
      setMessage({ type: 'error', text: 'Erreur lors de l\'upload' });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDelete = async (fileId: string, filename: string) => {
    if (!confirm(`Supprimer ${filename} ?`)) return;

    try {
      await filesAPI.delete(fileId);
      setMessage({ type: 'success', text: 'Fichier supprimé' });
      setPreviewFile(null);
      await loadData();
    } catch (error) {
      console.error('Failed to delete file:', error);
      setMessage({ type: 'error', text: 'Erreur lors de la suppression' });
    }
  };

  const getFileUrl = (fileId: string) => {
    const token = localStorage.getItem('auth_token');
    return `${API_URL}/files/${fileId}?token=${token}`;
  };

  const isImage = (mimeType: string) => mimeType.startsWith('image/');
  const isVideo = (mimeType: string) => mimeType.startsWith('video/');
  const isAudio = (mimeType: string) => mimeType.startsWith('audio/');
  const isMedia = (mimeType: string) => isImage(mimeType) || isVideo(mimeType) || isAudio(mimeType);

  const getFileIcon = (mimeType: string, size: 'sm' | 'lg' = 'sm') => {
    const sizeClass = size === 'lg' ? 'w-16 h-16' : 'w-8 h-8';
    
    if (isImage(mimeType)) {
      return (
        <svg className={`${sizeClass} text-purple-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/>
        </svg>
      );
    }
    if (mimeType === 'application/pdf') {
      return (
        <svg className={`${sizeClass} text-red-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"/>
        </svg>
      );
    }
    if (isVideo(mimeType)) {
      return (
        <svg className={`${sizeClass} text-blue-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"/>
        </svg>
      );
    }
    if (isAudio(mimeType)) {
      return (
        <svg className={`${sizeClass} text-green-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/>
        </svg>
      );
    }
    return (
      <svg className={`${sizeClass} text-gray-500`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
      </svg>
    );
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Cloud</h1>
          <p className="mt-2 text-gray-600">
            Gérez vos fichiers et médias
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
              title="Vue grille"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/>
              </svg>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white shadow-sm' : 'hover:bg-gray-200'}`}
              title="Vue liste"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16"/>
              </svg>
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            onChange={handleUpload}
            className="hidden"
            id="file-upload"
          />
          <label
            htmlFor="file-upload"
            className={`inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 cursor-pointer transition-colors ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isUploading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                Upload en cours...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
                </svg>
                Upload
              </>
            )}
          </label>
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

      {/* Quota Card */}
      {quota && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Espace de stockage</h2>
            <span className="text-sm text-gray-600">
              {formatBytes(quota.total_size_used)} / {formatBytes(quota.quota_limit)}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className={`h-3 rounded-full transition-all ${
                quota.usage_percentage > 90 ? 'bg-red-500' : 
                quota.usage_percentage > 70 ? 'bg-yellow-500' : 'bg-primary-600'
              }`}
              style={{ width: `${Math.min(quota.usage_percentage, 100)}%` }}
            ></div>
          </div>
          <p className="mt-2 text-sm text-gray-600">
            {quota.usage_percentage.toFixed(1)}% utilisé · {formatBytes(quota.remaining)} restant
          </p>
        </div>
      )}

      {/* Files */}
      {files.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <svg className="mx-auto h-16 w-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/>
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">Aucun fichier</h3>
          <p className="mt-2 text-gray-600">Commencez par uploader votre premier fichier</p>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid View */
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {files.map((file) => (
            <div
              key={file.id}
              className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => setPreviewFile(file)}
            >
              {/* Preview Thumbnail */}
              <div className="aspect-square bg-gray-100 relative overflow-hidden">
                {isImage(file.mime_type) ? (
                  <img
                    src={getFileUrl(file.id)}
                    alt={file.filename}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      // Fallback to icon if image fails to load
                      (e.target as HTMLImageElement).style.display = 'none';
                      (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                ) : null}
                {isVideo(file.mime_type) ? (
                  <div className="w-full h-full flex items-center justify-center bg-gray-900">
                    <svg className="w-16 h-16 text-white opacity-80" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  </div>
                ) : null}
                {!isImage(file.mime_type) && !isVideo(file.mime_type) && (
                  <div className="w-full h-full flex items-center justify-center">
                    {getFileIcon(file.mime_type, 'lg')}
                  </div>
                )}
                {/* Fallback icon for failed images */}
                <div className="hidden absolute inset-0 bg-gray-100 items-center justify-center" style={{ display: 'none' }}>
                  {getFileIcon(file.mime_type, 'lg')}
                </div>
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center">
                  <svg className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                  </svg>
                </div>
              </div>
              {/* File Info */}
              <div className="p-3">
                <p className="text-sm font-medium text-gray-900 truncate" title={file.filename}>
                  {file.filename}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {formatBytes(file.size_bytes)}
                </p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* List View */
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fichier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Taille
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {files.map((file) => (
                <tr key={file.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => setPreviewFile(file)}>
                      {isImage(file.mime_type) ? (
                        <img
                          src={getFileUrl(file.id)}
                          alt={file.filename}
                          className="w-10 h-10 rounded object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        getFileIcon(file.mime_type)
                      )}
                      <span className="text-sm font-medium text-gray-900 truncate max-w-xs hover:text-primary-600">
                        {file.filename}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-600">{file.mime_type}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-600">{formatBytes(file.size_bytes)}</span>
                    {file.compressed_size_bytes < file.size_bytes && (
                      <span className="ml-2 text-xs text-green-600">
                        ({Math.round((1 - file.compressed_size_bytes / file.size_bytes) * 100)}% compressé)
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-gray-600">
                      {new Date(file.uploaded_at).toLocaleDateString('fr-FR')}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right space-x-3">
                    <button
                      onClick={() => setPreviewFile(file)}
                      className="text-primary-600 hover:text-primary-800 text-sm font-medium"
                    >
                      Voir
                    </button>
                    <button
                      onClick={() => handleDelete(file.id, file.filename)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Supprimer
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Preview Modal */}
      {previewFile && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setPreviewFile(null)}
        >
          <div 
            className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900 truncate pr-4">{previewFile.filename}</h3>
              <button
                onClick={() => setPreviewFile(null)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-4 bg-gray-100 flex items-center justify-center min-h-[300px] max-h-[60vh] overflow-auto">
              {isImage(previewFile.mime_type) && (
                <img
                  src={getFileUrl(previewFile.id)}
                  alt={previewFile.filename}
                  className="max-w-full max-h-full object-contain rounded"
                />
              )}
              {isVideo(previewFile.mime_type) && (
                <video
                  src={getFileUrl(previewFile.id)}
                  controls
                  className="max-w-full max-h-full rounded"
                >
                  Votre navigateur ne supporte pas la lecture vidéo.
                </video>
              )}
              {isAudio(previewFile.mime_type) && (
                <div className="text-center">
                  {getFileIcon(previewFile.mime_type, 'lg')}
                  <audio
                    src={getFileUrl(previewFile.id)}
                    controls
                    className="mt-4"
                  >
                    Votre navigateur ne supporte pas la lecture audio.
                  </audio>
                </div>
              )}
              {!isMedia(previewFile.mime_type) && (
                <div className="text-center">
                  {getFileIcon(previewFile.mime_type, 'lg')}
                  <p className="mt-4 text-gray-600">Aperçu non disponible pour ce type de fichier</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-gray-200 bg-white">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-600 space-y-1">
                  <p><strong>Type:</strong> {previewFile.mime_type}</p>
                  <p><strong>Taille:</strong> {formatBytes(previewFile.size_bytes)}
                    {previewFile.compressed_size_bytes < previewFile.size_bytes && (
                      <span className="text-green-600 ml-2">
                        (compressé: {formatBytes(previewFile.compressed_size_bytes)})
                      </span>
                    )}
                  </p>
                  <p><strong>Date:</strong> {new Date(previewFile.uploaded_at).toLocaleString('fr-FR')}</p>
                </div>
                <div className="flex gap-3">
                  <a
                    href={getFileUrl(previewFile.id)}
                    download={previewFile.filename}
                    className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
                  >
                    Télécharger
                  </a>
                  <button
                    onClick={() => handleDelete(previewFile.id, previewFile.filename)}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Supprimer
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
