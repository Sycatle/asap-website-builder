"use client"

import type { FileMetadata } from "@/lib/api";

export interface RealtimeData {
  activeVisitors: number;
  todayVisits: number;
  todayPageViews: number;
  newsletterSubs: number;
  contactRequests: number;
  conversionRate: number;
}

export interface SiteProgressionCardProps {
  websiteId: string;
  pagesCount: number;
  sectionsCount: number;
  extensionsCount: number;
  isPublished: boolean;
  hasTheme: boolean;
  hasSEO: boolean;
}

export interface WeeklyGoalsCardProps {
  websiteId: string;
  currentVisits: number;
  currentSubscribers: number;
  currentContacts: number;
}

export interface AchievementsCardProps {
  websiteId: string;
  pagesCount: number;
  sectionsCount: number;
  extensionsCount: number;
  isPublished: boolean;
  totalVisits: number;
  newsletterSubs: number;
}

export interface TeamCardProps {
  websiteId: string;
}

export interface RecentEventsCardProps {
  websiteId: string;
}

export interface CloudPreviewCardProps {
  websiteId: string;
  storageUsed: number;
  storageLimit: number;
  storagePercentage: number;
}

export interface StatsCardsProps {
  realtimeData: RealtimeData;
  prevData: RealtimeData;
}

export interface TrendChartProps {
  websiteId: string;
  trendData: Array<{ day: string; visits: number }>;
}

export interface ConversionsCardProps {
  realtimeData: RealtimeData;
  prevData: RealtimeData;
}

export interface QuickActionsProps {
  websiteId: string;
  pagesCount: number;
  enabledExtensionsCount: number;
}
