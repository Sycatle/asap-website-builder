/**
 * V1 MVP: Freelance Dev Onboarding
 * 
 * Premium onboarding experience for the "Dev Freelance — Classic" preset.
 * 
 * Flow:
 * 1. Welcome & Identity (name, URL)
 * 2. Professional Info (title, tagline, availability)
 * 3. Services (what you offer)
 * 4. Projects (portfolio items)
 * 5. Contact & Social
 * 6. Preview & Publish
 */

import * as React from 'react';
import { websitesAPI, presetsAPI } from '@/lib/api';
import { trackEvent } from '@/lib/api/metrics';
import type { FreelanceProject, FreelanceService } from '@asap/shared';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { 
  ArrowRight, 
  ArrowLeft,
  Sparkles, 
  Rocket, 
  CheckCircle2,
  User,
  Briefcase,
  Code,
  Mail,
  ExternalLink,
  Plus,
  X,
  Globe,
  Linkedin,
  Github,
  Twitter,
  Calendar,
  MapPin,
  Clock,
  Zap,
  Palette,
  Server,
  Smartphone,
  Database,
  Cloud,
  MessageSquare,
  Star,
  ChevronRight,
  Eye,
  Share2,
  Copy,
  Check,
} from 'lucide-react';
import { PRESET_IDS } from './index';

// ============================================
// Types
// ============================================

type OnboardingStep = 
  | 'identity' 
  | 'professional' 
  | 'services' 
  | 'projects' 
  | 'contact' 
  | 'preview';

interface FreelanceDevOnboardingProps {
  onComplete: (websiteId: string) => void;
}

// Service icons
const serviceIcons = {
  code: Code,
  globe: Globe,
  mobile: Smartphone,
  server: Server,
  database: Database,
  cloud: Cloud,
  design: Palette,
  consulting: MessageSquare,
};

// Default services templates
const defaultServices: FreelanceService[] = [
  { title: 'Applications Web', description: 'Développement d\'applications web modernes et performantes', icon: 'globe' },
  { title: 'APIs & Backend', description: 'Conception d\'APIs robustes et scalables', icon: 'server' },
  { title: 'Consulting Tech', description: 'Audit de code et accompagnement technique', icon: 'consulting' },
];

// ============================================
// Main Component
// ============================================

