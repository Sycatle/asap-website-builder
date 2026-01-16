import React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Settings,
  Zap,
  RefreshCw,
  Play,
  Loader2,
} from 'lucide-react';
import SchemaRenderer from '@/components/schema-renderer';
import type { SettingsTabProps, ActionsTabProps } from './types';

export function SettingsTab({ schema, settings, onSettingsChange }: SettingsTabProps) {
  if (!schema.fields || schema.fields.length === 0) {
    return (
      <div className="text-center py-10">
        <Settings className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
        <h3 className="font-medium text-sm mb-1">Aucune configuration</h3>
        <p className="text-xs text-muted-foreground">
          Cette extension ne nécessite pas de configuration.
        </p>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Settings className="w-4 h-4 text-muted-foreground" />
          Configuration
        </CardTitle>
        <CardDescription className="text-xs">
          Personnalisez le comportement de l'extension
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SchemaRenderer
          schema={{ ...schema, actions: [], dataDisplay: [] }}
          settings={settings}
          data={{}}
          onSettingsChange={onSettingsChange}
          onAction={async () => {}}
          isExecutingAction={null}
        />
      </CardContent>
    </Card>
  );
}

export function ActionsTab({ actions, executingAction, onAction }: ActionsTabProps) {
  if (actions.length === 0) {
    return (
      <div className="text-center py-10">
        <Zap className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
        <h3 className="font-medium text-sm mb-1">Aucune action</h3>
        <p className="text-xs text-muted-foreground">
          Cette extension n'a pas d'actions disponibles.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {actions.map(action => (
        <Card key={action.key}>
          <CardContent className="flex items-center justify-between p-3">
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-2 rounded-lg",
                action.style === 'danger' 
                  ? "bg-red-500/10 text-red-500"
                  : action.key.includes('sync')
                    ? "bg-blue-500/10 text-blue-500"
                    : "bg-primary/10 text-primary"
              )}>
                {action.key.includes('sync') ? (
                  <RefreshCw className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
              </div>
              <div>
                <h4 className="font-medium text-sm">{action.label}</h4>
                {action.confirm && (
                  <p className="text-[11px] text-muted-foreground">
                    Nécessite une confirmation
                  </p>
                )}
              </div>
            </div>
            <Button
              variant={action.style === 'danger' ? 'destructive' : 'default'}
              size="sm"
              onClick={() => onAction(action.key)}
              disabled={executingAction === action.key}
            >
              {executingAction === action.key ? (
                <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
              ) : null}
              Exécuter
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
