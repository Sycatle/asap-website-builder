import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { WebsiteExtension } from '@/lib/api';
import { useWebsitesQuery, useWebsiteExtensionsQuery } from '@/lib/query';
import { ExtensionIcon } from '@/lib/extension-icons';

export default function DynamicSidebar() {
  const { t } = useTranslation(['dashboard']);
  
  // Use React Query hooks for real-time updates - when extensions change elsewhere, sidebar updates automatically
  const { data: websites = [], isLoading: websitesLoading } = useWebsitesQuery();
  const currentWebsiteId = websites.length > 0 ? websites[0].id : null;
  const { data: allExtensions = [], isLoading: extensionsLoading } = useWebsiteExtensionsQuery(currentWebsiteId);
  
  // Filter to get only enabled extensions
  const extensions = useMemo(() => 
    allExtensions.filter(m => m.enabled), 
    [allExtensions]
  );

  const loading = websitesLoading || extensionsLoading;

  // Don't render anything if loading or no extensions
  if (loading || extensions.length === 0) {
    return null;
  }

  return (
    <div className="mt-4">
      <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {t('dashboard:extensions.title')}
      </div>
      <nav className="space-y-1">
        {extensions.map((extension) => (
          <a
            key={extension.id}
            href={`/extensions/${extension.extension_slug}`}
            className="flex items-center gap-3 px-4 py-2 text-foreground rounded-lg hover:bg-muted transition-colors"
          >
            <span className="text-muted-foreground">
              <ExtensionIcon icon={extension.icon} slug={extension.extension_slug} size="sm" />
            </span>
            <span>{extension.extension_name}</span>
          </a>
        ))}
      </nav>
    </div>
  );
}
