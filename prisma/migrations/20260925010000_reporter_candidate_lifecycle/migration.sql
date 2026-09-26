ALTER TABLE "reporter_story_candidates"
ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "lastMaterializedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "reporter_story_candidates_communityId_isActive_score_idx"
ON "reporter_story_candidates"("communityId", "isActive", "score");
