-- Additive only; existing event UUID primary key supplies retry deduplication.
ALTER TYPE "AnalyticsEventName" ADD VALUE IF NOT EXISTS 'web_vital';
CREATE INDEX IF NOT EXISTS "analytics_events_communityId_eventName_occurredAt_idx"
ON "analytics_events" ("communityId", "eventName", "occurredAt");

CREATE TABLE "analytics_traffic_daily" (
 "id" UUID NOT NULL,
 "communityId" UUID NOT NULL,
 "date" DATE NOT NULL,
 "views" INTEGER NOT NULL DEFAULT 0,
 "visits" INTEGER NOT NULL DEFAULT 0,
 "visitors" INTEGER NOT NULL DEFAULT 0,
 "engagedSessions" INTEGER NOT NULL DEFAULT 0,
 "activeSeconds" INTEGER NOT NULL DEFAULT 0,
 "confirmedActions" INTEGER NOT NULL DEFAULT 0,
 "updatedAt" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "analytics_traffic_daily_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "analytics_traffic_daily_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "analytics_traffic_daily_communityId_date_key" ON "analytics_traffic_daily"("communityId", "date");
