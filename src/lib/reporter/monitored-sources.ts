export const REPORTER_MONITORED_SOURCE_TYPE_OPTIONS = [
  'MUNICIPAL_AGENDA',
  'MUNICIPAL_MINUTES',
  'MUNICIPAL_NOTICES',
  'COUNTY_UPDATES',
  'SCHOOL_BOARD',
  'SCHOOL_ANNOUNCEMENTS',
  'EVENT_CALENDAR',
  'COMMUNITY_CALENDAR',
  'PARKS_AND_REC',
  'LIBRARY_EVENTS',
  'SCHOOL_CALENDAR',
  'VENUE_CALENDAR',
  'PUBLIC_SAFETY',
  'LOCAL_NEWSROOM',
  'PRESS_RELEASE',
  'COMMUNITY_BULLETIN',
  'OTHER',
] as const;

export const REPORTER_EVENT_ORIENTED_SOURCE_TYPE_OPTIONS = [
  'EVENT_CALENDAR',
  'COMMUNITY_CALENDAR',
  'PARKS_AND_REC',
  'LIBRARY_EVENTS',
  'SCHOOL_CALENDAR',
  'VENUE_CALENDAR',
] as const;

export const REPORTER_MONITORED_SOURCE_FORMAT_OPTIONS = [
  'RSS',
  'ATOM',
  'HTML',
  'JSON',
  'PDF',
  'ICS',
  'OTHER',
] as const;

export const REPORTER_MONITORED_SOURCE_STATUS_OPTIONS = [
  'ACTIVE',
  'PAUSED',
  'ARCHIVED',
] as const;

export const REPORTER_MONITORED_SOURCE_EXECUTION_LANE_OPTIONS = [
  'SERVER_FETCH',
  'LOCAL_BROWSER',
] as const;

export const REPORTER_COVERAGE_SCOPE_OPTIONS = [
  'LOCAL',
  'COUNTY',
  'STATE',
  'NATIONAL',
] as const;

export const REPORTER_SOURCE_FETCH_STATUS_OPTIONS = [
  'SUCCESS',
  'NO_CHANGE',
  'FAILED',
] as const;

export type ReporterMonitoredSourceHealth = 'healthy' | 'stale' | 'failing' | 'new' | 'paused' | 'archived';

export function isReporterMonitoredSourceDue(source: {
  status: string;
  fetchFrequencyMinutes: number;
  lastFetchedAt?: string | Date | null;
}, now = new Date()) {
  if (source.status !== 'ACTIVE') {
    return false;
  }

  if (!source.lastFetchedAt) {
    return true;
  }

  const lastFetchedAt = new Date(source.lastFetchedAt);
  return now.getTime() - lastFetchedAt.getTime() >= source.fetchFrequencyMinutes * 60 * 1000;
}

export function getReporterMonitoredSourceHealth(source: {
  status: string;
  fetchFrequencyMinutes: number;
  lastSuccessfulAt?: string | Date | null;
  lastErrorAt?: string | Date | null;
}) : ReporterMonitoredSourceHealth {
  if (source.status === 'PAUSED') {
    return 'paused';
  }
  if (source.status === 'ARCHIVED') {
    return 'archived';
  }

  const lastSuccessfulAt = source.lastSuccessfulAt ? new Date(source.lastSuccessfulAt) : null;
  const lastErrorAt = source.lastErrorAt ? new Date(source.lastErrorAt) : null;

  if (lastErrorAt && (!lastSuccessfulAt || lastErrorAt > lastSuccessfulAt)) {
    return 'failing';
  }

  if (!lastSuccessfulAt) {
    return 'new';
  }

  const staleThresholdMs = Math.max(source.fetchFrequencyMinutes, 60) * 2 * 60 * 1000;
  if (Date.now() - lastSuccessfulAt.getTime() > staleThresholdMs) {
    return 'stale';
  }

  return 'healthy';
}

export function formatReporterMonitoredSourceEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}
