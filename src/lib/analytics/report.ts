import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { z } from "zod";
import { analyticsDateRange } from "./ranges";
import { safeAnalyticsPath } from "./policy";
import type {
  AnalyticsFilters,
  AnalyticsReport,
  ContentRow,
} from "./report-types";

const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (v) =>
      !Number.isNaN(Date.parse(v)) &&
      new Date(v).toISOString().slice(0, 10) === v,
  );
export const ReportFiltersSchema = z
  .object({
    start: date,
    end: date,
    timezone: z
      .string()
      .max(80)
      .default("America/New_York")
      .refine((v) => {
        try {
          new Intl.DateTimeFormat("en", { timeZone: v });
          return true;
        } catch {
          return false;
        }
      }),
    device: z
      .enum(["all", "desktop", "mobile", "tablet", "unknown"])
      .default("all"),
    channel: z
      .enum([
        "all",
        "SEARCH",
        "DIRECT",
        "INTERNAL",
        "EXTERNAL",
        "UNKNOWN",
        "CAMPAIGN",
      ])
      .default("all"),
    contentType: z
      .enum([
        "all",
        "ARTICLE",
        "EVENT",
        "RECIPE",
        "MARKETPLACE_LISTING",
        "STOREFRONT",
        "HELP_WANTED_POST",
        "ORGANIZATION",
        "STATIC_PAGE",
        "SUPPORT_PAGE",
      ])
      .default("all"),
    excludeStaff: z.coerce
      .string()
      .transform((v) => v !== "false")
      .default("true"),
  })
  .refine((v) => {
    const days = (Date.parse(v.end) - Date.parse(v.start)) / 86400_000;
    return (
      days >= 0 &&
      days < 90 &&
      Date.parse(v.end) < Date.now() + 86400_000 &&
      Date.parse(v.start) >= Date.now() - 91 * 86400_000
    );
  }, "Choose a valid range of at most 90 recent days");

export function parseReportFilters(
  params: URLSearchParams,
  now = new Date(),
): AnalyticsFilters {
  const candidate = params.get("timezone") || "America/New_York";
  let timezone = "America/New_York";
  try {
    new Intl.DateTimeFormat("en", { timeZone: candidate });
    timezone = candidate;
  } catch {
    /* Schema below returns a 400 for invalid zones. */
  }
  return ReportFiltersSchema.parse({
    ...analyticsDateRange(30, timezone, now),
    ...Object.fromEntries(params),
  });
}