export function FreelanceDevOnboarding({ onComplete }: FreelanceDevOnboardingProps) {
  const [currentStep, setCurrentStep] = React.useState<OnboardingStep>('identity');
  const [isLoading, setIsLoading] = React.useState(false);
  const [websiteId, setWebsiteId] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  
  // Identity
  const [name, setName] = React.useState('');
  const [slug, setSlug] = React.useState('');
  const [avatar, setAvatar] = React.useState('');
  
  // Professional
  const [title, setTitle] = React.useState('');
  const [tagline, setTagline] = React.useState('');
  const [location, setLocation] = React.useState('');
  const [availability, setAvailability] = React.useState<'available' | 'busy' | 'not-available'>('available');
  const [yearsOfExperience, setYearsOfExperience] = React.useState('');
  
  // Services
  const [services, setServices] = React.useState<FreelanceService[]>([]);
  
  // Projects
  const [projects, setProjects] = React.useState<Partial<FreelanceProject>[]>([]);
  
  // Contact
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [github, setGithub] = React.useState('');
  const [linkedin, setLinkedin] = React.useState('');
  const [twitter, setTwitter] = React.useState('');
  const [bookingUrl, setBookingUrl] = React.useState('');

  // Progress tracking
  const steps: OnboardingStep[] = ['identity', 'professional', 'services', 'projects', 'contact', 'preview'];
  const currentStepIndex = steps.indexOf(currentStep);
  const progress = Math.round(((currentStepIndex + 1) / steps.length) * 100);

  // Track step changes
  React.useEffect(() => {
    trackEvent('onboarding_step_viewed', websiteId || 'new', { 
      step: currentStep,
      preset: 'dev-freelance-classic'
    });
  }, [currentStep, websiteId]);

  // Generate slug from name
  const handleNameChange = (value: string) => {
    setName(value);
    if (!slug || slug === slugify(name)) {
      setSlug(slugify(value));
    }
  };

  const slugify = (text: string) => {
    return text
      .toLowerCase()
      .replace(/[àáâãäå]/g, 'a')
      .replace(/[èéêë]/g, 'e')
      .replace(/[ìíîï]/g, 'i')
      .replace(/[òóôõö]/g, 'o')
      .replace(/[ùúûü]/g, 'u')
      .replace(/[ç]/g, 'c')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 50);
  };

  // Step navigation
  const goToNextStep = () => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < steps.length) {
      setCurrentStep(steps[nextIndex]);
    }
  };

  const goToPreviousStep = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(steps[prevIndex]);
    }
  };

  // Create website on first step completion
  const handleIdentityComplete = async () => {
    if (!name.trim() || !slug.trim()) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    setIsLoading(true);
    try {
      const response = await presetsAPI.createWebsiteFromPreset({
        preset_id: PRESET_IDS.DEV_FREELANCE_CLASSIC,
        slug: slug.trim(),
        title: name.trim(),
      });
      
      setWebsiteId(response.website.id);
      trackEvent('onboarding_started', response.website.id, { preset: 'dev-freelance-classic' });
      goToNextStep();
      toast.success('Parfait ! Continuons avec votre profil.');
    } catch (error: any) {
      console.error('Failed to create website:', error);
      // Check for slug_taken error from backend
      if (error?.status === 409 || error?.data?.error === 'slug_taken') {
        toast.error('Cette URL est déjà prise. Essayez une autre adresse.');
      } else if (error?.message?.includes('slug')) {
        toast.error('Cette URL est déjà prise. Essayez une autre.');
      } else {
        toast.error('Erreur lors de la création. Réessayez.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Save profile data
  const saveProfileData = async () => {
    if (!websiteId) return;
    
    try {
      const currentData = await websitesAPI.getData(websiteId);
      await websitesAPI.patchData(websiteId, {
        ...currentData,
        profile: {
          version: 1,
          slug,
          identity: {
            name,
            title,
            tagline,
            avatar,
            bio: '', // Will be filled later or in studio
            location,
            availability,
            yearsOfExperience: yearsOfExperience ? parseInt(yearsOfExperience) : undefined,
          },
          services,
          projects: projects.filter(p => p.title) as FreelanceProject[],
          process: [
            { step: 1, title: 'Découverte', description: 'Échange sur vos besoins', icon: 'chat' },
            { step: 2, title: 'Proposition', description: 'Devis détaillé et planning', icon: 'pencil' },
            { step: 3, title: 'Développement', description: 'Réalisation itérative', icon: 'code' },
            { step: 4, title: 'Livraison', description: 'Mise en production', icon: 'rocket' },
          ],
          stack: [],
          proof: [],
          contact: {
            email,
            phone: phone || undefined,
            bookingUrl: bookingUrl || undefined,
            socials: {
              github: github || undefined,
              linkedin: linkedin || undefined,
              twitter: twitter || undefined,
            },
          },
          cta: {
            primaryText: 'Discutons de votre projet',
            primaryAction: 'email',
            primaryTarget: email || '#contact',
            secondaryText: 'Voir mes projets',
            secondaryAction: 'scroll',
            secondaryTarget: '#projects',
          },
          theme: {
            primaryColor: '#6366f1',
            mode: 'dark',
            avatarStyle: 'rounded',
          },
          seo: {
            title: `${name} — ${title}`,
            description: tagline,
          },
        },
      });
    } catch (error) {
      console.error('Failed to save profile:', error);
      throw error;
    }
  };

  // Handle step completion
  const handleStepComplete = async () => {
    setIsLoading(true);
    try {
      if (currentStep === 'identity') {
        await handleIdentityComplete();
        return;
      }
      
      // Save current data
      if (websiteId) {
        await saveProfileData();
      }
      
      goToNextStep();
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setIsLoading(false);
    }
  };

  // Publish website
  const handlePublish = async () => {
    if (!websiteId) return;
    
    setIsLoading(true);
    try {
      await saveProfileData();
      await websitesAPI.publish(websiteId);
      trackEvent('site_published', websiteId, { preset: 'dev-freelance-classic' });
      trackEvent('onboarding_completed', websiteId);
      toast.success('🎉 Votre portfolio est en ligne !');
      onComplete(websiteId);
    } catch (error) {
      console.error('Failed to publish:', error);
      toast.error('Erreur lors de la publication');
    } finally {
      setIsLoading(false);
    }
  };

  // Save as draft
  const handleSaveAsDraft = async () => {
    if (!websiteId) return;
    
    setIsLoading(true);
    try {
      await saveProfileData();
      trackEvent('onboarding_completed', websiteId, { draft: true });
      toast.success('Portfolio enregistré comme brouillon');
      onComplete(websiteId);
    } catch (error) {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setIsLoading(false);
    }
  };

  // Copy URL
  const handleCopyUrl = () => {
    const url = `https://${slug}.asap.cool`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Add service
  const addService = () => {
    if (services.length < 6) {
      setServices([...services, { title: '', description: '', icon: 'code' }]);
    }
  };

  // Remove service
  const removeService = (index: number) => {
    setServices(services.filter((_, i) => i !== index));
  };

  // Update service
  const updateService = (index: number, field: keyof FreelanceService, value: string) => {
    const updated = [...services];
    updated[index] = { ...updated[index], [field]: value };
    setServices(updated);
  };

  // Add project
  const addProject = () => {
    if (projects.length < 10) {
      setProjects([...projects, {
        id: `project-${Date.now()}`,
        title: '',
        description: '',
        technologies: [],
        featured: false,
        type: 'personal',
      }]);
    }
  };

  // Remove project
  const removeProject = (index: number) => {
    setProjects(projects.filter((_, i) => i !== index));
  };

  // Update project
  const updateProject = (index: number, field: string, value: any) => {
    const updated = [...projects];
    updated[index] = { ...updated[index], [field]: value };
    setProjects(updated);
  };

  // Add default services
  const addDefaultServices = () => {
    setServices(defaultServices);
  };

  // Step indicator
  const stepLabels: Record<OnboardingStep, string> = {
    identity: 'Identité',
    professional: 'Profil',
    services: 'Services',
    projects: 'Projets',
    contact: 'Contact',
    preview: 'Publication',
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">Création de portfolio</h1>
                <p className="text-sm text-muted-foreground">Dev Freelance — Classic</p>
              </div>
            </div>
            <Badge variant="outline" className="gap-1">
              <span>{currentStepIndex + 1}</span>
              <span>/</span>
              <span>{steps.length}</span>
            </Badge>
          </div>
          
          {/* Progress bar */}
          <Progress value={progress} className="h-2" />
          
          {/* Step indicators */}
          <div className="flex justify-between mt-4">
            {steps.map((step, index) => (
              <div 
                key={step}
                className={`flex flex-col items-center ${
                  index <= currentStepIndex ? 'text-primary' : 'text-muted-foreground'
                }`}
              >
                <div className={`h-2 w-2 rounded-full mb-1 ${
                  index <= currentStepIndex ? 'bg-primary' : 'bg-muted'
                }`} />
                <span className="text-xs hidden sm:block">{stepLabels[step]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Step Content */}
        <div className="animate-fade-in">
          <div key={currentStep}>
            {/* Identity Step */}
            {currentStep === 'identity' && (
              <Card className="border-2 border-primary/10">
                <CardHeader className="text-center pb-2">
                  <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                    <User className="h-8 w-8 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">Commençons par vous</CardTitle>
                  <CardDescription className="text-base">
                    Ces informations seront visibles sur votre portfolio
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Votre nom complet *</Label>
                    <Input
                      id="name"
                      placeholder="Jean Dupont"
                      value={name}
                      onChange={(e) => handleNameChange(e.target.value)}
                      className="h-12 text-lg"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="slug">Adresse de votre portfolio *</Label>
                    <div className="flex items-center gap-0">
                      <div className="h-12 px-4 bg-muted rounded-l-lg border border-r-0 flex items-center text-muted-foreground">
                        https://
                      </div>
                      <Input
                        id="slug"
                        placeholder="jean-dupont"
                        value={slug}
                        onChange={(e) => setSlug(slugify(e.target.value))}
                        className="h-12 rounded-none border-x-0 font-mono"
                      />
                      <div className="h-12 px-4 bg-muted rounded-r-lg border border-l-0 flex items-center text-muted-foreground">
                        .asap.cool
                      </div>
                    </div>
                    {slug && (
                      <p className="text-xs text-muted-foreground">
                        Votre portfolio sera accessible à <span className="font-mono text-primary">https://{slug}.asap.cool</span>
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="avatar">Photo de profil (URL)</Label>
                    <Input
                      id="avatar"
                      type="url"
                      placeholder="https://example.com/photo.jpg"
                      value={avatar}
                      onChange={(e) => setAvatar(e.target.value)}
                    />
                    {avatar && (
                      <div className="flex justify-center pt-2">
                        <Avatar className="h-20 w-20">
                          <AvatarImage src={avatar} />
                          <AvatarFallback>{name.charAt(0)}</AvatarFallback>
                        </Avatar>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Professional Step */}
            {currentStep === 'professional' && (
              <Card className="border-2 border-primary/10">
                <CardHeader className="text-center pb-2">
                  <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-indigo-500/5 flex items-center justify-center">
                    <Briefcase className="h-8 w-8 text-indigo-500" />
                  </div>
                  <CardTitle className="text-2xl">Votre profil professionnel</CardTitle>
                  <CardDescription className="text-base">
                    Décrivez votre activité en quelques mots
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Titre professionnel *</Label>
                    <Input
                      id="title"
                      placeholder="Développeur Full-Stack Freelance"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="h-12"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="tagline">Phrase d'accroche</Label>
                    <Textarea
                      id="tagline"
                      placeholder="Je transforme vos idées en applications web performantes et modernes."
                      value={tagline}
                      onChange={(e) => setTagline(e.target.value)}
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="location">Localisation</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="location"
                          placeholder="Paris, France"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="experience">Années d'expérience</Label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="experience"
                          type="number"
                          placeholder="5"
                          value={yearsOfExperience}
                          onChange={(e) => setYearsOfExperience(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Disponibilité</Label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { value: 'available', label: 'Disponible', color: 'bg-green-500' },
                        { value: 'busy', label: 'Occupé', color: 'bg-yellow-500' },
                        { value: 'not-available', label: 'Indisponible', color: 'bg-red-500' },
                      ].map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setAvailability(option.value as typeof availability)}
                          className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all ${
                            availability === option.value
                              ? 'border-primary bg-primary/5'
                              : 'border-transparent bg-muted hover:border-muted-foreground/20'
                          }`}
                        >
                          <span className={`h-2 w-2 rounded-full ${option.color}`} />
                          <span className="text-sm">{option.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Services Step */}
            {currentStep === 'services' && (
              <Card className="border-2 border-primary/10">
                <CardHeader className="text-center pb-2">
                  <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-violet-500/5 flex items-center justify-center">
                    <Zap className="h-8 w-8 text-violet-500" />
                  </div>
                  <CardTitle className="text-2xl">Vos services</CardTitle>
                  <CardDescription className="text-base">
                    Décrivez ce que vous proposez à vos clients (3 recommandé)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  {services.length === 0 ? (
                    <div className="text-center py-8">
                      <Zap className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                      <p className="text-muted-foreground mb-4">Ajoutez vos services</p>
                      <div className="flex flex-col sm:flex-row gap-2 justify-center">
                        <Button variant="outline" onClick={addDefaultServices}>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Utiliser les exemples
                        </Button>
                        <Button variant="outline" onClick={addService}>
                          <Plus className="h-4 w-4 mr-2" />
                          Ajouter manuellement
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {services.map((service, index) => (
                        <div key={index} className="p-4 rounded-lg border bg-card space-y-3">
                          <div className="flex items-start justify-between">
                            <Badge variant="outline">Service {index + 1}</Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => removeService(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          <Input
                            placeholder="Titre du service"
                            value={service.title}
                            onChange={(e) => updateService(index, 'title', e.target.value)}
                          />
                          <Input
                            placeholder="Description courte"
                            value={service.description}
                            onChange={(e) => updateService(index, 'description', e.target.value)}
                          />
                        </div>
                      ))}
                      {services.length < 6 && (
                        <Button variant="outline" className="w-full" onClick={addService}>
                          <Plus className="h-4 w-4 mr-2" />
                          Ajouter un service
                        </Button>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Projects Step */}
            {currentStep === 'projects' && (
              <Card className="border-2 border-primary/10">
                <CardHeader className="text-center pb-2">
                  <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 flex items-center justify-center">
                    <Code className="h-8 w-8 text-emerald-500" />
                  </div>
                  <CardTitle className="text-2xl">Vos projets</CardTitle>
                  <CardDescription className="text-base">
                    Montrez vos meilleures réalisations (min. 3 recommandé)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  {projects.length === 0 ? (
                    <div className="text-center py-8">
                      <Code className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                      <p className="text-muted-foreground mb-4">Ajoutez vos projets</p>
                      <Button variant="outline" onClick={addProject}>
                        <Plus className="h-4 w-4 mr-2" />
                        Ajouter un projet
                      </Button>
                    </div>
                  ) : (
                    <>
                      {projects.map((project, index) => (
                        <div key={project.id} className="p-4 rounded-lg border bg-card space-y-3">
                          <div className="flex items-start justify-between">
                            <Badge variant="outline">Projet {index + 1}</Badge>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-destructive"
                              onClick={() => removeProject(index)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                          <Input
                            placeholder="Nom du projet"
                            value={project.title || ''}
                            onChange={(e) => updateProject(index, 'title', e.target.value)}
                          />
                          <Textarea
                            placeholder="Description courte"
                            value={project.description || ''}
                            onChange={(e) => updateProject(index, 'description', e.target.value)}
                            rows={2}
                          />
                          <Input
                            placeholder="Technologies (séparées par des virgules)"
                            value={project.technologies?.join(', ') || ''}
                            onChange={(e) => updateProject(index, 'technologies', e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
                          />
                          <div className="flex gap-2">
                            <Input
                              placeholder="URL du projet (optionnel)"
                              value={project.liveUrl || ''}
                              onChange={(e) => updateProject(index, 'liveUrl', e.target.value)}
                              className="flex-1"
                            />
                            <Input
                              placeholder="GitHub (optionnel)"
                              value={project.githubUrl || ''}
                              onChange={(e) => updateProject(index, 'githubUrl', e.target.value)}
                              className="flex-1"
                            />
                          </div>
                        </div>
                      ))}
                      {projects.length < 10 && (
                        <Button variant="outline" className="w-full" onClick={addProject}>
                          <Plus className="h-4 w-4 mr-2" />
                          Ajouter un projet
                        </Button>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Contact Step */}
            {currentStep === 'contact' && (
              <Card className="border-2 border-primary/10">
                <CardHeader className="text-center pb-2">
                  <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-gradient-to-br from-sky-500/20 to-sky-500/5 flex items-center justify-center">
                    <Mail className="h-8 w-8 text-sky-500" />
                  </div>
                  <CardTitle className="text-2xl">Contact & Réseaux</CardTitle>
                  <CardDescription className="text-base">
                    Comment vos clients peuvent vous joindre
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="contact@example.com"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="phone">Téléphone</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+33 6 12 34 56 78"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-4">
                    <Label>Réseaux sociaux</Label>
                    <div className="space-y-3">
                      <div className="relative">
                        <Github className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="https://github.com/username"
                          value={github}
                          onChange={(e) => setGithub(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      <div className="relative">
                        <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="https://linkedin.com/in/username"
                          value={linkedin}
                          onChange={(e) => setLinkedin(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      <div className="relative">
                        <Twitter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="https://twitter.com/username"
                          value={twitter}
                          onChange={(e) => setTwitter(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="booking">Lien de prise de rendez-vous</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="booking"
                        placeholder="https://calendly.com/username"
                        value={bookingUrl}
                        onChange={(e) => setBookingUrl(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Preview Step */}
            {currentStep === 'preview' && (
              <Card className="border-2 border-primary/10 overflow-hidden">
                <CardHeader className="text-center pb-2 bg-gradient-to-b from-primary/5 to-transparent">
                  <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                    <Rocket className="h-8 w-8 text-primary-foreground" />
                  </div>
                  <CardTitle className="text-2xl">Prêt à publier !</CardTitle>
                  <CardDescription className="text-base">
                    Votre portfolio est prêt. Publiez-le maintenant ou continuez plus tard.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-4">
                  {/* Preview Card */}
                  <div className="rounded-xl border-2 border-dashed border-muted-foreground/20 p-6 bg-muted/30">
                    <div className="flex items-start gap-4">
                      <Avatar className="h-16 w-16">
                        <AvatarImage src={avatar} />
                        <AvatarFallback className="text-lg">{name.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-semibold truncate">{name || 'Votre nom'}</h3>
                        <p className="text-muted-foreground">{title || 'Votre titre'}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary" className="gap-1">
                            <span className={`h-2 w-2 rounded-full ${
                              availability === 'available' ? 'bg-green-500' :
                              availability === 'busy' ? 'bg-yellow-500' : 'bg-red-500'
                            }`} />
                            {availability === 'available' ? 'Disponible' :
                             availability === 'busy' ? 'Occupé' : 'Indisponible'}
                          </Badge>
                          {location && (
                            <Badge variant="outline" className="gap-1">
                              <MapPin className="h-3 w-3" />
                              {location}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <Separator className="my-4" />
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold">{services.length}</p>
                        <p className="text-xs text-muted-foreground">Services</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{projects.filter(p => p.title).length}</p>
                        <p className="text-xs text-muted-foreground">Projets</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{yearsOfExperience || '—'}</p>
                        <p className="text-xs text-muted-foreground">Ans d'exp.</p>
                      </div>
                    </div>
                  </div>

                  {/* URL Preview */}
                  <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
                    <Globe className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1 font-mono text-sm truncate">
                      https://{slug}.asap.cool
                    </span>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleCopyUrl}>
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>

                  {/* Actions */}
                  <div className="space-y-3">
                    <Button 
                      className="w-full h-12 text-base" 
                      size="lg"
                      onClick={handlePublish}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <Spinner className="h-4 w-4 mr-2" />
                          Publication...
                        </>
                      ) : (
                        <>
                          <Rocket className="h-4 w-4 mr-2" />
                          Publier mon portfolio
                        </>
                      )}
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={handleSaveAsDraft}
                      disabled={isLoading}
                    >
                      Enregistrer comme brouillon
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Navigation */}
        {currentStep !== 'preview' && (
          <div className="flex justify-between mt-6">
            <Button
              variant="ghost"
              onClick={goToPreviousStep}
              disabled={currentStep === 'identity' || isLoading}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour
            </Button>
            <Button
              onClick={handleStepComplete}
              disabled={isLoading || (currentStep === 'identity' && (!name.trim() || !slug.trim()))}
              className="gap-2"
            >
              {isLoading ? (
                <>
                  <Spinner className="h-4 w-4" />
                  {currentStep === 'identity' ? 'Création...' : 'Enregistrement...'}
                </>
              ) : (
                <>
                  Continuer
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        )}

        {currentStep === 'preview' && (
          <div className="flex justify-start mt-6">
            <Button
              variant="ghost"
              onClick={goToPreviousStep}
              disabled={isLoading}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Retour
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
