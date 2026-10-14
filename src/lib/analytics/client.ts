"use client";

import { safeAnalyticsPath } from "./paths";
import type { AnalyticsClientEventInput } from "./types";

const IDLE_MS = 30 * 60_000;
const VISITOR_MS = 90 * 24 * 3600_000;
const MAX_EVENTS = 200;
let queue: AnalyticsClientEventInput[] = [];
let timer: ReturnType<typeof setTimeout> | undefined;
let sending = false;
let failures = 0;
let listening = false;
let currentPath = "";
let pageId = "";
let contentContext: {
  contentType?: AnalyticsClientEventInput["contentType"];
  contentId?: string | null;
} = {};
let seen = new Set<string>();
const memory = new Map<string, string>();

function storage(key: string, value?: string) {
  try {
    if (value !== undefined) window.localStorage.setItem(key, value);
    return window.localStorage.getItem(key);
  } catch {
    if (value !== undefined) memory.set(key, value);
    return memory.get(key) || null;
  }
}
function tenantKey() {
  return document.documentElement.dataset.communityId || window.location.host;
}
export function analyticsAllowed() {
  if (typeof window === "undefined") return false;
  if (document.documentElement.dataset.analyticsEnabled === "false")
    return false;
  return (
    !/bot\b|crawler|spider|headless|lighthouse|preview|facebookexternalhit|slurp/i.test(
      navigator.userAgent,
    ) &&
    storage(`analytics:${tenantKey()}:optout`) !== "true" &&
    navigator.doNotTrack !== "1" &&
    !(navigator as Navigator & { globalPrivacyControl?: boolean })
      .globalPrivacyControl
  );
}
export function setAnalyticsOptOut(value: boolean) {
  storage(`analytics:${tenantKey()}:optout`, String(value));
  if (value) {
    queue = [];
    for (const suffix of ["visitor", "session"]) {
      memory.delete(`analytics:${tenantKey()}:${suffix}`);
      try {
        window.localStorage.removeItem(`analytics:${tenantKey()}:${suffix}`);
      } catch {
        /* Memory-only storage remains bounded. */
      }
    }
  }
  window.dispatchEvent(new Event("analytics:privacy"));
}
export function isAnalyticsOptedOut() {
  return !analyticsAllowed();
}

function ids() {
  const now = Date.now(),
    prefix = `analytics:${tenantKey()}:`;
  function record(key: string, maxAge: number) {
    let value: { id: string; at: number; first?: boolean } | null = null;
    try {
      value = JSON.parse(storage(prefix + key) || "null");
    } catch {
      /* Expired/corrupt storage starts a new identifier. */
    }
    if (
      !value ||
      typeof value.id !== "string" ||
      typeof value.at !== "number" ||
      now - value.at > maxAge ||
      value.at > now
    )
      value = { id: crypto.randomUUID(), at: now, first: true };
    storage(
      prefix + key,
      JSON.stringify({
        ...value,
        at: key === "session" ? now : value.at,
        first: false,
      }),
    );
    return value;
  }
  const visitor = record("visitor", VISITOR_MS),
    session = record("session", IDLE_MS);
  return { anonymousVisitorId: visitor.id, sessionId: session.id };
}

export function beginAnalyticsPage(path: string) {
  if (currentPath === path && pageId) return;
  currentPath = path;
  pageId = crypto.randomUUID();
  seen = new Set();
  contentContext = {};
}

function schedule(ms = 500) {
  if (!timer)
    timer = setTimeout(() => {
      timer = undefined;
      void flushAnalytics();
    }, ms);
}
export async function flushAnalytics(beacon = false) {
  if (!analyticsAllowed()) {
    queue = [];
    return;
  }
  if (sending || !queue.length) return;
  // Bound both the number of events and UTF-8 bytes, including metadata.
  const batch: AnalyticsClientEventInput[] = [];
  for (const event of queue.slice(0, 50)) {
    if (
      new Blob([JSON.stringify({ events: [...batch, event] })]).size >
      48 * 1024
    )
      break;
    batch.push(event);
  }
  if (!batch.length) {
    queue.shift();
    schedule();
    return;
  }
  const body = JSON.stringify({ events: batch });
  if (
    beacon &&
    navigator.sendBeacon?.(
      "/api/analytics/events",
      new Blob([body], { type: "application/json" }),
    )
  ) {
    // Keep the batch until a later acknowledged POST. Identical event IDs deduplicate it.
    return;
  }
  sending = true;
  try {
    const response = await fetch("/api/analytics/events", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body,
      keepalive: true,
    });
    if (response.ok || [400, 403, 404, 413].includes(response.status)) {
      const sent = new Set(batch.map((e) => e.eventId));
      queue = queue.filter((e) => !sent.has(e.eventId));
      failures = 0;
    } else failures++;
  } catch {
    failures++;
  } finally {
    sending = false;
  }
  if (failures >= 5) {
    queue = queue.slice(batch.length);
    failures = 0;
  }
  if (queue.length) schedule(Math.min(30_000, 1000 * 2 ** failures));
}

