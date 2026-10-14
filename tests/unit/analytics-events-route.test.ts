import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { prismaMock } from "@/__mocks__/prisma";
import { clearRateLimitStore } from "@/lib/rate-limit";
jest.mock("@/lib/db", () => ({ db: prismaMock }));
jest.mock("@/lib/analytics/access", () => ({
  resolveAnalyticsCommunity: jest
    .fn<() => Promise<string | null>>()
    .mockResolvedValue("11111111-1111-4111-8111-111111111111"),
}));
jest.mock("@/lib/analytics/content", () => ({
  analyticsContentExists: jest
    .fn<() => Promise<boolean>>()
    .mockResolvedValue(true),
}));
const { resolveAnalyticsCommunity } =
  require("@/lib/analytics/access") as typeof import("@/lib/analytics/access");
const { analyticsContentExists } =
  require("@/lib/analytics/content") as typeof import("@/lib/analytics/content");
const { POST } =
  require("@/app/api/analytics/events/route") as typeof import("@/app/api/analytics/events/route");
import { tenantEventId } from "@/lib/analytics/policy";
const eventId = "22222222-2222-4222-8222-222222222222";
const event = {
  eventId,
  eventName: "page_view",
  contentType: "ARTICLE",
  contentId: "33333333-3333-4333-8333-333333333333",
  pageType: "article-detail",
  pagePath: "/local-life/story?token=secret",
  referrerUrl: "https://www.google.com/search?q=private",
  metadata: {
    anonymousVisitorId: "anon-1",
    sessionId: "session-1",
    scrollBucket: "top",
    clientVersion: 2,
    password: "never-store",
    origin: "server",
  },
};
function request(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://localhost/api/analytics/events", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-community-domain": "highlander.today",
      ...headers,
    },
    body: JSON.stringify(body),
  }) as any;
}
describe("analytics collection boundary", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearRateLimitStore();
    (
      resolveAnalyticsCommunity as jest.MockedFunction<
        typeof resolveAnalyticsCommunity
      >
    ).mockResolvedValue("11111111-1111-4111-8111-111111111111");
    (
      analyticsContentExists as jest.MockedFunction<
        typeof analyticsContentExists
      >
    ).mockResolvedValue(true);
    (prismaMock.siteSetting.findUnique as any).mockResolvedValue(null);
    (prismaMock.analyticsEvent.createMany as any).mockResolvedValue({
      count: 1,
    });
  });
  it("sanitizes paths/metadata and derives tenant-specific retry IDs", async () => {
    const res = await POST(request({ events: [event] }));
    expect(res.status).toBe(200);
    expect(prismaMock.analyticsEvent.createMany).toHaveBeenCalledWith({
      skipDuplicates: true,
      data: [
        expect.objectContaining({
          id: tenantEventId("11111111-1111-4111-8111-111111111111", eventId),
          communityId: "11111111-1111-4111-8111-111111111111",
          userId: null,
          pagePath: "/local-life/story",
          referrerHost: "www.google.com",
          referrerType: "SEARCH",
          metadata: {
            scrollBucket: "top",
            clientVersion: 2,
            origin: "browser",
            schemaVersion: 2,
            staff: false,
          },
        }),
      ],
    });
  });
  it("fails closed on unknown tenants", async () => {
    (
      resolveAnalyticsCommunity as jest.MockedFunction<
        typeof resolveAnalyticsCommunity
      >
    ).mockResolvedValue(null);
    expect((await POST(request({ events: [event] }))).status).toBe(404);
    expect(prismaMock.analyticsEvent.createMany).not.toHaveBeenCalled();
  });
  it("excludes foreign or unpublished content", async () => {
    (
      analyticsContentExists as jest.MockedFunction<
        typeof analyticsContentExists
      >
    ).mockResolvedValue(false);
    expect(
      await (await POST(request({ events: [event] }))).json(),
    ).toMatchObject({ accepted: 0, excluded: 1 });
    expect(prismaMock.analyticsEvent.createMany).not.toHaveBeenCalled();
  });
  it("excludes private paths and stale/future events", async () => {
    await POST(
      request({
        events: [
          { ...event, pagePath: "/messages/private" },
          { ...event, occurredAt: "2001-01-01T00:00:00Z" },
          { ...event, occurredAt: "2099-01-01T00:00:00Z" },
        ],
      }),
    );
    expect(prismaMock.analyticsEvent.createMany).not.toHaveBeenCalled();
  });
  it("rejects cross-origin collection and oversized streamed bodies", async () => {
    expect(
      (
        await POST(
          request({ events: [event] }, { origin: "https://attacker.test" }),
        )
      ).status,
    ).toBe(403);
    expect(
      (await POST(request({ padding: "x".repeat(65 * 1024) }))).status,
    ).toBe(413);
  });
  it("rejects malformed payloads and more than 50 events", async () => {
    expect(
      (await POST(request({ events: [{ ...event, eventName: "fake" }] })))
        .status,
    ).toBe(400);
    expect(
      (await POST(request({ events: Array(51).fill(event) }))).status,
    ).toBe(400);
  });
  it("honors tenant collection switch and bot exclusions", async () => {
    (prismaMock.siteSetting.findUnique as any).mockResolvedValue({
      value: "false",
    });
    expect(
      await (await POST(request({ events: [event] }))).json(),
    ).toMatchObject({ excluded: "disabled" });
    expect(
      await (
        await POST(request({ events: [event] }, { "user-agent": "Googlebot" }))
      ).json(),
    ).toMatchObject({ excluded: "automated" });
  });
});
