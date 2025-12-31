// SeoPage module exports
export { SeoPage, SeoPage as default } from "./seo-page";

// Types
export type {
  PerformanceDataPoint,
  DeviceData,
  CountryData,
  QueryData,
  PageData,
  CoreWebVitals,
  SeoIssues,
  RichResults,
  BacklinksData,
  SeoData,
  TimeRange,
  // Tab props
  PerformanceTabProps,
  QueriesTabProps,
  PagesTabProps,
  HealthTabProps,
  BacklinksTabProps,
  // Component props
  SeoHealthBannerProps,
  SeoKpiCardsProps,
} from "./types";

// Hooks
export { useSeoData } from "./hooks";

// Components
export { SeoHealthBanner } from "./components/seo-health-banner";
export { SeoKpiCards } from "./components/seo-kpi-cards";

// Tabs
export { PerformanceTab } from "./tabs/performance-tab";
export { QueriesTab } from "./tabs/queries-tab";
export { PagesTab } from "./tabs/pages-tab";
export { HealthTab } from "./tabs/health-tab";
export { BacklinksTab } from "./tabs/backlinks-tab";

// Utils
export {
  ChangeIndicator,
  StatusBadge,
  PositionIndicator,
  RankBadge,
  getSeoScoreColor,
  getCtrQuality,
  getPositionQuality,
} from "./utils";
