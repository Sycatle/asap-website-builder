"use client"

import type { LucideIcon } from "lucide-react";

// ============================================================================
// Time Range
// ============================================================================

export type TimeRange = '7d' | '30d' | '90d';

// ============================================================================
// Traffic Data Types
// ============================================================================

export interface TrafficDataPoint {
  date: string;
  shortDate: string;
  visits: number;
  pageViews: number;
  uniqueVisitors: number;
  bounceRate: number;
  avgDuration: number;
}

export interface HourlyDataPoint {
  hour: string;
  visits: number;
  pageViews: number;
}

// ============================================================================
// Traffic Sources & Devices
// ============================================================================

export interface TrafficSource {
  name: string;
  value: number;
  visitors: number;
  change: number;
  color: string;
}

export interface DeviceData {
  name: string;
  value: number;
  icon: LucideIcon;
  color: string;
}

// ============================================================================
// Geographic Data
// ============================================================================

export interface CountryData {
  name: string;
  code: string;
  visitors: number;
  percent: number;
}

// ============================================================================
// Page & Content Data
// ============================================================================

export interface TopPageData {
  path: string;
  name: string;
  views: number;
  uniqueViews: number;
  avgTime: number;
  bounceRate: number;
}

// ============================================================================
// Conversion Metrics
// ============================================================================

export interface ConversionMetric {
  total: number;
  change: number;
  rate: string;
}

export interface ConversionsData {
  newsletterSignups: ConversionMetric;
  contactForms: ConversionMetric;
  ctaClicks: ConversionMetric;
  downloads: ConversionMetric;
}

// ============================================================================
// Engagement Metrics
// ============================================================================

export interface EngagementData {
  pagesPerSession: string;
  avgSessionDuration: number;
  scrollDepth: number;
  returnVisitors: number;
}

// ============================================================================
// Real-time Data
// ============================================================================

export interface RealtimeData {
  activeUsers: number;
  pageViewsPerMin: number;
  avgLoadTime: string;
}

// ============================================================================
// Period Changes
// ============================================================================

export interface PeriodChanges {
  visits: number;
  pageViews: number;
  uniqueVisitors: number;
  bounceRate: number;
  avgDuration: number;
}

// ============================================================================
// Combined Analytics Data
// ============================================================================

export interface AnalyticsData {
  trafficData: TrafficDataPoint[];
  totalVisits: number;
  totalPageViews: number;
  totalUniqueVisitors: number;
  avgBounceRate: number;
  avgDuration: number;
  changes: PeriodChanges;
  realtime: RealtimeData;
  trafficSources: TrafficSource[];
  devices: DeviceData[];
  topPages: TopPageData[];
  countries: CountryData[];
  conversions: ConversionsData;
  engagement: EngagementData;
  hourlyData: HourlyDataPoint[];
}

// ============================================================================
// Component Props
// ============================================================================

export interface KpiCardsProps {
  data: AnalyticsData;
}

export interface RealtimeBannerProps {
  realtime: RealtimeData;
}

export interface TrafficChartProps {
  data: TrafficDataPoint[];
}

export interface TrafficSourcesCardProps {
  sources: TrafficSource[];
}

export interface EngagementCardsProps {
  engagement: EngagementData;
}

export interface DevicesCardProps {
  devices: DeviceData[];
}

export interface CountriesCardProps {
  countries: CountryData[];
}

export interface HourlyChartProps {
  data: HourlyDataPoint[];
}

export interface TopPagesTableProps {
  pages: TopPageData[];
}

export interface ConversionsCardsProps {
  conversions: ConversionsData;
}

export interface ConversionFunnelProps {
  totalVisits: number;
  totalPageViews: number;
  conversions: ConversionsData;
}

export interface ChangeIndicatorProps {
  value: number;
  inverted?: boolean;
}
