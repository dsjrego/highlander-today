export const REPORTER_RUN_STATUS = {
  NEW: 'NEW',
  NEEDS_REVIEW: 'NEEDS_REVIEW',
  SOURCE_PACKET_IN_PROGRESS: 'SOURCE_PACKET_IN_PROGRESS',
  READY_FOR_DRAFT: 'READY_FOR_DRAFT',
  BLOCKED: 'BLOCKED',
  DRAFT_CREATED: 'DRAFT_CREATED',
  CONVERTED_TO_ARTICLE: 'CONVERTED_TO_ARTICLE',
  ARCHIVED: 'ARCHIVED',
} as const;

export type ReporterRunStatusValue =
  (typeof REPORTER_RUN_STATUS)[keyof typeof REPORTER_RUN_STATUS];

export const REPORTER_MODE = {
  REQUEST: 'REQUEST',
  INTERVIEW: 'INTERVIEW',
  RESEARCH: 'RESEARCH',
  HYBRID: 'HYBRID',
} as const;

export type ReporterModeValue = (typeof REPORTER_MODE)[keyof typeof REPORTER_MODE];

export const REPORTER_REQUEST_TYPE = {
  ARTICLE_REQUEST: 'ARTICLE_REQUEST',
  STORY_TIP: 'STORY_TIP',
  EDITOR_ASSIGNMENT: 'EDITOR_ASSIGNMENT',
} as const;

export type ReporterRequestTypeValue =
  (typeof REPORTER_REQUEST_TYPE)[keyof typeof REPORTER_REQUEST_TYPE];

export const REPORTER_SOURCE_TYPE = {
  USER_NOTE: 'USER_NOTE',
  STAFF_NOTE: 'STAFF_NOTE',
  INTERVIEW_NOTE: 'INTERVIEW_NOTE',
  TRANSCRIPT_EXCERPT: 'TRANSCRIPT_EXCERPT',
  DOCUMENT: 'DOCUMENT',
  OFFICIAL_URL: 'OFFICIAL_URL',
  NEWS_ARTICLE: 'NEWS_ARTICLE',
  HIGHLANDER_ARTICLE: 'HIGHLANDER_ARTICLE',
  EVENT_RECORD: 'EVENT_RECORD',
  ORGANIZATION_RECORD: 'ORGANIZATION_RECORD',
  PLACE_RECORD: 'PLACE_RECORD',
} as const;

export type ReporterSourceTypeValue =
  (typeof REPORTER_SOURCE_TYPE)[keyof typeof REPORTER_SOURCE_TYPE];

export const REPORTER_RELIABILITY_TIER = {
  PRIMARY: 'PRIMARY',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  LOW: 'LOW',
  UNVERIFIED: 'UNVERIFIED',
} as const;

export type ReporterReliabilityTierValue =
  (typeof REPORTER_RELIABILITY_TIER)[keyof typeof REPORTER_RELIABILITY_TIER];

export const REPORTER_VALIDATION_SEVERITY = {
  CRITICAL: 'CRITICAL',
  WARNING: 'WARNING',
} as const;

export type ReporterValidationSeverityValue =
  (typeof REPORTER_VALIDATION_SEVERITY)[keyof typeof REPORTER_VALIDATION_SEVERITY];

export const REPORTER_DRAFT_TYPE = {
  ARTICLE_DRAFT: 'ARTICLE_DRAFT',
  SOURCE_PACKET_SUMMARY: 'SOURCE_PACKET_SUMMARY',
} as const;

export type ReporterDraftTypeValue =
  (typeof REPORTER_DRAFT_TYPE)[keyof typeof REPORTER_DRAFT_TYPE];

export const REPORTER_INTERVIEW_REQUEST_STATUS = {
  DRAFT: 'DRAFT',
  INVITED: 'INVITED',
  READY: 'READY',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  DECLINED: 'DECLINED',
  NO_SHOW: 'NO_SHOW',
  BLOCKED: 'BLOCKED',
  CANCELLED: 'CANCELLED',
} as const;

export type ReporterInterviewRequestStatusValue =
  (typeof REPORTER_INTERVIEW_REQUEST_STATUS)[keyof typeof REPORTER_INTERVIEW_REQUEST_STATUS];

export const REPORTER_INTERVIEW_TYPE = {
  TIPSTER: 'TIPSTER',
  WITNESS: 'WITNESS',
  EVENT_ORGANIZER: 'EVENT_ORGANIZER',
  ORG_REPRESENTATIVE: 'ORG_REPRESENTATIVE',
  PROFILE_SUBJECT: 'PROFILE_SUBJECT',
  GENERAL_SOURCE: 'GENERAL_SOURCE',
} as const;

export type ReporterInterviewTypeValue =
  (typeof REPORTER_INTERVIEW_TYPE)[keyof typeof REPORTER_INTERVIEW_TYPE];

export const REPORTER_INTERVIEW_PRIORITY = {
  LOW: 'LOW',
  NORMAL: 'NORMAL',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
} as const;

export type ReporterInterviewPriorityValue =
  (typeof REPORTER_INTERVIEW_PRIORITY)[keyof typeof REPORTER_INTERVIEW_PRIORITY];

