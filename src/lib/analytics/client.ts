'use client';

import type { AnalyticsClientEventInput } from '@/lib/analytics/types';

const VISITOR_STORAGE_KEY = 'analytics-anonymous-visitor-id';
const SESSION_STORAGE_KEY = 'analytics-session-id';
const FLUSH_DELAY_MS = 300;

let queuedEvents: AnalyticsClientEventInput[] = [];
let flushTimer: number | null = null;
let pagehideRegistered = false;

function createId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `anon-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function ensureStorageValue(storage: Storage, key: string) {
  const existing = storage.getItem(key);
  if (existing) {
    return existing;
  }

  const next = createId();
  storage.setItem(key, next);
  return next;
}

function getClientIds() {
  if (typeof window === 'undefined') {
    return { anonymousVisitorId: null, sessionId: null };
  }

  return {
    anonymousVisitorId: ensureStorageValue(window.localStorage, VISITOR_STORAGE_KEY),
    sessionId: ensureStorageValue(window.sessionStorage, SESSION_STORAGE_KEY),
  };
}

function flushQueuedEvents(useBeacon = false) {
  if (typeof window === 'undefined' || queuedEvents.length === 0) {
    return;
  }

  const payload = JSON.stringify({ events: queuedEvents });
  queuedEvents = [];

  if (flushTimer) {
    window.clearTimeout(flushTimer);
    flushTimer = null;
  }

  if (useBeacon && typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
    const blob = new Blob([payload], { type: 'application/json' });
    navigator.sendBeacon('/api/analytics/events', blob);
    return;
  }

  void fetch('/api/analytics/events', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: payload,
    keepalive: true,
  }).catch(() => {});
}

function ensurePagehideListener() {
  if (pagehideRegistered || typeof window === 'undefined') {
    return;
  }

  window.addEventListener('pagehide', () => {
    flushQueuedEvents(true);
  });

  pagehideRegistered = true;
}

export function trackAnalyticsEvent(input: Omit<AnalyticsClientEventInput, 'pagePath' | 'referrerUrl'> & {
  pagePath?: string;
  referrerUrl?: string | null;
}) {
  if (typeof window === 'undefined') {
    return;
  }

  ensurePagehideListener();
  const { anonymousVisitorId, sessionId } = getClientIds();

  queuedEvents.push({
    ...input,
    pagePath: input.pagePath ?? `${window.location.pathname}${window.location.search}`,
    referrerUrl: input.referrerUrl ?? (document.referrer || null),
    occurredAt: new Date().toISOString(),
    metadata: {
      ...(input.metadata ?? {}),
      anonymousVisitorId,
      sessionId,
    },
  });

  if (flushTimer) {
    window.clearTimeout(flushTimer);
  }

  flushTimer = window.setTimeout(() => {
    flushQueuedEvents(false);
  }, FLUSH_DELAY_MS);
}
