"use client"

import { useState, useEffect, useMemo } from 'react';
import { Smartphone, Monitor, Tablet } from "lucide-react";
import type { TimeRange, AnalyticsData } from './types';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate seeded pseudo-random number for consistent demo data
 */
function seededRandom(baseSeed: number, offset: number, timeSlot: number, refreshKey: number): number {
  const seed = Math.abs((baseSeed + offset + timeSlot + refreshKey) * 2654435761 % 2147483647);
  return seed / 2147483647;
}

/**
 * Small variation function for real-time feel
 */
function vary(base: number, percent: number = 5): number {
  const variation = base * (percent / 100);
  return Math.floor(base + (Math.random() * variation * 2 - variation));
}

// ============================================================================
// useAnalyticsData Hook
// ============================================================================

/**
 * Hook to generate dynamic analytics data for demo purposes
 * Updates every 30 seconds for real-time feel
 */
export function useAnalyticsData(websiteId: string | null, timeRange: TimeRange): AnalyticsData {
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Auto-refresh every 30 seconds for real-time feel
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshKey(prev => prev + 1);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  return useMemo(() => {
    const now = Date.now();
    const timeSlot = Math.floor(now / 30000);
    const baseSeed = websiteId 
      ? websiteId.split('').reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) | 0, 0)
      : 42;
    
    // Dynamic random function
    const random = (min: number, max: number, offset = 0) => {
      const r = seededRandom(baseSeed, offset, timeSlot, refreshKey);
      return Math.floor(r * (max - min)) + min;
    };

    // Days based on time range
    const daysCount = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    
    // Traffic trend data
    const trafficData = Array.from({ length: daysCount }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (daysCount - 1 - i));
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      const baseVisits = random(100, 400, i * 7);
      const weekendMultiplier = isWeekend ? 0.7 : 1;
      const trendMultiplier = 1 + (i / daysCount) * 0.3;
      
      return {
        date: date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
        shortDate: date.getDate().toString(),
        visits: Math.floor(baseVisits * weekendMultiplier * trendMultiplier),
        pageViews: Math.floor(baseVisits * weekendMultiplier * trendMultiplier * random(18, 28, i) / 10),
        uniqueVisitors: Math.floor(baseVisits * weekendMultiplier * trendMultiplier * 0.65),
        bounceRate: random(25, 55, i * 3),
        avgDuration: random(90, 300, i * 5),
      };
    });

    // Calculate totals
    const totalVisits = vary(trafficData.reduce((sum, d) => sum + d.visits, 0));
    const totalPageViews = vary(trafficData.reduce((sum, d) => sum + d.pageViews, 0));
    const totalUniqueVisitors = vary(trafficData.reduce((sum, d) => sum + d.uniqueVisitors, 0));
    const avgBounceRate = Math.floor(trafficData.reduce((sum, d) => sum + d.bounceRate, 0) / daysCount);
    const avgDuration = Math.floor(trafficData.reduce((sum, d) => sum + d.avgDuration, 0) / daysCount);

    // Previous period comparison
    const prevMultiplier = random(70, 95, 100) / 100;
    const changes = {
      visits: Math.floor((1 - prevMultiplier) * 100 + random(-5, 15, 101)),
      pageViews: Math.floor((1 - prevMultiplier) * 100 + random(-3, 18, 102)),
      uniqueVisitors: Math.floor((1 - prevMultiplier) * 100 + random(-8, 12, 103)),
      bounceRate: random(-8, 5, 104),
      avgDuration: random(-5, 15, 105),
    };

    // Real-time metrics
    const realtime = {
      activeUsers: vary(random(5, 35, 200)),
      pageViewsPerMin: vary(random(2, 12, 201)),
      avgLoadTime: (random(8, 25, 202) / 10).toFixed(1),
    };

    // Traffic sources
    const trafficSources = [
      { name: 'Direct', value: random(30, 45, 300), visitors: vary(random(800, 2500, 301)), change: random(-5, 25, 302), color: '#6366f1' },
      { name: 'Recherche organique', value: random(20, 35, 303), visitors: vary(random(500, 1800, 304)), change: random(5, 35, 305), color: '#22c55e' },
      { name: 'Réseaux sociaux', value: random(15, 28, 306), visitors: vary(random(400, 1200, 307)), change: random(-3, 40, 308), color: '#8b5cf6' },
      { name: 'Référents', value: random(8, 18, 309), visitors: vary(random(200, 700, 310)), change: random(-10, 30, 311), color: '#f59e0b' },
      { name: 'Email', value: random(3, 12, 312), visitors: vary(random(100, 400, 313)), change: random(0, 50, 314), color: '#ec4899' },
    ];

    // Device breakdown
    const devices = [
      { name: 'Mobile', value: random(55, 68, 400), icon: Smartphone, color: '#6366f1' },
      { name: 'Desktop', value: random(28, 38, 401), icon: Monitor, color: '#8b5cf6' },
      { name: 'Tablet', value: random(4, 10, 402), icon: Tablet, color: '#22c55e' },
    ];

    // Top pages
    const topPages = [
      { path: '/', name: 'Accueil', views: vary(random(2000, 6000, 500)), uniqueViews: vary(random(1500, 4500, 501)), avgTime: random(60, 180, 502), bounceRate: random(20, 45, 503) },
      { path: '/projets', name: 'Projets', views: vary(random(800, 3000, 504)), uniqueViews: vary(random(600, 2200, 505)), avgTime: random(90, 240, 506), bounceRate: random(25, 50, 507) },
      { path: '/about', name: 'À propos', views: vary(random(500, 1800, 508)), uniqueViews: vary(random(400, 1400, 509)), avgTime: random(120, 300, 510), bounceRate: random(30, 55, 511) },
      { path: '/contact', name: 'Contact', views: vary(random(300, 1200, 512)), uniqueViews: vary(random(250, 1000, 513)), avgTime: random(45, 120, 514), bounceRate: random(15, 35, 515) },
      { path: '/blog', name: 'Blog', views: vary(random(200, 900, 516)), uniqueViews: vary(random(150, 700, 517)), avgTime: random(180, 360, 518), bounceRate: random(35, 60, 519) },
    ].sort((a, b) => b.views - a.views);

    // Geographic data
    const countries = [
      { name: 'France', code: 'FR', visitors: vary(random(1500, 4000, 600)), percent: random(45, 65, 601) },
      { name: 'Belgique', code: 'BE', visitors: vary(random(300, 800, 602)), percent: random(8, 15, 603) },
      { name: 'Suisse', code: 'CH', visitors: vary(random(200, 600, 604)), percent: random(5, 12, 605) },
      { name: 'Canada', code: 'CA', visitors: vary(random(150, 500, 606)), percent: random(4, 10, 607) },
      { name: 'États-Unis', code: 'US', visitors: vary(random(100, 400, 608)), percent: random(3, 8, 609) },
    ];

    // Conversion metrics
    const conversions = {
      newsletterSignups: {
        total: vary(random(150, 500, 700)),
        change: random(5, 35, 701),
        rate: (random(20, 50, 702) / 10).toFixed(1),
      },
      contactForms: {
        total: vary(random(30, 120, 703)),
        change: random(-5, 45, 704),
        rate: (random(8, 25, 705) / 10).toFixed(1),
      },
      ctaClicks: {
        total: vary(random(500, 1500, 706)),
        change: random(0, 30, 707),
        rate: (random(30, 70, 708) / 10).toFixed(1),
      },
      downloads: {
        total: vary(random(50, 300, 709)),
        change: random(-10, 40, 710),
        rate: (random(10, 35, 711) / 10).toFixed(1),
      },
    };

    // Engagement metrics
    const engagement = {
      pagesPerSession: (random(20, 45, 800) / 10).toFixed(1),
      avgSessionDuration: avgDuration,
      scrollDepth: random(55, 85, 801),
      returnVisitors: random(25, 45, 802),
    };

    // Hourly data for today
    const hourlyData = Array.from({ length: 24 }, (_, hour) => {
      const isBusinessHour = hour >= 9 && hour <= 18;
      const isPeakHour = hour >= 10 && hour <= 14;
      const baseVisits = isPeakHour ? random(15, 40, hour) : isBusinessHour ? random(8, 25, hour) : random(2, 12, hour);
      
      return {
        hour: `${hour}h`,
        visits: vary(baseVisits),
        pageViews: vary(Math.floor(baseVisits * 2.3)),
      };
    });

    return {
      trafficData,
      totalVisits,
      totalPageViews,
      totalUniqueVisitors,
      avgBounceRate,
      avgDuration,
      changes,
      realtime,
      trafficSources,
      devices,
      topPages,
      countries,
      conversions,
      engagement,
      hourlyData,
    };
  }, [websiteId, timeRange, refreshKey]);
}
