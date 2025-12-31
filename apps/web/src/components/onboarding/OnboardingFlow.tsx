/**
 * V1 MVP: Onboarding Flow (In-Dashboard)
 * 
 * This component is shown in the Dashboard when the user has no websites.
 * It guides them through creating their first portfolio.
 * 
 * Flow: Skip GitHub (V1) → Review Profile → Publish
 */

import * as React from 'react';
import { useTranslation } from 'react-i18next';
import { websitesAPI } from '@/lib/api';
import { trackEvent } from '@/lib/api/metrics';
import { DEFAULT_FREELANCE_PROFILE, type FreelanceDevProfile, type FreelanceProject } from '@asap/shared';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Field,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Spinner } from '@/components/ui/spinner';
import { 
  Github, 
  ArrowRight, 
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
} from 'lucide-react';

type OnboardingStep = 'welcome' | 'profile' | 'projects' | 'publish' | 'completed';

interface OnboardingFlowProps {
  onComplete: (websiteId: string) => void;
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const { t } = useTranslation(['onboarding', 'common']);
  const [currentStep, setCurrentStep] = React.useState<OnboardingStep>('welcome');
  const [isLoading, setIsLoading] = React.useState(false);
  const [websiteId, setWebsiteId] = React.useState<string | null>(null);
  
  // Profile state
  const [name, setName] = React.useState('');
  const [slug, setSlug] = React.useState('');
  const [title, setTitle] = React.useState('');
  const [bio, setBio] = React.useState('');
  const [email, setEmail] = React.useState('');
  
  // Projects state
  const [projects, setProjects] = React.useState<Partial<FreelanceProject>[]>([]);
  
  // Track step
  React.useEffect(() => {
    trackEvent('onboarding_step_viewed', websiteId || '00000000-0000-0000-0000-000000000000', { step: currentStep });
  }, [currentStep, websiteId]);

