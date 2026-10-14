export type AnalyticsFilters = {
  start: string;
  end: string;
  timezone: string;
  device: string;
  channel: string;
  contentType: string;
  excludeStaff: boolean;
};
export type AnalyticsTotals = {
  views: number;
  visits: number;
  visitors: number;
  engaged: number;
  seconds: number;
  actions: number;
};
export type BreakdownRow = {
  label: string;
  views: number;
  visits: number;
  visitors: number;
  actions: number;
};
export type ContentRow = BreakdownRow & {
  type: string;
  id: string;
  title: string;
  category: string;
  author: string;
  shares: number;
  completion: number;
  seconds: number;
  href: string | null;
};
export type AnalyticsReport = {
  generatedAt: string;
  filters: AnalyticsFilters;
  audience: { newlyObserved: number; seenPreviously: number };
  current: AnalyticsTotals;
  previous: AnalyticsTotals;
  series: Array<{
    date: string;
    views: number;
    visits: number;
    visitors: number;
    actions: number;
    previous: number;
  }>;
  channels: BreakdownRow[];
  devices: BreakdownRow[];
  browsers: BreakdownRow[];
  campaigns: BreakdownRow[];
  pages: BreakdownRow[];
  referrers: BreakdownRow[];
  landings: BreakdownRow[];
  exits: BreakdownRow[];
  content: ContentRow[];
  categories: BreakdownRow[];
  authors: BreakdownRow[];
  outcomes: Array<{ label: string; count: number; confirmed: boolean }>;
  retention: Array<{ week: number; eligible: number; returned: number }>;
  funnel: Array<{ label: string; count: number }>;
  journeys: Array<{ from: string; to: string; count: number }>;
  slots: Array<{ label: string; impressions: number; clicks: number }>;
  health: {
    maintenance?: string | null;
    firstEvent: string | null;
    lastEvent: string | null;
    events: number;
    measuredPages: number;
    legacyEvents: number;
    unidentified: number;
    live: number;
    vitals: Array<{ label: string; value: number; samples: number }>;
  };
};
