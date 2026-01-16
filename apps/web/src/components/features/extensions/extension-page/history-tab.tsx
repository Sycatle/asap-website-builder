import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import {
  History,
  RefreshCw,
  Settings,
  CheckCircle2,
  Power,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { HistoryTabProps, ChangelogEntry } from './types';

export function HistoryTab({ changelog }: HistoryTabProps) {
  const getIcon = (action: ChangelogEntry['action']) => {
    switch (action) {
      case 'sync': return <RefreshCw className="w-3.5 h-3.5" />;
      case 'settings_updated': return <Settings className="w-3.5 h-3.5" />;
      case 'enabled': return <CheckCircle2 className="w-3.5 h-3.5" />;
      case 'disabled': return <Power className="w-3.5 h-3.5" />;
      default: return <History className="w-3.5 h-3.5" />;
    }
  };

  if (changelog.length === 0) {
    return (
      <div className="text-center py-10">
        <History className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
        <h3 className="font-medium text-sm mb-1">Aucun historique</h3>
        <p className="text-xs text-muted-foreground">
          Les actions sur cette extension apparaîtront ici.
        </p>
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="divide-y">
          {changelog.map(entry => (
            <div key={entry.id} className="flex items-start gap-3 p-3">
              <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0 text-muted-foreground">
                {getIcon(entry.action)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm">{entry.description}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {formatDistanceToNow(new Date(entry.timestamp), { addSuffix: true, locale: fr })}
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
