import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

/** Recompute one UTC day atomically. Distincts and grouping stay in PostgreSQL. */
export async function recomputeAnalyticsRollupsForDay(
  day: Date,
  communityId?: string,
) {
  const date = new Date(day);
  date.setUTCHours(0, 0, 0, 0);
  const end = new Date(date.getTime() + 86400_000);
  const base = Prisma.sql`
    WITH descriptors AS (
      SELECT a."communityId",a.id,'ARTICLE'::"AnalyticsContentType" AS type,COALESCE(c.name,'Uncategorized') AS category,a."authorUserId" AS author FROM articles a LEFT JOIN categories c ON c.id=a."categoryId" AND c."communityId"=a."communityId"
      UNION ALL SELECT r."communityId",r.id,'RECIPE'::"AnalyticsContentType",COALESCE(c.name,'Uncategorized'),r."authorUserId" FROM recipes r LEFT JOIN categories c ON c.id=r."categoryId" AND c."communityId"=r."communityId"
      UNION ALL SELECT e."communityId",e.id,'EVENT'::"AnalyticsContentType",COALESCE(o.name,'Events'),e."submittedByUserId" FROM events e LEFT JOIN organizations o ON o.id=e."organizationId" AND o."communityId"=e."communityId"
      UNION ALL SELECT "communityId",id,'MARKETPLACE_LISTING'::"AnalyticsContentType",category,"authorUserId" FROM marketplace_listings
      UNION ALL SELECT "communityId",id,'HELP_WANTED_POST'::"AnalyticsContentType","postingType"::text,"authorUserId" FROM help_wanted_posts
      UNION ALL SELECT "communityId",id,'ORGANIZATION'::"AnalyticsContentType","organizationType","createdByUserId" FROM organizations
      UNION ALL SELECT "communityId",id,'STOREFRONT'::"AnalyticsContentType",'Storefront',"ownerUserId" FROM stores
    ), e AS MATERIALIZED (
      SELECT ev.*, d.category,d.author, (ev.metadata->>'origin'='server') IS TRUE AS confirmed
      FROM analytics_events ev JOIN descriptors d ON d."communityId"=ev."communityId" AND d.type=ev."contentType" AND d.id::text=ev."contentId"
      WHERE (${communityId || null}::uuid IS NULL OR ev."communityId"=${communityId || null}::uuid) AND ev."occurredAt">=${date} AND ev."occurredAt"<${end}
    )`;
  return db.$transaction(
    async (tx) => {
      await tx.$executeRaw`SET LOCAL statement_timeout='20000'`;
      await tx.contentMetricsDaily.deleteMany({
        where: { date, ...(communityId ? { communityId } : {}) },
      });
      await tx.categoryMetricsDaily.deleteMany({
        where: { date, ...(communityId ? { communityId } : {}) },
      });
      await tx.homepageSlotMetricsDaily.deleteMany({
        where: { date, ...(communityId ? { communityId } : {}) },
      });
      const contentRows = await tx.$executeRaw(Prisma.sql`${base}
      INSERT INTO content_metrics_daily (id,"communityId",date,"contentType","contentId","categoryLabel","authorUserId","pageViews","uniqueVisitors",opens,"engagedPings",reactions,comments,shares,"messageStarts","createdAt","updatedAt")
      SELECT gen_random_uuid(),"communityId",${date}::date,"contentType","contentId",category,author,
      count(*) FILTER(WHERE "eventName"::text='page_view'),count(DISTINCT "anonymousVisitorId"),count(*) FILTER(WHERE "eventName"::text='content_open'),
      count(*) FILTER(WHERE "eventName"::text='engaged_time_ping'),count(*) FILTER(WHERE "eventName"::text='reaction_added' AND confirmed),count(*) FILTER(WHERE "eventName"::text='comment_created' AND confirmed),
      count(*) FILTER(WHERE "eventName"::text IN ('share_clicked','copy_link_clicked')),count(*) FILTER(WHERE "eventName"::text='message_started_from_content' AND confirmed),now(),now()
      FROM e GROUP BY "communityId","contentType","contentId",category,author
    `);
      const categoryRows = await tx.$executeRaw(Prisma.sql`${base}
      INSERT INTO category_metrics_daily (id,"communityId",date,"contentType","categoryLabel","pageViews","uniqueVisitors",opens,"engagedPings",reactions,comments,shares,"messageStarts","createdAt","updatedAt")
      SELECT gen_random_uuid(),"communityId",${date}::date,"contentType",category,
      count(*) FILTER(WHERE "eventName"::text='page_view'),count(DISTINCT "anonymousVisitorId"),count(*) FILTER(WHERE "eventName"::text='content_open'),
      count(*) FILTER(WHERE "eventName"::text='engaged_time_ping'),count(*) FILTER(WHERE "eventName"::text='reaction_added' AND confirmed),count(*) FILTER(WHERE "eventName"::text='comment_created' AND confirmed),
      count(*) FILTER(WHERE "eventName"::text IN ('share_clicked','copy_link_clicked')),count(*) FILTER(WHERE "eventName"::text='message_started_from_content' AND confirmed),now(),now()
      FROM e GROUP BY "communityId","contentType",category
    `);
      const homepageSlotRows = await tx.$executeRaw(Prisma.sql`
      INSERT INTO homepage_slot_metrics_daily (id,"communityId",date,"slotPosition","boxType",placement,"contentType","contentId",impressions,clicks,"createdAt","updatedAt")
      SELECT gen_random_uuid(),"communityId",${date}::date,(metadata->>'slot')::int,metadata->>'boxType',metadata->>'placement',"contentType","contentId",
      count(*) FILTER(WHERE "eventName"::text='content_impression'),count(*) FILTER(WHERE "eventName"::text='homepage_slot_clicked'),now(),now()
      FROM analytics_events WHERE (${communityId || null}::uuid IS NULL OR "communityId"=${communityId || null}::uuid) AND "communityId" IS NOT NULL AND "occurredAt">=${date} AND "occurredAt"<${end}
      AND metadata->>'slot' ~ '^[1-9][0-9]{0,5}$' AND metadata->>'boxType' IS NOT NULL AND metadata->>'placement' IS NOT NULL
      GROUP BY "communityId",metadata->>'slot',metadata->>'boxType',metadata->>'placement',"contentType","contentId"
    `);
      return { date, contentRows, categoryRows, homepageSlotRows };
    },
    {
      timeout: 60_000,
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
    },
  );
}
export async function recomputeAnalyticsRollupsForRange(
  start: Date,
  endInclusive: Date,
) {
  const results = [];
  const cursor = new Date(start);
  cursor.setUTCHours(0, 0, 0, 0);
  while (cursor <= endInclusive) {
    results.push(await recomputeAnalyticsRollupsForDay(cursor));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return results;
}
