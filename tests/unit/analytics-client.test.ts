import { jest } from "@jest/globals";
let client: typeof import("@/lib/analytics/client");
let fetchMock: jest.MockedFunction<typeof fetch>;
beforeEach(() => {
  jest.resetModules();
  jest.useFakeTimers();
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      location: new URL("http://localhost/events"),
      localStorage: {
        getItem: (k: string) => values.get(k) || null,
        setItem: (k: string, v: string) => values.set(k, v),
        removeItem: (k: string) => values.delete(k),
        clear: () => values.clear(),
      },
      addEventListener: () => {},
      dispatchEvent: () => {},
    },
  });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
      documentElement: {
        dataset: { communityId: "tenant-a", analyticsEnabled: "true" },
      },
      referrer: "",
      addEventListener: () => {},
    },
  });
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { userAgent: "Mozilla/5.0 Chrome/120.0", doNotTrack: "0" },
  });
  Object.defineProperty(globalThis, "crypto", {
    configurable: true,
    value: {
      randomUUID: () =>
        `11111111-1111-4111-8111-${String(Math.floor(Math.random() * 1e12)).padStart(12, "0")}`,
    },
  });
  fetchMock = jest
    .fn<typeof fetch>()
    .mockResolvedValue({ ok: true, status: 200 } as Response);
  global.fetch = fetchMock;
  client = require("@/lib/analytics/client");
  client.beginAnalyticsPage("/events");
});
afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});
const event = {
  eventName: "cta_clicked" as const,
  pageType: "events",
  pagePath: "/events",
};
test("splits batches at 50 and retries with the same event IDs", async () => {
  for (let i = 0; i < 55; i++) client.trackAnalyticsEvent(event);
  fetchMock.mockRejectedValueOnce(new Error("offline"));
  await client.flushAnalytics();
  const first = JSON.parse(fetchMock.mock.calls[0][1]!.body as string);
  expect(first.events).toHaveLength(50);
  await client.flushAnalytics();
  const retry = JSON.parse(fetchMock.mock.calls[1][1]!.body as string);
  expect(retry).toEqual(first);
  await client.flushAnalytics();
  expect(
    JSON.parse(fetchMock.mock.calls[2][1]!.body as string).events,
  ).toHaveLength(5);
});
test("deduplicates route hydration but allows a return visit and expires idle sessions", async () => {
  client.trackAnalyticsEvent({ ...event, eventName: "page_view" });
  client.trackAnalyticsEvent({ ...event, eventName: "page_view" });
  await client.flushAnalytics();
  expect(
    JSON.parse(fetchMock.mock.calls[0][1]!.body as string).events,
  ).toHaveLength(1);
  const first = JSON.parse(fetchMock.mock.calls[0][1]!.body as string).events[0]
    .metadata;
  jest.setSystemTime(Date.now() + 31 * 60_000);
  client.beginAnalyticsPage("/recipes");
  client.trackAnalyticsEvent(event);
  await client.flushAnalytics();
  const second = JSON.parse(fetchMock.mock.calls[1][1]!.body as string)
    .events[0].metadata;
  expect(second.sessionId).not.toBe(first.sessionId);
  expect(second.anonymousVisitorId).toBe(first.anonymousVisitorId);
});
test("honors opt-out and tenant namespaces", async () => {
  client.trackAnalyticsEvent(event);
  client.setAnalyticsOptOut(true);
  await client.flushAnalytics();
  expect(fetchMock).not.toHaveBeenCalled();
  document.documentElement.dataset.communityId = "tenant-b";
  client.trackAnalyticsEvent(event);
  await client.flushAnalytics();
  expect(fetchMock).toHaveBeenCalledTimes(1);
});
test("keeps private routes and queries out of collection", async () => {
  client.trackAnalyticsEvent({ ...event, pagePath: "/messages/private" });
  client.trackAnalyticsEvent({ ...event, pagePath: "/events?email=private" });
  await client.flushAnalytics();
  const events = JSON.parse(fetchMock.mock.calls[0][1]!.body as string).events;
  expect(events).toHaveLength(1);
  expect(events[0].pagePath).toBe("/events");
});