export const REPORTER_SUPPORTED_LANGUAGE = {
  ENGLISH: 'ENGLISH',
  SPANISH: 'SPANISH',
  UKRAINIAN: 'UKRAINIAN',
} as const;

export type ReporterSupportedLanguageValue =
  (typeof REPORTER_SUPPORTED_LANGUAGE)[keyof typeof REPORTER_SUPPORTED_LANGUAGE];

export const REPORTER_INTERVIEW_SESSION_STATUS = {
  NOT_STARTED: 'NOT_STARTED',
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  ABANDONED: 'ABANDONED',
  EXPIRED: 'EXPIRED',
} as const;

export type ReporterInterviewSessionStatusValue =
  (typeof REPORTER_INTERVIEW_SESSION_STATUS)[keyof typeof REPORTER_INTERVIEW_SESSION_STATUS];

export const REPORTER_DRAFT_STATUS = {
  GENERATED: 'GENERATED',
  REVIEWED: 'REVIEWED',
  REJECTED: 'REJECTED',
  CONVERTED_TO_ARTICLE: 'CONVERTED_TO_ARTICLE',
} as const;

export type ReporterDraftStatusValue =
  (typeof REPORTER_DRAFT_STATUS)[keyof typeof REPORTER_DRAFT_STATUS];

export interface ReporterRunIntakePayload {
  mode?: ReporterModeValue | null;
  requestType?: ReporterRequestTypeValue | null;
  topic?: string | null;
  title?: string | null;
  subjectName?: string | null;
  requestedArticleType?: string | null;
  requestSummary?: string | null;
  whatHappened?: string | null;
  whoIsInvolved?: string | null;
  whereDidItHappen?: string | null;
  whenDidItHappen?: string | null;
  whyItMatters?: string | null;
  notes?: string | null;
  editorNotes?: string | null;
  supportingLinks?: Array<string | null | undefined>;
  requesterName?: string | null;
  requesterEmail?: string | null;
  requesterPhone?: string | null;
}

export interface ReporterRunNormalizedInput {
  mode: ReporterModeValue | null;
  requestType: ReporterRequestTypeValue | null;
  title: string | null;
  topic: string;
  subjectName: string | null;
  requestedArticleType: string | null;
  requesterName: string | null;
  requesterEmail: string | null;
  requesterPhone: string | null;
  requestSummary: string | null;
  editorNotes: string | null;
  publicDescription: string | null;
  initialSources: ReporterSourceSeed[];
}

export interface ReporterSourceSeed {
  sourceType: ReporterSourceTypeValue;
  title: string | null;
  url: string | null;
  contentText: string | null;
  excerpt: string | null;
  note: string | null;
  reliabilityTier: ReporterReliabilityTierValue;
}

export interface ReporterSourcePacketItem {
  id: string;
  sourceType: ReporterSourceTypeValue;
  title: string | null;
  url: string | null;
  publisher: string | null;
  author: string | null;
  publishedAt: string | null;
  excerpt: string | null;
  note: string | null;
  contentText: string | null;
  reliabilityTier: ReporterReliabilityTierValue;
}

export interface ReporterSourcePacket {
  runId: string;
  mode: ReporterModeValue;
  requestType: ReporterRequestTypeValue;
  topic: string;
  title: string | null;
  subjectName: string | null;
  requestedArticleType: string | null;
  requestSummary: string | null;
  editorNotes: string | null;
  sources: ReporterSourcePacketItem[];
}

export interface ReporterDraftGenerationInput {
  packet: ReporterSourcePacket;
  draftType?: ReporterDraftTypeValue;
}

export interface ReporterGeneratedDraft {
  headline: string | null;
  dek: string | null;
  body: string;
  draftType: ReporterDraftTypeValue;
  modelProvider: string | null;
  modelName: string | null;
  generationNotes: string | null;
}

export interface ReporterValidationIssueResult {
  code: string;
  severity: ReporterValidationSeverityValue;
  message: string;
  evidenceSpan?: string | null;
}

export interface ReporterValidationResult {
  issues: ReporterValidationIssueResult[];
  hasCriticalIssues: boolean;
}

export interface ReporterProviderMetadata {
  provider: string;
  model: string;
}

export interface ReporterProviderDraftResult extends ReporterGeneratedDraft {
  metadata: ReporterProviderMetadata;
}

export interface ReporterRunRecord {
  id: string;
  status: ReporterRunStatusValue;
  mode: ReporterModeValue;
  requestType: ReporterRequestTypeValue;
  topic: string;
  title: string | null;
  subjectName: string | null;
  requestSummary: string | null;
  editorNotes: string | null;
}

export interface ReporterSourceRecord {
  id: string;
  sourceType: ReporterSourceTypeValue;
  title: string | null;
  url: string | null;
  publisher: string | null;
  author: string | null;
  publishedAt: Date | null;
  excerpt: string | null;
  note: string | null;
  contentText: string | null;
  reliabilityTier: ReporterReliabilityTierValue;
  sortOrder: number;
}

export interface ReporterDraftRecord {
  id: string;
  headline: string | null;
  dek: string | null;
  body: string;
  draftType: ReporterDraftTypeValue;
  status: ReporterDraftStatusValue;
}
