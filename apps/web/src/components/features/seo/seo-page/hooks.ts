"use client"

import { useState, useEffect, useMemo } from 'react';
import { Smartphone, Monitor } from "lucide-react";
import { 
  FileWarning, 
  Image, 
  Hash, 
  Link as LinkIcon, 
  Clock, 
  Code, 
  ExternalLink 
} from "lucide-react";
import type { SeoData, TimeRange } from './types';

/**
 * Generate seeded pseudo-random number for consistent demo data
 */
function seededRandom(seed: number, offset: number = 0): number {
  const value = Math.abs((seed + offset) * 2654435761 % 2147483647);
  return value / 2147483647;
}

/**
 * Hook to generate dynamic SEO data for demo purposes
 * Updates every 5 seconds for real-time feel
 */
export function useSeoData(websiteId: string | undefined, timeRange: TimeRange): SeoData {
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Auto-refresh every 5 seconds for real-time feel
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshKey(prev => prev + 1);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return useMemo(() => {
    const now = Date.now();
    const timeSlot = Math.floor(now / 5000);
    const baseSeed = websiteId 
      ? websiteId.split('').reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) | 0, 0)
      : 42;
    
    // Dynamic random function with small incremental changes
    const random = (min: number, max: number, offset = 0) => {
      const seed = Math.abs((baseSeed + offset + timeSlot + refreshKey) * 2654435761 % 2147483647);
      return Math.floor((seed / 2147483647) * (max - min)) + min;
    };

    // Small variation function
    const vary = (base: number, percent = 3) => {
      const variation = base * (percent / 100);
      return Math.floor(base + (Math.random() * variation * 2 - variation));
    };

    // Days based on time range
    const daysCount = timeRange === '7d' ? 7 : timeRange === '28d' ? 28 : 90;
    
    // Search performance data over time
    const performanceData = Array.from({ length: daysCount }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (daysCount - 1 - i));
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      const weekendMultiplier = isWeekend ? 0.75 : 1;
      const trendMultiplier = 1 + (i / daysCount) * 0.25;
      
      const impressions = Math.floor(random(800, 2500, i * 7) * weekendMultiplier * trendMultiplier);
      const clicks = Math.floor(impressions * (random(25, 55, i * 3) / 1000));
      
      return {
        date: date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }),
        shortDate: date.getDate().toString(),
        impressions: vary(impressions),
        clicks: vary(clicks),
        ctr: ((clicks / impressions) * 100).toFixed(1),
        position: (random(80, 150, i * 5) / 10).toFixed(1),
      };
    });

    // Calculate totals
    const totalImpressions = vary(performanceData.reduce((sum, d) => sum + d.impressions, 0));
    const totalClicks = vary(performanceData.reduce((sum, d) => sum + d.clicks, 0));
    const avgCtr = ((totalClicks / totalImpressions) * 100).toFixed(1);
    const avgPosition = (performanceData.reduce((sum, d) => sum + parseFloat(d.position), 0) / daysCount).toFixed(1);

    // Previous period comparison
    const changes = {
      impressions: random(5, 28, 100),
      clicks: random(8, 35, 101),
      ctr: random(-5, 15, 102),
      position: random(-8, 5, 103), // negative is better for position
    };

    // Top search queries
    const queries = [
      { query: 'portfolio designer', impressions: vary(random(800, 2000, 200)), clicks: vary(random(80, 250, 201)), ctr: (random(80, 150, 202) / 10).toFixed(1), position: (random(15, 45, 203) / 10).toFixed(1) },
      { query: 'création site web', impressions: vary(random(600, 1500, 204)), clicks: vary(random(50, 180, 205)), ctr: (random(60, 130, 206) / 10).toFixed(1), position: (random(20, 60, 207) / 10).toFixed(1) },
      { query: 'web designer freelance', impressions: vary(random(400, 1200, 208)), clicks: vary(random(40, 150, 209)), ctr: (random(70, 140, 210) / 10).toFixed(1), position: (random(25, 70, 211) / 10).toFixed(1) },
      { query: 'agence digitale', impressions: vary(random(300, 900, 212)), clicks: vary(random(25, 100, 213)), ctr: (random(50, 120, 214) / 10).toFixed(1), position: (random(30, 80, 215) / 10).toFixed(1) },
      { query: 'développeur react', impressions: vary(random(250, 800, 216)), clicks: vary(random(20, 90, 217)), ctr: (random(60, 130, 218) / 10).toFixed(1), position: (random(35, 90, 219) / 10).toFixed(1) },
      { query: 'site vitrine', impressions: vary(random(200, 700, 220)), clicks: vary(random(15, 70, 221)), ctr: (random(50, 110, 222) / 10).toFixed(1), position: (random(40, 100, 223) / 10).toFixed(1) },
      { query: 'ux designer', impressions: vary(random(150, 600, 224)), clicks: vary(random(12, 60, 225)), ctr: (random(55, 120, 226) / 10).toFixed(1), position: (random(45, 110, 227) / 10).toFixed(1) },
      { query: 'refonte site internet', impressions: vary(random(120, 500, 228)), clicks: vary(random(10, 50, 229)), ctr: (random(45, 100, 230) / 10).toFixed(1), position: (random(50, 120, 231) / 10).toFixed(1) },
    ].sort((a, b) => b.clicks - a.clicks);

    // Top pages in search
    const pages = [
      { path: '/', title: 'Accueil', impressions: vary(random(2000, 5000, 300)), clicks: vary(random(200, 600, 301)), ctr: (random(80, 140, 302) / 10).toFixed(1), position: (random(15, 40, 303) / 10).toFixed(1) },
      { path: '/projets', title: 'Projets', impressions: vary(random(1000, 3000, 304)), clicks: vary(random(100, 350, 305)), ctr: (random(70, 130, 306) / 10).toFixed(1), position: (random(20, 50, 307) / 10).toFixed(1) },
      { path: '/services', title: 'Services', impressions: vary(random(800, 2500, 308)), clicks: vary(random(80, 280, 309)), ctr: (random(65, 120, 310) / 10).toFixed(1), position: (random(25, 60, 311) / 10).toFixed(1) },
      { path: '/about', title: 'À propos', impressions: vary(random(600, 2000, 312)), clicks: vary(random(60, 200, 313)), ctr: (random(60, 110, 314) / 10).toFixed(1), position: (random(30, 70, 315) / 10).toFixed(1) },
      { path: '/contact', title: 'Contact', impressions: vary(random(400, 1500, 316)), clicks: vary(random(40, 150, 317)), ctr: (random(55, 100, 318) / 10).toFixed(1), position: (random(35, 80, 319) / 10).toFixed(1) },
      { path: '/blog', title: 'Blog', impressions: vary(random(300, 1200, 320)), clicks: vary(random(30, 120, 321)), ctr: (random(50, 95, 322) / 10).toFixed(1), position: (random(40, 90, 323) / 10).toFixed(1) },
    ].sort((a, b) => b.clicks - a.clicks);

    // Top countries
    const countries = [
      { name: 'France', code: 'FR', impressions: vary(random(4000, 10000, 400)), clicks: vary(random(400, 1200, 401)), ctr: (random(80, 140, 402) / 10).toFixed(1) },
      { name: 'Belgique', code: 'BE', impressions: vary(random(800, 2000, 403)), clicks: vary(random(80, 240, 404)), ctr: (random(70, 130, 405) / 10).toFixed(1) },
      { name: 'Suisse', code: 'CH', impressions: vary(random(600, 1500, 406)), clicks: vary(random(60, 180, 407)), ctr: (random(65, 120, 408) / 10).toFixed(1) },
      { name: 'Canada', code: 'CA', impressions: vary(random(400, 1000, 409)), clicks: vary(random(40, 120, 410)), ctr: (random(60, 110, 411) / 10).toFixed(1) },
      { name: 'Maroc', code: 'MA', impressions: vary(random(200, 600, 412)), clicks: vary(random(20, 70, 413)), ctr: (random(50, 100, 414) / 10).toFixed(1) },
    ];

    // Device breakdown for search
    const devices = [
      { name: 'Mobile', impressions: vary(random(3000, 8000, 500)), clicks: vary(random(250, 700, 501)), ctr: (random(60, 100, 502) / 10).toFixed(1), icon: Smartphone },
      { name: 'Desktop', impressions: vary(random(2000, 5000, 503)), clicks: vary(random(200, 500, 504)), ctr: (random(80, 130, 505) / 10).toFixed(1), icon: Monitor },
    ];

    // SEO Health Score
    const seoIssues = {
      critical: random(0, 3, 600),
      warnings: random(2, 8, 601),
      passed: random(15, 25, 602),
    };
    const seoScore = Math.min(100, Math.max(0, 100 - (seoIssues.critical * 15) - (seoIssues.warnings * 3)));

    // Page indexing status
    const indexingStatus = {
      indexed: random(8, 15, 700),
      notIndexed: random(0, 3, 701),
      excluded: random(1, 4, 702),
      crawled: random(10, 20, 703),
    };

    // Core Web Vitals
    const lcpValue = random(15, 35, 800);
    const fidValue = random(50, 150, 801);
    const clsValue = random(5, 25, 802);
    const ttfbValue = random(200, 600, 803);

    const coreWebVitals = {
      lcp: { 
        value: (lcpValue / 10).toFixed(1), 
        status: lcpValue < 25 ? 'good' as const : lcpValue < 40 ? 'needs-improvement' as const : 'poor' as const 
      },
      fid: { 
        value: fidValue, 
        status: fidValue < 100 ? 'good' as const : fidValue < 300 ? 'needs-improvement' as const : 'poor' as const 
      },
      cls: { 
        value: (clsValue / 100).toFixed(2), 
        status: clsValue < 10 ? 'good' as const : clsValue < 25 ? 'needs-improvement' as const : 'poor' as const 
      },
      ttfb: { 
        value: ttfbValue, 
        status: ttfbValue < 400 ? 'good' as const : ttfbValue < 800 ? 'needs-improvement' as const : 'poor' as const 
      },
    };

    // Backlinks
    const backlinks = {
      total: vary(random(50, 300, 900)),
      newThisMonth: vary(random(5, 25, 901)),
      lostThisMonth: vary(random(0, 8, 902)),
      dofollow: vary(random(30, 200, 903)),
      nofollow: vary(random(10, 80, 904)),
      referringDomains: vary(random(15, 80, 905)),
    };

    // SEO Issues breakdown
    const issuesList = [
      { type: 'critical' as const, title: 'Pages sans meta description', count: random(0, 2, 1000), icon: FileWarning },
      { type: 'critical' as const, title: 'Images sans attribut alt', count: random(0, 5, 1001), icon: Image },
      { type: 'warning' as const, title: 'Titres trop longs (>60 car.)', count: random(1, 4, 1002), icon: Hash },
      { type: 'warning' as const, title: 'Liens internes cassés', count: random(0, 3, 1003), icon: LinkIcon },
      { type: 'warning' as const, title: 'Pages lentes (>3s)', count: random(0, 2, 1004), icon: Clock },
      { type: 'info' as const, title: 'Pages sans H1', count: random(0, 2, 1005), icon: Code },
      { type: 'info' as const, title: 'Redirections 301', count: random(2, 8, 1006), icon: ExternalLink },
    ].filter(issue => issue.count > 0);

    // Sitemap status
    const sitemapStatus = {
      lastSubmitted: new Date(Date.now() - random(1, 7, 1100) * 24 * 60 * 60 * 1000).toLocaleDateString('fr-FR'),
      urls: random(8, 20, 1101),
      indexed: random(6, 18, 1102),
      errors: random(0, 2, 1103),
    };

    // Rich results
    const richResults = {
      eligible: random(3, 8, 1200),
      detected: random(1, 5, 1201),
      types: ['Article', 'FAQ', 'Breadcrumb', 'Organization'].slice(0, random(1, 4, 1202)),
    };

    return {
      performanceData,
      totalImpressions,
      totalClicks,
      avgCtr,
      avgPosition,
      changes,
      queries,
      pages,
      countries,
      devices,
      seoIssues,
      seoScore,
      indexingStatus,
      coreWebVitals,
      backlinks,
      issuesList,
      sitemapStatus,
      richResults,
    };
  }, [websiteId, timeRange, refreshKey]);
}
