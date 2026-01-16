import React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Info,
  Tag,
  User,
  CheckCircle2,
  Shield,
  Zap,
  Heart,
  ExternalLink,
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import type { InfoTabProps } from './types';

export function InfoTab({ extension }: InfoTabProps) {
  const permissions = (extension.manifest?.permissions as string[]) || [];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {/* Main Content */}
      <div className="md:col-span-2 space-y-4">
        {/* Banner */}
        {extension.banner && (
          <Card className="overflow-hidden">
            <img src={extension.banner} alt={extension.name} className="w-full h-auto" />
          </Card>
        )}

        {/* Description */}
        {extension.long_description && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <div className="p-1.5 rounded-lg bg-primary/10">
                  <Info className="w-4 h-4 text-primary" />
                </div>
                Description
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">
                {extension.long_description}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Features */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <Zap className="w-4 h-4 text-primary" />
              </div>
              Fonctionnalités
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 gap-2">
              {[
                { title: 'Installation rapide', desc: 'Activez en un clic' },
                { title: 'Mises à jour auto', desc: 'Toujours à jour' },
                { title: 'Support intégré', desc: 'Assistance directe' },
                { title: 'Configuration simple', desc: 'Interface intuitive' },
              ].map(f => (
                <div key={f.title} className="flex items-start gap-2 p-2.5 rounded-lg bg-muted/30">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-sm">{f.title}</p>
                    <p className="text-xs text-muted-foreground">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Permissions */}
        {permissions.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <div className="p-1.5 rounded-lg bg-amber-500/10">
                  <Shield className="w-4 h-4 text-amber-500" />
                </div>
                Permissions requises
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {permissions.map(perm => (
                  <div key={perm} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50">
                    <Shield className="w-4 h-4 text-amber-500 shrink-0" />
                    <span className="text-sm">{perm}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Sidebar */}
      <div className="space-y-4">
        {/* Info Card */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Informations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Version</span>
              <span className="font-medium">{extension.version}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Plan minimum</span>
              <Badge variant="secondary" className="capitalize text-xs">{extension.min_plan}</Badge>
            </div>
            <Separator />
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Catégorie</span>
              <span className="font-medium capitalize">{extension.category}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center text-sm">
              <span className="text-muted-foreground">Dernière MAJ</span>
              <span className="font-medium">
                {format(new Date(extension.updated_at), 'dd MMM yyyy', { locale: fr })}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Tags */}
        {extension.tags.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <Tag className="w-4 h-4 text-muted-foreground" />
                Tags
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-1.5">
                {extension.tags.map(tag => (
                  <Badge key={tag} variant="secondary" className="text-xs">{tag}</Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Author */}
        {extension.author && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <User className="w-4 h-4 text-muted-foreground" />
                Développeur
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold">
                  {extension.author.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-medium text-sm">{extension.author.name}</span>
                    {extension.author.verified && <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />}
                  </div>
                  <p className="text-xs text-muted-foreground">Développeur vérifié</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Support */}
        <Card className="bg-muted/30">
          <CardContent className="pt-5 text-center space-y-2">
            <Heart className="w-6 h-6 mx-auto text-muted-foreground" />
            <div>
              <h3 className="font-medium text-sm">Besoin d'aide ?</h3>
              <p className="text-xs text-muted-foreground">Consultez la documentation</p>
            </div>
            <Button variant="outline" size="sm" className="w-full text-xs">
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
              Documentation
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
