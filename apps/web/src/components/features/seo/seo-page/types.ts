"use client"

import type { LucideIcon } from "lucide-react";

// ============================================================================
// Performance Data Types
// ============================================================================

export interface PerformanceDataPoint {
  date: string;
  shortDate: string;
  impressions: number;
  clicks: number;
  ctr: string;
  position: string;
}

export interface QueryData {
  query: string;
  impressions: number;
  clicks: number;
  ctr: string;
  position: string;
}

export interface PageData {
  path: string;
  title: string;
  impressions: number;
  clicks: number;
  ctr: string;
  position: string;
}

export interface CountryData {
  name: string;
  code: string;
  impressions: number;
  clicks: number;
  ctr: string;
}

export interface DeviceData {
  name: string;
  impressions: number;
  clicks: number;
  ctr: string;
  icon: LucideIcon;
}

// ============================================================================
// SEO Health Types
// ============================================================================

export interface SeoIssues {
  critical: number;
  warnings: number;
  passed: number;
}

export interface IndexingStatus {
  indexed: number;
  notIndexed: number;
  excluded: number;
  crawled: number;
}

export type WebVitalStatus = 'good' | 'needs-improvement' | 'poor';

export interface WebVitalMetric {
  value: string | number;
  status: WebVitalStatus;
}

export interface CoreWebVitals {
  lcp: WebVitalMetric;
  fid: WebVitalMetric;
  cls: WebVitalMetric;
  ttfb: WebVitalMetric;
}

export interface SeoIssueItem {
  type: 'critical' | 'warning' | 'info';
  title: string;
  count: number;
  icon: LucideIcon;
}

export interface SitemapStatus {
  lastSubmitted: string;
  urls: number;
  indexed: number;
  errors: number;
}

export interface RichResults {
  eligible: number;
  detected: number;
  types: string[];
}

// ============================================================================
// Backlinks Types
// ============================================================================

export interface BacklinksData {
  total: number;
  newThisMonth: number;
  lostThisMonth: number;
  dofollow: number;
  nofollow: number;
  referringDomains: number;
}

// ============================================================================
// Changes Types
// ============================================================================

export interface PerformanceChanges {
  impressions: number;
  clicks: number;
  ctr: number;
  position: number;
}

// ============================================================================
// Complete SEO Data Type
// ============================================================================

export interface SeoData {
  performanceData: PerformanceDataPoint[];
  totalImpressions: number;
  totalClicks: number;
  avgCtr: string;
  avgPosition: string;
  changes: PerformanceChanges;
  queries: QueryData[];
  pages: PageData[];
  countries: CountryData[];
  devices: DeviceData[];
  seoIssues: SeoIssues;
  seoScore: number;
  indexingStatus: IndexingStatus;
  coreWebVitals: CoreWebVitals;
  backlinks: BacklinksData;
  issuesList: SeoIssueItem[];
  sitemapStatus: SitemapStatus;
  richResults: RichResults;
}

// ============================================================================
// Component Props Types
// ============================================================================

export type TimeRange = '7d' | '28d' | '90d';

export interface SeoKpiCardsProps {
  data: SeoData;
}

export interface SeoHealthBannerProps {
  seoScore: number;
  seoIssues: SeoIssues;
}

export interface PerformanceTabProps {
  data: SeoData;
}

export interface QueriesTabProps {
  queries: QueryData[];
}

export interface PagesTabProps {
  pages: PageData[];
  indexingStatus: IndexingStatus;
  sitemapStatus: SitemapStatus;
}

export interface HealthTabProps {
  coreWebVitals: CoreWebVitals;
  issuesList: SeoIssueItem[];
  richResults: RichResults;
}

export interface BacklinksTabProps {
  backlinks: BacklinksData;
}
