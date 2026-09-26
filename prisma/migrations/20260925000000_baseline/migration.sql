-- CreateEnum
CREATE TYPE "TenantDomainStatus" AS ENUM ('PENDING', 'ACTIVE', 'DISABLED');

-- CreateEnum
CREATE TYPE "TrustLevel" AS ENUM ('ANONYMOUS', 'REGISTERED', 'TRUSTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "OrganizationDirectoryGroup" AS ENUM ('BUSINESS', 'GOVERNMENT', 'ORGANIZATION');

-- CreateEnum
CREATE TYPE "OrganizationStatus" AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "OrganizationMembershipRole" AS ENUM ('OWNER', 'MANAGER', 'STAFF', 'BOARD_MEMBER', 'VOLUNTEER', 'PASTOR', 'OFFICIAL', 'ADMINISTRATOR');

-- CreateEnum
CREATE TYPE "OrganizationMembershipStatus" AS ENUM ('PENDING', 'ACTIVE', 'REJECTED', 'REMOVED');

-- CreateEnum
CREATE TYPE "OrganizationFormStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "OrganizationFormQuestionType" AS ENUM ('TEXT_SHORT', 'TEXT_LONG', 'SINGLE_CHOICE', 'MULTIPLE_CHOICE');

-- CreateEnum
CREATE TYPE "MembershipRole" AS ENUM ('READER', 'CONTRIBUTOR', 'STAFF_WRITER', 'EDITOR', 'ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "PlaceType" AS ENUM ('BOROUGH', 'TOWNSHIP', 'TOWN', 'CITY', 'COUNTY', 'REGION', 'STATE', 'COUNTRY');

-- CreateEnum
CREATE TYPE "TenantCoverageType" AS ENUM ('PRIMARY', 'SECONDARY', 'EMERGING', 'WATCHLIST');

-- CreateEnum
CREATE TYPE "UserPlaceRelationshipType" AS ENUM ('CURRENT_RESIDENT', 'FORMER_RESIDENT', 'FROM_HERE', 'FAMILY_IN', 'WORKS_IN', 'OWNS_PROPERTY_IN', 'CARES_ABOUT');

-- CreateEnum
CREATE TYPE "UserPlaceSource" AS ENUM ('USER_SELECTED', 'ADMIN_SET', 'MIGRATED');

-- CreateEnum
CREATE TYPE "ObservedGeoReviewStatus" AS ENUM ('UNMATCHED', 'MATCHED_TO_PLACE', 'IGNORE', 'READY_FOR_CURATION', 'PROMOTED');

-- CreateEnum
CREATE TYPE "TrustAction" AS ENUM ('TRUST_GRANTED', 'TRUST_REVOKED', 'SUSPENDED', 'REINSTATED', 'BANNED', 'UNBANNED', 'IDENTITY_MODIFIED');

-- CreateEnum
CREATE TYPE "ArticleStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'UNPUBLISHED');

-- CreateEnum
CREATE TYPE "ReporterRunStatus" AS ENUM ('NEW', 'NEEDS_REVIEW', 'SOURCE_PACKET_IN_PROGRESS', 'READY_FOR_DRAFT', 'BLOCKED', 'DRAFT_CREATED', 'CONVERTED_TO_ARTICLE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ReporterMode" AS ENUM ('REQUEST', 'INTERVIEW', 'RESEARCH', 'HYBRID');

-- CreateEnum
CREATE TYPE "ReporterRequestType" AS ENUM ('ARTICLE_REQUEST', 'STORY_TIP', 'EDITOR_ASSIGNMENT');

-- CreateEnum
CREATE TYPE "ReporterSourceType" AS ENUM ('USER_NOTE', 'STAFF_NOTE', 'INTERVIEW_NOTE', 'TRANSCRIPT_EXCERPT', 'DOCUMENT', 'OFFICIAL_URL', 'NEWS_ARTICLE', 'HIGHLANDER_ARTICLE', 'EVENT_RECORD', 'ORGANIZATION_RECORD', 'PLACE_RECORD');

-- CreateEnum
CREATE TYPE "ReporterReliabilityTier" AS ENUM ('PRIMARY', 'HIGH', 'MEDIUM', 'LOW', 'UNVERIFIED');

-- CreateEnum
CREATE TYPE "ReporterValidationSeverity" AS ENUM ('CRITICAL', 'WARNING');

-- CreateEnum
CREATE TYPE "ReporterDraftStatus" AS ENUM ('GENERATED', 'REVIEWED', 'REJECTED', 'CONVERTED_TO_ARTICLE');

-- CreateEnum
CREATE TYPE "ReporterDraftType" AS ENUM ('ARTICLE_DRAFT', 'SOURCE_PACKET_SUMMARY');

-- CreateEnum
CREATE TYPE "ReporterAgentTaskType" AS ENUM ('ANALYZE_SOURCE_PACKET', 'GENERATE_REPORTING_GAPS', 'GENERATE_DRAFT', 'VALIDATE_DRAFT', 'EXTRACT_INTERVIEW_FACTS', 'SUGGEST_FOLLOW_UPS', 'CLASSIFY_READINESS', 'TRIAGE_REPORTER_RUN');

-- CreateEnum
CREATE TYPE "ReporterAgentTaskStatus" AS ENUM ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "ReporterAgentTraceType" AS ENUM ('INTERVIEW_NEXT_STEP', 'SOURCE_PACKET_ANALYSIS', 'DRAFT_GENERATION', 'DRAFT_VALIDATION', 'INTERVIEW_FACT_EXTRACTION', 'TRIAGE_SUMMARY');

-- CreateEnum
CREATE TYPE "ReporterClaimType" AS ENUM ('DIRECT_OBSERVATION', 'ATTRIBUTED_CLAIM', 'OFFICIAL_STATEMENT', 'DATE_TIME_FACT', 'LOCATION_FACT', 'QUOTE', 'BACKGROUND_CONTEXT', 'UNVERIFIED_ASSERTION', 'FOLLOW_UP_REQUIREMENT');

-- CreateEnum
CREATE TYPE "ReporterClaimConfidence" AS ENUM ('HIGH', 'MEDIUM', 'LOW', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ReporterClaimVerificationStatus" AS ENUM ('UNREVIEWED', 'SUPPORTED', 'NEEDS_CORROBORATION', 'DISPUTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ReporterClaimCreatedBy" AS ENUM ('HUMAN', 'AGENT');

-- CreateEnum
CREATE TYPE "ReporterMonitoredSourceType" AS ENUM ('MUNICIPAL_AGENDA', 'MUNICIPAL_MINUTES', 'MUNICIPAL_NOTICES', 'COUNTY_UPDATES', 'SCHOOL_BOARD', 'SCHOOL_ANNOUNCEMENTS', 'EVENT_CALENDAR', 'COMMUNITY_CALENDAR', 'PARKS_AND_REC', 'LIBRARY_EVENTS', 'SCHOOL_CALENDAR', 'VENUE_CALENDAR', 'PUBLIC_SAFETY', 'LOCAL_NEWSROOM', 'PRESS_RELEASE', 'COMMUNITY_BULLETIN', 'OTHER');

-- CreateEnum
CREATE TYPE "ReporterMonitoredSourceFormat" AS ENUM ('RSS', 'ATOM', 'HTML', 'JSON', 'PDF', 'ICS', 'OTHER');

-- CreateEnum
CREATE TYPE "ReporterMonitoredSourceStatus" AS ENUM ('ACTIVE', 'PAUSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ReporterMonitoredSourceExecutionLane" AS ENUM ('SERVER_FETCH', 'LOCAL_BROWSER');

-- CreateEnum
CREATE TYPE "ReporterCoverageScope" AS ENUM ('LOCAL', 'COUNTY', 'STATE', 'NATIONAL');

-- CreateEnum
CREATE TYPE "ReporterSourceFetchStatus" AS ENUM ('SUCCESS', 'NO_CHANGE', 'FAILED');

-- CreateEnum
CREATE TYPE "ReporterStorySignalLevel" AS ENUM ('LIKELY', 'POSSIBLE', 'LOW');

-- CreateEnum
CREATE TYPE "ReporterCandidateType" AS ENUM ('ARTICLE_ONLY', 'EVENT_ONLY', 'EVENT_AND_ARTICLE', 'NEITHER');

-- CreateEnum
CREATE TYPE "ReporterDailyCoverageDecisionOutcome" AS ENUM ('SELECTED_CANDIDATE', 'NO_PUBLISHABLE_STORY');

-- CreateEnum
CREATE TYPE "ReporterDailyCoverageAnalysisStatus" AS ENUM ('GENERATED', 'BLOCKED', 'SKIPPED', 'FAILED');

-- CreateEnum
CREATE TYPE "ReporterDailyCoverageArticleStatus" AS ENUM ('GENERATED', 'BLOCKED', 'SKIPPED', 'FAILED');

-- CreateEnum
CREATE TYPE "ReporterInterviewRequestStatus" AS ENUM ('DRAFT', 'INVITED', 'READY', 'IN_PROGRESS', 'COMPLETED', 'DECLINED', 'NO_SHOW', 'BLOCKED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ReporterInterviewType" AS ENUM ('TIPSTER', 'WITNESS', 'EVENT_ORGANIZER', 'ORG_REPRESENTATIVE', 'PROFILE_SUBJECT', 'GENERAL_SOURCE');

-- CreateEnum
CREATE TYPE "ReporterInterviewPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "ReporterSupportedLanguage" AS ENUM ('ENGLISH', 'SPANISH', 'UKRAINIAN');

-- CreateEnum
CREATE TYPE "ReporterInterviewSessionStatus" AS ENUM ('NOT_STARTED', 'ACTIVE', 'COMPLETED', 'ABANDONED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "ReporterInterviewFactType" AS ENUM ('DIRECT_OBSERVATION', 'ATTRIBUTED_CLAIM', 'DISPUTED_CLAIM', 'CHRONOLOGY_ITEM', 'QUOTED_STATEMENT', 'NAMED_ENTITY', 'FOLLOW_UP_REQUIREMENT');

-- CreateEnum
CREATE TYPE "ReporterInterviewSafetyFlagType" AS ENUM ('ACCUSATION_OF_WRONGDOING', 'MINOR_MENTION', 'SELF_HARM_OR_VIOLENCE', 'MEDICAL_CLAIM', 'LEGAL_EXPOSURE', 'DOXXING_RISK', 'ANONYMITY_REQUEST');

-- CreateEnum
CREATE TYPE "RecipeStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'UNPUBLISHED');

-- CreateEnum
CREATE TYPE "RecipeNoteKind" AS ENUM ('COOK_NOTE', 'SUBSTITUTION', 'STORAGE', 'SERVING', 'TROUBLESHOOTING');

-- CreateEnum
CREATE TYPE "RecipeMediaType" AS ENUM ('IMAGE', 'VIDEO_EMBED');

-- CreateEnum
CREATE TYPE "RecipeVideoProvider" AS ENUM ('YOUTUBE', 'VIMEO');

-- CreateEnum
CREATE TYPE "MemorialPageType" AS ENUM ('DEATH_NOTICE', 'MEMORIAL_PAGE');

-- CreateEnum
CREATE TYPE "MemorialPageStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'FROZEN', 'UNPUBLISHED', 'REJECTED');

-- CreateEnum
CREATE TYPE "MemorialSubmissionType" AS ENUM ('DEATH_NOTICE', 'MEMORIAL_PAGE', 'PRIVATE_REQUEST');

-- CreateEnum
CREATE TYPE "MemorialSubmissionStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'NEEDS_CLARIFICATION', 'APPROVED', 'REJECTED', 'CONVERTED_TO_PAGE');

-- CreateEnum
CREATE TYPE "MemorialContributorRole" AS ENUM ('SUBMITTER', 'STEWARD', 'CO_STEWARD', 'FAMILY', 'INSTITUTIONAL_REPRESENTATIVE');

-- CreateEnum
CREATE TYPE "MemorialContributorStatus" AS ENUM ('PENDING', 'ACTIVE', 'REJECTED', 'REMOVED');

-- CreateEnum
CREATE TYPE "MemorialVerificationRole" AS ENUM ('FAMILY', 'FUNERAL_HOME', 'CLERGY', 'CEMETERY', 'ORGANIZATION', 'TRUSTED_CONFIRMATION', 'STAFF');

-- CreateEnum
CREATE TYPE "MemorialVerificationStatus" AS ENUM ('PENDING', 'CONFIRMED', 'REJECTED');

-- CreateEnum
CREATE TYPE "MemorialMemoryStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'HIDDEN');

-- CreateEnum
CREATE TYPE "MemorialPhotoStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'HIDDEN');

-- CreateEnum
CREATE TYPE "CategoryContentModel" AS ENUM ('ARTICLE', 'MEMORIAM', 'RECIPE', 'EVENT', 'HELP_WANTED', 'MARKETPLACE', 'MIXED', 'PLANNED');

-- CreateEnum
CREATE TYPE "CommentStatus" AS ENUM ('APPROVED', 'PENDING', 'HIDDEN');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('PENDING_REVIEW', 'PUBLISHED', 'UNPUBLISHED');

-- CreateEnum
CREATE TYPE "LocationValidationStatus" AS ENUM ('UNVERIFIED', 'NORMALIZED', 'VERIFIED', 'NEEDS_REVIEW');

-- CreateEnum
CREATE TYPE "HelpWantedPostingType" AS ENUM ('EMPLOYMENT', 'SERVICE_REQUEST', 'GIG_TASK');

-- CreateEnum
CREATE TYPE "HelpWantedCompensationType" AS ENUM ('HOURLY', 'SALARY', 'FIXED', 'NEGOTIABLE', 'VOLUNTEER', 'UNSPECIFIED');

-- CreateEnum
CREATE TYPE "HelpWantedStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'FILLED', 'CLOSED', 'REJECTED');

-- CreateEnum
CREATE TYPE "RoadmapIdeaStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'APPROVED_FOR_RANKING', 'DECLINED', 'MERGED', 'PLANNED', 'IN_PROGRESS', 'SHIPPED');

-- CreateEnum
CREATE TYPE "InfluenceDomain" AS ENUM ('ROADMAP_FEATURE_PRIORITIZATION');

-- CreateEnum
CREATE TYPE "MarketplaceStatus" AS ENUM ('DRAFT', 'PENDING', 'ACTIVE', 'SOLD', 'ARCHIVED', 'EXPIRED', 'REMOVED');

-- CreateEnum
CREATE TYPE "MarketplaceListingType" AS ENUM ('PRODUCT', 'FOOD', 'SERVICE');

-- CreateEnum
CREATE TYPE "StoreStatus" AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "StoreMemberRole" AS ENUM ('OWNER', 'MANAGER');

-- CreateEnum
CREATE TYPE "HomepageSectionType" AS ENUM ('FEATURED_ARTICLES', 'LATEST_NEWS', 'FEATURED_RECIPES', 'UPCOMING_EVENTS', 'RECENT_MARKETPLACE', 'RECENT_GALLERIES');

-- CreateEnum
CREATE TYPE "HomepageBoxType" AS ENUM ('ARTICLES', 'EVENTS', 'RECIPES', 'MARKETPLACE', 'HELP_WANTED', 'GARDENING', 'MEMORIAM');

-- CreateEnum
CREATE TYPE "HomepageBoxItemRole" AS ENUM ('HERO', 'LINK');

-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('ARTICLE', 'RECIPE', 'EVENT', 'MARKETPLACE_LISTING', 'GALLERY');

-- CreateEnum
CREATE TYPE "ActivityAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'PUBLISH', 'UNPUBLISH', 'APPROVE', 'REJECT', 'FLAG', 'SEND_MESSAGE');

-- CreateEnum
CREATE TYPE "ResourceType" AS ENUM ('ARTICLE', 'REPORTER_RUN', 'REPORTER_DRAFT', 'REPORTER_INTERVIEW_REQUEST', 'REPORTER_MONITORED_SOURCE', 'REPORTER_SOURCE_FETCH', 'REPORTER_STORY_CANDIDATE', 'REPORTER_DAILY_COVERAGE_DECISION', 'RECIPE', 'COMMENT', 'EVENT', 'HELP_WANTED_POST', 'ROADMAP_IDEA', 'ROADMAP_RANKING_BALLOT', 'DOMAIN_INFLUENCE_WEIGHT', 'MARKETPLACE_LISTING', 'MESSAGE', 'CONVERSATION', 'USER_PROFILE');

-- CreateEnum
CREATE TYPE "AnalyticsEventName" AS ENUM ('page_view', 'page_exit', 'engaged_time_ping', 'scroll_depth_reached', 'content_impression', 'content_open', 'reaction_added', 'comment_created', 'share_clicked', 'copy_link_clicked', 'message_started_from_content', 'cta_clicked', 'search_result_clicked', 'homepage_slot_clicked');

-- CreateEnum
CREATE TYPE "AnalyticsContentType" AS ENUM ('ARTICLE', 'EVENT', 'MARKETPLACE_LISTING', 'STOREFRONT', 'HELP_WANTED_POST', 'ROADMAP_IDEA', 'STATIC_PAGE', 'SUPPORT_PAGE', 'RECIPE', 'ORGANIZATION');

-- CreateEnum
CREATE TYPE "AnalyticsReferrerType" AS ENUM ('INTERNAL', 'DIRECT', 'SEARCH', 'EXTERNAL', 'UNKNOWN');

-- CreateEnum
CREATE TYPE "ContentReactionType" AS ENUM ('useful', 'important', 'interesting', 'needs_follow_up');

-- CreateTable
CREATE TABLE "communities" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "domain" TEXT,
    "description" TEXT,
    "colorPrimary" TEXT NOT NULL DEFAULT 'var(--brand-primary)',
    "colorAccent" TEXT NOT NULL DEFAULT 'var(--brand-accent)',
    "logoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "communities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_domains" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "domain" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "status" "TenantDomainStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_domains_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "profilePhotoUrl" TEXT,
    "bio" TEXT,
    "isDirectoryListed" BOOLEAN NOT NULL DEFAULT false,
    "trustLevel" "TrustLevel" NOT NULL DEFAULT 'ANONYMOUS',
    "isIdentityLocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_community_memberships" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "role" "MembershipRole" NOT NULL DEFAULT 'READER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_community_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "places" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "PlaceType" NOT NULL,
    "countryCode" TEXT NOT NULL,
    "admin1Code" TEXT,
    "admin1Name" TEXT,
    "admin2Name" TEXT,
    "parentPlaceId" UUID,
    "isSelectable" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "places_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "place_aliases" (
    "id" UUID NOT NULL,
    "placeId" UUID NOT NULL,
    "alias" TEXT NOT NULL,
    "aliasType" TEXT,
    "isSearchable" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "place_aliases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_coverage_areas" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "placeId" UUID NOT NULL,
    "coverageType" "TenantCoverageType" NOT NULL DEFAULT 'SECONDARY',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenant_coverage_areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_place_relationships" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "placeId" UUID,
    "relationshipType" "UserPlaceRelationshipType" NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "fallbackLocationText" TEXT,
    "source" "UserPlaceSource" NOT NULL DEFAULT 'USER_SELECTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_place_relationships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "observed_geo_locations" (
    "id" UUID NOT NULL,
    "normalizedLabel" TEXT NOT NULL,
    "city" TEXT,
    "region" TEXT,
    "country" TEXT,
    "matchedPlaceId" UUID,
    "reviewStatus" "ObservedGeoReviewStatus" NOT NULL DEFAULT 'UNMATCHED',
    "firstSeenAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "loginCount" INTEGER NOT NULL DEFAULT 0,
    "distinctUserCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "observed_geo_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vouch_records" (
    "id" UUID NOT NULL,
    "voucherUserId" UUID NOT NULL,
    "vouchedUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vouch_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trust_audit_logs" (
    "id" UUID NOT NULL,
    "actorUserId" UUID NOT NULL,
    "targetUserId" UUID NOT NULL,
    "action" "TrustAction" NOT NULL,
    "reason" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trust_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "banned_emails" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "bannedByUserId" UUID NOT NULL,
    "bannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unbannedByUserId" UUID,
    "unbannedAt" TIMESTAMP(3),

    CONSTRAINT "banned_emails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "createdByUserId" UUID NOT NULL,
    "approvedByUserId" UUID,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "logoUrl" TEXT,
    "bannerUrl" TEXT,
    "websiteUrl" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "directoryGroup" "OrganizationDirectoryGroup" NOT NULL,
    "organizationType" TEXT NOT NULL,
    "isPublicMemberRoster" BOOLEAN NOT NULL DEFAULT false,
    "status" "OrganizationStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_memberships" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "OrganizationMembershipRole" NOT NULL DEFAULT 'MANAGER',
    "status" "OrganizationMembershipStatus" NOT NULL DEFAULT 'PENDING',
    "title" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "isPrimaryContact" BOOLEAN NOT NULL DEFAULT false,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_locations" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "label" TEXT,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "municipality" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "websiteUrl" TEXT,
    "hoursSummary" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_departments" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "locationId" UUID,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "description" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "websiteUrl" TEXT,
    "hoursSummary" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_contacts" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "departmentId" UUID,
    "locationId" UUID,
    "userId" UUID,
    "label" TEXT,
    "name" TEXT,
    "title" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "websiteUrl" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_forms" (
    "id" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "createdByUserId" UUID NOT NULL,
    "updatedByUserId" UUID,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "status" "OrganizationFormStatus" NOT NULL DEFAULT 'DRAFT',
    "isPubliclyListed" BOOLEAN NOT NULL DEFAULT false,
    "minimumTrustLevel" "TrustLevel" NOT NULL DEFAULT 'REGISTERED',
    "opensAt" TIMESTAMP(3),
    "closesAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_forms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_form_questions" (
    "id" UUID NOT NULL,
    "formId" UUID NOT NULL,
    "prompt" TEXT NOT NULL,
    "helpText" TEXT,
    "type" "OrganizationFormQuestionType" NOT NULL,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_form_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_form_question_options" (
    "id" UUID NOT NULL,
    "questionId" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_form_question_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_form_submissions" (
    "id" UUID NOT NULL,
    "formId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "userId" UUID,
    "communityId" UUID NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_form_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_form_answers" (
    "id" UUID NOT NULL,
    "submissionId" UUID NOT NULL,
    "questionId" UUID NOT NULL,
    "selectedOptionId" UUID,
    "textValue" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organization_form_answers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "articles" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "authorUserId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT,
    "body" TEXT NOT NULL,
    "featuredImageUrl" TEXT,
    "featured_image_caption" TEXT,
    "status" "ArticleStatus" NOT NULL DEFAULT 'DRAFT',
    "categoryId" UUID,
    "publishedAt" TIMESTAMP(3),
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "featuredOrder" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reporter_runs" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "createdByUserId" UUID,
    "assignedToUserId" UUID,
    "linkedArticleId" UUID,
    "status" "ReporterRunStatus" NOT NULL DEFAULT 'NEW',
    "mode" "ReporterMode" NOT NULL DEFAULT 'REQUEST',
    "requestType" "ReporterRequestType" NOT NULL DEFAULT 'ARTICLE_REQUEST',
    "title" TEXT,
    "topic" TEXT NOT NULL,
    "subjectName" TEXT,
    "requestedArticleType" TEXT,
    "requesterName" TEXT,
    "requesterEmail" TEXT,
    "requesterPhone" TEXT,
    "requesterUserId" UUID,
    "requestSummary" TEXT,
    "editorNotes" TEXT,
    "publicDescription" TEXT,
    "debugNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reporter_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reporter_sources" (
    "id" UUID NOT NULL,
    "reporterRunId" UUID NOT NULL,
    "sourceType" "ReporterSourceType" NOT NULL,
    "title" TEXT,
    "url" TEXT,
    "publisher" TEXT,
    "author" TEXT,
    "publishedAt" TIMESTAMP(3),
    "retrievedAt" TIMESTAMP(3),
    "contentText" TEXT,
    "excerpt" TEXT,
    "note" TEXT,
    "reliabilityTier" "ReporterReliabilityTier" NOT NULL DEFAULT 'UNVERIFIED',
    "linkedArticleId" UUID,
    "linkedEventId" UUID,
    "linkedOrganizationId" UUID,
    "linkedPlaceId" UUID,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reporter_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reporter_blockers" (
    "id" UUID NOT NULL,
    "reporterRunId" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "resolvedAt" TIMESTAMP(3),
    "resolvedByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reporter_blockers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reporter_drafts" (
    "id" UUID NOT NULL,
    "reporterRunId" UUID NOT NULL,
    "headline" TEXT,
    "dek" TEXT,
    "body" TEXT NOT NULL,
    "draftType" "ReporterDraftType" NOT NULL DEFAULT 'ARTICLE_DRAFT',
    "status" "ReporterDraftStatus" NOT NULL DEFAULT 'GENERATED',
    "modelProvider" TEXT,
    "modelName" TEXT,
    "generationNotes" TEXT,
    "createdByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reporter_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reporter_validation_issues" (
    "id" UUID NOT NULL,
    "reporterRunId" UUID NOT NULL,
    "reporterDraftId" UUID,
    "code" TEXT NOT NULL,
    "severity" "ReporterValidationSeverity" NOT NULL,
    "message" TEXT NOT NULL,
    "evidenceSpan" TEXT,
    "isResolved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reporter_validation_issues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reporter_agent_tasks" (
    "id" UUID NOT NULL,
    "reporterRunId" UUID,
    "scopeKey" TEXT,
    "taskType" "ReporterAgentTaskType" NOT NULL,
    "status" "ReporterAgentTaskStatus" NOT NULL DEFAULT 'PENDING',
    "priority" INTEGER NOT NULL DEFAULT 50,
    "inputJson" JSONB,
    "outputJson" JSONB,
    "errorMessage" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "maxAttempts" INTEGER NOT NULL DEFAULT 3,
    "scheduledFor" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reporter_agent_tasks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reporter_agent_traces" (
    "id" UUID NOT NULL,
    "reporterRunId" UUID,
    "reporterAgentTaskId" UUID,
    "traceType" "ReporterAgentTraceType" NOT NULL,
    "provider" TEXT,
    "modelName" TEXT,
    "promptKey" TEXT,
    "promptVersion" TEXT,
    "promptHash" TEXT,
    "inputHash" TEXT,
    "inputSnapshotJson" JSONB,
    "rawOutputText" TEXT,
    "parsedOutputJson" JSONB,
    "validationJson" JSONB,
    "latencyMs" INTEGER,
    "tokenEstimate" INTEGER,
    "wasSuccessful" BOOLEAN,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reporter_agent_traces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reporter_claims" (
    "id" UUID NOT NULL,
    "reporterRunId" UUID NOT NULL,
    "reporterSourceId" UUID,
    "claimType" "ReporterClaimType" NOT NULL,
    "claimText" TEXT NOT NULL,
    "sourceExcerpt" TEXT,
    "attribution" TEXT,
    "confidence" "ReporterClaimConfidence" NOT NULL DEFAULT 'UNKNOWN',
    "verificationStatus" "ReporterClaimVerificationStatus" NOT NULL DEFAULT 'UNREVIEWED',
    "createdBy" "ReporterClaimCreatedBy" NOT NULL,
    "createdByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reporter_claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reporter_monitored_sources" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "placeId" UUID,
    "organizationId" UUID,
    "createdByUserId" UUID,
    "label" TEXT NOT NULL,
    "sourceType" "ReporterMonitoredSourceType" NOT NULL,
    "sourceFormat" "ReporterMonitoredSourceFormat" NOT NULL,
    "executionLane" "ReporterMonitoredSourceExecutionLane" NOT NULL DEFAULT 'SERVER_FETCH',
    "coverageScope" "ReporterCoverageScope" NOT NULL DEFAULT 'LOCAL',
    "url" TEXT NOT NULL,
    "publisher" TEXT,
    "notes" TEXT,
    "status" "ReporterMonitoredSourceStatus" NOT NULL DEFAULT 'ACTIVE',
    "fetchFrequencyMinutes" INTEGER NOT NULL DEFAULT 1440,
    "lastFetchedAt" TIMESTAMP(3),
    "lastSuccessfulAt" TIMESTAMP(3),
    "lastChangedAt" TIMESTAMP(3),
    "lastErrorAt" TIMESTAMP(3),
    "lastErrorMessage" TEXT,
    "lastHttpStatus" INTEGER,
    "lastETag" TEXT,
    "lastModifiedHeader" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reporter_monitored_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reporter_source_fetches" (
    "id" UUID NOT NULL,
    "monitoredSourceId" UUID NOT NULL,
    "status" "ReporterSourceFetchStatus" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "httpStatus" INTEGER,
    "responseEtag" TEXT,
    "responseLastModified" TEXT,
    "sourceFingerprint" TEXT,
    "errorMessage" TEXT,
    "itemCount" INTEGER NOT NULL DEFAULT 0,
    "newItemCount" INTEGER NOT NULL DEFAULT 0,
    "changedItemCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reporter_source_fetches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reporter_source_ingestion_items" (
    "id" UUID NOT NULL,
    "monitoredSourceId" UUID NOT NULL,
    "dedupeKey" TEXT NOT NULL,
    "externalId" TEXT,
    "canonicalUrl" TEXT,
    "title" TEXT NOT NULL,
    "excerpt" TEXT,
    "publishedAt" TIMESTAMP(3),
    "retrievedAt" TIMESTAMP(3),
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publisher" TEXT,
    "sourceFingerprint" TEXT,
    "contentText" TEXT,
    "metadataJson" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reporter_source_ingestion_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reporter_story_candidates" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "placeId" UUID,
    "linkedReporterRunId" UUID,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "signalLevel" "ReporterStorySignalLevel" NOT NULL,
    "candidateType" "ReporterCandidateType" NOT NULL DEFAULT 'ARTICLE_ONLY',
    "coverageScopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "eventExtractionJson" JSONB,
    "score" INTEGER NOT NULL,
    "reasons" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "matchedKeywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sourceCount" INTEGER NOT NULL DEFAULT 0,
    "itemCount" INTEGER NOT NULL DEFAULT 0,
    "recentItemCount" INTEGER NOT NULL DEFAULT 0,
    "civicSignalCount" INTEGER NOT NULL DEFAULT 0,
    "latestSourceAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reporter_story_candidates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reporter_daily_coverage_goals" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "placeId" UUID,
    "label" TEXT,
    "targetArticleCount" INTEGER NOT NULL DEFAULT 1,
    "priorityCoverageScopes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "minimumCandidateScore" INTEGER NOT NULL DEFAULT 6,
    "freshnessWindowHours" INTEGER NOT NULL DEFAULT 36,
    "allowNeedsReportingFallback" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reporter_daily_coverage_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reporter_daily_coverage_decisions" (
    "id" UUID NOT NULL,
    "reporterDailyCoverageGoalId" UUID NOT NULL,
    "reporterStoryCandidateId" UUID,
    "reporterRunId" UUID,
    "analysisDraftId" UUID,
    "articleDraftId" UUID,
    "decisionDate" TIMESTAMP(3) NOT NULL,
    "outcome" "ReporterDailyCoverageDecisionOutcome" NOT NULL,
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

    CONSTRAINT "reporter_daily_coverage_decisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reporter_story_candidate_items" (
    "id" UUID NOT NULL,
    "reporterStoryCandidateId" UUID NOT NULL,
    "ingestionItemId" UUID NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reporter_story_candidate_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reporter_interview_requests" (
    "id" UUID NOT NULL,
    "reporterRunId" UUID NOT NULL,
    "status" "ReporterInterviewRequestStatus" NOT NULL DEFAULT 'DRAFT',
    "interviewType" "ReporterInterviewType" NOT NULL DEFAULT 'GENERAL_SOURCE',
    "priority" "ReporterInterviewPriority" NOT NULL DEFAULT 'NORMAL',
    "intervieweeName" TEXT NOT NULL,
    "intervieweeUserId" UUID,
    "inviteEmail" TEXT,
    "relationshipToStory" TEXT,
    "purpose" TEXT NOT NULL,
    "editorBrief" TEXT,
    "mustLearn" TEXT,
    "knownContext" TEXT,
    "sensitivityNotes" TEXT,
    "suggestedLanguage" "ReporterSupportedLanguage" NOT NULL DEFAULT 'ENGLISH',
    "nativeLanguage" "ReporterSupportedLanguage",
    "interviewLanguage" "ReporterSupportedLanguage",
    "requiresTranslationSupport" BOOLEAN NOT NULL DEFAULT false,
    "scheduledFor" TIMESTAMP(3),
    "invitedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reporter_interview_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reporter_interview_sessions" (
    "id" UUID NOT NULL,
    "interviewRequestId" UUID NOT NULL,
    "status" "ReporterInterviewSessionStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "questionTemplateKey" TEXT,
    "language" "ReporterSupportedLanguage" NOT NULL DEFAULT 'ENGLISH',
    "currentStep" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "lastActivityAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "abandonedAt" TIMESTAMP(3),
    "transcriptText" TEXT,
    "englishSummary" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedByUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reporter_interview_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reporter_interview_turns" (
    "id" UUID NOT NULL,
    "interviewSessionId" UUID NOT NULL,
    "sortOrder" INTEGER NOT NULL,
    "questionKey" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "questionLanguage" "ReporterSupportedLanguage" NOT NULL DEFAULT 'ENGLISH',
    "answerText" TEXT,
    "answerLanguage" "ReporterSupportedLanguage",
    "answerTranslatedEnglish" TEXT,
    "branchDecision" TEXT,
    "askedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "answeredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reporter_interview_turns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reporter_interview_facts" (
    "id" UUID NOT NULL,
    "interviewSessionId" UUID NOT NULL,
    "interviewTurnId" UUID,
    "factType" "ReporterInterviewFactType" NOT NULL,
    "summary" TEXT NOT NULL,
    "detail" TEXT,
    "sourceLabel" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reporter_interview_facts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reporter_interview_safety_flags" (
    "id" UUID NOT NULL,
    "interviewSessionId" UUID NOT NULL,
    "flagType" "ReporterInterviewSafetyFlagType" NOT NULL,
    "headline" TEXT NOT NULL,
    "detail" TEXT,
    "evidenceSpan" TEXT,
    "blockerId" UUID,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reporter_interview_safety_flags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipes" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "authorUserId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "excerpt" TEXT,
    "intro_html" TEXT,
    "featuredImageUrl" TEXT,
    "featured_image_caption" TEXT,
    "status" "RecipeStatus" NOT NULL DEFAULT 'DRAFT',
    "categoryId" UUID,
    "yield_label" TEXT,
    "prep_minutes" INTEGER,
    "cook_minutes" INTEGER,
    "total_minutes" INTEGER,
    "servings" INTEGER,
    "source_name" TEXT,
    "source_url" TEXT,
    "structured_input_raw" JSONB,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "recipes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_ingredient_sections" (
    "id" UUID NOT NULL,
    "recipeId" UUID NOT NULL,
    "title" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "recipe_ingredient_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_ingredients" (
    "id" UUID NOT NULL,
    "recipeId" UUID NOT NULL,
    "section_id" UUID,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "amount" TEXT,
    "unit" TEXT,
    "ingredient_name" TEXT NOT NULL,
    "preparation_note" TEXT,
    "is_optional" BOOLEAN NOT NULL DEFAULT false,
    "substitution_note" TEXT,

    CONSTRAINT "recipe_ingredients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_instruction_steps" (
    "id" UUID NOT NULL,
    "recipeId" UUID NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "timer_minutes" INTEGER,

    CONSTRAINT "recipe_instruction_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_notes" (
    "id" UUID NOT NULL,
    "recipeId" UUID NOT NULL,
    "kind" "RecipeNoteKind" NOT NULL,
    "title" TEXT,
    "body" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "recipe_notes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "recipe_media" (
    "id" UUID NOT NULL,
    "recipeId" UUID NOT NULL,
    "step_id" UUID,
    "type" "RecipeMediaType" NOT NULL,
    "provider" "RecipeVideoProvider",
    "image_url" TEXT,
    "embed_url" TEXT,
    "caption" TEXT,
    "alt_text" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recipe_media_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memorial_people" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "fullName" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "preferredName" TEXT,
    "age" INTEGER,
    "birthDate" TIMESTAMP(3),
    "deathDate" TIMESTAMP(3),
    "townName" TEXT,
    "birthTownName" TEXT,
    "deathTownName" TEXT,
    "isIdentityLocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "memorial_people_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memorial_pages" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "memorialPersonId" UUID NOT NULL,
    "categoryId" UUID,
    "pageType" "MemorialPageType" NOT NULL,
    "status" "MemorialPageStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "shortSummary" TEXT,
    "biography" TEXT,
    "lifeStory" TEXT,
    "serviceDetails" TEXT,
    "familyDetails" TEXT,
    "provenanceNote" TEXT,
    "heroImageUrl" TEXT,
    "videoEmbeds" TEXT[],
    "serviceStreamUrl" TEXT,
    "createdByUserId" UUID,
    "approvedByUserId" UUID,
    "approvedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "memorial_pages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memorial_submissions" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "memorialPersonId" UUID,
    "memorialPageId" UUID,
    "submittedByUserId" UUID,
    "assignedToUserId" UUID,
    "reviewedByUserId" UUID,
    "submissionType" "MemorialSubmissionType" NOT NULL,
    "status" "MemorialSubmissionStatus" NOT NULL DEFAULT 'DRAFT',
    "relationshipToDeceased" TEXT,
    "requesterName" TEXT,
    "requesterEmail" TEXT,
    "requesterPhone" TEXT,
    "summary" TEXT,
    "reviewNotes" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "memorial_submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memorial_contributors" (
    "id" UUID NOT NULL,
    "memorialPageId" UUID NOT NULL,
    "userId" UUID,
    "invitedByUserId" UUID,
    "role" "MemorialContributorRole" NOT NULL,
    "status" "MemorialContributorStatus" NOT NULL DEFAULT 'PENDING',
    "displayName" TEXT,
    "relationshipToDeceased" TEXT,
    "invitedAt" TIMESTAMP(3),
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "memorial_contributors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memorial_verifications" (
    "id" UUID NOT NULL,
    "memorialPersonId" UUID,
    "memorialPageId" UUID,
    "memorialSubmissionId" UUID,
    "createdByUserId" UUID,
    "verificationRole" "MemorialVerificationRole" NOT NULL,
    "status" "MemorialVerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verifierName" TEXT NOT NULL,
    "verifierOrganization" TEXT,
    "verifierContact" TEXT,
    "note" TEXT,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "memorial_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memorial_memories" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "memorialPageId" UUID NOT NULL,
    "createdByUserId" UUID,
    "reviewedByUserId" UUID,
    "displayName" TEXT,
    "relationshipToDeceased" TEXT,
    "body" TEXT NOT NULL,
    "status" "MemorialMemoryStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "memorial_memories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memorial_photos" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "memorialPageId" UUID NOT NULL,
    "createdByUserId" UUID,
    "reviewedByUserId" UUID,
    "imageUrl" TEXT NOT NULL,
    "caption" TEXT,
    "altText" TEXT,
    "status" "MemorialPhotoStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "memorial_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memorial_audit_logs" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "memorialPageId" UUID,
    "memorialSubmissionId" UUID,
    "memorialMemoryId" UUID,
    "memorialPhotoId" UUID,
    "actorUserId" UUID,
    "action" TEXT NOT NULL,
    "note" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "memorial_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tags" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,

    CONSTRAINT "tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "article_tags" (
    "articleId" UUID NOT NULL,
    "tagId" UUID NOT NULL,

    CONSTRAINT "article_tags_pkey" PRIMARY KEY ("articleId","tagId")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" UUID NOT NULL,
    "communityId" UUID,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "contentModel" "CategoryContentModel",
    "minTrustLevel" "TrustLevel" NOT NULL DEFAULT 'ANONYMOUS',
    "parentCategoryId" UUID,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" UUID NOT NULL,
    "articleId" UUID NOT NULL,
    "authorUserId" UUID NOT NULL,
    "parentCommentId" UUID,
    "body" TEXT NOT NULL,
    "status" "CommentStatus" NOT NULL DEFAULT 'APPROVED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "submittedByUserId" UUID NOT NULL,
    "organizationId" UUID,
    "seriesId" UUID,
    "reporterStoryCandidateId" UUID,
    "locationId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "venueLabel" TEXT,
    "description" TEXT,
    "startDatetime" TIMESTAMP(3) NOT NULL,
    "endDatetime" TIMESTAMP(3),
    "costText" TEXT,
    "contactInfo" TEXT,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrenceRule" TEXT,
    "seriesPosition" INTEGER,
    "seriesCount" INTEGER,
    "photoUrl" TEXT,
    "status" "EventStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "event_series" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "createdByUserId" UUID NOT NULL,
    "organizationId" UUID,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "cadenceLabel" TEXT NOT NULL,
    "intervalCount" INTEGER NOT NULL DEFAULT 1,
    "occurrenceCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "event_series_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "locations" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "name" TEXT,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "postalCode" TEXT,
    "countryCode" TEXT NOT NULL DEFAULT 'US',
    "normalizedAddressKey" TEXT NOT NULL,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "validationStatus" "LocationValidationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "validatedAt" TIMESTAMP(3),
    "googlePlaceId" TEXT,
    "uspsNormalized" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "help_wanted_posts" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "authorUserId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "postingType" "HelpWantedPostingType" NOT NULL,
    "compensationType" "HelpWantedCompensationType",
    "compensationText" TEXT,
    "locationText" TEXT,
    "scheduleText" TEXT,
    "photoUrl" TEXT,
    "status" "HelpWantedStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "publishedAt" TIMESTAMP(3),
    "filledAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "help_wanted_posts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roadmap_ideas" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "authorUserId" UUID NOT NULL,
    "mergedIntoIdeaId" UUID,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "RoadmapIdeaStatus" NOT NULL DEFAULT 'SUBMITTED',
    "staffNotes" TEXT,
    "publishedAt" TIMESTAMP(3),
    "plannedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "shippedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roadmap_ideas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roadmap_ranking_ballots" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roadmap_ranking_ballots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roadmap_ranking_items" (
    "id" UUID NOT NULL,
    "ballotId" UUID NOT NULL,
    "ideaId" UUID NOT NULL,
    "rank" INTEGER NOT NULL,

    CONSTRAINT "roadmap_ranking_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "domain_influence_weights" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "domain" "InfluenceDomain" NOT NULL,
    "multiplierPercent" INTEGER NOT NULL DEFAULT 100,
    "rationale" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "domain_influence_weights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stores" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "ownerUserId" UUID NOT NULL,
    "approvedByUserId" UUID,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "logoUrl" TEXT,
    "bannerUrl" TEXT,
    "websiteUrl" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "status" "StoreStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "approvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "stores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store_members" (
    "id" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "StoreMemberRole" NOT NULL DEFAULT 'MANAGER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "store_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_listings" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "storeId" UUID NOT NULL,
    "authorUserId" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priceCents" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "listingType" "MarketplaceListingType" NOT NULL DEFAULT 'PRODUCT',
    "contactMethod" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "status" "MarketplaceStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "marketplace_listings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketplace_photos" (
    "id" UUID NOT NULL,
    "marketplaceListingId" UUID NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "marketplace_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversation_participants" (
    "id" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "conversation_participants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" UUID NOT NULL,
    "conversationId" UUID NOT NULL,
    "senderUserId" UUID NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "message_attachments" (
    "id" UUID NOT NULL,
    "messageId" UUID NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL,

    CONSTRAINT "message_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_blocks" (
    "id" UUID NOT NULL,
    "blockerUserId" UUID NOT NULL,
    "blockedUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "homepage_boxes" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "boxType" "HomepageBoxType" NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,
    "maxLinks" INTEGER NOT NULL DEFAULT 5,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "homepage_boxes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "homepage_sections" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "sectionType" "HomepageSectionType" NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isVisible" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "homepage_sections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "homepage_box_items" (
    "id" UUID NOT NULL,
    "homepageBoxId" UUID NOT NULL,
    "role" "HomepageBoxItemRole" NOT NULL,
    "contentType" "ContentType" NOT NULL,
    "contentId" UUID NOT NULL,
    "pinnedByUserId" UUID NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "pinnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "homepage_box_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "homepage_pinned_items" (
    "id" UUID NOT NULL,
    "homepageSectionId" UUID NOT NULL,
    "contentType" "ContentType" NOT NULL,
    "contentId" UUID NOT NULL,
    "pinnedByUserId" UUID NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "pinnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "homepage_pinned_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "site_settings" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "site_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_events" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "ipAddress" TEXT NOT NULL,
    "userAgent" TEXT,
    "provider" TEXT NOT NULL,
    "city" TEXT,
    "region" TEXT,
    "country" TEXT,
    "isAnomaly" BOOLEAN NOT NULL DEFAULT false,
    "anomalyReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_logs" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "action" "ActivityAction" NOT NULL,
    "resourceType" "ResourceType" NOT NULL,
    "resourceId" UUID NOT NULL,
    "ipAddress" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analytics_events" (
    "id" UUID NOT NULL,
    "communityId" UUID,
    "siteDomain" TEXT,
    "userId" UUID,
    "sessionId" TEXT NOT NULL,
    "anonymousVisitorId" TEXT,
    "eventName" "AnalyticsEventName" NOT NULL,
    "contentType" "AnalyticsContentType",
    "contentId" TEXT,
    "pageType" TEXT NOT NULL,
    "pagePath" TEXT NOT NULL,
    "referrerType" "AnalyticsReferrerType",
    "referrerHost" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_reactions" (
    "id" UUID NOT NULL,
    "communityId" UUID,
    "userId" UUID NOT NULL,
    "contentType" "AnalyticsContentType" NOT NULL,
    "contentId" TEXT NOT NULL,
    "reactionType" "ContentReactionType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_reactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "content_metrics_daily" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "contentType" "AnalyticsContentType" NOT NULL,
    "contentId" TEXT NOT NULL,
    "categoryLabel" TEXT,
    "authorUserId" UUID,
    "pageViews" INTEGER NOT NULL DEFAULT 0,
    "uniqueVisitors" INTEGER NOT NULL DEFAULT 0,
    "opens" INTEGER NOT NULL DEFAULT 0,
    "engagedPings" INTEGER NOT NULL DEFAULT 0,
    "reactions" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "messageStarts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "content_metrics_daily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "category_metrics_daily" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "contentType" "AnalyticsContentType" NOT NULL,
    "categoryLabel" TEXT NOT NULL,
    "pageViews" INTEGER NOT NULL DEFAULT 0,
    "uniqueVisitors" INTEGER NOT NULL DEFAULT 0,
    "opens" INTEGER NOT NULL DEFAULT 0,
    "engagedPings" INTEGER NOT NULL DEFAULT 0,
    "reactions" INTEGER NOT NULL DEFAULT 0,
    "comments" INTEGER NOT NULL DEFAULT 0,
    "shares" INTEGER NOT NULL DEFAULT 0,
    "messageStarts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "category_metrics_daily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "homepage_slot_metrics_daily" (
    "id" UUID NOT NULL,
    "communityId" UUID NOT NULL,
    "date" DATE NOT NULL,
    "slotPosition" INTEGER NOT NULL,
    "boxType" TEXT NOT NULL,
    "placement" TEXT NOT NULL,
    "contentType" "AnalyticsContentType",
    "contentId" TEXT,
    "impressions" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "homepage_slot_metrics_daily_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "communities_slug_key" ON "communities"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "communities_domain_key" ON "communities"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_domains_domain_key" ON "tenant_domains"("domain");

-- CreateIndex
CREATE INDEX "tenant_domains_communityId_idx" ON "tenant_domains"("communityId");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_community_memberships_userId_communityId_key" ON "user_community_memberships"("userId", "communityId");

-- CreateIndex
CREATE UNIQUE INDEX "places_slug_key" ON "places"("slug");

-- CreateIndex
CREATE INDEX "places_type_idx" ON "places"("type");

-- CreateIndex
CREATE INDEX "places_countryCode_idx" ON "places"("countryCode");

-- CreateIndex
CREATE INDEX "places_parentPlaceId_idx" ON "places"("parentPlaceId");

-- CreateIndex
CREATE INDEX "places_countryCode_admin1Code_idx" ON "places"("countryCode", "admin1Code");

-- CreateIndex
CREATE INDEX "place_aliases_placeId_idx" ON "place_aliases"("placeId");

-- CreateIndex
CREATE INDEX "place_aliases_alias_idx" ON "place_aliases"("alias");

-- CreateIndex
CREATE UNIQUE INDEX "place_aliases_placeId_alias_key" ON "place_aliases"("placeId", "alias");

-- CreateIndex
CREATE INDEX "tenant_coverage_areas_communityId_idx" ON "tenant_coverage_areas"("communityId");

-- CreateIndex
CREATE INDEX "tenant_coverage_areas_placeId_idx" ON "tenant_coverage_areas"("placeId");

-- CreateIndex
CREATE INDEX "tenant_coverage_areas_coverageType_idx" ON "tenant_coverage_areas"("coverageType");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_coverage_areas_communityId_placeId_key" ON "tenant_coverage_areas"("communityId", "placeId");

-- CreateIndex
CREATE INDEX "user_place_relationships_userId_idx" ON "user_place_relationships"("userId");

-- CreateIndex
CREATE INDEX "user_place_relationships_placeId_idx" ON "user_place_relationships"("placeId");

-- CreateIndex
CREATE INDEX "user_place_relationships_relationshipType_idx" ON "user_place_relationships"("relationshipType");

-- CreateIndex
CREATE INDEX "observed_geo_locations_matchedPlaceId_idx" ON "observed_geo_locations"("matchedPlaceId");

-- CreateIndex
CREATE INDEX "observed_geo_locations_reviewStatus_idx" ON "observed_geo_locations"("reviewStatus");

-- CreateIndex
CREATE UNIQUE INDEX "observed_geo_locations_normalizedLabel_key" ON "observed_geo_locations"("normalizedLabel");

-- CreateIndex
CREATE UNIQUE INDEX "vouch_records_voucherUserId_vouchedUserId_key" ON "vouch_records"("voucherUserId", "vouchedUserId");

-- CreateIndex
CREATE UNIQUE INDEX "banned_emails_email_key" ON "banned_emails"("email");

-- CreateIndex
CREATE INDEX "organizations_communityId_idx" ON "organizations"("communityId");

-- CreateIndex
CREATE INDEX "organizations_createdByUserId_idx" ON "organizations"("createdByUserId");

-- CreateIndex
CREATE INDEX "organizations_approvedByUserId_idx" ON "organizations"("approvedByUserId");

-- CreateIndex
CREATE INDEX "organizations_directoryGroup_idx" ON "organizations"("directoryGroup");

-- CreateIndex
CREATE INDEX "organizations_organizationType_idx" ON "organizations"("organizationType");

-- CreateIndex
CREATE INDEX "organizations_status_idx" ON "organizations"("status");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_communityId_slug_key" ON "organizations"("communityId", "slug");

-- CreateIndex
CREATE INDEX "organization_memberships_userId_idx" ON "organization_memberships"("userId");

-- CreateIndex
CREATE INDEX "organization_memberships_role_idx" ON "organization_memberships"("role");

-- CreateIndex
CREATE INDEX "organization_memberships_status_idx" ON "organization_memberships"("status");

-- CreateIndex
CREATE UNIQUE INDEX "organization_memberships_organizationId_userId_key" ON "organization_memberships"("organizationId", "userId");

-- CreateIndex
CREATE INDEX "organization_locations_organizationId_idx" ON "organization_locations"("organizationId");

-- CreateIndex
CREATE INDEX "organization_locations_municipality_idx" ON "organization_locations"("municipality");

-- CreateIndex
CREATE INDEX "organization_departments_organizationId_idx" ON "organization_departments"("organizationId");

-- CreateIndex
CREATE INDEX "organization_departments_locationId_idx" ON "organization_departments"("locationId");

-- CreateIndex
CREATE UNIQUE INDEX "organization_departments_organizationId_slug_key" ON "organization_departments"("organizationId", "slug");

-- CreateIndex
CREATE INDEX "organization_contacts_organizationId_idx" ON "organization_contacts"("organizationId");

-- CreateIndex
CREATE INDEX "organization_contacts_departmentId_idx" ON "organization_contacts"("departmentId");

-- CreateIndex
CREATE INDEX "organization_contacts_locationId_idx" ON "organization_contacts"("locationId");

-- CreateIndex
CREATE INDEX "organization_contacts_userId_idx" ON "organization_contacts"("userId");

-- CreateIndex
CREATE INDEX "organization_forms_organizationId_status_idx" ON "organization_forms"("organizationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "organization_forms_organizationId_slug_key" ON "organization_forms"("organizationId", "slug");

-- CreateIndex
CREATE INDEX "organization_form_questions_formId_sortOrder_idx" ON "organization_form_questions"("formId", "sortOrder");

-- CreateIndex
CREATE INDEX "organization_form_question_options_questionId_sortOrder_idx" ON "organization_form_question_options"("questionId", "sortOrder");

-- CreateIndex
CREATE INDEX "organization_form_submissions_formId_userId_idx" ON "organization_form_submissions"("formId", "userId");

-- CreateIndex
CREATE INDEX "organization_form_submissions_organizationId_submittedAt_idx" ON "organization_form_submissions"("organizationId", "submittedAt");

-- CreateIndex
CREATE INDEX "organization_form_answers_submissionId_idx" ON "organization_form_answers"("submissionId");

-- CreateIndex
CREATE INDEX "organization_form_answers_questionId_idx" ON "organization_form_answers"("questionId");

-- CreateIndex
CREATE INDEX "organization_form_answers_selectedOptionId_idx" ON "organization_form_answers"("selectedOptionId");

-- CreateIndex
CREATE INDEX "articles_communityId_idx" ON "articles"("communityId");

-- CreateIndex
CREATE INDEX "articles_authorUserId_idx" ON "articles"("authorUserId");

-- CreateIndex
CREATE INDEX "articles_categoryId_idx" ON "articles"("categoryId");

-- CreateIndex
CREATE INDEX "articles_status_idx" ON "articles"("status");

-- CreateIndex
CREATE UNIQUE INDEX "articles_communityId_slug_key" ON "articles"("communityId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "reporter_runs_linkedArticleId_key" ON "reporter_runs"("linkedArticleId");

-- CreateIndex
CREATE INDEX "reporter_runs_communityId_status_idx" ON "reporter_runs"("communityId", "status");

-- CreateIndex
CREATE INDEX "reporter_runs_assignedToUserId_status_idx" ON "reporter_runs"("assignedToUserId", "status");

-- CreateIndex
CREATE INDEX "reporter_runs_createdByUserId_idx" ON "reporter_runs"("createdByUserId");

-- CreateIndex
CREATE INDEX "reporter_runs_requesterUserId_idx" ON "reporter_runs"("requesterUserId");

-- CreateIndex
CREATE INDEX "reporter_runs_createdAt_idx" ON "reporter_runs"("createdAt");

-- CreateIndex
CREATE INDEX "reporter_sources_reporterRunId_sortOrder_idx" ON "reporter_sources"("reporterRunId", "sortOrder");

-- CreateIndex
CREATE INDEX "reporter_sources_sourceType_idx" ON "reporter_sources"("sourceType");

-- CreateIndex
CREATE INDEX "reporter_sources_linkedArticleId_idx" ON "reporter_sources"("linkedArticleId");

-- CreateIndex
CREATE INDEX "reporter_sources_linkedEventId_idx" ON "reporter_sources"("linkedEventId");

-- CreateIndex
CREATE INDEX "reporter_sources_linkedOrganizationId_idx" ON "reporter_sources"("linkedOrganizationId");

-- CreateIndex
CREATE INDEX "reporter_sources_linkedPlaceId_idx" ON "reporter_sources"("linkedPlaceId");

-- CreateIndex
CREATE INDEX "reporter_blockers_reporterRunId_isResolved_idx" ON "reporter_blockers"("reporterRunId", "isResolved");

-- CreateIndex
CREATE INDEX "reporter_blockers_resolvedByUserId_idx" ON "reporter_blockers"("resolvedByUserId");

-- CreateIndex
CREATE INDEX "reporter_drafts_reporterRunId_createdAt_idx" ON "reporter_drafts"("reporterRunId", "createdAt");

-- CreateIndex
CREATE INDEX "reporter_drafts_createdByUserId_idx" ON "reporter_drafts"("createdByUserId");

-- CreateIndex
CREATE INDEX "reporter_validation_issues_reporterRunId_idx" ON "reporter_validation_issues"("reporterRunId");

-- CreateIndex
CREATE INDEX "reporter_validation_issues_reporterDraftId_idx" ON "reporter_validation_issues"("reporterDraftId");

-- CreateIndex
CREATE INDEX "reporter_agent_tasks_reporterRunId_idx" ON "reporter_agent_tasks"("reporterRunId");

-- CreateIndex
CREATE INDEX "reporter_agent_tasks_scopeKey_idx" ON "reporter_agent_tasks"("scopeKey");

-- CreateIndex
CREATE INDEX "reporter_agent_tasks_taskType_idx" ON "reporter_agent_tasks"("taskType");

-- CreateIndex
CREATE INDEX "reporter_agent_tasks_status_idx" ON "reporter_agent_tasks"("status");

-- CreateIndex
CREATE INDEX "reporter_agent_tasks_scheduledFor_idx" ON "reporter_agent_tasks"("scheduledFor");

-- CreateIndex
CREATE INDEX "reporter_agent_traces_reporterRunId_idx" ON "reporter_agent_traces"("reporterRunId");

-- CreateIndex
CREATE INDEX "reporter_agent_traces_reporterAgentTaskId_idx" ON "reporter_agent_traces"("reporterAgentTaskId");

-- CreateIndex
CREATE INDEX "reporter_agent_traces_traceType_idx" ON "reporter_agent_traces"("traceType");

-- CreateIndex
CREATE INDEX "reporter_agent_traces_createdAt_idx" ON "reporter_agent_traces"("createdAt");

-- CreateIndex
CREATE INDEX "reporter_claims_reporterRunId_idx" ON "reporter_claims"("reporterRunId");

-- CreateIndex
CREATE INDEX "reporter_claims_reporterSourceId_idx" ON "reporter_claims"("reporterSourceId");

-- CreateIndex
CREATE INDEX "reporter_claims_claimType_idx" ON "reporter_claims"("claimType");

-- CreateIndex
CREATE INDEX "reporter_claims_verificationStatus_idx" ON "reporter_claims"("verificationStatus");

-- CreateIndex
CREATE INDEX "reporter_monitored_sources_communityId_status_idx" ON "reporter_monitored_sources"("communityId", "status");

-- CreateIndex
CREATE INDEX "reporter_monitored_sources_communityId_executionLane_status_idx" ON "reporter_monitored_sources"("communityId", "executionLane", "status");

-- CreateIndex
CREATE INDEX "reporter_monitored_sources_communityId_coverageScope_idx" ON "reporter_monitored_sources"("communityId", "coverageScope");

-- CreateIndex
CREATE INDEX "reporter_monitored_sources_placeId_idx" ON "reporter_monitored_sources"("placeId");

-- CreateIndex
CREATE INDEX "reporter_monitored_sources_organizationId_idx" ON "reporter_monitored_sources"("organizationId");

-- CreateIndex
CREATE INDEX "reporter_monitored_sources_createdByUserId_idx" ON "reporter_monitored_sources"("createdByUserId");

-- CreateIndex
CREATE INDEX "reporter_monitored_sources_lastSuccessfulAt_idx" ON "reporter_monitored_sources"("lastSuccessfulAt");

-- CreateIndex
CREATE INDEX "reporter_monitored_sources_lastErrorAt_idx" ON "reporter_monitored_sources"("lastErrorAt");

-- CreateIndex
CREATE INDEX "reporter_source_fetches_monitoredSourceId_startedAt_idx" ON "reporter_source_fetches"("monitoredSourceId", "startedAt");

-- CreateIndex
CREATE INDEX "reporter_source_fetches_status_idx" ON "reporter_source_fetches"("status");

-- CreateIndex
CREATE INDEX "reporter_source_ingestion_items_monitoredSourceId_published_idx" ON "reporter_source_ingestion_items"("monitoredSourceId", "publishedAt");

-- CreateIndex
CREATE INDEX "reporter_source_ingestion_items_monitoredSourceId_lastSeenA_idx" ON "reporter_source_ingestion_items"("monitoredSourceId", "lastSeenAt");

-- CreateIndex
CREATE INDEX "reporter_source_ingestion_items_canonicalUrl_idx" ON "reporter_source_ingestion_items"("canonicalUrl");

-- CreateIndex
CREATE UNIQUE INDEX "reporter_source_ingestion_items_monitoredSourceId_dedupeKey_key" ON "reporter_source_ingestion_items"("monitoredSourceId", "dedupeKey");

-- CreateIndex
CREATE INDEX "reporter_story_candidates_communityId_score_idx" ON "reporter_story_candidates"("communityId", "score");

-- CreateIndex
CREATE INDEX "reporter_story_candidates_communityId_latestSourceAt_idx" ON "reporter_story_candidates"("communityId", "latestSourceAt");

-- CreateIndex
CREATE INDEX "reporter_story_candidates_placeId_idx" ON "reporter_story_candidates"("placeId");

-- CreateIndex
CREATE INDEX "reporter_story_candidates_linkedReporterRunId_idx" ON "reporter_story_candidates"("linkedReporterRunId");

-- CreateIndex
CREATE INDEX "reporter_daily_coverage_goals_communityId_isActive_idx" ON "reporter_daily_coverage_goals"("communityId", "isActive");

-- CreateIndex
CREATE INDEX "reporter_daily_coverage_goals_placeId_idx" ON "reporter_daily_coverage_goals"("placeId");

-- CreateIndex
CREATE UNIQUE INDEX "reporter_daily_coverage_goals_communityId_key" ON "reporter_daily_coverage_goals"("communityId");

-- CreateIndex
CREATE INDEX "reporter_daily_coverage_decisions_reporterStoryCandidateId_idx" ON "reporter_daily_coverage_decisions"("reporterStoryCandidateId");

-- CreateIndex
CREATE INDEX "reporter_daily_coverage_decisions_reporterRunId_idx" ON "reporter_daily_coverage_decisions"("reporterRunId");

-- CreateIndex
CREATE INDEX "reporter_daily_coverage_decisions_analysisDraftId_idx" ON "reporter_daily_coverage_decisions"("analysisDraftId");

-- CreateIndex
CREATE INDEX "reporter_daily_coverage_decisions_articleDraftId_idx" ON "reporter_daily_coverage_decisions"("articleDraftId");

-- CreateIndex
CREATE INDEX "reporter_daily_coverage_decisions_decisionDate_idx" ON "reporter_daily_coverage_decisions"("decisionDate");

-- CreateIndex
CREATE UNIQUE INDEX "reporter_daily_coverage_decisions_reporterDailyCoverageGoal_key" ON "reporter_daily_coverage_decisions"("reporterDailyCoverageGoalId", "decisionDate");

-- CreateIndex
CREATE INDEX "reporter_story_candidate_items_ingestionItemId_idx" ON "reporter_story_candidate_items"("ingestionItemId");

-- CreateIndex
CREATE INDEX "reporter_story_candidate_items_reporterStoryCandidateId_sor_idx" ON "reporter_story_candidate_items"("reporterStoryCandidateId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "reporter_story_candidate_items_reporterStoryCandidateId_ing_key" ON "reporter_story_candidate_items"("reporterStoryCandidateId", "ingestionItemId");

-- CreateIndex
CREATE INDEX "reporter_interview_requests_reporterRunId_status_idx" ON "reporter_interview_requests"("reporterRunId", "status");

-- CreateIndex
CREATE INDEX "reporter_interview_requests_intervieweeUserId_status_idx" ON "reporter_interview_requests"("intervieweeUserId", "status");

-- CreateIndex
CREATE INDEX "reporter_interview_requests_createdByUserId_idx" ON "reporter_interview_requests"("createdByUserId");

-- CreateIndex
CREATE INDEX "reporter_interview_requests_scheduledFor_idx" ON "reporter_interview_requests"("scheduledFor");

-- CreateIndex
CREATE INDEX "reporter_interview_requests_createdAt_idx" ON "reporter_interview_requests"("createdAt");

-- CreateIndex
CREATE INDEX "reporter_interview_sessions_interviewRequestId_status_idx" ON "reporter_interview_sessions"("interviewRequestId", "status");

-- CreateIndex
CREATE INDEX "reporter_interview_sessions_lastActivityAt_idx" ON "reporter_interview_sessions"("lastActivityAt");

-- CreateIndex
CREATE INDEX "reporter_interview_sessions_reviewedByUserId_idx" ON "reporter_interview_sessions"("reviewedByUserId");

-- CreateIndex
CREATE INDEX "reporter_interview_turns_interviewSessionId_answeredAt_idx" ON "reporter_interview_turns"("interviewSessionId", "answeredAt");

-- CreateIndex
CREATE UNIQUE INDEX "reporter_interview_turns_interviewSessionId_sortOrder_key" ON "reporter_interview_turns"("interviewSessionId", "sortOrder");

-- CreateIndex
CREATE INDEX "reporter_interview_facts_interviewSessionId_factType_idx" ON "reporter_interview_facts"("interviewSessionId", "factType");

-- CreateIndex
CREATE INDEX "reporter_interview_facts_interviewTurnId_idx" ON "reporter_interview_facts"("interviewTurnId");

-- CreateIndex
CREATE INDEX "reporter_interview_safety_flags_interviewSessionId_flagType_idx" ON "reporter_interview_safety_flags"("interviewSessionId", "flagType");

-- CreateIndex
CREATE INDEX "reporter_interview_safety_flags_blockerId_idx" ON "reporter_interview_safety_flags"("blockerId");

-- CreateIndex
CREATE INDEX "recipes_communityId_idx" ON "recipes"("communityId");

-- CreateIndex
CREATE INDEX "recipes_authorUserId_idx" ON "recipes"("authorUserId");

-- CreateIndex
CREATE INDEX "recipes_categoryId_idx" ON "recipes"("categoryId");

-- CreateIndex
CREATE INDEX "recipes_status_idx" ON "recipes"("status");

-- CreateIndex
CREATE UNIQUE INDEX "recipes_communityId_slug_key" ON "recipes"("communityId", "slug");

-- CreateIndex
CREATE INDEX "recipe_ingredient_sections_recipeId_sort_order_idx" ON "recipe_ingredient_sections"("recipeId", "sort_order");

-- CreateIndex
CREATE INDEX "recipe_ingredients_recipeId_sort_order_idx" ON "recipe_ingredients"("recipeId", "sort_order");

-- CreateIndex
CREATE INDEX "recipe_ingredients_section_id_idx" ON "recipe_ingredients"("section_id");

-- CreateIndex
CREATE INDEX "recipe_instruction_steps_recipeId_sort_order_idx" ON "recipe_instruction_steps"("recipeId", "sort_order");

-- CreateIndex
CREATE INDEX "recipe_notes_recipeId_sort_order_idx" ON "recipe_notes"("recipeId", "sort_order");

-- CreateIndex
CREATE INDEX "recipe_media_recipeId_sort_order_idx" ON "recipe_media"("recipeId", "sort_order");

-- CreateIndex
CREATE INDEX "recipe_media_step_id_sort_order_idx" ON "recipe_media"("step_id", "sort_order");

-- CreateIndex
CREATE INDEX "memorial_people_communityId_deathDate_idx" ON "memorial_people"("communityId", "deathDate");

-- CreateIndex
CREATE UNIQUE INDEX "memorial_people_communityId_slug_key" ON "memorial_people"("communityId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "memorial_pages_memorialPersonId_key" ON "memorial_pages"("memorialPersonId");

-- CreateIndex
CREATE INDEX "memorial_pages_communityId_status_idx" ON "memorial_pages"("communityId", "status");

-- CreateIndex
CREATE INDEX "memorial_pages_categoryId_idx" ON "memorial_pages"("categoryId");

-- CreateIndex
CREATE INDEX "memorial_pages_createdByUserId_idx" ON "memorial_pages"("createdByUserId");

-- CreateIndex
CREATE INDEX "memorial_pages_approvedByUserId_idx" ON "memorial_pages"("approvedByUserId");

-- CreateIndex
CREATE UNIQUE INDEX "memorial_pages_communityId_slug_key" ON "memorial_pages"("communityId", "slug");

-- CreateIndex
CREATE INDEX "memorial_submissions_communityId_status_idx" ON "memorial_submissions"("communityId", "status");

-- CreateIndex
CREATE INDEX "memorial_submissions_memorialPersonId_idx" ON "memorial_submissions"("memorialPersonId");

-- CreateIndex
CREATE INDEX "memorial_submissions_memorialPageId_idx" ON "memorial_submissions"("memorialPageId");

-- CreateIndex
CREATE INDEX "memorial_submissions_submittedByUserId_idx" ON "memorial_submissions"("submittedByUserId");

-- CreateIndex
CREATE INDEX "memorial_submissions_assignedToUserId_idx" ON "memorial_submissions"("assignedToUserId");

-- CreateIndex
CREATE INDEX "memorial_submissions_reviewedByUserId_idx" ON "memorial_submissions"("reviewedByUserId");

-- CreateIndex
CREATE INDEX "memorial_contributors_memorialPageId_status_idx" ON "memorial_contributors"("memorialPageId", "status");

-- CreateIndex
CREATE INDEX "memorial_contributors_userId_idx" ON "memorial_contributors"("userId");

-- CreateIndex
CREATE INDEX "memorial_contributors_invitedByUserId_idx" ON "memorial_contributors"("invitedByUserId");

-- CreateIndex
CREATE INDEX "memorial_verifications_memorialPersonId_idx" ON "memorial_verifications"("memorialPersonId");

-- CreateIndex
CREATE INDEX "memorial_verifications_memorialPageId_idx" ON "memorial_verifications"("memorialPageId");

-- CreateIndex
CREATE INDEX "memorial_verifications_memorialSubmissionId_idx" ON "memorial_verifications"("memorialSubmissionId");

-- CreateIndex
CREATE INDEX "memorial_verifications_createdByUserId_idx" ON "memorial_verifications"("createdByUserId");

-- CreateIndex
CREATE INDEX "memorial_memories_communityId_status_idx" ON "memorial_memories"("communityId", "status");

-- CreateIndex
CREATE INDEX "memorial_memories_memorialPageId_status_idx" ON "memorial_memories"("memorialPageId", "status");

-- CreateIndex
CREATE INDEX "memorial_memories_createdByUserId_idx" ON "memorial_memories"("createdByUserId");

-- CreateIndex
CREATE INDEX "memorial_memories_reviewedByUserId_idx" ON "memorial_memories"("reviewedByUserId");

-- CreateIndex
CREATE INDEX "memorial_photos_communityId_status_idx" ON "memorial_photos"("communityId", "status");

-- CreateIndex
CREATE INDEX "memorial_photos_memorialPageId_status_idx" ON "memorial_photos"("memorialPageId", "status");

-- CreateIndex
CREATE INDEX "memorial_photos_createdByUserId_idx" ON "memorial_photos"("createdByUserId");

-- CreateIndex
CREATE INDEX "memorial_photos_reviewedByUserId_idx" ON "memorial_photos"("reviewedByUserId");

-- CreateIndex
CREATE INDEX "memorial_audit_logs_communityId_createdAt_idx" ON "memorial_audit_logs"("communityId", "createdAt");

-- CreateIndex
CREATE INDEX "memorial_audit_logs_memorialPageId_idx" ON "memorial_audit_logs"("memorialPageId");

-- CreateIndex
CREATE INDEX "memorial_audit_logs_memorialSubmissionId_idx" ON "memorial_audit_logs"("memorialSubmissionId");

-- CreateIndex
CREATE INDEX "memorial_audit_logs_memorialMemoryId_idx" ON "memorial_audit_logs"("memorialMemoryId");

-- CreateIndex
CREATE INDEX "memorial_audit_logs_memorialPhotoId_idx" ON "memorial_audit_logs"("memorialPhotoId");

-- CreateIndex
CREATE INDEX "memorial_audit_logs_actorUserId_idx" ON "memorial_audit_logs"("actorUserId");

-- CreateIndex
CREATE UNIQUE INDEX "tags_name_key" ON "tags"("name");

-- CreateIndex
CREATE UNIQUE INDEX "tags_slug_key" ON "tags"("slug");

-- CreateIndex
CREATE INDEX "categories_communityId_idx" ON "categories"("communityId");

-- CreateIndex
CREATE INDEX "categories_parentCategoryId_idx" ON "categories"("parentCategoryId");

-- CreateIndex
CREATE INDEX "comments_articleId_idx" ON "comments"("articleId");

-- CreateIndex
CREATE INDEX "comments_authorUserId_idx" ON "comments"("authorUserId");

-- CreateIndex
CREATE INDEX "comments_parentCommentId_idx" ON "comments"("parentCommentId");

-- CreateIndex
CREATE INDEX "events_communityId_idx" ON "events"("communityId");

-- CreateIndex
CREATE INDEX "events_submittedByUserId_idx" ON "events"("submittedByUserId");

-- CreateIndex
CREATE INDEX "events_organizationId_idx" ON "events"("organizationId");

-- CreateIndex
CREATE INDEX "events_seriesId_idx" ON "events"("seriesId");

-- CreateIndex
CREATE INDEX "events_reporterStoryCandidateId_idx" ON "events"("reporterStoryCandidateId");

-- CreateIndex
CREATE INDEX "events_locationId_idx" ON "events"("locationId");

-- CreateIndex
CREATE INDEX "events_status_idx" ON "events"("status");

-- CreateIndex
CREATE INDEX "event_series_communityId_idx" ON "event_series"("communityId");

-- CreateIndex
CREATE INDEX "event_series_createdByUserId_idx" ON "event_series"("createdByUserId");

-- CreateIndex
CREATE INDEX "event_series_organizationId_idx" ON "event_series"("organizationId");

-- CreateIndex
CREATE INDEX "locations_communityId_idx" ON "locations"("communityId");

-- CreateIndex
CREATE INDEX "locations_normalizedAddressKey_idx" ON "locations"("normalizedAddressKey");

-- CreateIndex
CREATE INDEX "locations_googlePlaceId_idx" ON "locations"("googlePlaceId");

-- CreateIndex
CREATE INDEX "help_wanted_posts_communityId_idx" ON "help_wanted_posts"("communityId");

-- CreateIndex
CREATE INDEX "help_wanted_posts_authorUserId_idx" ON "help_wanted_posts"("authorUserId");

-- CreateIndex
CREATE INDEX "help_wanted_posts_postingType_idx" ON "help_wanted_posts"("postingType");

-- CreateIndex
CREATE INDEX "help_wanted_posts_status_idx" ON "help_wanted_posts"("status");

-- CreateIndex
CREATE INDEX "roadmap_ideas_communityId_idx" ON "roadmap_ideas"("communityId");

-- CreateIndex
CREATE INDEX "roadmap_ideas_authorUserId_idx" ON "roadmap_ideas"("authorUserId");

-- CreateIndex
CREATE INDEX "roadmap_ideas_status_idx" ON "roadmap_ideas"("status");

-- CreateIndex
CREATE INDEX "roadmap_ideas_mergedIntoIdeaId_idx" ON "roadmap_ideas"("mergedIntoIdeaId");

-- CreateIndex
CREATE INDEX "roadmap_ranking_ballots_communityId_idx" ON "roadmap_ranking_ballots"("communityId");

-- CreateIndex
CREATE INDEX "roadmap_ranking_ballots_userId_idx" ON "roadmap_ranking_ballots"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "roadmap_ranking_ballots_communityId_userId_key" ON "roadmap_ranking_ballots"("communityId", "userId");

-- CreateIndex
CREATE INDEX "roadmap_ranking_items_ideaId_idx" ON "roadmap_ranking_items"("ideaId");

-- CreateIndex
CREATE UNIQUE INDEX "roadmap_ranking_items_ballotId_rank_key" ON "roadmap_ranking_items"("ballotId", "rank");

-- CreateIndex
CREATE UNIQUE INDEX "roadmap_ranking_items_ballotId_ideaId_key" ON "roadmap_ranking_items"("ballotId", "ideaId");

-- CreateIndex
CREATE INDEX "domain_influence_weights_communityId_idx" ON "domain_influence_weights"("communityId");

-- CreateIndex
CREATE INDEX "domain_influence_weights_userId_idx" ON "domain_influence_weights"("userId");

-- CreateIndex
CREATE INDEX "domain_influence_weights_domain_idx" ON "domain_influence_weights"("domain");

-- CreateIndex
CREATE UNIQUE INDEX "domain_influence_weights_communityId_userId_domain_key" ON "domain_influence_weights"("communityId", "userId", "domain");

-- CreateIndex
CREATE INDEX "stores_communityId_idx" ON "stores"("communityId");

-- CreateIndex
CREATE INDEX "stores_ownerUserId_idx" ON "stores"("ownerUserId");

-- CreateIndex
CREATE INDEX "stores_approvedByUserId_idx" ON "stores"("approvedByUserId");

-- CreateIndex
CREATE INDEX "stores_status_idx" ON "stores"("status");

-- CreateIndex
CREATE UNIQUE INDEX "stores_communityId_slug_key" ON "stores"("communityId", "slug");

-- CreateIndex
CREATE INDEX "store_members_userId_idx" ON "store_members"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "store_members_storeId_userId_key" ON "store_members"("storeId", "userId");

-- CreateIndex
CREATE INDEX "marketplace_listings_communityId_idx" ON "marketplace_listings"("communityId");

-- CreateIndex
CREATE INDEX "marketplace_listings_storeId_idx" ON "marketplace_listings"("storeId");

-- CreateIndex
CREATE INDEX "marketplace_listings_authorUserId_idx" ON "marketplace_listings"("authorUserId");

-- CreateIndex
CREATE INDEX "marketplace_listings_status_idx" ON "marketplace_listings"("status");

-- CreateIndex
CREATE INDEX "marketplace_photos_marketplaceListingId_idx" ON "marketplace_photos"("marketplaceListingId");

-- CreateIndex
CREATE INDEX "conversation_participants_conversationId_idx" ON "conversation_participants"("conversationId");

-- CreateIndex
CREATE INDEX "conversation_participants_userId_idx" ON "conversation_participants"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "conversation_participants_conversationId_userId_key" ON "conversation_participants"("conversationId", "userId");

-- CreateIndex
CREATE INDEX "messages_conversationId_idx" ON "messages"("conversationId");

-- CreateIndex
CREATE INDEX "messages_senderUserId_idx" ON "messages"("senderUserId");

-- CreateIndex
CREATE INDEX "message_attachments_messageId_idx" ON "message_attachments"("messageId");

-- CreateIndex
CREATE UNIQUE INDEX "user_blocks_blockerUserId_blockedUserId_key" ON "user_blocks"("blockerUserId", "blockedUserId");

-- CreateIndex
CREATE INDEX "homepage_boxes_communityId_sortOrder_idx" ON "homepage_boxes"("communityId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "homepage_boxes_communityId_boxType_key" ON "homepage_boxes"("communityId", "boxType");

-- CreateIndex
CREATE INDEX "homepage_sections_communityId_idx" ON "homepage_sections"("communityId");

-- CreateIndex
CREATE INDEX "homepage_box_items_homepageBoxId_role_sortOrder_idx" ON "homepage_box_items"("homepageBoxId", "role", "sortOrder");

-- CreateIndex
CREATE INDEX "homepage_box_items_pinnedByUserId_idx" ON "homepage_box_items"("pinnedByUserId");

-- CreateIndex
CREATE INDEX "homepage_pinned_items_homepageSectionId_idx" ON "homepage_pinned_items"("homepageSectionId");

-- CreateIndex
CREATE INDEX "homepage_pinned_items_pinnedByUserId_idx" ON "homepage_pinned_items"("pinnedByUserId");

-- CreateIndex
CREATE INDEX "site_settings_communityId_idx" ON "site_settings"("communityId");

-- CreateIndex
CREATE UNIQUE INDEX "site_settings_communityId_key_key" ON "site_settings"("communityId", "key");

-- CreateIndex
CREATE INDEX "login_events_userId_idx" ON "login_events"("userId");

-- CreateIndex
CREATE INDEX "login_events_ipAddress_idx" ON "login_events"("ipAddress");

-- CreateIndex
CREATE INDEX "login_events_createdAt_idx" ON "login_events"("createdAt");

-- CreateIndex
CREATE INDEX "login_events_userId_ipAddress_idx" ON "login_events"("userId", "ipAddress");

-- CreateIndex
CREATE INDEX "activity_logs_userId_idx" ON "activity_logs"("userId");

-- CreateIndex
CREATE INDEX "activity_logs_resourceType_resourceId_idx" ON "activity_logs"("resourceType", "resourceId");

-- CreateIndex
CREATE INDEX "activity_logs_createdAt_idx" ON "activity_logs"("createdAt");

-- CreateIndex
CREATE INDEX "activity_logs_action_idx" ON "activity_logs"("action");

-- CreateIndex
CREATE INDEX "analytics_events_communityId_occurredAt_idx" ON "analytics_events"("communityId", "occurredAt");

-- CreateIndex
CREATE INDEX "analytics_events_contentType_contentId_occurredAt_idx" ON "analytics_events"("contentType", "contentId", "occurredAt");

-- CreateIndex
CREATE INDEX "analytics_events_eventName_occurredAt_idx" ON "analytics_events"("eventName", "occurredAt");

-- CreateIndex
CREATE INDEX "analytics_events_sessionId_occurredAt_idx" ON "analytics_events"("sessionId", "occurredAt");

-- CreateIndex
CREATE INDEX "analytics_events_anonymousVisitorId_occurredAt_idx" ON "analytics_events"("anonymousVisitorId", "occurredAt");

-- CreateIndex
CREATE INDEX "content_reactions_communityId_contentType_createdAt_idx" ON "content_reactions"("communityId", "contentType", "createdAt");

-- CreateIndex
CREATE INDEX "content_reactions_contentType_contentId_idx" ON "content_reactions"("contentType", "contentId");

-- CreateIndex
CREATE UNIQUE INDEX "content_reactions_userId_contentType_contentId_key" ON "content_reactions"("userId", "contentType", "contentId");

-- CreateIndex
CREATE INDEX "content_metrics_daily_communityId_date_contentType_idx" ON "content_metrics_daily"("communityId", "date", "contentType");

-- CreateIndex
CREATE INDEX "content_metrics_daily_authorUserId_date_idx" ON "content_metrics_daily"("authorUserId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "content_metrics_daily_communityId_date_contentType_contentI_key" ON "content_metrics_daily"("communityId", "date", "contentType", "contentId");

-- CreateIndex
CREATE INDEX "category_metrics_daily_communityId_date_contentType_idx" ON "category_metrics_daily"("communityId", "date", "contentType");

-- CreateIndex
CREATE UNIQUE INDEX "category_metrics_daily_communityId_date_contentType_categor_key" ON "category_metrics_daily"("communityId", "date", "contentType", "categoryLabel");

-- CreateIndex
CREATE INDEX "homepage_slot_metrics_daily_communityId_date_boxType_idx" ON "homepage_slot_metrics_daily"("communityId", "date", "boxType");

-- CreateIndex
CREATE UNIQUE INDEX "homepage_slot_metrics_daily_communityId_date_slotPosition_b_key" ON "homepage_slot_metrics_daily"("communityId", "date", "slotPosition", "boxType", "placement", "contentType", "contentId");

-- AddForeignKey
ALTER TABLE "tenant_domains" ADD CONSTRAINT "tenant_domains_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_community_memberships" ADD CONSTRAINT "user_community_memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_community_memberships" ADD CONSTRAINT "user_community_memberships_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "places" ADD CONSTRAINT "places_parentPlaceId_fkey" FOREIGN KEY ("parentPlaceId") REFERENCES "places"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "place_aliases" ADD CONSTRAINT "place_aliases_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_coverage_areas" ADD CONSTRAINT "tenant_coverage_areas_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tenant_coverage_areas" ADD CONSTRAINT "tenant_coverage_areas_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "places"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_place_relationships" ADD CONSTRAINT "user_place_relationships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_place_relationships" ADD CONSTRAINT "user_place_relationships_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "places"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "observed_geo_locations" ADD CONSTRAINT "observed_geo_locations_matchedPlaceId_fkey" FOREIGN KEY ("matchedPlaceId") REFERENCES "places"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vouch_records" ADD CONSTRAINT "vouch_records_voucherUserId_fkey" FOREIGN KEY ("voucherUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vouch_records" ADD CONSTRAINT "vouch_records_vouchedUserId_fkey" FOREIGN KEY ("vouchedUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trust_audit_logs" ADD CONSTRAINT "trust_audit_logs_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trust_audit_logs" ADD CONSTRAINT "trust_audit_logs_targetUserId_fkey" FOREIGN KEY ("targetUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "banned_emails" ADD CONSTRAINT "banned_emails_bannedByUserId_fkey" FOREIGN KEY ("bannedByUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "banned_emails" ADD CONSTRAINT "banned_emails_unbannedByUserId_fkey" FOREIGN KEY ("unbannedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_memberships" ADD CONSTRAINT "organization_memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_locations" ADD CONSTRAINT "organization_locations_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_departments" ADD CONSTRAINT "organization_departments_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_departments" ADD CONSTRAINT "organization_departments_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "organization_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_contacts" ADD CONSTRAINT "organization_contacts_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_contacts" ADD CONSTRAINT "organization_contacts_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "organization_departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_contacts" ADD CONSTRAINT "organization_contacts_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "organization_locations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_contacts" ADD CONSTRAINT "organization_contacts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_forms" ADD CONSTRAINT "organization_forms_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_forms" ADD CONSTRAINT "organization_forms_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_forms" ADD CONSTRAINT "organization_forms_updatedByUserId_fkey" FOREIGN KEY ("updatedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_form_questions" ADD CONSTRAINT "organization_form_questions_formId_fkey" FOREIGN KEY ("formId") REFERENCES "organization_forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_form_question_options" ADD CONSTRAINT "organization_form_question_options_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "organization_form_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_form_submissions" ADD CONSTRAINT "organization_form_submissions_formId_fkey" FOREIGN KEY ("formId") REFERENCES "organization_forms"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_form_submissions" ADD CONSTRAINT "organization_form_submissions_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_form_submissions" ADD CONSTRAINT "organization_form_submissions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_form_submissions" ADD CONSTRAINT "organization_form_submissions_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_form_answers" ADD CONSTRAINT "organization_form_answers_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "organization_form_submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_form_answers" ADD CONSTRAINT "organization_form_answers_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "organization_form_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_form_answers" ADD CONSTRAINT "organization_form_answers_selectedOptionId_fkey" FOREIGN KEY ("selectedOptionId") REFERENCES "organization_form_question_options"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "articles_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "articles_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "articles" ADD CONSTRAINT "articles_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporter_runs" ADD CONSTRAINT "reporter_runs_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporter_runs" ADD CONSTRAINT "reporter_runs_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporter_runs" ADD CONSTRAINT "reporter_runs_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporter_runs" ADD CONSTRAINT "reporter_runs_linkedArticleId_fkey" FOREIGN KEY ("linkedArticleId") REFERENCES "articles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporter_sources" ADD CONSTRAINT "reporter_sources_reporterRunId_fkey" FOREIGN KEY ("reporterRunId") REFERENCES "reporter_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporter_sources" ADD CONSTRAINT "reporter_sources_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporter_sources" ADD CONSTRAINT "reporter_sources_linkedArticleId_fkey" FOREIGN KEY ("linkedArticleId") REFERENCES "articles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporter_sources" ADD CONSTRAINT "reporter_sources_linkedEventId_fkey" FOREIGN KEY ("linkedEventId") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporter_sources" ADD CONSTRAINT "reporter_sources_linkedOrganizationId_fkey" FOREIGN KEY ("linkedOrganizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporter_sources" ADD CONSTRAINT "reporter_sources_linkedPlaceId_fkey" FOREIGN KEY ("linkedPlaceId") REFERENCES "places"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporter_blockers" ADD CONSTRAINT "reporter_blockers_reporterRunId_fkey" FOREIGN KEY ("reporterRunId") REFERENCES "reporter_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporter_blockers" ADD CONSTRAINT "reporter_blockers_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporter_drafts" ADD CONSTRAINT "reporter_drafts_reporterRunId_fkey" FOREIGN KEY ("reporterRunId") REFERENCES "reporter_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporter_drafts" ADD CONSTRAINT "reporter_drafts_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporter_validation_issues" ADD CONSTRAINT "reporter_validation_issues_reporterRunId_fkey" FOREIGN KEY ("reporterRunId") REFERENCES "reporter_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporter_validation_issues" ADD CONSTRAINT "reporter_validation_issues_reporterDraftId_fkey" FOREIGN KEY ("reporterDraftId") REFERENCES "reporter_drafts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporter_agent_tasks" ADD CONSTRAINT "reporter_agent_tasks_reporterRunId_fkey" FOREIGN KEY ("reporterRunId") REFERENCES "reporter_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporter_agent_tasks" ADD CONSTRAINT "reporter_agent_tasks_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporter_agent_traces" ADD CONSTRAINT "reporter_agent_traces_reporterRunId_fkey" FOREIGN KEY ("reporterRunId") REFERENCES "reporter_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporter_agent_traces" ADD CONSTRAINT "reporter_agent_traces_reporterAgentTaskId_fkey" FOREIGN KEY ("reporterAgentTaskId") REFERENCES "reporter_agent_tasks"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporter_claims" ADD CONSTRAINT "reporter_claims_reporterRunId_fkey" FOREIGN KEY ("reporterRunId") REFERENCES "reporter_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporter_claims" ADD CONSTRAINT "reporter_claims_reporterSourceId_fkey" FOREIGN KEY ("reporterSourceId") REFERENCES "reporter_sources"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporter_claims" ADD CONSTRAINT "reporter_claims_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporter_monitored_sources" ADD CONSTRAINT "reporter_monitored_sources_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporter_monitored_sources" ADD CONSTRAINT "reporter_monitored_sources_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "places"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporter_monitored_sources" ADD CONSTRAINT "reporter_monitored_sources_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporter_monitored_sources" ADD CONSTRAINT "reporter_monitored_sources_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporter_source_fetches" ADD CONSTRAINT "reporter_source_fetches_monitoredSourceId_fkey" FOREIGN KEY ("monitoredSourceId") REFERENCES "reporter_monitored_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporter_source_ingestion_items" ADD CONSTRAINT "reporter_source_ingestion_items_monitoredSourceId_fkey" FOREIGN KEY ("monitoredSourceId") REFERENCES "reporter_monitored_sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporter_story_candidates" ADD CONSTRAINT "reporter_story_candidates_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporter_story_candidates" ADD CONSTRAINT "reporter_story_candidates_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "places"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporter_story_candidates" ADD CONSTRAINT "reporter_story_candidates_linkedReporterRunId_fkey" FOREIGN KEY ("linkedReporterRunId") REFERENCES "reporter_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporter_daily_coverage_goals" ADD CONSTRAINT "reporter_daily_coverage_goals_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporter_daily_coverage_goals" ADD CONSTRAINT "reporter_daily_coverage_goals_placeId_fkey" FOREIGN KEY ("placeId") REFERENCES "places"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporter_daily_coverage_decisions" ADD CONSTRAINT "reporter_daily_coverage_decisions_reporterDailyCoverageGoa_fkey" FOREIGN KEY ("reporterDailyCoverageGoalId") REFERENCES "reporter_daily_coverage_goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporter_daily_coverage_decisions" ADD CONSTRAINT "reporter_daily_coverage_decisions_reporterStoryCandidateId_fkey" FOREIGN KEY ("reporterStoryCandidateId") REFERENCES "reporter_story_candidates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporter_daily_coverage_decisions" ADD CONSTRAINT "reporter_daily_coverage_decisions_reporterRunId_fkey" FOREIGN KEY ("reporterRunId") REFERENCES "reporter_runs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporter_daily_coverage_decisions" ADD CONSTRAINT "reporter_daily_coverage_decisions_analysisDraftId_fkey" FOREIGN KEY ("analysisDraftId") REFERENCES "reporter_drafts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporter_daily_coverage_decisions" ADD CONSTRAINT "reporter_daily_coverage_decisions_articleDraftId_fkey" FOREIGN KEY ("articleDraftId") REFERENCES "reporter_drafts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporter_story_candidate_items" ADD CONSTRAINT "reporter_story_candidate_items_reporterStoryCandidateId_fkey" FOREIGN KEY ("reporterStoryCandidateId") REFERENCES "reporter_story_candidates"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporter_story_candidate_items" ADD CONSTRAINT "reporter_story_candidate_items_ingestionItemId_fkey" FOREIGN KEY ("ingestionItemId") REFERENCES "reporter_source_ingestion_items"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporter_interview_requests" ADD CONSTRAINT "reporter_interview_requests_reporterRunId_fkey" FOREIGN KEY ("reporterRunId") REFERENCES "reporter_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporter_interview_requests" ADD CONSTRAINT "reporter_interview_requests_intervieweeUserId_fkey" FOREIGN KEY ("intervieweeUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporter_interview_requests" ADD CONSTRAINT "reporter_interview_requests_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporter_interview_sessions" ADD CONSTRAINT "reporter_interview_sessions_interviewRequestId_fkey" FOREIGN KEY ("interviewRequestId") REFERENCES "reporter_interview_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporter_interview_sessions" ADD CONSTRAINT "reporter_interview_sessions_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporter_interview_turns" ADD CONSTRAINT "reporter_interview_turns_interviewSessionId_fkey" FOREIGN KEY ("interviewSessionId") REFERENCES "reporter_interview_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporter_interview_facts" ADD CONSTRAINT "reporter_interview_facts_interviewSessionId_fkey" FOREIGN KEY ("interviewSessionId") REFERENCES "reporter_interview_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporter_interview_facts" ADD CONSTRAINT "reporter_interview_facts_interviewTurnId_fkey" FOREIGN KEY ("interviewTurnId") REFERENCES "reporter_interview_turns"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporter_interview_safety_flags" ADD CONSTRAINT "reporter_interview_safety_flags_interviewSessionId_fkey" FOREIGN KEY ("interviewSessionId") REFERENCES "reporter_interview_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporter_interview_safety_flags" ADD CONSTRAINT "reporter_interview_safety_flags_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "reporter_blockers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipes" ADD CONSTRAINT "recipes_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredient_sections" ADD CONSTRAINT "recipe_ingredient_sections_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_ingredients" ADD CONSTRAINT "recipe_ingredients_section_id_fkey" FOREIGN KEY ("section_id") REFERENCES "recipe_ingredient_sections"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_instruction_steps" ADD CONSTRAINT "recipe_instruction_steps_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_notes" ADD CONSTRAINT "recipe_notes_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_media" ADD CONSTRAINT "recipe_media_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "recipes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recipe_media" ADD CONSTRAINT "recipe_media_step_id_fkey" FOREIGN KEY ("step_id") REFERENCES "recipe_instruction_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memorial_people" ADD CONSTRAINT "memorial_people_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memorial_pages" ADD CONSTRAINT "memorial_pages_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memorial_pages" ADD CONSTRAINT "memorial_pages_memorialPersonId_fkey" FOREIGN KEY ("memorialPersonId") REFERENCES "memorial_people"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memorial_pages" ADD CONSTRAINT "memorial_pages_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memorial_pages" ADD CONSTRAINT "memorial_pages_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memorial_pages" ADD CONSTRAINT "memorial_pages_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memorial_submissions" ADD CONSTRAINT "memorial_submissions_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memorial_submissions" ADD CONSTRAINT "memorial_submissions_memorialPersonId_fkey" FOREIGN KEY ("memorialPersonId") REFERENCES "memorial_people"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memorial_submissions" ADD CONSTRAINT "memorial_submissions_memorialPageId_fkey" FOREIGN KEY ("memorialPageId") REFERENCES "memorial_pages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memorial_submissions" ADD CONSTRAINT "memorial_submissions_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memorial_submissions" ADD CONSTRAINT "memorial_submissions_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memorial_submissions" ADD CONSTRAINT "memorial_submissions_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memorial_contributors" ADD CONSTRAINT "memorial_contributors_memorialPageId_fkey" FOREIGN KEY ("memorialPageId") REFERENCES "memorial_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memorial_contributors" ADD CONSTRAINT "memorial_contributors_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memorial_contributors" ADD CONSTRAINT "memorial_contributors_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memorial_verifications" ADD CONSTRAINT "memorial_verifications_memorialPersonId_fkey" FOREIGN KEY ("memorialPersonId") REFERENCES "memorial_people"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memorial_verifications" ADD CONSTRAINT "memorial_verifications_memorialPageId_fkey" FOREIGN KEY ("memorialPageId") REFERENCES "memorial_pages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memorial_verifications" ADD CONSTRAINT "memorial_verifications_memorialSubmissionId_fkey" FOREIGN KEY ("memorialSubmissionId") REFERENCES "memorial_submissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memorial_verifications" ADD CONSTRAINT "memorial_verifications_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memorial_memories" ADD CONSTRAINT "memorial_memories_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memorial_memories" ADD CONSTRAINT "memorial_memories_memorialPageId_fkey" FOREIGN KEY ("memorialPageId") REFERENCES "memorial_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memorial_memories" ADD CONSTRAINT "memorial_memories_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memorial_memories" ADD CONSTRAINT "memorial_memories_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memorial_photos" ADD CONSTRAINT "memorial_photos_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memorial_photos" ADD CONSTRAINT "memorial_photos_memorialPageId_fkey" FOREIGN KEY ("memorialPageId") REFERENCES "memorial_pages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memorial_photos" ADD CONSTRAINT "memorial_photos_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memorial_photos" ADD CONSTRAINT "memorial_photos_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memorial_audit_logs" ADD CONSTRAINT "memorial_audit_logs_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memorial_audit_logs" ADD CONSTRAINT "memorial_audit_logs_memorialPageId_fkey" FOREIGN KEY ("memorialPageId") REFERENCES "memorial_pages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memorial_audit_logs" ADD CONSTRAINT "memorial_audit_logs_memorialSubmissionId_fkey" FOREIGN KEY ("memorialSubmissionId") REFERENCES "memorial_submissions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memorial_audit_logs" ADD CONSTRAINT "memorial_audit_logs_memorialMemoryId_fkey" FOREIGN KEY ("memorialMemoryId") REFERENCES "memorial_memories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memorial_audit_logs" ADD CONSTRAINT "memorial_audit_logs_memorialPhotoId_fkey" FOREIGN KEY ("memorialPhotoId") REFERENCES "memorial_photos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memorial_audit_logs" ADD CONSTRAINT "memorial_audit_logs_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_tags" ADD CONSTRAINT "article_tags_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "article_tags" ADD CONSTRAINT "article_tags_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "tags"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parentCategoryId_fkey" FOREIGN KEY ("parentCategoryId") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_parentCommentId_fkey" FOREIGN KEY ("parentCommentId") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_submittedByUserId_fkey" FOREIGN KEY ("submittedByUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "event_series"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_reporterStoryCandidateId_fkey" FOREIGN KEY ("reporterStoryCandidateId") REFERENCES "reporter_story_candidates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_series" ADD CONSTRAINT "event_series_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_series" ADD CONSTRAINT "event_series_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "event_series" ADD CONSTRAINT "event_series_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "locations" ADD CONSTRAINT "locations_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "help_wanted_posts" ADD CONSTRAINT "help_wanted_posts_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "help_wanted_posts" ADD CONSTRAINT "help_wanted_posts_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roadmap_ideas" ADD CONSTRAINT "roadmap_ideas_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roadmap_ideas" ADD CONSTRAINT "roadmap_ideas_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roadmap_ideas" ADD CONSTRAINT "roadmap_ideas_mergedIntoIdeaId_fkey" FOREIGN KEY ("mergedIntoIdeaId") REFERENCES "roadmap_ideas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roadmap_ranking_ballots" ADD CONSTRAINT "roadmap_ranking_ballots_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roadmap_ranking_ballots" ADD CONSTRAINT "roadmap_ranking_ballots_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roadmap_ranking_items" ADD CONSTRAINT "roadmap_ranking_items_ballotId_fkey" FOREIGN KEY ("ballotId") REFERENCES "roadmap_ranking_ballots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roadmap_ranking_items" ADD CONSTRAINT "roadmap_ranking_items_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "roadmap_ideas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "domain_influence_weights" ADD CONSTRAINT "domain_influence_weights_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "domain_influence_weights" ADD CONSTRAINT "domain_influence_weights_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stores" ADD CONSTRAINT "stores_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stores" ADD CONSTRAINT "stores_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stores" ADD CONSTRAINT "stores_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_members" ADD CONSTRAINT "store_members_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "store_members" ADD CONSTRAINT "store_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_listings" ADD CONSTRAINT "marketplace_listings_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_listings" ADD CONSTRAINT "marketplace_listings_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_listings" ADD CONSTRAINT "marketplace_listings_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketplace_photos" ADD CONSTRAINT "marketplace_photos_marketplaceListingId_fkey" FOREIGN KEY ("marketplaceListingId") REFERENCES "marketplace_listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversation_participants" ADD CONSTRAINT "conversation_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_senderUserId_fkey" FOREIGN KEY ("senderUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "message_attachments" ADD CONSTRAINT "message_attachments_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blockerUserId_fkey" FOREIGN KEY ("blockerUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_blocks" ADD CONSTRAINT "user_blocks_blockedUserId_fkey" FOREIGN KEY ("blockedUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "homepage_boxes" ADD CONSTRAINT "homepage_boxes_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "homepage_sections" ADD CONSTRAINT "homepage_sections_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "homepage_box_items" ADD CONSTRAINT "homepage_box_items_homepageBoxId_fkey" FOREIGN KEY ("homepageBoxId") REFERENCES "homepage_boxes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "homepage_box_items" ADD CONSTRAINT "homepage_box_items_pinnedByUserId_fkey" FOREIGN KEY ("pinnedByUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "homepage_pinned_items" ADD CONSTRAINT "homepage_pinned_items_homepageSectionId_fkey" FOREIGN KEY ("homepageSectionId") REFERENCES "homepage_sections"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "homepage_pinned_items" ADD CONSTRAINT "homepage_pinned_items_pinnedByUserId_fkey" FOREIGN KEY ("pinnedByUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "login_events" ADD CONSTRAINT "login_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_logs" ADD CONSTRAINT "activity_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analytics_events" ADD CONSTRAINT "analytics_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_reactions" ADD CONSTRAINT "content_reactions_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_reactions" ADD CONSTRAINT "content_reactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_metrics_daily" ADD CONSTRAINT "content_metrics_daily_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "content_metrics_daily" ADD CONSTRAINT "content_metrics_daily_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "category_metrics_daily" ADD CONSTRAINT "category_metrics_daily_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "homepage_slot_metrics_daily" ADD CONSTRAINT "homepage_slot_metrics_daily_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
