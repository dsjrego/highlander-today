import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { requireTestDatabaseUrl } from "../helpers/test-database";
requireTestDatabaseUrl();
import { db } from "../../src/lib/db";
import {
  archiveTrafficDay,
  maintainAnalytics,
} from "../../src/lib/analytics/maintenance";
import { recomputeAnalyticsRollupsForDay } from "../../src/lib/analytics/rollups";
import { getAnalyticsReport } from "../../src/lib/analytics/report";

const prisma = new PrismaClient();
const ids: string[] = [];
let userId: string;
let articleId: string;
const today = new Date().toISOString().slice(0, 10);
const at = (days: number, hour = 12) => {
  const d = new Date(`${today}T${String(hour).padStart(2, "0")}:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
};
const date = (days: number) => at(days).toISOString().slice(0, 10);
beforeAll(async () => {
  for (const name of ["Analytics A", "Analytics B"])
    ids.push(
      (
        await prisma.community.create({
          data: { name, slug: `analytics-${randomUUID()}` },
        })
      ).id,
    );
  userId = (
    await prisma.user.create({
      data: {
        email: `${randomUUID()}@example.test`,
        firstName: "Analytics",
        lastName: "Fixture",
        trustLevel: "TRUSTED",
      },
    })
  ).id;
  articleId = (
    await prisma.article.create({
      data: {
        communityId: ids[0],
        authorUserId: userId,
        title: "Measured community guide",
        slug: randomUUID(),
        body: "Fixture",
        status: "PUBLISHED",
      },
    })
  ).id;
  const base = {
    communityId: ids[0],
    pageType: "article-detail",
    contentType: "ARTICLE" as const,
    contentId: articleId,
    pagePath: `/local-life/${articleId}`,
    referrerType: "SEARCH" as const,
    anonymousVisitorId: "browser-one",
    sessionId: "session-one",
  };
  await prisma.analyticsEvent.createMany({
    data: [
      {
        ...base,
        eventName: "page_view",
        sessionId: "session-previous",
        occurredAt: at(-8),
        metadata: { device: "mobile", schemaVersion: 2 },
      },
      {
        ...base,
        eventName: "page_view",
        occurredAt: at(-2),
        metadata: {
          pageId: "page-one",
          device: "mobile",
          origin: "browser",
          schemaVersion: 2,
        },
      },
      {
        ...base,
        eventName: "content_open",
        occurredAt: at(-2),
        metadata: {
          pageId: "page-one",
          device: "mobile",
          origin: "browser",
          schemaVersion: 2,
        },
      },
      {
        ...base,
        eventName: "engaged_time_ping",
        occurredAt: at(-2),
        metadata: {
          pageId: "page-one",
          device: "mobile",
          activeSeconds: 15,
          schemaVersion: 2,
        },
      },
      {
        ...base,
        eventName: "cta_clicked",
        occurredAt: at(-2, 13),
        metadata: {
          pageId: "page-one",
          device: "mobile",
          origin: "browser",
          schemaVersion: 2,
        },
      },
      {
        ...base,
        eventName: "page_view",
        sessionId: "session-two",
        occurredAt: at(-1),
        metadata: { pageId: "page-two", device: "desktop", schemaVersion: 2 },
      },
      {
        ...base,
        eventName: "comment_created",
        sessionId: "server-one",
        anonymousVisitorId: null,
        occurredAt: at(-1),
        metadata: { origin: "server", schemaVersion: 2 },
      },
      {
        ...base,
        eventName: "comment_created",
        sessionId: "session-two",
        occurredAt: at(-1),
        metadata: { origin: "browser", device: "desktop", schemaVersion: 2 },
      },
      {
        ...base,
        eventName: "page_view",
        anonymousVisitorId: "browser-two",
        sessionId: "session-three",
        occurredAt: at(-1),
        metadata: { pageId: "page-three", device: "desktop", schemaVersion: 2 },
      },
      {
        ...base,
        communityId: ids[1],
        eventName: "page_view",
        anonymousVisitorId: "foreign-browser",
        sessionId: "foreign-session",
        occurredAt: at(-1),
        pagePath: "/foreign-secret",
        metadata: { device: "desktop" },
      },
    ],
  });
});
afterAll(async () => {
  await prisma.analyticsEvent.deleteMany({
    where: { communityId: { in: ids } },
  });
  await prisma.community.deleteMany({ where: { id: { in: ids } } });
  if (userId) await prisma.user.delete({ where: { id: userId } });
  await prisma.$disconnect();
  await db.$disconnect();
});
test("reconciles range distincts, engagement, content and tenant isolation in PostgreSQL", async () => {
  const report = await getAnalyticsReport(ids[0], {
    start: date(-6),
    end: date(0),
    timezone: "UTC",
    device: "all",
    channel: "all",
    contentType: "all",
    excludeStaff: true,
  });
  expect(report.audience).toEqual({ newlyObserved: 1, seenPreviously: 1 });
  expect(report.current).toMatchObject({
    views: 3,
    visits: 3,
    visitors: 2,
    engaged: 1,
    seconds: 15,
    actions: 1,
  });
  expect(report.content[0]).toMatchObject({
    title: "Measured community guide",
    views: 3,
    visitors: 2,
    actions: 1,
  });
  expect(JSON.stringify(report)).not.toContain("foreign-secret");
  expect(report.funnel.map((r) => r.count)).toEqual([3, 1, 1]);
  expect(report.series.reduce((n, r) => n + r.visitors, 0)).toBe(3); // Same browser on two days is unique once for the period.
  expect(report.outcomes).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        label: "comment_created",
        confirmed: true,
        count: 1,
      }),
    ]),
  );
});
test("applies segments and handles empty periods without inventing counts", async () => {
  const filters = {
    start: date(-6),
    end: date(0),
    timezone: "America/New_York",
    device: "mobile",
    channel: "all",
    contentType: "all",
    excludeStaff: true,
  };
  const mobile = await getAnalyticsReport(ids[0], filters);
  expect(mobile.current).toMatchObject({
    views: 1,
    visits: 1,
    visitors: 1,
    actions: 0,
  });
  const empty = await getAnalyticsReport(ids[1], {
    ...filters,
    device: "tablet",
  });
  expect(empty.current.views).toBe(0);
  expect(empty.series).toHaveLength(7);
});

test("recomputes tenant-qualified daily history idempotently without adding unique counts", async () => {
  await recomputeAnalyticsRollupsForDay(at(-1));
  await recomputeAnalyticsRollupsForDay(at(-1));
  await archiveTrafficDay(at(-1));
  await archiveTrafficDay(at(-1));
  const rows = await prisma.contentMetricsDaily.findMany({
    where: { communityId: ids[0] },
  });
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({
    pageViews: 2,
    uniqueVisitors: 2,
    comments: 1,
    shares: 0,
  });
  expect(
    await prisma.contentMetricsDaily.count({ where: { communityId: ids[1] } }),
  ).toBe(0); // A foreign reference cannot acquire another tenant's content labels.
  const history = await prisma.analyticsTrafficDaily.findMany({
    where: { communityId: ids[0] },
  });
  expect(history).toHaveLength(1);
  expect(history[0]).toMatchObject({
    views: 2,
    visits: 2,
    visitors: 2,
    confirmedActions: 1,
  });
});

test("archives before raw retention deletion and preserves another tenant", async () => {
  const expired = at(-100);
  await prisma.analyticsEvent.createMany({
    data: ids.map((communityId, i) => ({
      communityId,
      eventName: "page_view",
      pageType: "public",
      pagePath: "/local-life",
      sessionId: `expired-${i}`,
      anonymousVisitorId: `expired-${i}`,
      occurredAt: expired,
    })),
  });
  const result = await maintainAnalytics(new Date(), ids[0]);
  expect(result.deletedEvents).toBe(1);
  expect(
    await prisma.analyticsEvent.count({
      where: { communityId: ids[0], occurredAt: { lt: at(-90) } },
    }),
  ).toBe(0);
  expect(
    await prisma.analyticsEvent.count({
      where: { communityId: ids[1], occurredAt: expired },
    }),
  ).toBe(1);
  const date = new Date(expired);
  date.setUTCHours(0, 0, 0, 0);
  expect(
    await prisma.analyticsTrafficDaily.findUnique({
      where: { communityId_date: { communityId: ids[0], date } },
    }),
  ).toMatchObject({ views: 1, visits: 1, visitors: 1 });
});

test("measures eligible cohorts without counting incomplete follow-up weeks", async () => {
  await prisma.analyticsEvent.createMany({
    data: [
      [-28, "returner"],
      [-18, "returner"],
      [-21, "no-return"],
    ].map(([days, visitor]) => ({
      communityId: ids[0],
      eventName: "page_view" as const,
      pageType: "public",
      pagePath: "/local-life",
      anonymousVisitorId: String(visitor),
      sessionId: `cohort-${visitor}-${days}`,
      occurredAt: at(Number(days)),
      metadata: { device: "tablet", schemaVersion: 2 },
    })),
  });
  const report = await getAnalyticsReport(ids[0], {
    start: date(-29),
    end: date(0),
    timezone: "UTC",
    device: "tablet",
    channel: "all",
    contentType: "all",
    excludeStaff: true,
  });
  expect(report.retention.find((r) => r.week === 1)).toEqual({
    week: 1,
    eligible: 2,
    returned: 1,
  });
  expect(report.retention.some((r) => r.week === 4)).toBe(false);
});

test("chooses exactly one landing and exit for simultaneous page views", async () => {
  const idsAtSameTime = [
    "11111111-aaaa-4111-8111-111111111111",
    "22222222-bbbb-4222-8222-222222222222",
  ];
  await prisma.analyticsEvent.createMany({
    data: idsAtSameTime.map((id, i) => ({
      id,
      communityId: ids[0],
      eventName: "page_view" as const,
      pageType: "public",
      pagePath: `/tie-${i}`,
      sessionId: "tie-session",
      anonymousVisitorId: "tie-browser",
      occurredAt: at(0),
      metadata: { device: "unknown", schemaVersion: 2 },
    })),
  });
  const report = await getAnalyticsReport(ids[0], {
    start: date(-6),
    end: date(0),
    timezone: "UTC",
    device: "unknown",
    channel: "all",
    contentType: "all",
    excludeStaff: true,
  });
  expect(report.landings.find((r) => r.label === "/tie-0")?.visits).toBe(1);
  expect(report.landings.find((r) => r.label === "/tie-1")).toBeUndefined();
  expect(report.exits.find((r) => r.label === "/tie-1")?.visits).toBe(1);
  expect(report.exits.find((r) => r.label === "/tie-0")).toBeUndefined();
});
