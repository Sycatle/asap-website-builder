/**
 * V1 MVP: Onboarding Wizard
 * 
 * Main component orchestrating the onboarding flow:
 * GitHub Connect → Import Projects → Review Profile → Publish
 */

import * as React from 'react';
import { OnboardingLayout } from './OnboardingLayout';
import { GitHubConnectStep } from './GitHubConnectStep';
import { ImportProjectsStep } from './ImportProjectsStep';
import { ReviewProfileStep } from './ReviewProfileStep';
import { PublishStep } from './PublishStep';
import { 
  onboardingAPI, 
  type OnboardingStep, 
  type GitHubRepo,
  repoToProject,
  getNextStep,
} from '@/lib/api/onboarding';
import { metricsAPI, trackEvent } from '@/lib/api/metrics';
import { DEFAULT_FREELANCE_PROFILE, type FreelanceDevProfile, type FreelanceProject } from '@asap/shared';
import { toast } from 'sonner';

interface OnboardingWizardProps {
  websiteId: string;
  initialStep?: OnboardingStep;
}

export function OnboardingWizard({ websiteId, initialStep = 'github_connect' }: OnboardingWizardProps) {
  // State
  const [currentStep, setCurrentStep] = React.useState<OnboardingStep>(initialStep);
  const [isLoading, setIsLoading] = React.useState(false);
  
  // GitHub state
  const [githubRepos, setGithubRepos] = React.useState<GitHubRepo[]>([]);
  const [selectedRepoIds, setSelectedRepoIds] = React.useState<number[]>([]);
  const [isLoadingRepos, setIsLoadingRepos] = React.useState(false);
  const [isImporting, setIsImporting] = React.useState(false);
  
  // Profile state - create a full profile from default
  const [profile, setProfile] = React.useState<FreelanceDevProfile>(() => ({
    ...DEFAULT_FREELANCE_PROFILE,
    slug: websiteId,
    meta: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      published: false,
    },
  }));
  
  // Publish state
  const [subdomain, setSubdomain] = React.useState('');
  const [isPublishing, setIsPublishing] = React.useState(false);
  const [isPublished, setIsPublished] = React.useState(false);
  const [publishedUrl, setPublishedUrl] = React.useState<string>();

  // Track step changes
  React.useEffect(() => {
    trackEvent('onboarding_step_viewed', websiteId, { step: currentStep });
  }, [currentStep, websiteId]);

  // ========================
  // Step 1: GitHub Connect
  // ========================
  
  const handleGitHubConnect = async () => {
    setIsLoading(true);
    try {
      const { url } = await onboardingAPI.initiateGitHubOAuth(websiteId);
      trackEvent('github_oauth_started', websiteId);
      // Redirect to GitHub OAuth
      window.location.href = url;
    } catch (error: any) {
      console.error('GitHub OAuth error:', error);
      // Check if GitHub is not configured yet (V1)
      if (error?.response?.status === 503 || error?.message?.includes('GitHub OAuth not configured')) {
        toast.info('L\'intégration GitHub sera disponible prochainement. Vous pouvez ajouter vos projets manuellement.');
        // Skip to profile editing
        setCurrentStep('review_profile');
      } else if (error?.response?.status === 401 || error?.response?.status === 400) {
        // Not authenticated or invalid website ID - skip to profile for demo mode
        toast.info('Mode démo: ajoutez vos projets manuellement');
        setCurrentStep('review_profile');
      } else {
        toast.error('Erreur lors de la connexion GitHub');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkipGitHub = async () => {
    setIsLoading(true);
    try {
      // In demo mode or without auth, just skip locally
      if (websiteId === 'demo' || websiteId === 'new') {
        trackEvent('github_skipped', websiteId);
        setCurrentStep('review_profile');
        toast.info('Vous pourrez ajouter des projets manuellement');
        return;
      }
      await onboardingAPI.skipGitHubImport(websiteId);
      trackEvent('github_skipped', websiteId);
      setCurrentStep('review_profile');
      toast.info('Vous pourrez ajouter des projets manuellement');
    } catch (error: any) {
      console.error('Skip error:', error);
      // In case of auth error, just proceed locally
      if (error?.response?.status === 401 || error?.response?.status === 400) {
        setCurrentStep('review_profile');
        toast.info('Vous pourrez ajouter des projets manuellement');
      } else {
        toast.error('Une erreur est survenue');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ========================
  // Step 2: Import Projects
  // ========================
  
  // Load repos when entering import step
  React.useEffect(() => {
    if (currentStep === 'import_projects' && githubRepos.length === 0) {
      loadGitHubRepos();
    }
  }, [currentStep]);

  const loadGitHubRepos = async () => {
    setIsLoadingRepos(true);
    try {
      const repos = await onboardingAPI.fetchGitHubRepos(websiteId);
      setGithubRepos(repos);
      trackEvent('github_repos_loaded', websiteId, { repoCount: repos.length });
      
      // Pre-select top repos (non-forks with most stars)
      const recommended = repos
        .filter(r => !r.fork)
        .sort((a, b) => b.stargazers_count - a.stargazers_count)
        .slice(0, 4)
        .map(r => r.id);
      setSelectedRepoIds(recommended);
    } catch (error) {
      console.error('Error loading repos:', error);
      toast.error('Erreur lors du chargement des repositories');
    } finally {
      setIsLoadingRepos(false);
    }
  };

  const handleImportProjects = async () => {
    if (selectedRepoIds.length === 0) {
      toast.error('Sélectionnez au moins un repository');
      return;
    }

    setIsImporting(true);
    try {
      const importedProjects = await onboardingAPI.importRepos(websiteId, selectedRepoIds);
      
      // Update profile with imported projects
      setProfile((prev: FreelanceDevProfile) => ({
        ...prev,
        projects: {
          ...prev.projects,
          items: importedProjects,
        },
      }));
      
      trackEvent('projects_imported', websiteId, { 
        projectCount: importedProjects.length,
        fromGithub: true,
      });
      
      toast.success(`${importedProjects.length} projet(s) importé(s) !`);
      setCurrentStep('review_profile');
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Erreur lors de l\'import des projets');
    } finally {
      setIsImporting(false);
    }
  };

  const handleBackFromImport = () => {
    setCurrentStep('github_connect');
  };

  // ========================
  // Step 3: Review Profile
  // ========================
  
  const handleProfileChange = (updatedProfile: FreelanceDevProfile) => {
    setProfile(updatedProfile);
  };

  const handlePreviewProfile = () => {
    // Open preview in new tab
    window.open(`/preview/${websiteId}`, '_blank');
    trackEvent('profile_previewed', websiteId);
  };

  const handleNextFromReview = () => {
    // Validate minimum requirements
    if (!profile.identity.name) {
      toast.error('Veuillez entrer votre nom');
      return;
    }
    if (!profile.contact.email) {
      toast.error('Veuillez entrer votre email de contact');
      return;
    }
    
    trackEvent('profile_completed', websiteId);
    setCurrentStep('publish');
  };

  const handleBackFromReview = () => {
    setCurrentStep('import_projects');
  };

  // ========================
  // Step 4: Publish
  // ========================
  
  const handlePublish = async () => {
    if (!subdomain) {
      toast.error('Veuillez choisir un sous-domaine');
      return;
    }

    setIsPublishing(true);
    try {
      // In a real implementation, this would call the API
      // await websiteAPI.publish(websiteId, { subdomain, profile });
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const url = `https://${subdomain}.asap.cool`;
      setPublishedUrl(url);
      setIsPublished(true);
      setCurrentStep('completed');
      
      trackEvent('portfolio_published', websiteId, { 
        subdomain,
        projectCount: profile.projects.length,
        serviceCount: profile.services.length,
      });
      
      toast.success('Portfolio publié avec succès !');
    } catch (error) {
      console.error('Publish error:', error);
      toast.error('Erreur lors de la publication');
    } finally {
      setIsPublishing(false);
    }
  };

  const handleBackFromPublish = () => {
    setCurrentStep('review_profile');
  };

  // ========================
  // Render current step
  // ========================
  
  const renderStep = () => {
    switch (currentStep) {
      case 'github_connect':
        return (
          <GitHubConnectStep
            onConnect={handleGitHubConnect}
            onSkip={handleSkipGitHub}
            isLoading={isLoading}
          />
        );

      case 'import_projects':
        return (
          <ImportProjectsStep
            repos={githubRepos}
            selectedRepoIds={selectedRepoIds}
            onSelectionChange={setSelectedRepoIds}
            onNext={handleImportProjects}
            onBack={handleBackFromImport}
            isLoading={isLoadingRepos}
            isImporting={isImporting}
          />
        );

      case 'review_profile':
        return (
          <ReviewProfileStep
            profile={profile}
            onProfileChange={handleProfileChange}
            onNext={handleNextFromReview}
            onBack={handleBackFromReview}
            onPreview={handlePreviewProfile}
            isLoading={isLoading}
          />
        );

      case 'publish':
      case 'completed':
        return (
          <PublishStep
            profile={profile}
            subdomain={subdomain}
            onSubdomainChange={setSubdomain}
            onPublish={handlePublish}
            onBack={handleBackFromPublish}
            isPublishing={isPublishing}
            isPublished={isPublished}
            publishedUrl={publishedUrl}
          />
        );

      default:
        return null;
    }
  };

  return (
    <OnboardingLayout currentStep={currentStep}>
      {renderStep()}
    </OnboardingLayout>
  );
}

// ========================
// Simulated data for development
// ========================

export const MOCK_GITHUB_REPOS: GitHubRepo[] = [
  {
    id: 1,
    name: 'awesome-portfolio',
    full_name: 'user/awesome-portfolio',
    description: 'Mon portfolio personnel avec Next.js et TailwindCSS',
    html_url: 'https://github.com/user/awesome-portfolio',
    homepage: 'https://portfolio.example.com',
    stargazers_count: 42,
    language: 'TypeScript',
    topics: ['nextjs', 'tailwindcss', 'react', 'portfolio'],
    pushed_at: new Date().toISOString(),
    fork: false,
  },
  {
    id: 2,
    name: 'react-dashboard',
    full_name: 'user/react-dashboard',
    description: 'Dashboard admin moderne avec React et Chart.js',
    html_url: 'https://github.com/user/react-dashboard',
    homepage: null,
    stargazers_count: 128,
    language: 'TypeScript',
    topics: ['react', 'dashboard', 'chartjs'],
    pushed_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    fork: false,
  },
  {
    id: 3,
    name: 'api-starter',
    full_name: 'user/api-starter',
    description: 'Boilerplate Node.js pour APIs REST avec Express',
    html_url: 'https://github.com/user/api-starter',
    homepage: null,
    stargazers_count: 15,
    language: 'JavaScript',
    topics: ['nodejs', 'express', 'api', 'boilerplate'],
    pushed_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    fork: false,
  },
  {
    id: 4,
    name: 'dotfiles',
    full_name: 'user/dotfiles',
    description: 'Ma configuration de développement',
    html_url: 'https://github.com/user/dotfiles',
    homepage: null,
    stargazers_count: 5,
    language: 'Shell',
    topics: ['dotfiles', 'zsh', 'vim'],
    pushed_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
    fork: false,
  },
  {
    id: 5,
    name: 'fork-awesome-lib',
    full_name: 'user/fork-awesome-lib',
    description: 'Fork of awesome-lib with custom modifications',
    html_url: 'https://github.com/user/fork-awesome-lib',
    homepage: null,
    stargazers_count: 0,
    language: 'Python',
    topics: [],
    pushed_at: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(),
    fork: true,
  },
];