  // Step 1: Create website and move to profile
  const handleStart = async () => {
    setIsLoading(true);
    try {
      // Generate a slug from name or use a random one
      const generatedSlug = slug || `portfolio-${Date.now().toString(36)}`;
      
      // Create the website
      const website = await websitesAPI.create({
        slug: generatedSlug,
        title: name || 'Mon Portfolio',
        tagline: title || 'Développeur Freelance',
        creation_mode: 'onboarding',
        preset_id: undefined,
      });
      
      setWebsiteId(website.id);
      trackEvent('onboarding_started', website.id);
      setCurrentStep('profile');
      toast.success(t('flow.toasts.portfolioCreated'));
    } catch (error: any) {
      console.error('Failed to create website:', error);
      if (error?.response?.data?.error?.includes('slug')) {
        toast.error(t('flow.toasts.slugTaken'));
      } else {
        toast.error(t('flow.toasts.createError'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Save profile and move to projects
  const handleSaveProfile = async () => {
    if (!websiteId) return;
    
    setIsLoading(true);
    try {
      // Update website metadata with profile info
      await websitesAPI.update(websiteId, {
        title: name || 'Mon Portfolio',
        tagline: title || 'Développeur Freelance',
        metadata: {
          profile: {
            name,
            title,
            bio,
            email,
          },
        },
      });
      
      trackEvent('profile_completed', websiteId);
      setCurrentStep('projects');
      toast.success(t('flow.toasts.profileSaved'));
    } catch (error) {
      console.error('Failed to save profile:', error);
      toast.error(t('flow.toasts.saveError'));
    } finally {
      setIsLoading(false);
    }
  };

  // Add a project
  const handleAddProject = () => {
    setProjects([...projects, {
      id: `project-${Date.now()}`,
      title: '',
      description: '',
      technologies: [],
      featured: false,
      type: 'personal',
    }]);
  };

  // Remove a project
  const handleRemoveProject = (index: number) => {
    setProjects(projects.filter((_, i) => i !== index));
  };

  // Update a project
  const handleUpdateProject = (index: number, field: string, value: any) => {
    const updated = [...projects];
    updated[index] = { ...updated[index], [field]: value };
    setProjects(updated);
  };

  // Step 3: Save projects and move to publish
  const handleSaveProjects = async () => {
    if (!websiteId) return;
    
    setIsLoading(true);
    try {
      // Update website data with projects
      const currentData = await websitesAPI.getData(websiteId);
      await websitesAPI.patchData(websiteId, {
        ...currentData,
        profile: {
          ...currentData?.profile,
          projects: projects.filter(p => p.title), // Filter out empty projects
        },
      });
      
      trackEvent('projects_imported', websiteId, { count: projects.length });
      setCurrentStep('publish');
      toast.success(t('flow.toasts.projectsSaved'));
    } catch (error) {
      console.error('Failed to save projects:', error);
      toast.error(t('flow.toasts.saveError'));
    } finally {
      setIsLoading(false);
    }
  };

  // Step 4: Publish and complete
  const handlePublish = async () => {
    if (!websiteId) return;
    
    setIsLoading(true);
    try {
      await websitesAPI.publish(websiteId);
      trackEvent('site_published', websiteId);
      trackEvent('onboarding_completed', websiteId);
      setCurrentStep('completed');
      toast.success(t('flow.toasts.portfolioOnline'));
    } catch (error) {
      console.error('Failed to publish:', error);
      toast.error(t('flow.toasts.publishError'));
    } finally {
      setIsLoading(false);
    }
  };

  // Skip to dashboard (keep as draft)
  const handleSkipPublish = () => {
    if (websiteId) {
      trackEvent('onboarding_completed', websiteId, { skipped_publish: true });
      onComplete(websiteId);
    }
  };

  // Go to dashboard after completion
  const handleGoToDashboard = () => {
    if (websiteId) {
      onComplete(websiteId);
    }
  };

  // Progress percentage
  const stepProgress = {
    'welcome': 0,
    'profile': 25,
    'projects': 50,
    'publish': 75,
    'completed': 100,
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm text-muted-foreground">
          <span>{t('flow.progress.title')}</span>
          <span>{stepProgress[currentStep]}%</span>
        </div>
        <Progress value={stepProgress[currentStep]} className="h-2" />
      </div>

      {/* Step: Welcome */}
      {currentStep === 'welcome' && (
        <Card className="border-2 border-primary/20">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">{t('flow.welcome.title')}</CardTitle>
            <CardDescription className="text-base">
              {t('flow.welcome.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="name">{t('flow.welcome.nameLabel')}</FieldLabel>
                <Input
                  id="name"
                  placeholder={t('flow.welcome.namePlaceholder')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="slug">{t('flow.welcome.urlLabel')}</FieldLabel>
                <div className="flex items-center gap-2">
                  <Input
                    id="slug"
                    placeholder={t('flow.welcome.urlPlaceholder')}
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))}
                    className="font-mono"
                  />
                  <span className="text-sm text-muted-foreground whitespace-nowrap">.asap.cool</span>
                </div>
              </Field>
            </FieldGroup>

            <Button 
              className="w-full" 
              size="lg" 
              onClick={handleStart}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Spinner className="h-4 w-4 mr-2" />
                  {t('flow.welcome.creating')}
                </>
              ) : (
                <>
                  {t('flow.welcome.startButton')}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              {t('flow.welcome.githubNote')}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Step: Profile */}
      {currentStep === 'profile' && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              <CardTitle>{t('flow.profile.title')}</CardTitle>
            </div>
            <CardDescription>
              {t('flow.profile.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="profile-name">{t('flow.profile.fullName')}</FieldLabel>
                <Input
                  id="profile-name"
                  placeholder={t('flow.welcome.namePlaceholder')}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="profile-title">{t('flow.profile.professionalTitle')}</FieldLabel>
                <Input
                  id="profile-title"
                  placeholder={t('flow.profile.titlePlaceholder')}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="profile-bio">{t('flow.profile.biography')}</FieldLabel>
                <Textarea
                  id="profile-bio"
                  placeholder={t('flow.profile.bioPlaceholder')}
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={4}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="profile-email">{t('flow.profile.contactEmail')}</FieldLabel>
                <Input
                  id="profile-email"
                  type="email"
                  placeholder={t('flow.profile.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>
            </FieldGroup>

            <div className="flex gap-2 pt-4">
              <Button 
                className="flex-1" 
                onClick={handleSaveProfile}
                disabled={isLoading || !name}
              >
                {isLoading ? (
                  <Spinner className="h-4 w-4 mr-2" />
                ) : null}
                {t('common:actions.continue')}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Projects */}
      {currentStep === 'projects' && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" />
              <CardTitle>{t('flow.projects.title')}</CardTitle>
            </div>
            <CardDescription>
              {t('flow.projects.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {projects.map((project, index) => (
              <Card key={project.id || index} className="p-4 space-y-3 relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 h-6 w-6"
                  onClick={() => handleRemoveProject(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
                <FieldGroup>
                  <Field>
                    <FieldLabel>{t('flow.projects.projectName')}</FieldLabel>
                    <Input
                      placeholder={t('flow.projects.projectNamePlaceholder')}
                      value={project.title || ''}
                      onChange={(e) => handleUpdateProject(index, 'title', e.target.value)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>{t('flow.projects.projectDescription')}</FieldLabel>
                    <Textarea
                      placeholder={t('flow.projects.descriptionPlaceholder')}
                      value={project.description || ''}
                      onChange={(e) => handleUpdateProject(index, 'description', e.target.value)}
                      rows={2}
                    />
                  </Field>
                  <Field>
                    <FieldLabel>{t('flow.projects.technologies')}</FieldLabel>
                    <Input
                      placeholder={t('flow.projects.techPlaceholder')}
                      value={project.technologies?.join(', ') || ''}
                      onChange={(e) => handleUpdateProject(index, 'technologies', e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
                    />
                  </Field>
                </FieldGroup>
              </Card>
            ))}

            <Button
              variant="outline"
              className="w-full"
              onClick={handleAddProject}
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('flow.projects.addProject')}
            </Button>

            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setCurrentStep('profile')}
              >
                {t('common:actions.back')}
              </Button>
              <Button 
                className="flex-1" 
                onClick={handleSaveProjects}
                disabled={isLoading}
              >
                {isLoading ? (
                  <Spinner className="h-4 w-4 mr-2" />
                ) : null}
                {t('common:actions.continue')}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              {t('flow.projects.note')}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Step: Publish */}
      {currentStep === 'publish' && (
        <Card className="border-2 border-green-500/20">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center">
              <Rocket className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl">{t('flow.publish.title')}</CardTitle>
            <CardDescription className="text-base">
              {t('flow.publish.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 rounded-lg bg-muted/50 text-center">
              <p className="text-sm text-muted-foreground mb-1">{t('flow.publish.accessibleAt')}</p>
              <p className="font-mono font-semibold">{slug || t('flow.publish.defaultSlug')}.asap.cool</p>
            </div>

            <div className="flex flex-col gap-2">
              <Button 
                className="w-full bg-green-600 hover:bg-green-700" 
                size="lg"
                onClick={handlePublish}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Spinner className="h-4 w-4 mr-2" />
                    {t('flow.publish.publishing')}
                  </>
                ) : (
                  <>
                    <Rocket className="h-4 w-4 mr-2" />
                    {t('flow.publish.publishButton')}
                  </>
                )}
              </Button>
              <Button 
                variant="ghost" 
                onClick={handleSkipPublish}
                disabled={isLoading}
              >
                {t('flow.publish.publishLater')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step: Completed */}
      {currentStep === 'completed' && (
        <Card className="border-2 border-green-500/20">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <CardTitle className="text-2xl">{t('flow.completed.title')}</CardTitle>
            <CardDescription className="text-base">
              {t('flow.completed.description')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 rounded-lg bg-green-500/10 text-center">
              <p className="text-sm text-muted-foreground mb-2">{t('flow.completed.visitPortfolio')}</p>
              <a 
                href={`https://${slug || t('flow.publish.defaultSlug')}.asap.cool`}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono font-semibold text-green-600 hover:underline flex items-center justify-center gap-1"
              >
                {slug || t('flow.publish.defaultSlug')}.asap.cool
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>

            <Button 
              className="w-full" 
              size="lg"
              onClick={handleGoToDashboard}
            >
              {t('flow.completed.goToDashboard')}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
