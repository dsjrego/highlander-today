import { readBoundedAnalyticsJson } from "@/lib/analytics/bounded-json";
import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { AnalyticsEventBatchSchema } from "@/lib/analytics/types";
import { classifyReferrer } from "@/lib/analytics/server";
import { resolveAnalyticsCommunity } from "@/lib/analytics/access";
import { analyticsContentExists } from "@/lib/analytics/content";
import {
  BOT_AGENT,
  MAX_BATCH_BYTES,
  safeAnalyticsPath,
  sanitizeAnalyticsMetadata,
  tenantEventId,
} from "@/lib/analytics/policy";
import { consumeRateLimit } from "@/lib/rate-limit";
import {
  getClientIpFromHeaders,
  isSameOriginMutation,
} from "@/lib/request-security";

export async function POST(request: NextRequest) {
  try {
    if (!isSameOriginMutation(request))
      return NextResponse.json(
        { error: "Cross-origin collection denied" },
        { status: 403 },
      );
    const communityId = await resolveAnalyticsCommunity(request.headers);
    if (!communityId)
      return NextResponse.json({ error: "Unknown community" }, { status: 404 });
    if (BOT_AGENT.test(request.headers.get("user-agent") || ""))
      return NextResponse.json({
        ok: true,
        accepted: 0,
        excluded: "automated",
      });
    const limit = consumeRateLimit(
      `analytics:${communityId}:${getClientIpFromHeaders(request.headers)}`,
      120,
      60_000,
    );
    if (!limit.allowed)
      return NextResponse.json(
        { error: "Collection limit reached" },
        {
          status: 429,
          headers: { "Retry-After": String(limit.retryAfterSeconds) },
        },
      );
    const enabled = await db.siteSetting.findUnique({
      where: { communityId_key: { communityId, key: "analytics_enabled" } },
      select: { value: true },
    });
    if (enabled?.value === "false")
      return NextResponse.json({ ok: true, accepted: 0, excluded: "disabled" });
    const { events } = AnalyticsEventBatchSchema.parse(
      await readBoundedAnalyticsJson(request, MAX_BATCH_BYTES),
    );
    const siteDomain =
      request.headers.get("x-community-domain") || request.headers.get("host");
    const now = Date.now();
    const ownership = new Map<string, boolean>();
    for (const event of events) {
      if (event.contentId && event.contentType) {
        const key = `${event.contentType}:${event.contentId}`;
        if (!ownership.has(key))
          ownership.set(
            key,
            await analyticsContentExists(
              communityId,
              event.contentType,
              event.contentId,
            ),
          );
      }
    }
    const data: Prisma.AnalyticsEventCreateManyInput[] = [];
    for (const event of events) {
      const path = safeAnalyticsPath(event.pagePath);
      if (!path) continue;
      if (Boolean(event.contentType) !== Boolean(event.contentId)) continue;
      if (
        event.contentId &&
        !ownership.get(`${event.contentType}:${event.contentId}`)
      )
        continue;
      const occurredAt = event.occurredAt
        ? new Date(event.occurredAt)
        : new Date(now);
      if (
        occurredAt.getTime() < now - 24 * 3600_000 ||
        occurredAt.getTime() > now + 60_000
      )
        continue;
      const metadata = sanitizeAnalyticsMetadata(event.metadata);
      // Browser events are untrusted intent/behavior, never server-confirmed conversions.
      const ids = event.metadata;
      const readId = (key: string) =>
        typeof ids?.[key] === "string" &&
        /^[\w-]{1,100}$/.test(ids[key] as string)
          ? (ids[key] as string)
          : null;
      const sessionId = readId("sessionId");
      const anonymousVisitorId = readId("anonymousVisitorId");
      const referrer = classifyReferrer(event.referrerUrl, siteDomain);
      data.push({
        ...(event.eventId
          ? { id: tenantEventId(communityId, event.eventId) }
          : {}),
        communityId,
        siteDomain,
        userId: null,
        sessionId:
          sessionId || `unidentified-${event.eventId || crypto.randomUUID()}`,
        anonymousVisitorId,
        eventName: event.eventName,
        contentType: event.contentType || null,
        contentId: event.contentId || null,
        pageType: event.pageType,
        pagePath: path,
        ...referrer,
        occurredAt,
        metadata: {
          ...metadata,
          origin: "browser",
          schemaVersion:
            event.eventId && event.metadata?.clientVersion === 2 ? 2 : 1,
          staff: ["EDITOR", "ADMIN", "SUPER_ADMIN", "STAFF_WRITER"].includes(
            request.headers.get("x-user-role") || "",
          ),
        },
      });
    }
    const result = data.length
      ? await db.analyticsEvent.createMany({ data, skipDuplicates: true })
      : { count: 0 };
    return NextResponse.json({
      ok: true,
      accepted: result.count,
      processed: data.length,
      excluded: events.length - data.length,
    });
  } catch (error) {
    if (error instanceof RangeError)
      return NextResponse.json({ error: "Batch too large" }, { status: 413 });
    if (error instanceof z.ZodError || error instanceof SyntaxError)
      return NextResponse.json(
        { error: "Invalid analytics batch" },
        { status: 400 },
      );
    console.error(
      "[analytics] Ingestion failed",
      error instanceof Error ? error.name : "unknown",
    );
    return NextResponse.json(
      { error: "Analytics temporarily unavailable" },
      { status: 503 },
    );
  }
}