export function trackAnalyticsEvent(
  input: Omit<AnalyticsClientEventInput, "pagePath" | "referrerUrl"> & {
    pagePath?: string;
    referrerUrl?: string | null;
  },
) {
  if (!analyticsAllowed()) return;
  if (
    input.contentType &&
    input.contentId &&
    ["page_view", "content_open"].includes(input.eventName)
  )
    contentContext = {
      contentType: input.contentType,
      contentId: input.contentId,
    };
  if (["engaged_time_ping", "scroll_depth_reached"].includes(input.eventName))
    input = { ...contentContext, ...input };
  const path = safeAnalyticsPath(input.pagePath || window.location.pathname);
  if (!path) return;
  if (!currentPath) beginAnalyticsPage(path);
  const dedup = ["page_view", "content_open", "scroll_depth_reached"].includes(
    input.eventName,
  )
    ? `${input.eventName}:${path}:${input.eventName === "page_view" ? "" : input.contentId || ""}:${input.metadata?.percent || ""}`
    : null;
  if (dedup && seen.has(dedup)) return;
  if (dedup) seen.add(dedup);
  const agent = navigator.userAgent;
  const device = /iPad|Tablet/i.test(agent)
    ? "tablet"
    : /Mobi|Android/i.test(agent)
      ? "mobile"
      : "desktop";
  const browser = /Edg\//.test(agent)
    ? "Edge"
    : /Firefox\//.test(agent)
      ? "Firefox"
      : /Chrome\//.test(agent)
        ? "Chrome"
        : /Safari\//.test(agent)
          ? "Safari"
          : "Other";
  const url = new URL(window.location.href);
  const campaigns: Record<string, string> = {};
  for (const [param, key] of [
    ["utm_source", "utmSource"],
    ["utm_medium", "utmMedium"],
    ["utm_campaign", "utmCampaign"],
  ]) {
    const value = url.searchParams.get(param);
    if (value) campaigns[key] = value.slice(0, 100);
  }
  const identity = ids();
  const entryKey = `analytics:${tenantKey()}:entry`;
  let entry: {
    sessionId: string;
    campaigns: Record<string, string>;
    referrer: string | null;
  } | null = null;
  try {
    entry = JSON.parse(storage(entryKey) || "null");
  } catch {
    /* Start fresh attribution. */
  }
  if (entry?.sessionId !== identity.sessionId) {
    entry = {
      sessionId: identity.sessionId,
      campaigns,
      referrer: document.referrer ? new URL(document.referrer).origin : null,
    };
    storage(entryKey, JSON.stringify(entry));
  }
  queue.push({
    ...input,
    eventId: crypto.randomUUID(),
    occurredAt: new Date().toISOString(),
    pagePath: path,
    referrerUrl: input.referrerUrl ?? entry.referrer,
    metadata: {
      ...input.metadata,
      ...identity,
      ...entry.campaigns,
      pageId,
      device,
      browser,
      clientVersion: 2,
    },
  });
  if (queue.length > MAX_EVENTS) queue = queue.slice(-MAX_EVENTS);
  if (!listening) {
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") void flushAnalytics(true);
      else void flushAnalytics();
    });
    window.addEventListener("online", () => {
      void flushAnalytics();
    });
    listening = true;
  }
  schedule();
}

/** Attach only bounded, pseudonymous attribution to a successful product action. */
export function getAnalyticsActionContext() {
  if (
    !analyticsAllowed() ||
    !contentContext.contentId ||
    !contentContext.contentType
  )
    return undefined;
  return {
    ...ids(),
    contentType: contentContext.contentType,
    contentId: contentContext.contentId,
  };
}
