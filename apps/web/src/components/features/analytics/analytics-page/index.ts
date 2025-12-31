/**
 * Analytics Page Module
 * 
 * Re-exports the main AnalyticsPage component and related utilities.
 */

export { AnalyticsPage, default } from './analytics-page';

// Types
export type { 
  TimeRange,
  TrafficDataPoint,
  HourlyDataPoint,
  TrafficSource,
  DeviceData,
  CountryData,
  TopPageData,
  ConversionMetric,
  ConversionsData,
  EngagementData,
  RealtimeData,
  PeriodChanges,
  AnalyticsData,
} from './types';

// Hooks
export { useAnalyticsData } from './hooks';

// Utils
export { ChangeIndicator, formatDuration } from './utils';

// Components
export { AnalyticsPageSkeleton } from './components/analytics-page-skeleton';
export { KpiCards } from './components/kpi-cards';
export { RealtimeBanner } from './components/realtime-banner';
export { 
  TrafficChart, 
  TrafficSourcesCard, 
  EngagementCards,
  DevicesCard,
  CountriesCard,
  HourlyChart,
  TrafficSourcesDetailCard,
} from './components/overview-components';
export { TopPagesTable } from './components/top-pages-table';
export { ConversionsCards, ConversionFunnel } from './components/conversions-components';
