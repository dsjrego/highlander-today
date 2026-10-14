import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { recomputeAnalyticsRollupsForDay } from "./rollups";
import { RAW_RETENTION_DAYS } from "./policy";

export async function archiveTrafficDay(day: Date, communityId?: string) {
  const date = new Date(day);
  date.setUTCHours(0, 0, 0, 0);
  const end = new Date(date.getTime() + 86400_000);
  const rows = await db.$queryRaw<
    Array<{
      communityId: string;
      views: bigint;
      visits: bigint;
      visitors: bigint;
      engaged: bigint;
      seconds: bigint;
      actions: bigint;
    }>
  >(Prisma.sql`
    WITH e AS (SELECT *, CASE WHEN jsonb_typeof(metadata->'activeSeconds')='number' THEN LEAST(30,GREATEST(0,(metadata->>'activeSeconds')::numeric)) ELSE 0 END AS seconds
      FROM analytics_events WHERE (${communityId || null}::uuid IS NULL OR "communityId"=${communityId || null}::uuid) AND "communityId" IS NOT NULL AND "occurredAt">=${date} AND "occurredAt"<${end}),
    sessions AS (SELECT "communityId","sessionId",count(*) FILTER(WHERE "eventName"::text='page_view') AS views,sum(seconds) AS seconds, bool_or(metadata->>'origin'='server' AND "eventName"::text IN ('comment_created','reaction_added','message_started_from_content')) AS confirmed FROM e GROUP BY "communityId","sessionId")
    SELECT e."communityId",count(*) FILTER(WHERE "eventName"::text='page_view') AS views,
    (SELECT count(*) FROM sessions s WHERE s."communityId"=e."communityId" AND views>0) AS visits,
    count(DISTINCT "anonymousVisitorId") FILTER(WHERE "eventName"::text='page_view') AS visitors,
    (SELECT count(*) FROM sessions s WHERE s."communityId"=e."communityId" AND views>0 AND (views>=2 OR seconds>=10 OR confirmed)) AS engaged,
    COALESCE(sum(seconds),0)::bigint AS seconds,
    count(*) FILTER(WHERE metadata->>'origin'='server' AND "eventName"::text IN ('comment_created','reaction_added','message_started_from_content')) AS actions
    FROM e GROUP BY e."communityId"
  `);
  for (const r of rows) {
    const data = {
      views: Number(r.views),
      visits: Number(r.visits),
      visitors: Number(r.visitors),
      engagedSessions: Number(r.engaged),
      activeSeconds: Number(r.seconds),
      confirmedActions: Number(r.actions),
    };
    await db.analyticsTrafficDaily.upsert({
      where: { communityId_date: { communityId: r.communityId, date } },
      create: { communityId: r.communityId, date, ...data },
      update: data,
    });
  }
  return rows.length;
}

/** Retry-safe: an expired day is deleted only after both history layers succeeded. */
export async function maintainAnalytics(
  now = new Date(),
  communityId?: string,
) {
  return db.$transaction(
    async (lock) => {
      const [state] = await lock.$queryRaw<
        Array<{ locked: boolean }>
      >`SELECT pg_try_advisory_xact_lock(718624104) AS locked`;
      if (!state.locked)
        return { skipped: true, archivedDays: 0, deletedEvents: 0 };
      const today = new Date(now);
      today.setUTCHours(0, 0, 0, 0);
      for (const days of [2, 1]) {
        const day = new Date(today.getTime() - days * 86400_000);
        await recomputeAnalyticsRollupsForDay(day, communityId);
        await archiveTrafficDay(day, communityId);
      }
      const cutoff = new Date(today.getTime() - RAW_RETENTION_DAYS * 86400_000);
      const expired = await db.$queryRaw<
        Array<{ date: Date }>
      >`SELECT DISTINCT date_trunc('day',"occurredAt") AS date FROM analytics_events WHERE (${communityId || null}::uuid IS NULL OR "communityId"=${communityId || null}::uuid) AND "occurredAt"<${cutoff} ORDER BY date LIMIT 7`;
      let deletedEvents = 0;
      for (const { date } of expired) {
        await recomputeAnalyticsRollupsForDay(date, communityId);
        await archiveTrafficDay(date, communityId);
        const end = new Date(date.getTime() + 86400_000);
        deletedEvents += (
          await db.analyticsEvent.deleteMany({
            where: {
              ...(communityId ? { communityId } : {}),
              occurredAt: { gte: date, lt: end },
            },
          })
        ).count;
      }
      const aggregateCutoff = new Date(today);
      aggregateCutoff.setUTCMonth(aggregateCutoff.getUTCMonth() - 25);
      await db.analyticsTrafficDaily.deleteMany({
        where: {
          ...(communityId ? { communityId } : {}),
          date: { lt: aggregateCutoff },
        },
      });
      await db.contentMetricsDaily.deleteMany({
        where: {
          ...(communityId ? { communityId } : {}),
          date: { lt: aggregateCutoff },
        },
      });
      await db.categoryMetricsDaily.deleteMany({
        where: {
          ...(communityId ? { communityId } : {}),
          date: { lt: aggregateCutoff },
        },
      });
      await db.homepageSlotMetricsDaily.deleteMany({
        where: {
          ...(communityId ? { communityId } : {}),
          date: { lt: aggregateCutoff },
        },
      });
      const communities = communityId
        ? [{ id: communityId }]
        : await db.community.findMany({ select: { id: true } });
      for (const community of communities)
        await db.siteSetting.upsert({
          where: {
            communityId_key: {
              communityId: community.id,
              key: "analytics_maintenance",
            },
          },
          create: {
            communityId: community.id,
            key: "analytics_maintenance",
            value: now.toISOString(),
          },
          update: { value: now.toISOString() },
        });
      return {
        skipped: false,
        archivedDays: expired.length + 2,
        deletedEvents,
      };
    },
    { timeout: 240_000, maxWait: 5000 },
  );
}
