/**
 * V1 MVP: GitHub Onboarding Flow
 * 
 * Happy Path: GitHub Connect → Import Projects → Review → Publish
 * 
 * This module handles the onboarding flow for new freelance portfolios.
 */

import { apiClient } from './client';
import type { FreelanceProject } from '@asap/shared';

// ============================================
// Onboarding Steps
// ============================================

export type OnboardingStep = 
  | 'github_connect'    // Step 1: Connect GitHub
  | 'import_projects'   // Step 2: Select repos to import
  | 'review_profile'    // Step 3: Review & edit profile
  | 'publish'           // Step 4: Publish portfolio
  | 'completed';        // Done!

export interface OnboardingState {
  currentStep: OnboardingStep;
  githubConnected: boolean;
  githubUsername?: string;
  selectedRepos: string[];
  importedProjects: FreelanceProject[];
  profileCompleted: boolean;
  published: boolean;
}

// ============================================
// GitHub Repository (from API)
// ============================================

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  stargazers_count: number;
  language: string | null;
  topics: string[];
  pushed_at: string;
  fork: boolean;
}

// ============================================
// API Endpoints
// ============================================

export const onboardingAPI = {
  /**
   * Get current onboarding state for a website
   */
  async getState(websiteId: string): Promise<OnboardingState> {
    return apiClient.get<OnboardingState>(`/websites/${websiteId}/onboarding`);
  },

  /**
   * Update onboarding step
   */
  async updateStep(websiteId: string, step: OnboardingStep): Promise<void> {
    return apiClient.patch(`/websites/${websiteId}/onboarding`, { step });
  },

  /**
   * Initiate GitHub OAuth flow
   * Returns the OAuth URL to redirect to
   */
  async initiateGitHubOAuth(websiteId: string): Promise<{ url: string }> {
    return apiClient.post<{ url: string }>(`/websites/${websiteId}/github/connect`, {});
  },

  /**
   * Complete GitHub OAuth (called after redirect back)
   */
  async completeGitHubOAuth(websiteId: string, code: string): Promise<{ 
    success: boolean; 
    username: string;
  }> {
    return apiClient.post(`/websites/${websiteId}/github/callback`, { code });
  },

  /**
   * Fetch user's GitHub repositories
   */
  async fetchGitHubRepos(websiteId: string): Promise<GitHubRepo[]> {
    return apiClient.get<GitHubRepo[]>(`/websites/${websiteId}/github/repos`);
  },

  /**
   * Import selected repositories as projects
   */
  async importRepos(websiteId: string, repoIds: number[]): Promise<FreelanceProject[]> {
    return apiClient.post<FreelanceProject[]>(`/websites/${websiteId}/github/import`, { 
      repo_ids: repoIds 
    });
  },

  /**
   * Skip GitHub import (manual project entry)
   */
  async skipGitHubImport(websiteId: string): Promise<void> {
    return apiClient.post(`/websites/${websiteId}/onboarding/skip-github`, {});
  },
};

// ============================================
// Onboarding Helper Functions
// ============================================

/**
 * Convert GitHub repo to FreelanceProject
 */
export function repoToProject(repo: GitHubRepo): Omit<FreelanceProject, 'id'> {
  // Extract technologies from language and topics
  const technologies: string[] = [];
  if (repo.language) technologies.push(repo.language);
  technologies.push(...repo.topics.slice(0, 4));

  return {
    title: repo.name.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    description: repo.description || `Projet ${repo.name}`,
    technologies: [...new Set(technologies)].slice(0, 5),
    githubUrl: repo.html_url,
    liveUrl: repo.homepage || undefined,
    featured: repo.stargazers_count > 10,
    type: repo.fork ? 'opensource' : 'personal',
    year: new Date(repo.pushed_at).getFullYear(),
    fromGithub: true,
    stars: repo.stargazers_count,
  };
}

/**
 * Sort repos by relevance for portfolio
 */
export function sortReposByRelevance(repos: GitHubRepo[]): GitHubRepo[] {
  return [...repos].sort((a, b) => {
    // Non-forks first
    if (a.fork !== b.fork) return a.fork ? 1 : -1;
    // More stars = better
    if (a.stargazers_count !== b.stargazers_count) {
      return b.stargazers_count - a.stargazers_count;
    }
    // More recent = better
    return new Date(b.pushed_at).getTime() - new Date(a.pushed_at).getTime();
  });
}

/**
 * Get step number (1-based) for progress indicator
 */
export function getStepNumber(step: OnboardingStep): number {
  const steps: OnboardingStep[] = [
    'github_connect',
    'import_projects',
    'review_profile',
    'publish',
    'completed',
  ];
  return steps.indexOf(step) + 1;
}

/**
 * Get next step in the flow
 */
export function getNextStep(current: OnboardingStep): OnboardingStep {
  const flow: Record<OnboardingStep, OnboardingStep> = {
    'github_connect': 'import_projects',
    'import_projects': 'review_profile',
    'review_profile': 'publish',
    'publish': 'completed',
    'completed': 'completed',
  };
  return flow[current];
}

/**
 * Check if a step is completed
 */
export function isStepCompleted(current: OnboardingStep, checkStep: OnboardingStep): boolean {
  const order: OnboardingStep[] = [
    'github_connect',
    'import_projects',
    'review_profile',
    'publish',
    'completed',
  ];
  return order.indexOf(current) > order.indexOf(checkStep);
}

// ============================================
// Onboarding Progress
// ============================================

export interface OnboardingProgress {
  currentStep: number;
  totalSteps: number;
  percentage: number;
  stepLabel: string;
}

export function calculateProgress(step: OnboardingStep): OnboardingProgress {
  const stepLabels: Record<OnboardingStep, string> = {
    'github_connect': 'Connexion GitHub',
    'import_projects': 'Import des projets',
    'review_profile': 'Configuration du profil',
    'publish': 'Publication',
    'completed': 'Terminé !',
  };

  const currentStep = getStepNumber(step);
  const totalSteps = 4; // Not counting 'completed'
  const percentage = step === 'completed' ? 100 : ((currentStep - 1) / totalSteps) * 100;

  return {
    currentStep,
    totalSteps,
    percentage,
    stepLabel: stepLabels[step],
  };
}
