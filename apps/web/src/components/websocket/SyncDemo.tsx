import { useState } from 'react';
import { useWebsiteSync } from '@/hooks/useWebsiteSync';
import { useModuleSync } from '@/hooks/useModuleSync';
import { usePresence } from '@/hooks/usePresence';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Activity, Zap, RefreshCw } from 'lucide-react';

/**
 * Sync Demo Component - Phase 3
 * 
 * Demonstrates real-time synchronization features:
 * - Website sync
 * - Module sync  
 * - User presence
 * - Editing indicators
 */
export function SyncDemo() {
  const [resourceId] = useState('demo-resource-123');

  // Enable real-time sync hooks
  const websiteSync = useWebsiteSync({ showToasts: true });
  const moduleSync = useModuleSync({ showToasts: true });
  
  const {
    onlineUsers,
    editingUsers,
    startEditing,
    stopEditing,
    isTracking
  } = usePresence({
    resourceType: 'website',
    resourceId,
    debug: true
  });

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Synchronisation Temps Réel - Phase 3
            </CardTitle>
            <div className="flex gap-2">
              <Badge variant={websiteSync.isConnected ? 'default' : 'secondary'}>
                {websiteSync.isConnected ? 'Connecté' : 'Déconnecté'}
              </Badge>
            </div>
          </div>
          <CardDescription>
            Test de synchronisation WebSocket et présence utilisateur
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Sync Features */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center gap-2 font-medium">
                <RefreshCw className="h-4 w-4" />
                Website Sync
              </div>
              <p className="text-sm text-muted-foreground">
                Reçoit les mises à jour en temps réel quand un site est modifié, publié ou supprimé.
              </p>
              <div className="text-xs text-muted-foreground">
                ✅ Auto-invalidation du cache<br />
                ✅ Toast notifications<br />
                ✅ Multi-onglets
              </div>
            </div>

            <div className="rounded-lg border p-4 space-y-2">
              <div className="flex items-center gap-2 font-medium">
                <RefreshCw className="h-4 w-4" />
                Module Sync
              </div>
              <p className="text-sm text-muted-foreground">
                Synchronise l'état des modules (activé/désactivé) entre tous les clients.
              </p>
              <div className="text-xs text-muted-foreground">
                ✅ Cache updates optimistes<br />
                ✅ Catalogue temps réel<br />
                ✅ Configuration sync
              </div>
            </div>
          </div>

          {/* Presence Tracking */}
          <div className="rounded-lg border p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-medium">
                <Users className="h-4 w-4" />
                Présence Utilisateur
              </div>
              <Badge variant={isTracking ? 'default' : 'outline'}>
                {isTracking ? 'En édition' : 'Observateur'}
              </Badge>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="text-sm font-medium mb-2">
                  Utilisateurs en ligne ({onlineUsers.length})
                </h4>
                {onlineUsers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Aucun utilisateur connecté
                  </p>
                ) : (
                  <div className="space-y-1">
                    {onlineUsers.map(user => (
                      <div
                        key={user.id}
                        className="flex items-center gap-2 text-sm"
                      >
                        <div className="w-2 h-2 rounded-full bg-green-500" />
                        <span>{user.username}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">
                  En train d'éditer ({editingUsers.length})
                </h4>
                {editingUsers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Personne n'édite cette ressource
                  </p>
                ) : (
                  <div className="space-y-1">
                    {editingUsers.map(user => (
                      <div
                        key={user.id}
                        className="flex items-center gap-2 text-sm"
                      >
                        <Activity className="h-3 w-3 text-blue-500 animate-pulse" />
                        <span className="font-medium">{user.username}</span>
                        <span className="text-xs text-muted-foreground">
                          modifie...
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={startEditing}
                disabled={isTracking || !websiteSync.isConnected}
                size="sm"
                variant="default"
              >
                Commencer édition
              </Button>
              <Button
                onClick={stopEditing}
                disabled={!isTracking}
                size="sm"
                variant="outline"
              >
                Arrêter édition
              </Button>
            </div>
          </div>

          {/* Instructions */}
          <div className="rounded-lg border p-4 bg-blue-50 dark:bg-blue-950/20 space-y-2">
            <h4 className="font-medium">🧪 Comment tester Phase 3</h4>
            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
              <li>Ouvrez cette page dans 2+ onglets</li>
              <li>Cliquez "Commencer édition" dans un onglet</li>
              <li>L'autre onglet affiche qui édite en temps réel</li>
              <li>Les mises à jour de sites/modules sont synchronisées</li>
              <li>Les notifications apparaissent instantanément</li>
            </ul>
          </div>

          {/* Phase 3 Features */}
          <div className="rounded-lg border p-4 space-y-2">
            <h4 className="font-medium">✅ Phase 3 Features</h4>
            <div className="grid gap-2 text-sm">
              <div className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                <div>
                  <strong>Website Sync:</strong> useWebsiteSync hook avec invalidation cache automatique
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                <div>
                  <strong>Module Sync:</strong> useModuleSync hook avec updates optimistes
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                <div>
                  <strong>Presence:</strong> usePresence hook avec tracking multi-ressources
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                <div>
                  <strong>Types:</strong> syncEvents.ts avec 20+ event types TypeScript
                </div>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-green-500">✓</span>
                <div>
                  <strong>Sync Demo:</strong> Composant de test interactif
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
