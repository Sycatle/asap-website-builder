"use client"

import { useEffect, useState } from 'react';
import { websitesAPI, authAPI, type Website, type UpdateWebsiteRequest } from '../lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { 
  Globe, 
  Save, 
  ExternalLink, 
  CheckCircle2, 
  Clock, 
  Loader2,
  Github,
  Rocket,
  Link2,
  Type,
  MessageSquare,
  AlertCircle
} from "lucide-react";

export default function WebsiteEditor() {
  const [website, setWebsite] = useState<Website | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [tagline, setTagline] = useState('');
  const [githubUsername, setGithubUsername] = useState('');

  useEffect(() => {
    loadWebsite();
  }, []);

  const loadWebsite = async () => {
    try {
      const websites = await websitesAPI.list();
      if (websites.length > 0) {
        const w = websites[0];
        setWebsite(w);
        setTitle(w.title || '');
        setTagline(w.tagline || '');
      }
    } catch (error) {
      console.error('Failed to load website:', error);
      setMessage({ type: 'error', text: 'Erreur lors du chargement du site' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!website) return;

    setIsSaving(true);
    setMessage(null);

    try {
      const data: UpdateWebsiteRequest = { title, tagline };
      await websitesAPI.update(website.id, data);
      setMessage({ type: 'success', text: 'Site mis à jour avec succès !' });
      await loadWebsite();
    } catch (error) {
      console.error('Failed to save website:', error);
      setMessage({ type: 'error', text: 'Erreur lors de la sauvegarde' });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!website) return;

    setIsSaving(true);
    setMessage(null);

    try {
      await websitesAPI.publish(website.id);
      setMessage({ type: 'success', text: 'Site publié avec succès !' });
      await loadWebsite();
    } catch (error) {
      console.error('Failed to publish website:', error);
      setMessage({ type: 'error', text: 'Erreur lors de la publication' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleGitHubConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!website || !githubUsername.trim()) return;

    setIsSaving(true);
    setMessage(null);

    try {
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
      <div className="space-y-8 max-w-4xl">
        <div className="space-y-2">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-5 w-96" />
        </div>
        <Skeleton className="h-64" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  if (!website) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <Globe className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Aucun site trouvé</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight">Mon Site</h1>
            {website.status === 'published' ? (
              <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20 border-green-500/20">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Publié
              </Badge>
            ) : (
              <Badge variant="secondary">
                <Clock className="w-3 h-3 mr-1" />
                Brouillon
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {website.status === 'draft' && (
              <Button onClick={handlePublish} disabled={isSaving} className="bg-green-600 hover:bg-green-700">
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Rocket className="h-4 w-4 mr-2" />
                )}
                Publier
              </Button>
            )}
            <Button variant="outline" asChild>
              <a href={`/${website.slug}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Voir le site
              </a>
            </Button>
          </div>
        </div>
        <p className="text-muted-foreground">
          Personnalisez les informations de votre site
        </p>
      </div>

      {/* Message */}
      {message && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className={message.type === 'success' ? 'border-green-500/50 bg-green-500/10 text-green-700' : ''}>
          {message.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4" />
          ) : (
            <AlertCircle className="h-4 w-4" />
          )}
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      {/* Website Info Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-primary" />
            Informations générales
          </CardTitle>
          <CardDescription>
            Les informations de base de votre site
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSave} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="slug" className="flex items-center gap-2">
                <Link2 className="h-4 w-4 text-muted-foreground" />
                URL du site
              </Label>
              <div className="flex items-center">
                <span className="flex h-10 items-center rounded-l-md border border-r-0 bg-muted px-3 text-sm text-muted-foreground">
                  asap.cool/
                </span>
                <Input
                  id="slug"
                  value={website.slug}
                  disabled
                  className="rounded-l-none bg-muted"
                />
              </div>
              <p className="text-xs text-muted-foreground">L'URL ne peut pas être modifiée après la création</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title" className="flex items-center gap-2">
                <Type className="h-4 w-4 text-muted-foreground" />
                Titre
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Votre nom ou titre"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tagline" className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                Tagline
              </Label>
              <Input
                id="tagline"
                value={tagline}
                onChange={(e) => setTagline(e.target.value)}
                placeholder="Développeur Full Stack | Designer | ..."
              />
            </div>

            <Separator />

            <div className="flex justify-end">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Enregistrer
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* GitHub Integration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Github className="h-5 w-5" />
            Intégration GitHub
          </CardTitle>
          <CardDescription>
            Connectez votre compte GitHub pour afficher automatiquement vos projets
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleGitHubConnect} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="github">Nom d'utilisateur GitHub</Label>
              <div className="flex gap-2">
                <Input
                  id="github"
                  value={githubUsername}
                  onChange={(e) => setGithubUsername(e.target.value)}
                  placeholder="votre-username"
                  className="flex-1"
                />
                <Button 
                  type="submit" 
                  variant="secondary"
                  disabled={isSaving || !githubUsername.trim()}
                >
                  {isSaving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Connecter'
                  )}
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Preview Card */}
      <Card className="bg-gradient-to-br from-primary/5 via-violet-500/5 to-primary/5 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ExternalLink className="h-5 w-5 text-primary" />
            Prévisualiser votre site
          </CardTitle>
          <CardDescription>
            Voyez à quoi ressemble votre site pour les visiteurs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-2">
                Votre site est accessible à l'adresse :
              </p>
              <code className="text-sm bg-muted px-2 py-1 rounded font-mono">
                {website.slug}.asap.cool
              </code>
            </div>
            <Button asChild>
              <a href={`/${website.slug}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4 mr-2" />
                Ouvrir
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
