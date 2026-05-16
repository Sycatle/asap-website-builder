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
import { useTranslation } from 'react-i18next';
import { websitesAPI, presetsAPI } from '@/lib/api';
import { trackEvent } from '@/lib/api/metrics';
import type { FreelanceProject, FreelanceService } from '@asap/shared';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
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
  User,
  Briefcase,
  Code,
  Mail,
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
  HardDrive,
  Smartphone,
  Database,
  Cloud,
  MessageCircle,
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

// Service icons (available for future use)
const _serviceIcons = {
  code: Code,
  globe: Globe,
  mobile: Smartphone,
  server: HardDrive,
  database: Database,
  cloud: Cloud,
  design: Palette,
  consulting: MessageCircle,
};

// ============================================
// Main Component
// ============================================

export function FreelanceDevOnboarding({ onComplete }: FreelanceDevOnboardingProps) {
  const { t } = useTranslation(['onboarding', 'common']);
  const [currentStep, setCurrentStep] = React.useState<OnboardingStep>('identity');
  const [isLoading, setIsLoading] = React.useState(false);
  const [websiteId, setWebsiteId] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState(false);
  
  // Default services templates (using translations)
  const getDefaultServices = (): FreelanceService[] => [
    { title: t('services.defaults.webApps.title'), description: t('services.defaults.webApps.description'), icon: 'globe' },
    { title: t('services.defaults.apis.title'), description: t('services.defaults.apis.description'), icon: 'server' },
    { title: t('services.defaults.consulting.title'), description: t('services.defaults.consulting.description'), icon: 'consulting' },
  ];
  
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

  // Step labels using translations
  const stepLabels: Record<OnboardingStep, string> = {
    identity: t('steps.identity'),
    professional: t('steps.professional'),
    services: t('steps.services'),
    projects: t('steps.projects'),
    contact: t('steps.contact'),
    preview: t('steps.preview'),
  };

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
      toast.error(t('toasts.errors.fillAllFields'));
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
      toast.success(t('toasts.success.created'));
    } catch (error: any) {
      // Check for slug_taken error from backend
      if (error?.status === 409 || error?.data?.error === 'slug_taken') {
        toast.error(t('toasts.errors.slugTaken'));
      } else if (error?.message?.includes('slug')) {
        toast.error(t('toasts.errors.slugTaken'));
      } else {
        toast.error(t('toasts.errors.creationError'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Save profile data
  const saveProfileData = async () => {
    if (!websiteId) return;

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
      toast.error(t('toasts.errors.savingError'));
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
      toast.success(t('toasts.success.portfolioPublished'));
      onComplete(websiteId);
    } catch (error) {
      toast.error(t('toasts.errors.publishError'));
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
      toast.success(t('toasts.success.savedAsDraft'));
      onComplete(websiteId);
    } catch (error) {
      toast.error(t('toasts.errors.savingError'));
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
    setServices(getDefaultServices());
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-primary-foreground fill-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">{t('header.title')}</h1>
                <p className="text-sm text-muted-foreground">{t('header.subtitle')}</p>
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
                  <CardTitle className="text-2xl">{t('identity.title')}</CardTitle>
                  <CardDescription className="text-base">
                    {t('identity.description')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-4">
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="name">{t('identity.nameLabel')} *</FieldLabel>
                      <Input
                        id="name"
                        placeholder={t('identity.namePlaceholder')}
                        value={name}
                        onChange={(e) => handleNameChange(e.target.value)}
                        className="h-12 text-lg"
                      />
                    </Field>
                    
                    <Field>
                      <FieldLabel htmlFor="slug">{t('identity.slugLabel')} *</FieldLabel>
                      <div className="flex items-center gap-0">
                        <div className="h-12 px-4 bg-muted rounded-l-lg border border-r-0 flex items-center text-muted-foreground">
                          https://
                        </div>
                        <Input
                          id="slug"
                          placeholder={t('identity.slugPlaceholder')}
                          value={slug}
                          onChange={(e) => setSlug(slugify(e.target.value))}
                          className="h-12 rounded-none border-x-0 font-mono"
                        />
                        <div className="h-12 px-4 bg-muted rounded-r-lg border border-l-0 flex items-center text-muted-foreground">
                          .asap.cool
                        </div>
                      </div>
                      {slug && (
                        <FieldDescription>
                          {t('identity.slugDescription')} <span className="font-mono text-primary">https://{slug}.asap.cool</span>
                        </FieldDescription>
                      )}
                    </Field>

                    <Field>
                      <FieldLabel htmlFor="avatar">{t('identity.avatarLabel')}</FieldLabel>
                      <Input
                        id="avatar"
                        type="url"
                        placeholder={t('identity.avatarPlaceholder')}
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
                    </Field>
                  </FieldGroup>
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
                  <CardTitle className="text-2xl">{t('professional.title')}</CardTitle>
                  <CardDescription className="text-base">
                    {t('professional.description')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-4">
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="title">{t('professional.titleLabel')} *</FieldLabel>
                      <Input
                        id="title"
                        placeholder={t('professional.titlePlaceholder')}
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="h-12"
                      />
                    </Field>
                    
                    <Field>
                      <FieldLabel htmlFor="tagline">{t('professional.taglineLabel')}</FieldLabel>
                      <Textarea
                        id="tagline"
                        placeholder={t('professional.taglinePlaceholder')}
                        value={tagline}
                        onChange={(e) => setTagline(e.target.value)}
                        rows={2}
                      />
                    </Field>

                    <div className="grid grid-cols-2 gap-4">
                      <Field>
                        <FieldLabel htmlFor="location">{t('professional.locationLabel')}</FieldLabel>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="location"
                            placeholder={t('professional.locationPlaceholder')}
                            value={location}
                            onChange={(e) => setLocation(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="experience">{t('professional.experienceLabel')}</FieldLabel>
                        <div className="relative">
                          <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="experience"
                            type="number"
                            placeholder={t('professional.experiencePlaceholder')}
                            value={yearsOfExperience}
                            onChange={(e) => setYearsOfExperience(e.target.value)}
                            className="pl-10"
                          />
                        </div>
                      </Field>
                    </div>

                    <Field>
                      <FieldLabel>{t('professional.availabilityLabel')}</FieldLabel>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { value: 'available', label: t('professional.availability.available'), color: 'bg-green-500' },
                          { value: 'busy', label: t('professional.availability.busy'), color: 'bg-yellow-500' },
                          { value: 'not-available', label: t('professional.availability.notAvailable'), color: 'bg-red-500' },
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
                    </Field>
                  </FieldGroup>
                </CardContent>
              </Card>
            )}

            {/* Services Step */}
            {currentStep === 'services' && (
              <Card className="border-2 border-primary/10">
                <CardHeader className="text-center pb-2">
                  <div className="mx-auto mb-4 h-16 w-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-violet-500/5 flex items-center justify-center">
                    <Zap className="h-8 w-8 text-violet-500 fill-violet-500" />
                  </div>
                  <CardTitle className="text-2xl">{t('services.title')}</CardTitle>
                  <CardDescription className="text-base">
                    {t('services.description')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  {services.length === 0 ? (
                    <div className="text-center py-8">
                      <Zap className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                      <p className="text-muted-foreground mb-4">{t('services.empty')}</p>
                      <div className="flex flex-col sm:flex-row gap-2 justify-center">
                        <Button variant="outline" onClick={addDefaultServices}>
                          <Sparkles className="h-4 w-4 mr-2 fill-current" />
                          {t('services.useExamples')}
                        </Button>
                        <Button variant="outline" onClick={addService}>
                          <Plus className="h-4 w-4 mr-2" />
                          {t('services.addManually')}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {services.map((service, index) => (
                        <div key={index} className="p-4 rounded-lg border bg-card space-y-3">
                          <div className="flex items-start justify-between">
                            <Badge variant="outline">{t('services.serviceNumber', { number: index + 1 })}</Badge>
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
                            placeholder={t('services.titlePlaceholder')}
                            value={service.title}
                            onChange={(e) => updateService(index, 'title', e.target.value)}
                          />
                          <Input
                            placeholder={t('services.descriptionPlaceholder')}
                            value={service.description}
                            onChange={(e) => updateService(index, 'description', e.target.value)}
                          />
                        </div>
                      ))}
                      {services.length < 6 && (
                        <Button variant="outline" className="w-full" onClick={addService}>
                          <Plus className="h-4 w-4 mr-2" />
                          {t('services.addService')}
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
                  <CardTitle className="text-2xl">{t('projects.title')}</CardTitle>
                  <CardDescription className="text-base">
                    {t('projects.description')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  {projects.length === 0 ? (
                    <div className="text-center py-8">
                      <Code className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                      <p className="text-muted-foreground mb-4">{t('projects.empty')}</p>
                      <Button variant="outline" onClick={addProject}>
                        <Plus className="h-4 w-4 mr-2" />
                        {t('projects.addProject')}
                      </Button>
                    </div>
                  ) : (
                    <>
                      {projects.map((project, index) => (
                        <div key={project.id} className="p-4 rounded-lg border bg-card space-y-3">
                          <div className="flex items-start justify-between">
                            <Badge variant="outline">{t('projects.projectNumber', { number: index + 1 })}</Badge>
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
                            placeholder={t('projects.namePlaceholder')}
                            value={project.title || ''}
                            onChange={(e) => updateProject(index, 'title', e.target.value)}
                          />
                          <Textarea
                            placeholder={t('projects.descriptionPlaceholder')}
                            value={project.description || ''}
                            onChange={(e) => updateProject(index, 'description', e.target.value)}
                            rows={2}
                          />
                          <Input
                            placeholder={t('projects.technologiesPlaceholder')}
                            value={project.technologies?.join(', ') || ''}
                            onChange={(e) => updateProject(index, 'technologies', e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
                          />
                          <div className="flex gap-2">
                            <Input
                              placeholder={t('projects.liveUrlPlaceholder')}
                              value={project.liveUrl || ''}
                              onChange={(e) => updateProject(index, 'liveUrl', e.target.value)}
                              className="flex-1"
                            />
                            <Input
                              placeholder={t('projects.githubUrlPlaceholder')}
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
                          {t('projects.addProject')}
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
                  <CardTitle className="text-2xl">{t('contactStep.title')}</CardTitle>
                  <CardDescription className="text-base">
                    {t('contactStep.description')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Field>
                      <FieldLabel htmlFor="email">{t('contactStep.emailLabel')} *</FieldLabel>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          placeholder={t('contactStep.emailPlaceholder')}
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="phone">{t('contactStep.phoneLabel')}</FieldLabel>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder={t('contactStep.phonePlaceholder')}
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                      />
                    </Field>
                  </div>

                  <Separator />

                  <FieldGroup className="gap-4">
                    <FieldLabel>{t('contactStep.socialsLabel')}</FieldLabel>
                    <div className="space-y-3">
                      <div className="relative">
                        <Github className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder={t('contactStep.githubPlaceholder')}
                          value={github}
                          onChange={(e) => setGithub(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      <div className="relative">
                        <Linkedin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder={t('contactStep.linkedinPlaceholder')}
                          value={linkedin}
                          onChange={(e) => setLinkedin(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      <div className="relative">
                        <Twitter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder={t('contactStep.twitterPlaceholder')}
                          value={twitter}
                          onChange={(e) => setTwitter(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </FieldGroup>

                  <Field>
                    <FieldLabel htmlFor="booking">{t('contactStep.bookingLabel')}</FieldLabel>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="booking"
                        placeholder={t('contactStep.bookingPlaceholder')}
                        value={bookingUrl}
                        onChange={(e) => setBookingUrl(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </Field>
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
                  <CardTitle className="text-2xl">{t('previewStep.title')}</CardTitle>
                  <CardDescription className="text-base">
                    {t('previewStep.description')}
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
                        <h3 className="text-xl font-semibold truncate">{name || t('identity.namePlaceholder')}</h3>
                        <p className="text-muted-foreground">{title || t('professional.titlePlaceholder')}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary" className="gap-1">
                            <span className={`h-2 w-2 rounded-full ${
                              availability === 'available' ? 'bg-green-500' :
                              availability === 'busy' ? 'bg-yellow-500' : 'bg-red-500'
                            }`} />
                            {availability === 'available' ? t('professional.availability.available') :
                             availability === 'busy' ? t('professional.availability.busy') : t('professional.availability.notAvailable')}
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
                        <p className="text-xs text-muted-foreground">{t('previewStep.stats.services')}</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{projects.filter(p => p.title).length}</p>
                        <p className="text-xs text-muted-foreground">{t('previewStep.stats.projects')}</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{yearsOfExperience || '—'}</p>
                        <p className="text-xs text-muted-foreground">{t('previewStep.stats.yearsExp')}</p>
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
                          {t('previewStep.publishing')}
                        </>
                      ) : (
                        <>
                          <Rocket className="h-4 w-4 mr-2" />
                          {t('previewStep.publishButton')}
                        </>
                      )}
                    </Button>
                    <Button 
                      variant="outline" 
                      className="w-full"
                      onClick={handleSaveAsDraft}
                      disabled={isLoading}
                    >
                      {t('previewStep.saveDraft')}
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
              {t('navigation.back')}
            </Button>
            <Button
              onClick={handleStepComplete}
              disabled={isLoading || (currentStep === 'identity' && (!name.trim() || !slug.trim()))}
              className="gap-2"
            >
              {isLoading ? (
                <>
                  <Spinner className="h-4 w-4" />
                  {currentStep === 'identity' ? t('navigation.creating') : t('navigation.saving')}
                </>
              ) : (
                <>
                  {t('navigation.continue')}
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
              {t('navigation.back')}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
