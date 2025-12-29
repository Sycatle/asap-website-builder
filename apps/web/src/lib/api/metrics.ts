/**
 * V1 MVP: Product Metrics & Analytics
 * 
 * Activation Definition:
 * - Site is published
 * - Has at least 3 projects
 * - CTA is configured
 * - Contact email is set
 * 
 * All events are tracked for business validation.
 */

import { apiClient } from './client';
import type { ActivationMetrics } from '@asap/shared';

// ============================================
// Event Types
// ============================================

export type ProductEventType =
  // Onboarding flow events
  | 'onboarding_started'
  | 'onboarding_step_viewed'
  | 'onboarding_presets_loaded'
  | 'onboarding_preset_selected'
  | 'onboarding_template_confirmed'
  | 'github_oauth_started'
  | 'github_connected'
  | 'github_skipped'
  | 'github_repos_loaded'
  | 'repos_imported'
  | 'projects_imported'
  | 'profile_reviewed'
  | 'profile_previewed'
  | 'profile_completed'
  | 'site_published'
  | 'portfolio_published'
  | 'onboarding_completed'
  // Engagement events
  | 'profile_edited'
  | 'project_added'
  | 'project_removed'
  | 'theme_changed'
  | 'cta_configured'
  // Conversion events
  | 'site_visited'
  | 'contact_clicked'
  | 'social_clicked'
  | 'project_clicked';

export interface ProductEvent {
  type: ProductEventType;
  websiteId: string;
  data?: Record<string, unknown>;
  timestamp?: string;
}

// ============================================
// Metrics API
// ============================================

export const metricsAPI = {
  /**
   * Track a product event
   */
  async track(event: ProductEvent): Promise<void> {
    return apiClient.post('/metrics/events', {
      event_type: event.type,
      website_id: event.websiteId,
      event_data: event.data || {},
    });
  },

  /**
   * Track multiple events at once (batch)
   */
  async trackBatch(events: ProductEvent[]): Promise<void> {
    return apiClient.post('/metrics/events/batch', {
      events: events.map(e => ({
        event_type: e.type,
        website_id: e.websiteId,
        event_data: e.data || {},
      })),
    });
  },

  /**
   * Get activation metrics for a website
   */
  async getActivation(websiteId: string): Promise<ActivationMetrics> {
    return apiClient.get<ActivationMetrics>(`/websites/${websiteId}/activation`);
  },

  /**
   * Get aggregated metrics for admin dashboard
   */
  async getAggregated(): Promise<AggregatedMetrics> {
    return apiClient.get<AggregatedMetrics>('/metrics/aggregated');
  },
};

// ============================================
// Aggregated Metrics (Admin)
// ============================================

export interface AggregatedMetrics {
  // Funnel
  totalSignups: number;
  githubConnected: number;
  projectsImported: number;
  sitesPublished: number;
  activatedUsers: number;
  
  // Conversion rates
  signupToGithub: number;       // %
  githubToImport: number;       // %
  importToPublish: number;      // %
  publishToActivation: number;  // %
  
  // Engagement
  avgProjectsPerSite: number;
  avgTimeToPublish: number;     // minutes
  
  // Time period
  period: 'day' | 'week' | 'month';
  startDate: string;
  endDate: string;
}

// ============================================
// Client-side Tracking Helpers
// ============================================

let eventQueue: ProductEvent[] = [];
let flushTimeout: ReturnType<typeof setTimeout> | null = null;

/**
 * Track an event (queued for batch sending)
 */
export function trackEvent(
  type: ProductEventType, 
  websiteId: string, 
  data?: Record<string, unknown>
): void {
  // Use null UUID for demo/new mode
  const effectiveWebsiteId = (websiteId === 'demo' || websiteId === 'new')
    ? '00000000-0000-0000-0000-000000000000'
    : websiteId;
    
  eventQueue.push({
    type,
    websiteId: effectiveWebsiteId,
    data,
    timestamp: new Date().toISOString(),
  });

  // Debounce: flush after 1 second of inactivity or 10 events
  if (flushTimeout) clearTimeout(flushTimeout);
  
  if (eventQueue.length >= 10) {
    flushEvents();
  } else {
    flushTimeout = setTimeout(flushEvents, 1000);
  }
}

