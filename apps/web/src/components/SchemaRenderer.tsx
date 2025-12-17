import { useState } from 'react';
import type { 
  ConfigSchema, 
  ConfigField, 
  ConfigAction, 
  DataDisplay,
  DataDisplayField 
} from '../lib/api/extensions';

interface SchemaRendererProps {
  schema: ConfigSchema;
  settings: Record<string, any>;
  data?: Record<string, any>;
  onSettingsChange: (settings: Record<string, any>) => void;
  onAction: (actionKey: string) => Promise<void>;
  isExecutingAction?: string | null;
}

export default function SchemaRenderer({
  schema,
  settings,
  data = {},
  onSettingsChange,
  onAction,
  isExecutingAction,
}: SchemaRendererProps) {
  const [pendingConfirm, setPendingConfirm] = useState<string | null>(null);

  // Handle field value change
  const handleFieldChange = (key: string, value: any) => {
    onSettingsChange({
      ...settings,
      [key]: value,
    });
  };

  // Handle action execution with optional confirmation
  const handleAction = async (action: ConfigAction) => {
    if (action.confirm && pendingConfirm !== action.key) {
      setPendingConfirm(action.key);
      return;
    }
    setPendingConfirm(null);
    await onAction(action.key);
  };

  // Render a single field based on its type
  const renderField = (field: ConfigField) => {
    const value = settings[field.key] ?? field.default ?? '';
    const fieldId = `field-${field.key}`;

    const baseInputClass = "block w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500";

    switch (field.type) {
      case 'boolean':
        return (
          <div key={field.key} className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
            <div className="flex-1">
              <label htmlFor={fieldId} className="text-sm font-medium text-gray-900">
                {field.label}
              </label>
              {field.description && (
                <p className="text-xs text-gray-500 mt-0.5">{field.description}</p>
              )}
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={!!value}
              onClick={() => handleFieldChange(field.key, !value)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${
                value ? 'bg-primary-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  value ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        );

      case 'select':
        return (
          <div key={field.key} className="py-4 border-b border-gray-100 last:border-0">
            <label htmlFor={fieldId} className="block text-sm font-medium text-gray-900 mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {field.description && (
              <p className="text-xs text-gray-500 mb-2">{field.description}</p>
            )}
            <select
              id={fieldId}
              value={value}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
              className={baseInputClass}
            >
              <option value="">Sélectionner...</option>
              {field.options?.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        );

      case 'textarea':
        return (
          <div key={field.key} className="py-4 border-b border-gray-100 last:border-0">
            <label htmlFor={fieldId} className="block text-sm font-medium text-gray-900 mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {field.description && (
              <p className="text-xs text-gray-500 mb-2">{field.description}</p>
            )}
            <textarea
              id={fieldId}
              value={value}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
              placeholder={field.placeholder}
              rows={4}
              className={baseInputClass}
            />
          </div>
        );

      case 'number':
        return (
          <div key={field.key} className="py-4 border-b border-gray-100 last:border-0">
            <label htmlFor={fieldId} className="block text-sm font-medium text-gray-900 mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {field.description && (
              <p className="text-xs text-gray-500 mb-2">{field.description}</p>
            )}
            <input
              type="number"
              id={fieldId}
              value={value}
              onChange={(e) => handleFieldChange(field.key, parseFloat(e.target.value) || 0)}
              placeholder={field.placeholder}
              min={field.validation?.min}
              max={field.validation?.max}
              className={baseInputClass}
            />
          </div>
        );

      case 'color':
        return (
          <div key={field.key} className="py-4 border-b border-gray-100 last:border-0">
            <label htmlFor={fieldId} className="block text-sm font-medium text-gray-900 mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {field.description && (
              <p className="text-xs text-gray-500 mb-2">{field.description}</p>
            )}
            <div className="flex items-center gap-3">
              <input
                type="color"
                id={fieldId}
                value={value || '#000000'}
                onChange={(e) => handleFieldChange(field.key, e.target.value)}
                className="h-10 w-14 rounded border border-gray-300 cursor-pointer"
              />
              <input
                type="text"
                value={value || ''}
                onChange={(e) => handleFieldChange(field.key, e.target.value)}
                placeholder="#000000"
                className={`${baseInputClass} flex-1`}
              />
            </div>
          </div>
        );

      // Default: text, email, url, password, date
      default:
        return (
          <div key={field.key} className="py-4 border-b border-gray-100 last:border-0">
            <label htmlFor={fieldId} className="block text-sm font-medium text-gray-900 mb-1">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {field.description && (
              <p className="text-xs text-gray-500 mb-2">{field.description}</p>
            )}
            <input
              type={field.type}
              id={fieldId}
              value={value}
              onChange={(e) => handleFieldChange(field.key, e.target.value)}
              placeholder={field.placeholder}
              className={baseInputClass}
            />
          </div>
        );
    }
  };

  // Render an action button
  const renderAction = (action: ConfigAction) => {
    const isExecuting = isExecutingAction === action.key;
    const isPendingConfirm = pendingConfirm === action.key;

    const styleClasses = {
      primary: 'text-white bg-primary-600 hover:bg-primary-700',
      secondary: 'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50',
      danger: 'text-white bg-red-600 hover:bg-red-700',
    };

    const buttonClass = styleClasses[action.style || 'primary'];

    if (isPendingConfirm) {
      return (
        <div key={action.key} className="flex items-center gap-2">
          <span className="text-sm text-gray-600">{action.confirm}</span>
          <button
            onClick={() => handleAction(action)}
            className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
          >
            Confirmer
          </button>
          <button
            onClick={() => setPendingConfirm(null)}
            className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Annuler
          </button>
        </div>
      );
    }

    return (
      <button
        key={action.key}
        onClick={() => handleAction(action)}
        disabled={isExecuting}
        className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${buttonClass}`}
      >
        {isExecuting && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        {action.label}
      </button>
    );
  };

  // Render data display (list, table, stats)
  const renderDataDisplay = (display: DataDisplay) => {
    const sourceData = data[display.source];
    
    if (!sourceData || (Array.isArray(sourceData) && sourceData.length === 0)) {
      if (display.emptyMessage) {
        return (
          <div key={display.source}>
            {display.title && (
              <h3 className="text-base font-semibold text-gray-900 mb-4">{display.title}</h3>
            )}
            <div className="text-center py-12 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50">
              <div className="w-12 h-12 mx-auto bg-gray-100 rounded-full flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <p className="text-sm text-gray-500 max-w-sm mx-auto">{display.emptyMessage}</p>
            </div>
          </div>
        );
      }
      return null;
    }

    switch (display.type) {
      case 'profile':
        // GitHub profile display
        return (
          <div key={display.source} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6">
              <div className="flex items-start gap-5">
                {/* Avatar */}
                {sourceData.avatar_url && (
                  <img 
                    src={sourceData.avatar_url} 
                    alt={sourceData.name || sourceData.username}
                    className="w-20 h-20 rounded-full ring-4 ring-gray-100 flex-shrink-0"
                  />
                )}
                <div className="flex-1 min-w-0">
                  {/* Name & Username */}
                  <div className="mb-3">
                    {sourceData.name && (
                      <h3 className="text-xl font-bold text-gray-900">{sourceData.name}</h3>
                    )}
                    {sourceData.username && (
                      <a 
                        href={sourceData.url || `https://github.com/${sourceData.username}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-gray-500 hover:text-primary-600"
                      >
                        @{sourceData.username}
                      </a>
                    )}
                  </div>
                  {/* Bio */}
                  {sourceData.bio && (
                    <p className="text-sm text-gray-600 mb-4">{sourceData.bio}</p>
                  )}
                  {/* Meta info */}
                  <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                    {sourceData.company && (
                      <span className="inline-flex items-center gap-1.5">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        {sourceData.company}
                      </span>
                    )}
                    {sourceData.location && (
                      <span className="inline-flex items-center gap-1.5">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        {sourceData.location}
                      </span>
                    )}
                    {sourceData.blog && (
                      <a 
                        href={sourceData.blog.startsWith('http') ? sourceData.blog : `https://${sourceData.blog}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 hover:text-primary-600"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                        {sourceData.blog.replace(/^https?:\/\//, '')}
                      </a>
                    )}
                    {sourceData.twitter && (
                      <a 
                        href={`https://twitter.com/${sourceData.twitter}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 hover:text-primary-600"
                      >
                        <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                        @{sourceData.twitter}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
            {/* Stats bar */}
            <div className="bg-gray-50 px-6 py-4 flex items-center justify-around border-t border-gray-100">
              <div className="text-center">
                <div className="text-xl font-bold text-gray-900">{sourceData.public_repos ?? 0}</div>
                <div className="text-xs text-gray-500">Repos</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-gray-900">{sourceData.followers ?? 0}</div>
                <div className="text-xs text-gray-500">Followers</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-gray-900">{sourceData.following ?? 0}</div>
                <div className="text-xs text-gray-500">Following</div>
              </div>
            </div>
          </div>
        );

      case 'avatarList':
        // Organizations / avatar list display
        return (
          <div key={display.source}>
            {display.title && (
              <h3 className="text-base font-semibold text-gray-900 mb-4">{display.title}</h3>
            )}
            <div className="flex flex-wrap gap-3">
              {Array.isArray(sourceData) && sourceData.map((item: any, index: number) => (
                <div 
                  key={index}
                  className="group flex items-center gap-3 bg-white border border-gray-200 rounded-xl p-3 hover:border-primary-300 hover:shadow-sm transition-all"
                  title={item.description || item.name}
                >
                  {item.avatar_url && (
                    <img 
                      src={item.avatar_url} 
                      alt={item.name}
                      className="w-10 h-10 rounded-lg"
                    />
                  )}
                  <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">
                    {item.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );

      case 'stats':
        return (
          <div key={display.source} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            {display.title && (
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{display.title}</h3>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {display.stats?.map((stat) => (
                <div key={stat.key} className="text-center p-4 bg-gray-50 rounded-lg">
                  <div className="text-2xl font-bold text-gray-900">
                    {sourceData[stat.key] ?? 0}
                  </div>
                  <div className="text-sm text-gray-500">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'list':
        return (
          <div key={display.source}>
            {display.title && (
              <h3 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
                {display.title}
                <span className="px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-600 rounded-full">
                  {Array.isArray(sourceData) ? sourceData.length : 0}
                </span>
              </h3>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.isArray(sourceData) && sourceData.map((item: any, index: number) => (
                <div 
                  key={index} 
                  className="group flex flex-col bg-white border border-gray-200 rounded-xl p-4 hover:border-primary-300 hover:shadow-md transition-all"
                >
                  {/* Header with name */}
                  <div className="flex items-start gap-3 mb-3">
                    {/* Repo icon */}
                    <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500 flex-shrink-0">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      {/* Title/Link */}
                      {display.fields?.filter(f => f.type === 'link').map((field) => {
                        const value = item[field.key];
                        const url = field.linkKey ? item[field.linkKey] : null;
                        return url ? (
                          <a 
                            key={field.key}
                            href={url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-sm font-semibold text-gray-900 hover:text-primary-600 transition-colors line-clamp-1"
                          >
                            {value}
                          </a>
                        ) : (
                          <span key={field.key} className="text-sm font-semibold text-gray-900 line-clamp-1">{value}</span>
                        );
                      })}
                      {/* Language badge inline */}
                      {display.fields?.filter(f => f.type === 'badge').map((field) => {
                        const value = item[field.key];
                        if (!value) return null;
                        const colorClass = field.colorKey ? getBadgeColor(item[field.colorKey]) : 'bg-gray-100 text-gray-700';
                        return (
                          <span key={field.key} className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium mt-1 ${colorClass}`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70"></span>
                            {value}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                  
                  {/* Description */}
                  <div className="flex-1">
                    {display.fields?.filter(f => f.type === 'text').map((field) => {
                      const value = item[field.key];
                      return (
                        <p key={field.key} className="text-xs text-gray-500 line-clamp-2 min-h-[2.5rem]">
                          {value && value !== 'No description' ? value : 'Aucune description'}
                        </p>
                      );
                    })}
                  </div>
                  
                  {/* Footer with stats */}
                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100">
                    {display.fields?.filter(f => f.type === 'number').map((field) => {
                      const value = item[field.key];
                      if (value === undefined || value === null) return null;
                      const icon = field.key === 'stars' ? (
                        <svg className="w-4 h-4 text-amber-500" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                        </svg>
                      ) : field.key === 'forks' ? (
                        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
                        </svg>
                      ) : null;
                      return (
                        <span key={field.key} className="inline-flex items-center gap-1 text-xs text-gray-500">
                          {icon}
                          <span className="font-medium">{typeof value === 'number' ? value.toLocaleString() : value}</span>
                        </span>
                      );
                    })}
                    {/* External link */}
                    {display.fields?.filter(f => f.type === 'link').map((field) => {
                      const url = field.linkKey ? item[field.linkKey] : null;
                      return url ? (
                        <a 
                          key={`${field.key}-link`}
                          href={url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="ml-auto text-gray-400 hover:text-primary-600 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </a>
                      ) : null;
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'table':
        return (
          <div key={display.source} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            {display.title && (
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-900">{display.title}</h3>
              </div>
            )}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {display.fields?.map((field) => (
                      <th key={field.key} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {field.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {Array.isArray(sourceData) && sourceData.map((item: any, index: number) => (
                    <tr key={index} className="hover:bg-gray-50">
                      {display.fields?.map((field) => (
                        <td key={field.key} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {renderDataFieldValue(field, item)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Render a single data field in a list item
  const renderDataField = (field: DataDisplayField, item: any) => {
    const value = item[field.key];
    
    if (field.type === 'link' && field.linkKey) {
      return (
        <a 
          key={field.key}
          href={item[field.linkKey]} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-base font-medium text-gray-900 hover:text-primary-600"
        >
          {value}
        </a>
      );
    }

    if (field.type === 'badge') {
      const colorClass = field.colorKey ? getBadgeColor(item[field.colorKey]) : 'bg-gray-100 text-gray-700';
      return (
        <span key={field.key} className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colorClass}`}>
          {value}
        </span>
      );
    }

    if (field.type === 'date' && value) {
      return (
        <span key={field.key} className="text-sm text-gray-500">
          {new Date(value).toLocaleDateString('fr-FR')}
        </span>
      );
    }

    if (field.type === 'number') {
      return (
        <span key={field.key} className="text-sm text-gray-600">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </span>
      );
    }

    return (
      <span key={field.key} className="text-sm text-gray-600">
        {value}
      </span>
    );
  };

  // Render data field value for table cells
  const renderDataFieldValue = (field: DataDisplayField, item: any) => {
    const value = item[field.key];

    if (field.type === 'link' && field.linkKey) {
      return (
        <a href={item[field.linkKey]} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:underline">
          {value}
        </a>
      );
    }

    if (field.type === 'badge') {
      const colorClass = field.colorKey ? getBadgeColor(item[field.colorKey]) : 'bg-gray-100 text-gray-700';
      return (
        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colorClass}`}>
          {value}
        </span>
      );
    }

    if (field.type === 'date' && value) {
      return new Date(value).toLocaleDateString('fr-FR');
    }

    return value;
  };

  // Get badge color based on value
  const getBadgeColor = (value: string): string => {
    const colors: Record<string, string> = {
      // Programming languages
      'TypeScript': 'bg-blue-100 text-blue-700',
      'JavaScript': 'bg-yellow-100 text-yellow-800',
      'Python': 'bg-emerald-100 text-emerald-700',
      'Rust': 'bg-orange-100 text-orange-700',
      'Go': 'bg-cyan-100 text-cyan-700',
      'Ruby': 'bg-red-100 text-red-700',
      'PHP': 'bg-indigo-100 text-indigo-700',
      'Java': 'bg-red-100 text-red-800',
      'C#': 'bg-purple-100 text-purple-700',
      'C++': 'bg-pink-100 text-pink-700',
      'C': 'bg-slate-100 text-slate-700',
      'Swift': 'bg-orange-100 text-orange-600',
      'Kotlin': 'bg-violet-100 text-violet-700',
      'Dart': 'bg-sky-100 text-sky-700',
      'Shell': 'bg-lime-100 text-lime-700',
      'HTML': 'bg-orange-100 text-orange-600',
      'CSS': 'bg-blue-100 text-blue-600',
      'Vue': 'bg-emerald-100 text-emerald-600',
      'Svelte': 'bg-orange-100 text-orange-600',
      // Status
      'active': 'bg-green-100 text-green-700',
      'inactive': 'bg-gray-100 text-gray-700',
      'pending': 'bg-yellow-100 text-yellow-700',
      'error': 'bg-red-100 text-red-700',
    };
    return colors[value] || 'bg-gray-100 text-gray-600';
  };

  // Group fields by sections if defined
  const renderFields = () => {
    if (!schema.fields || schema.fields.length === 0) {
      return null;
    }

    if (schema.sections && schema.sections.length > 0) {
      return schema.sections.map((section) => {
        const sectionFields = schema.fields?.filter(f => section.fields.includes(f.key)) || [];
        if (sectionFields.length === 0) return null;

        return (
          <div key={section.key} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">{section.title}</h3>
            {section.description && (
              <p className="text-sm text-gray-500 mb-4">{section.description}</p>
            )}
            <div className="divide-y divide-gray-100">
              {sectionFields.map(renderField)}
            </div>
          </div>
        );
      });
    }

    // No sections defined, render all fields in one card
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuration</h3>
        <div className="divide-y divide-gray-100">
          {schema.fields.map(renderField)}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Actions bar */}
      {schema.actions && schema.actions.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
          <div className="flex flex-wrap gap-3">
            {schema.actions.map(renderAction)}
          </div>
        </div>
      )}

      {/* Data displays */}
      {schema.dataDisplay?.map(renderDataDisplay)}

      {/* Configuration fields */}
      {renderFields()}
    </div>
  );
}
