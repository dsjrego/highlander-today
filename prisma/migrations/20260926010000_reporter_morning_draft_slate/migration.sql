-- Expand the singular daily coverage decision into an auditable morning edition.
-- The existing decision columns remain as a compatibility summary of the lead item.
ALTER TABLE "reporter_daily_coverage_goals"
ALTER COLUMN "targetArticleCount" SET DEFAULT 3;

-- Existing rows were created when one was the only supported target.
UPDATE "reporter_daily_coverage_goals"
SET "targetArticleCount" = 3
WHERE "targetArticleCount" = 1;

CREATE TYPE "ReporterDailyCoverageItemStatus" AS ENUM (
    'SELECTED',
    'READY_FOR_EDITOR',
    'NEEDS_REPORTING',
    'BLOCKED',
    'FAILED'
);

CREATE TABLE "reporter_daily_coverage_items" (
    "id" UUID NOT NULL,
    "reporterDailyCoverageDecisionId" UUID NOT NULL,
    "reporterStoryCandidateId" UUID NOT NULL,
    "reporterRunId" UUID,
    "analysisDraftId" UUID,
    "articleDraftId" UUID,
    "rank" INTEGER NOT NULL,
    "status" "ReporterDailyCoverageItemStatus" NOT NULL,
    "summary" TEXT NOT NULL,
    "reasons" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "selectedScore" INTEGER,
    "selectedReadiness" TEXT,
    "analysisStatus" "ReporterDailyCoverageAnalysisStatus",
    "analysisSummary" TEXT,
    "analysisIssueCount" INTEGER,
    "analysisHasCriticalIssues" BOOLEAN,
    "articleStatus" "ReporterDailyCoverageArticleStatus",
    "articleSummary" TEXT,
    "articleIssueCount" INTEGER,
    "articleHasCriticalIssues" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reporter_daily_coverage_items_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "reporter_daily_coverage_items_reporterDailyCoverageDec_key"
ON "reporter_daily_coverage_items"("reporterDailyCoverageDecisionId", "reporterStoryCandidateId");

CREATE INDEX "reporter_daily_coverage_items_reporterDailyCoverageDec_rank_idx"
ON "reporter_daily_coverage_items"("reporterDailyCoverageDecisionId", "rank");

CREATE INDEX "reporter_daily_coverage_items_reporterStoryCandidateId_idx"
ON "reporter_daily_coverage_items"("reporterStoryCandidateId");

CREATE INDEX "reporter_daily_coverage_items_reporterRunId_idx"
ON "reporter_daily_coverage_items"("reporterRunId");

CREATE INDEX "reporter_daily_coverage_items_analysisDraftId_idx"
ON "reporter_daily_coverage_items"("analysisDraftId");

CREATE INDEX "reporter_daily_coverage_items_articleDraftId_idx"
ON "reporter_daily_coverage_items"("articleDraftId");

CREATE INDEX "reporter_daily_coverage_items_status_idx"
ON "reporter_daily_coverage_items"("status");

ALTER TABLE "reporter_daily_coverage_items"
ADD CONSTRAINT "reporter_daily_coverage_items_reporterDailyCoverageDec_fkey"
FOREIGN KEY ("reporterDailyCoverageDecisionId") REFERENCES "reporter_daily_coverage_decisions"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "reporter_daily_coverage_items"
ADD CONSTRAINT "reporter_daily_coverage_items_reporterStoryCandidateId_fkey"
FOREIGN KEY ("reporterStoryCandidateId") REFERENCES "reporter_story_candidates"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "reporter_daily_coverage_items"
ADD CONSTRAINT "reporter_daily_coverage_items_reporterRunId_fkey"
FOREIGN KEY ("reporterRunId") REFERENCES "reporter_runs"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "reporter_daily_coverage_items"
ADD CONSTRAINT "reporter_daily_coverage_items_analysisDraftId_fkey"
FOREIGN KEY ("analysisDraftId") REFERENCES "reporter_drafts"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "reporter_daily_coverage_items"
ADD CONSTRAINT "reporter_daily_coverage_items_articleDraftId_fkey"
FOREIGN KEY ("articleDraftId") REFERENCES "reporter_drafts"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

-- Preserve prior daily decisions as one-item editions.
INSERT INTO "reporter_daily_coverage_items" (
    "id",
    "reporterDailyCoverageDecisionId",
    "reporterStoryCandidateId",
    "reporterRunId",
    "analysisDraftId",
    "articleDraftId",
    "rank",
    "status",
    "summary",
    "reasons",
    "selectedScore",
    "selectedReadiness",
    "analysisStatus",
    "analysisSummary",
    "analysisIssueCount",
    "analysisHasCriticalIssues",
    "articleStatus",
    "articleSummary",
    "articleIssueCount",
    "articleHasCriticalIssues",
    "createdAt",
    "updatedAt"
)
SELECT
    gen_random_uuid(),
    "id",
    "reporterStoryCandidateId",
    "reporterRunId",
    "analysisDraftId",
    "articleDraftId",
    1,
    (CASE
        WHEN "articleStatus" = 'GENERATED' AND COALESCE("articleHasCriticalIssues", false) = false THEN 'READY_FOR_EDITOR'
        WHEN "analysisStatus" = 'BLOCKED' OR "articleStatus" = 'BLOCKED' THEN 'BLOCKED'
        WHEN "analysisStatus" = 'FAILED' OR "articleStatus" = 'FAILED' THEN 'FAILED'
        WHEN "selectedReadiness" = 'needs-reporting' THEN 'NEEDS_REPORTING'
        ELSE 'SELECTED'
    END)::"ReporterDailyCoverageItemStatus",
    "summary",
    "reasons",
    "selectedScore",
    "selectedReadiness",
    "analysisStatus",
    "analysisSummary",
    "analysisIssueCount",
    "analysisHasCriticalIssues",
    "articleStatus",
    "articleSummary",
    "articleIssueCount",
    "articleHasCriticalIssues",
    "createdAt",
    "updatedAt"
FROM "reporter_daily_coverage_decisions"
WHERE "reporterStoryCandidateId" IS NOT NULL;