/**
 * Flush queued events to the server
 */
async function flushEvents(): Promise<void> {
  if (eventQueue.length === 0) return;
  
  const eventsToSend = [...eventQueue];
  eventQueue = [];
  
  try {
    await metricsAPI.trackBatch(eventsToSend);
  } catch (error) {
    // Re-queue failed events (up to 50)
    eventQueue = [...eventsToSend.slice(0, 50), ...eventQueue].slice(0, 100);
    console.error('Failed to send metrics:', error);
  }
}

/**
 * Flush events immediately (e.g., on page unload)
 */
export function flushEventsSync(): void {
  if (eventQueue.length === 0) return;
  
  // Use sendBeacon for reliable delivery on page unload
  if (typeof navigator !== 'undefined' && navigator.sendBeacon) {
    const data = JSON.stringify({
      events: eventQueue.map(e => ({
        event_type: e.type,
        website_id: e.websiteId,
        event_data: e.data || {},
      })),
    });
    navigator.sendBeacon('/api/v1/metrics/events/batch', data);
    eventQueue = [];
  }
}

// Setup page unload handler
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', flushEventsSync);
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushEventsSync();
    }
  });
}

// ============================================
// Activation Checklist UI Helper
// ============================================

export interface ActivationChecklistItem {
  id: string;
  label: string;
  description: string;
  completed: boolean;
  action?: {
    label: string;
    href: string;
  };
}

export function getActivationChecklist(
  metrics: ActivationMetrics,
  websiteId: string
): ActivationChecklistItem[] {
  return [
    {
      id: 'projects',
      label: 'Ajouter 3 projets minimum',
      description: 'Importez vos repos GitHub ou ajoutez-les manuellement',
      completed: metrics.hasMinProjects,
      action: !metrics.hasMinProjects ? {
        label: 'Ajouter des projets',
        href: `/dashboard/${websiteId}/projects`,
      } : undefined,
    },
    {
      id: 'cta',
      label: 'Configurer votre CTA',
      description: 'Définissez l\'action principale de votre portfolio',
      completed: metrics.ctaConfigured,
      action: !metrics.ctaConfigured ? {
        label: 'Configurer le CTA',
        href: `/dashboard/${websiteId}/settings`,
      } : undefined,
    },
    {
      id: 'contact',
      label: 'Ajouter un email de contact',
      description: 'Permettez aux visiteurs de vous contacter',
      completed: metrics.contactConfigured,
      action: !metrics.contactConfigured ? {
        label: 'Ajouter un email',
        href: `/dashboard/${websiteId}/contact`,
      } : undefined,
    },
    {
      id: 'publish',
      label: 'Publier votre portfolio',
      description: 'Rendez votre portfolio accessible au public',
      completed: metrics.published,
      action: !metrics.published ? {
        label: 'Publier maintenant',
        href: `/dashboard/${websiteId}/publish`,
      } : undefined,
    },
  ];
}

// ============================================
// Public Site Analytics (visitor tracking)
// ============================================

/**
 * Track a page view on the public site
 * Called from apps/sites
 */
export function trackPageView(slug: string): void {
  // Use simple fetch to avoid loading the full API client
  fetch('/api/v1/public/analytics/pageview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug }),
  }).catch(() => {
    // Silent fail for analytics
  });
}

/**
 * Track a CTA click on the public site
 */
export function trackCTAClick(slug: string, ctaType: 'primary' | 'secondary' | 'contact' | 'social'): void {
  fetch('/api/v1/public/analytics/cta', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ slug, cta_type: ctaType }),
  }).catch(() => {
    // Silent fail for analytics
  });
}
