import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  authorizeAnalytics,
  AnalyticsAccessError,
} from "@/lib/analytics/access";
import { parseReportFilters } from "@/lib/analytics/report";
export async function GET(request: NextRequest) {
  try {
    const access = await authorizeAnalytics(request.headers);
    if (!access.isPlatformAdmin)
      return NextResponse.json(
        { error: "Platform analytics access required" },
        { status: 403 },
      );
    const f = parseReportFilters(request.nextUrl.searchParams);
    const rows = await db.$transaction(
      async (tx) => {
        await tx.$executeRaw`SET LOCAL statement_timeout='8000'`;
        return tx.$queryRaw<
          Array<{
            id: string;
            name: string;
            views: bigint;
            visits: bigint;
            visitors: bigint;
            actions: bigint;
          }>
        >(Prisma.sql`
   SELECT c.id,c.name,count(*) FILTER(WHERE ev."eventName"::text='page_view') AS views,
   count(DISTINCT ev."sessionId") FILTER(WHERE ev."eventName"::text='page_view') AS visits,
   count(DISTINCT ev."anonymousVisitorId") FILTER(WHERE ev."eventName"::text='page_view') AS visitors,
   count(*) FILTER(WHERE ev.metadata->>'origin'='server' AND ev."eventName"::text IN ('comment_created','reaction_added','message_started_from_content')) AS actions
   FROM communities c LEFT JOIN analytics_events ev ON ev."communityId"=c.id
   AND ev."occurredAt">=(${f.start}::date::timestamp AT TIME ZONE ${f.timezone} AT TIME ZONE 'UTC')
   AND ev."occurredAt"<((${f.end}::date+1)::timestamp AT TIME ZONE ${f.timezone} AT TIME ZONE 'UTC')
   AND (${f.device}='all' OR COALESCE(ev.metadata->>'device','unknown')=${f.device})
   AND (${f.contentType}='all' OR ev."contentType"::text=${f.contentType})
   AND (${f.channel}='all' OR CASE WHEN ev.metadata->>'utmSource' IS NOT NULL THEN 'CAMPAIGN' ELSE COALESCE(ev."referrerType"::text,'UNKNOWN') END=${f.channel})
   AND (NOT ${f.excludeStaff} OR COALESCE(ev.metadata->>'staff','false')<>'true')
   AND ev."pagePath" !~ '^/(admin|api|messages|profile|login|register|interviews)(/|$)'
   AND ev."pagePath" !~ '/(submit|create|edit|drafts|manage|workspace)(/|$)'
   GROUP BY c.id,c.name ORDER BY views DESC,c.name LIMIT 200
  `);
      },
      { timeout: 12_000 },
    );
    return NextResponse.json(
      rows.map((r) => ({
        ...r,
        views: Number(r.views),
        visits: Number(r.visits),
        visitors: Number(r.visitors),
        actions: Number(r.actions),
      })),
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    if (error instanceof AnalyticsAccessError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    return NextResponse.json(
      { error: "Platform comparison unavailable" },
      { status: error instanceof z.ZodError ? 400 : 503 },
    );
  }
}
