/**
 * V1 MVP: Publish Step
 * 
 * Step 4 of onboarding: Final review and publish portfolio.
 */

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { 
  ArrowLeft, Rocket, Globe, Check, Copy, ExternalLink, 
  PartyPopper, Share2, Twitter, Linkedin
} from 'lucide-react';
import { openExternalUrl } from '@/lib/utils/security';
import type { FreelanceDevProfile } from '@asap/shared';

interface PublishStepProps {
  profile: FreelanceDevProfile;
  subdomain: string;
  onSubdomainChange: (subdomain: string) => void;
  onPublish: () => void;
  onBack: () => void;
  isPublishing?: boolean;
  isPublished?: boolean;
  publishedUrl?: string;
}

export function PublishStep({
  profile,
  subdomain,
  onSubdomainChange,
  onPublish,
  onBack,
  isPublishing = false,
  isPublished = false,
  publishedUrl,
}: PublishStepProps) {
  const [copied, setCopied] = React.useState(false);
  
  const fullUrl = publishedUrl || `https://${subdomain}.asap.cool`;
  
  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(fullUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareOnTwitter = () => {
    const text = encodeURIComponent(`🚀 Je viens de créer mon portfolio de développeur freelance avec @asap_cool ! Découvrez-le ici 👇`);
    openExternalUrl(`https://twitter.com/intent/tweet?text=${text}&url=${encodeURIComponent(fullUrl)}`);
  };

  const shareOnLinkedin = () => {
    openExternalUrl(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(fullUrl)}`);
  };

  // Published state
  if (isPublished) {
    return (
      <div className="space-y-8">
        {/* Success Card */}
        <Card className="border-2 border-green-500/30 bg-gradient-to-br from-green-500/5 to-green-500/10">
          <CardContent className="py-12 text-center">
            <div className="mb-6">
              <div className="mx-auto h-20 w-20 rounded-full bg-green-500/20 flex items-center justify-center animate-in zoom-in duration-500">
                <PartyPopper className="h-10 w-10 text-green-500 fill-green-500" />
              </div>
            </div>
            <h2 className="text-2xl font-bold mb-2">
              🎉 Félicitations {profile.identity.name.split(' ')[0]} !
            </h2>
            <p className="text-muted-foreground mb-6">
              Votre portfolio est maintenant en ligne et accessible au monde entier.
            </p>
            
            {/* URL Display */}
            <div className="max-w-md mx-auto bg-background rounded-lg border p-4 flex items-center gap-3">
              <Globe className="h-5 w-5 text-muted-foreground flex-shrink-0" />
              <span className="font-mono text-sm flex-1 truncate">{fullUrl}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={copyToClipboard}
                className="flex-shrink-0"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => openExternalUrl(fullUrl)}
                className="flex-shrink-0"
              >
                <ExternalLink className="h-4 w-4 stroke-[2.5]" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Share Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Share2 className="h-5 w-5" />
              Partagez votre portfolio
            </CardTitle>
            <CardDescription>
              Faites connaître votre nouveau portfolio à votre réseau
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button variant="outline" onClick={shareOnTwitter} className="gap-2">
                <Twitter className="h-4 w-4 fill-current" />
                Partager sur Twitter
              </Button>
              <Button variant="outline" onClick={shareOnLinkedin} className="gap-2">
                <Linkedin className="h-4 w-4 fill-current" />
                Partager sur LinkedIn
              </Button>
              <Button variant="outline" onClick={copyToClipboard} className="gap-2">
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? 'Copié !' : 'Copier le lien'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Next Steps */}
        <Card>
          <CardHeader>
            <CardTitle>Et maintenant ?</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              <li className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-medium text-primary">1</span>
                </div>
                <div>
                  <p className="font-medium">Personnalisez davantage</p>
                  <p className="text-sm text-muted-foreground">
                    Accédez à votre dashboard pour affiner les détails de votre portfolio.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-medium text-primary">2</span>
                </div>
                <div>
                  <p className="font-medium">Ajoutez votre domaine personnalisé</p>
                  <p className="text-sm text-muted-foreground">
                    Connectez votre propre domaine pour une identité professionnelle unique.
                  </p>
                </div>
              </li>
              <li className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-xs font-medium text-primary">3</span>
                </div>
                <div>
                  <p className="font-medium">Suivez vos statistiques</p>
                  <p className="text-sm text-muted-foreground">
                    Consultez les analytics pour voir qui visite votre portfolio.
                  </p>
                </div>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="flex justify-center gap-4">
          <Button variant="outline" onClick={() => openExternalUrl(fullUrl)} className="gap-2">
            <ExternalLink className="h-4 w-4 stroke-[2.5]" />
            Voir mon portfolio
          </Button>
          <Button onClick={() => window.location.href = '/'} className="gap-2">
            Accéder au dashboard
          </Button>
        </div>
      </div>
    );
  }

  // Pre-publish state
  return (
    <div className="space-y-6">
      {/* Domain Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Choisissez votre URL
          </CardTitle>
          <CardDescription>
            Cette adresse sera celle de votre portfolio public
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">https://</span>
            <Input
              value={subdomain}
              onChange={(e) => onSubdomainChange(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              placeholder="votre-nom"
              className="max-w-[200px] font-mono"
            />
            <span className="text-muted-foreground">.asap.cool</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Vous pourrez ajouter un domaine personnalisé plus tard depuis votre dashboard.
          </p>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Récapitulatif</CardTitle>
          <CardDescription>
            Vérifiez les informations avant de publier
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-muted-foreground">Nom</span>
              <span className="font-medium">{profile.identity.name || '—'}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-muted-foreground">Titre</span>
              <span className="font-medium">{profile.identity.title || '—'}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-muted-foreground">Services</span>
              <span className="font-medium">{profile.services.length} service(s)</span>
            </div>
            <div className="flex justify-between items-center py-2 border-b">
              <span className="text-muted-foreground">Projets</span>
              <span className="font-medium">{profile.projects.length} projet(s)</span>
            </div>
            <div className="flex justify-between items-center py-2">
              <span className="text-muted-foreground">Contact</span>
              <span className="font-medium">{profile.contact.email || '—'}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Publish Info */}
      <Card className="bg-muted/30">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <Rocket className="h-5 w-5 text-primary mt-0.5" />
            <div className="text-sm">
              <p className="font-medium">Prêt à publier ?</p>
              <p className="text-muted-foreground">
                Votre portfolio sera accessible publiquement. Vous pourrez le modifier 
                à tout moment depuis votre dashboard.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Retour
        </Button>
        <Button 
          onClick={onPublish} 
          disabled={!subdomain || isPublishing}
          className="gap-2 min-w-[180px]"
        >
          {isPublishing ? (
            <>
              <Spinner className="h-4 w-4" />
              Publication...
            </>
          ) : (
            <>
              <Rocket className="h-4 w-4" />
              Publier mon portfolio
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