/** Database-side aggregates only. Identifiers never leave the service. Every query is tenant-bound. */
export async function getAnalyticsReport(
  communityId: string,
  filters: AnalyticsFilters,
): Promise<AnalyticsReport> {
  if (!communityId) throw new Error("Tenant required");
  const { start, end, timezone, device, channel, contentType, excludeStaff } =
    filters;
  const rows = await db.$transaction(
    async (tx) => {
      await tx.$executeRaw`SET LOCAL statement_timeout = '8000'`;
      return tx.$queryRaw<
        Array<{ report: Omit<AnalyticsReport, "filters" | "generatedAt"> }>
      >(Prisma.sql`
WITH bounds AS (
 SELECT ${start}::date AS a, ${end}::date + 1 AS b, (${end}::date - ${start}::date + 1) AS days
), e AS MATERIALIZED (
 SELECT ev.id,ev."eventName",ev."contentType",ev."contentId",ev."sessionId",ev."anonymousVisitorId",ev.metadata,ev."occurredAt",ev."createdAt",ev."referrerHost",
 split_part(split_part(ev."pagePath",'?',1),'#',1) AS "pagePath", (ev."occurredAt" AT TIME ZONE 'UTC' AT TIME ZONE ${timezone})::date AS day,
 NULLIF(ev."anonymousVisitorId", '') AS visitor,
 COALESCE(ev.metadata->>'device', 'unknown') AS device,
 CASE WHEN ev.metadata->>'utmSource' IS NOT NULL THEN 'CAMPAIGN' ELSE COALESCE(ev."referrerType"::text, 'UNKNOWN') END AS channel,
 (ev.metadata->>'origin' = 'server' AND ev."eventName"::text IN ('comment_created','reaction_added','message_started_from_content')) IS TRUE AS confirmed,
 CASE WHEN jsonb_typeof(ev.metadata->'activeSeconds') = 'number' THEN LEAST(30, GREATEST(0, (ev.metadata->>'activeSeconds')::numeric)) ELSE 0 END AS seconds
 FROM analytics_events ev, bounds
 WHERE ev."communityId" = ${communityId}::uuid
 AND ev."occurredAt" >= ((bounds.a - bounds.days)::timestamp AT TIME ZONE ${timezone} AT TIME ZONE 'UTC')
 AND ev."occurredAt" < (bounds.b::timestamp AT TIME ZONE ${timezone} AT TIME ZONE 'UTC')
 AND (${device} = 'all' OR COALESCE(ev.metadata->>'device','unknown') = ${device})
 AND (${contentType} = 'all' OR ev."contentType"::text = ${contentType})
 AND (${channel} = 'all' OR CASE WHEN ev.metadata->>'utmSource' IS NOT NULL THEN 'CAMPAIGN' ELSE COALESCE(ev."referrerType"::text,'UNKNOWN') END = ${channel})
 AND (NOT ${excludeStaff} OR COALESCE(ev.metadata->>'staff','false') <> 'true')
 AND ev."pagePath" !~ '^/(admin|api|messages|profile|login|register|interviews)(/|$)'
 AND ev."pagePath" !~ '/(submit|create|edit|drafts|manage|workspace)(/|$)'
), current_events AS MATERIALIZED (SELECT e.* FROM e, bounds WHERE e.day >= bounds.a),
sessions AS MATERIALIZED (
 SELECT "sessionId" AS id, day >= bounds.a AS current,
 count(*) FILTER (WHERE "eventName"::text='page_view') AS views,
 sum(seconds) AS seconds, bool_or(confirmed) AS confirmed,
 min("occurredAt") FILTER (WHERE "eventName"::text='page_view') AS entry,
 max("occurredAt") FILTER (WHERE "eventName"::text='page_view') AS exit
 FROM e, bounds GROUP BY "sessionId", day >= bounds.a
), totals AS (
 SELECT current, count(*) FILTER (WHERE views>0) AS visits,
 count(*) FILTER (WHERE views>0 AND (seconds>=10 OR views>=2 OR confirmed)) AS engaged, sum(seconds) AS seconds
 FROM sessions GROUP BY current
), page_events AS MATERIALIZED (SELECT id,"sessionId","occurredAt","pagePath",day,visitor,device,channel,"referrerHost","anonymousVisitorId",
 metadata->>'browser' AS browser,metadata->>'utmSource' AS campaign_source,metadata->>'utmMedium' AS campaign_medium,metadata->>'utmCampaign' AS campaign_name
 FROM current_events WHERE "eventName"::text='page_view'),
 daily AS MATERIALIZED (SELECT day,count(*) FILTER(WHERE "eventName"::text='page_view') AS views,
 count(DISTINCT "sessionId") FILTER(WHERE "eventName"::text='page_view') AS visits,
 count(DISTINCT visitor) FILTER(WHERE "eventName"::text='page_view') AS visitors,count(*) FILTER(WHERE confirmed) AS actions
 FROM e GROUP BY day),

page_order AS (
 SELECT "pagePath" AS path, "sessionId", "occurredAt",visitor,
 row_number() OVER(PARTITION BY "sessionId" ORDER BY "occurredAt",id) AS entry_rank,
 row_number() OVER(PARTITION BY "sessionId" ORDER BY "occurredAt" DESC,id DESC) AS exit_rank,
 lead("pagePath") OVER(PARTITION BY "sessionId" ORDER BY "occurredAt", id) AS next
 FROM page_events
), firsts AS (
 SELECT visitor, min(day) AS first, array_agg(DISTINCT day) AS observed_days, bool_or(day>=bounds.a) AS seen_current FROM e CROSS JOIN bounds WHERE visitor IS NOT NULL AND "eventName"::text='page_view' GROUP BY visitor
), funnel_sessions AS (
 SELECT "sessionId", min("occurredAt") FILTER (WHERE "eventName"::text='page_view') AS view,
 min("occurredAt") FILTER (WHERE "eventName"::text='content_open') AS opened,
 max("occurredAt") FILTER (WHERE "eventName"::text IN ('cta_clicked','share_clicked','copy_link_clicked','message_started_from_content')) AS acted
 FROM current_events GROUP BY "sessionId"
)
SELECT jsonb_build_object(
 'audience', jsonb_build_object('newlyObserved',(SELECT count(*) FROM firsts,bounds WHERE seen_current AND first>=bounds.a),'seenPreviously',(SELECT count(*) FROM firsts,bounds WHERE seen_current AND first<bounds.a)),
 'current', jsonb_build_object('views',(SELECT count(*) FROM page_events),'visits',COALESCE((SELECT visits FROM totals WHERE current),0),'visitors',(SELECT count(DISTINCT visitor) FROM page_events),'engaged',COALESCE((SELECT engaged FROM totals WHERE current),0),'seconds',COALESCE((SELECT seconds FROM totals WHERE current),0),'actions',(SELECT count(*) FROM current_events WHERE confirmed)),
 'previous', jsonb_build_object('views',(SELECT count(*) FROM e,bounds WHERE day<bounds.a AND "eventName"::text='page_view'),'visits',COALESCE((SELECT visits FROM totals WHERE NOT current),0),'visitors',(SELECT count(DISTINCT visitor) FROM e,bounds WHERE day<bounds.a AND "eventName"::text='page_view'),'engaged',COALESCE((SELECT engaged FROM totals WHERE NOT current),0),'seconds',COALESCE((SELECT seconds FROM totals WHERE NOT current),0),'actions',(SELECT count(*) FROM e,bounds WHERE day<bounds.a AND confirmed)),
 'series', (SELECT COALESCE(jsonb_agg(row_to_json(x) ORDER BY date),'[]') FROM (
 SELECT d::date::text AS date,COALESCE(c.views,0) AS views,COALESCE(c.visits,0) AS visits,COALESCE(c.visitors,0) AS visitors,COALESCE(c.actions,0) AS actions,COALESCE(p.visits,0) AS previous
 FROM bounds CROSS JOIN LATERAL generate_series(bounds.a::timestamp,(bounds.b-1)::timestamp,'1 day') d
 LEFT JOIN daily c ON c.day=d::date LEFT JOIN daily p ON p.day=d::date-bounds.days
 ) x),
 'channels', (SELECT COALESCE(jsonb_agg(row_to_json(x)),'[]') FROM (SELECT channel AS label, count(*) AS views,count(DISTINCT "sessionId") AS visits,count(DISTINCT visitor) AS visitors,0 AS actions FROM page_events GROUP BY channel ORDER BY visits DESC) x),
 'devices', (SELECT COALESCE(jsonb_agg(row_to_json(x)),'[]') FROM (SELECT device AS label, count(*) AS views,count(DISTINCT "sessionId") AS visits,count(DISTINCT visitor) AS visitors,0 AS actions FROM page_events GROUP BY device ORDER BY visits DESC) x),
 'browsers', (SELECT COALESCE(jsonb_agg(row_to_json(x)),'[]') FROM (SELECT COALESCE(browser,'Unknown') AS label,count(*) AS views,count(DISTINCT "sessionId") AS visits,count(DISTINCT visitor) AS visitors,0 AS actions FROM page_events GROUP BY 1 ORDER BY visits DESC LIMIT 12) x),
 'campaigns', (SELECT COALESCE(jsonb_agg(row_to_json(x)),'[]') FROM (SELECT concat_ws(' / ',campaign_source,campaign_medium,campaign_name) AS label,count(*) AS views,count(DISTINCT "sessionId") AS visits,count(DISTINCT visitor) AS visitors,0 AS actions FROM page_events WHERE campaign_source IS NOT NULL GROUP BY 1 ORDER BY visits DESC LIMIT 30) x),
 'referrers', (SELECT COALESCE(jsonb_agg(row_to_json(x)),'[]') FROM (SELECT COALESCE("referrerHost",'Direct / unknown') AS label,count(*) AS views,count(DISTINCT "sessionId") AS visits,count(DISTINCT visitor) AS visitors,0 AS actions FROM page_events GROUP BY 1 ORDER BY visits DESC LIMIT 30) x),
 'pages', (SELECT COALESCE(jsonb_agg(row_to_json(x)),'[]') FROM (SELECT split_part(split_part("pagePath",'?',1),'#',1) AS label,count(*) AS views,count(DISTINCT "sessionId") AS visits,count(DISTINCT visitor) AS visitors,0 AS actions FROM page_events GROUP BY 1 ORDER BY views DESC LIMIT 100) x),
 'landings', (SELECT COALESCE(jsonb_agg(row_to_json(x)),'[]') FROM (SELECT path AS label,count(*) AS views,count(DISTINCT "sessionId") AS visits,count(DISTINCT visitor) AS visitors,0 AS actions FROM page_order WHERE entry_rank=1 GROUP BY 1 ORDER BY visits DESC LIMIT 30) x),
 'exits', (SELECT COALESCE(jsonb_agg(row_to_json(x)),'[]') FROM (SELECT path AS label,count(*) AS views,count(DISTINCT "sessionId") AS visits,count(DISTINCT visitor) AS visitors,0 AS actions FROM page_order WHERE exit_rank=1 GROUP BY 1 ORDER BY visits DESC LIMIT 30) x),
 'content', (SELECT COALESCE(jsonb_agg(row_to_json(x)),'[]') FROM (SELECT "contentType" AS type,"contentId" AS id,"contentId" AS label,count(DISTINCT COALESCE(metadata->>'pageId',id::text)) FILTER(WHERE "eventName"::text IN ('content_open','page_view')) AS views,count(DISTINCT "sessionId") AS visits,count(DISTINCT visitor) AS visitors,count(*) FILTER(WHERE confirmed) AS actions,count(*) FILTER(WHERE "eventName"::text IN ('share_clicked','copy_link_clicked')) AS shares,count(DISTINCT "sessionId") FILTER(WHERE "eventName"::text='scroll_depth_reached' AND metadata->>'percent'='100') AS completion,sum(seconds) AS seconds FROM current_events WHERE "contentId" IS NOT NULL GROUP BY "contentType","contentId" ORDER BY views DESC LIMIT 100) x),
 'outcomes',(SELECT COALESCE(jsonb_agg(row_to_json(x)),'[]') FROM (SELECT "eventName" AS label,count(*) AS count,confirmed FROM current_events WHERE confirmed OR "eventName"::text IN ('cta_clicked','share_clicked','copy_link_clicked','message_started_from_content') GROUP BY "eventName",confirmed ORDER BY confirmed DESC,count DESC) x),
 'retention',(SELECT COALESCE(jsonb_agg(row_to_json(x) ORDER BY week),'[]') FROM (
 SELECT w.week,count(*) AS eligible,count(*) FILTER(WHERE EXISTS (
 SELECT 1 FROM unnest(f.observed_days) observed(day) WHERE observed.day>=f.first+w.week*7 AND observed.day<f.first+(w.week+1)*7
 )) AS returned
 FROM firsts f CROSS JOIN bounds CROSS JOIN generate_series(1,4) w(week)
 WHERE f.first>=bounds.a AND f.first+(w.week+1)*7<=bounds.b GROUP BY w.week
 ) x),
 'funnel',jsonb_build_array(jsonb_build_object('label','Visited','count',(SELECT count(*) FROM funnel_sessions WHERE view IS NOT NULL)),jsonb_build_object('label','Opened content','count',(SELECT count(*) FROM funnel_sessions WHERE opened>=view)),jsonb_build_object('label','Took an action','count',(SELECT count(*) FROM funnel_sessions WHERE acted>=opened AND opened>=view))),
 'journeys',(SELECT COALESCE(jsonb_agg(row_to_json(x)),'[]') FROM (SELECT path AS "from",next AS "to",count(*) AS count FROM page_order WHERE next IS NOT NULL AND next<>path GROUP BY path,next ORDER BY count DESC LIMIT 30) x),
 'slots',(SELECT COALESCE(jsonb_agg(row_to_json(x)),'[]') FROM (SELECT concat_ws(' · ', metadata->>'slot',metadata->>'boxType',metadata->>'placement') AS label,count(*) FILTER(WHERE "eventName"::text='content_impression') AS impressions,count(*) FILTER(WHERE "eventName"::text='homepage_slot_clicked') AS clicks FROM current_events WHERE metadata->>'slot' IS NOT NULL GROUP BY 1 ORDER BY impressions DESC LIMIT 30) x),
 'health', jsonb_build_object('firstEvent',(SELECT min("occurredAt") AT TIME ZONE 'UTC' FROM analytics_events WHERE "communityId"=${communityId}::uuid),'lastEvent',(SELECT max("createdAt") AT TIME ZONE 'UTC' FROM current_events),'events',(SELECT count(*) FROM current_events),'measuredPages',(SELECT count(DISTINCT "pagePath") FROM page_events),'legacyEvents',(SELECT count(*) FROM current_events WHERE COALESCE(metadata->>'schemaVersion','1')<>'2'),'unidentified',(SELECT count(*) FROM page_events WHERE "anonymousVisitorId" IS NULL),'live',(SELECT count(DISTINCT "sessionId") FROM analytics_events WHERE "communityId"=${communityId}::uuid AND "occurredAt">(now() AT TIME ZONE 'UTC')-interval '5 minutes' AND "eventName"::text='page_view'), 'vitals', (SELECT COALESCE(jsonb_agg(row_to_json(x)),'[]') FROM (SELECT metadata->>'vital' AS label,percentile_cont(.75) WITHIN GROUP(ORDER BY (metadata->>'value')::numeric) AS value,count(*) AS samples FROM current_events WHERE "eventName"::text='web_vital' AND jsonb_typeof(metadata->'value')='number' GROUP BY 1) x))
) AS report
`);
    },
    {
      timeout: 12_000,
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
    },
  );
  const report = {
    ...rows[0].report,
    generatedAt: new Date().toISOString(),
    filters,
  } as AnalyticsReport;
  // Resolve labels within the same tenant; deleted or malicious historical references disclose nothing.
  const groups = new Map<string, string[]>();
  report.content.forEach((row) => {
    if (/^[0-9a-f-]{36}$/i.test(row.id))
      groups.set(row.type, [...(groups.get(row.type) || []), row.id]);
  });
  const labels = new Map<string, Partial<ContentRow>>();
  for (const [type, ids] of groups) {
    const where = { communityId, id: { in: ids } };
    if (type === "ARTICLE" || type === "RECIPE") {
      const select = {
        id: true,
        title: true,
        category: { select: { name: true } },
        author: { select: { firstName: true, lastName: true } },
      } as const;
      const records =
        type === "ARTICLE"
          ? await db.article.findMany({ where, select })
          : await db.recipe.findMany({ where, select });
      records.forEach((r) =>
        labels.set(`${type}:${r.id}`, {
          title: r.title,
          category: r.category?.name || "Uncategorized",
          author: `${r.author.firstName} ${r.author.lastName}`,
          href: `/${type === "ARTICLE" ? "local-life" : "recipes"}/${r.id}`,
        }),
      );
    } else if (type === "ORGANIZATION" || type === "STOREFRONT") {
      const records =
        type === "ORGANIZATION"
          ? await db.organization.findMany({
              where,
              select: { id: true, name: true, slug: true },
            })
          : await db.store.findMany({
              where,
              select: { id: true, name: true, slug: true },
            });
      records.forEach((r) =>
        labels.set(`${type}:${r.id}`, {
          title: r.name,
          category: type === "ORGANIZATION" ? "Organizations" : "Storefronts",
          author: "",
          href:
            type === "ORGANIZATION"
              ? `/organizations/${r.slug}`
              : `/marketplace/stores/${r.id}`,
        }),
      );
    } else {
      const records =
        type === "EVENT"
          ? await db.event.findMany({
              where,
              select: { id: true, title: true },
            })
          : type === "HELP_WANTED_POST"
            ? await db.helpWantedPost.findMany({
                where,
                select: { id: true, title: true },
              })
            : type === "MARKETPLACE_LISTING"
              ? await db.marketplaceListing.findMany({
                  where,
                  select: { id: true, title: true },
                })
              : [];
      records.forEach((r) =>
        labels.set(`${type}:${r.id}`, {
          title: r.title,
          category: type.replace(/_/g, " "),
          author: "",
          href: `/${type === "EVENT" ? "events" : type === "HELP_WANTED_POST" ? "help-wanted" : "marketplace"}/${r.id}`,
        }),
      );
    }
  }
  report.content = report.content
    .filter((r) => labels.has(`${r.type}:${r.id}`))
    .map((r) => ({ ...r, ...labels.get(`${r.type}:${r.id}`) }));
  const summarize = (field: "category" | "author") => {
    const map = new Map<string, ContentRow[]>();
    report.content.forEach((r) => {
      if (r[field]) map.set(r[field], [...(map.get(r[field]) || []), r]);
    });
    // Counts of views/actions are additive; range uniques require a separate distinct query and are omitted here.
    return [...map]
      .map(([label, content]) => ({
        label,
        views: content.reduce((n, r) => n + r.views, 0),
        visits: 0,
        visitors: 0,
        actions: content.reduce((n, r) => n + r.actions, 0),
      }))
      .sort((a, b) => b.views - a.views);
  };
  report.categories = summarize("category");
  report.authors = summarize("author");
  const maintenance = await db.siteSetting.findUnique({
    where: { communityId_key: { communityId, key: "analytics_maintenance" } },
    select: { value: true },
  });
  report.health.maintenance = maintenance?.value || null;
  for (const key of ["pages", "landings", "exits"] as const)
    report[key] = report[key]
      .filter((row) => safeAnalyticsPath(row.label) !== null)
      .map((row) => ({ ...row, label: safeAnalyticsPath(row.label)! }));
  report.journeys = report.journeys
    .filter(
      (row) =>
        safeAnalyticsPath(row.from) !== null &&
        safeAnalyticsPath(row.to) !== null,
    )
    .map((row) => ({
      ...row,
      from: safeAnalyticsPath(row.from)!,
      to: safeAnalyticsPath(row.to)!,
    }));
  return report;
}
