import { useState } from 'react';
import type { 
  ConfigSchema, 
  ConfigField, 
  ConfigAction, 
  DataDisplay,
  DataDisplayField 
} from '../lib/api/modules';

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
          <div key={display.source} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            {display.title && (
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{display.title}</h3>
            )}
            <div className="text-center py-8">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="mt-4 text-gray-500">{display.emptyMessage}</p>
            </div>
          </div>
        );
      }
      return null;
    }

    switch (display.type) {
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
          <div key={display.source} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            {display.title && (
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                {display.title}
                <span className="ml-2 text-sm font-normal text-gray-500">
                  ({Array.isArray(sourceData) ? sourceData.length : 0})
                </span>
              </h3>
            )}
            <div className="space-y-3">
              {Array.isArray(sourceData) && sourceData.map((item: any, index: number) => (
                <div 
                  key={index} 
                  className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 hover:shadow-sm transition-all"
                >
                  {display.fields?.map((field) => renderDataField(field, item))}
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
      'TypeScript': 'bg-blue-100 text-blue-700',
      'JavaScript': 'bg-yellow-100 text-yellow-700',
      'Python': 'bg-green-100 text-green-700',
      'Rust': 'bg-orange-100 text-orange-700',
      'Go': 'bg-cyan-100 text-cyan-700',
      'active': 'bg-green-100 text-green-700',
      'inactive': 'bg-gray-100 text-gray-700',
      'pending': 'bg-yellow-100 text-yellow-700',
      'error': 'bg-red-100 text-red-700',
    };
    return colors[value] || 'bg-gray-100 text-gray-700';
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
