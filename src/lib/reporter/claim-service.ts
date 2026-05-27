import type {
  Prisma,
  ReporterInterviewFact,
  ReporterClaimConfidence,
  ReporterClaimCreatedBy,
  ReporterClaimType,
  ReporterClaimVerificationStatus,
} from '@prisma/client';
import { db } from '@/lib/db';

export async function createReporterClaim(params: {
  reporterRunId: string;
  reporterSourceId?: string | null;
  claimType: ReporterClaimType;
  claimText: string;
  sourceExcerpt?: string | null;
  attribution?: string | null;
  confidence?: ReporterClaimConfidence;
  verificationStatus?: ReporterClaimVerificationStatus;
  createdBy: ReporterClaimCreatedBy;
  createdByUserId?: string | null;
}) {
  const isAgentCreated = params.createdBy === 'AGENT';
  const verificationStatus =
    params.verificationStatus ??
    (isAgentCreated ? 'UNREVIEWED' : 'UNREVIEWED');

  return db.reporterClaim.create({
    data: {
      reporterRunId: params.reporterRunId,
      reporterSourceId: params.reporterSourceId || null,
      claimType: params.claimType,
      claimText: params.claimText,
      sourceExcerpt: params.sourceExcerpt || null,
      attribution: params.attribution || null,
      confidence: params.confidence || 'UNKNOWN',
      verificationStatus,
      createdBy: params.createdBy,
      createdByUserId: params.createdByUserId || null,
    },
    include: {
      reporterSource: {
        select: { id: true, sourceType: true, title: true, url: true, publisher: true },
      },
      createdByUser: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });
}

export async function createReporterClaimsFromSeeds(
  reporterRunId: string,
  claims: Array<{
    reporterSourceId?: string | null;
    claimType: ReporterClaimType;
    claimText: string;
    sourceExcerpt?: string | null;
    attribution?: string | null;
    confidence?: ReporterClaimConfidence;
    verificationStatus?: ReporterClaimVerificationStatus;
    createdBy: ReporterClaimCreatedBy;
    createdByUserId?: string | null;
  }>
) {
  if (claims.length === 0) {
    return [];
  }

  const existingClaims = await db.reporterClaim.findMany({
    where: { reporterRunId },
    select: {
      reporterSourceId: true,
      claimText: true,
      createdBy: true,
    },
  });

  const filteredClaims = claims.filter((claim) => {
    return !existingClaims.some(
      (existing) =>
        existing.createdBy === claim.createdBy &&
        (existing.reporterSourceId || null) === (claim.reporterSourceId || null) &&
        existing.claimText.trim() === claim.claimText.trim()
    );
  });

  if (filteredClaims.length === 0) {
    return [];
  }

  const payload: Prisma.ReporterClaimCreateManyInput[] = filteredClaims.map((claim) => ({
    reporterRunId,
    reporterSourceId: claim.reporterSourceId || null,
    claimType: claim.claimType,
    claimText: claim.claimText,
    sourceExcerpt: claim.sourceExcerpt || null,
    attribution: claim.attribution || null,
    confidence: claim.confidence || 'UNKNOWN',
    verificationStatus:
      claim.verificationStatus ||
      (claim.createdBy === 'AGENT' ? 'UNREVIEWED' : 'UNREVIEWED'),
    createdBy: claim.createdBy,
    createdByUserId: claim.createdByUserId || null,
  }));

  await db.reporterClaim.createMany({
    data: payload,
  });

  return db.reporterClaim.findMany({
    where: { reporterRunId },
    orderBy: [{ createdAt: 'desc' }],
    take: filteredClaims.length,
    include: {
      reporterSource: {
        select: { id: true, sourceType: true, title: true, url: true, publisher: true },
      },
      createdByUser: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });
}

export async function updateReporterClaimVerificationStatus(
  claimId: string,
  verificationStatus: ReporterClaimVerificationStatus
) {
  return db.reporterClaim.update({
    where: { id: claimId },
    data: { verificationStatus },
    include: {
      reporterSource: {
        select: { id: true, sourceType: true, title: true, url: true, publisher: true },
      },
      createdByUser: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });
}

export async function listReporterClaimsForRun(reporterRunId: string) {
  return db.reporterClaim.findMany({
    where: { reporterRunId },
    orderBy: [{ createdAt: 'desc' }],
    include: {
      reporterSource: {
        select: { id: true, sourceType: true, title: true, url: true, publisher: true },
      },
      createdByUser: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });
}

export async function listUnsupportedOrLowConfidenceReporterClaims(reporterRunId: string) {
  return db.reporterClaim.findMany({
    where: {
      reporterRunId,
      OR: [
        { verificationStatus: { in: ['UNREVIEWED', 'NEEDS_CORROBORATION', 'DISPUTED', 'REJECTED'] } },
        { confidence: { in: ['LOW', 'UNKNOWN'] } },
      ],
    },
    orderBy: [{ createdAt: 'desc' }],
    include: {
      reporterSource: {
        select: { id: true, sourceType: true, title: true, url: true, publisher: true },
      },
      createdByUser: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });
}

function mapInterviewFactTypeToClaimType(factType: ReporterInterviewFact['factType']): ReporterClaimType {
  switch (factType) {
    case 'DIRECT_OBSERVATION':
      return 'DIRECT_OBSERVATION';
    case 'QUOTED_STATEMENT':
      return 'QUOTE';
    case 'CHRONOLOGY_ITEM':
      return 'DATE_TIME_FACT';
    case 'NAMED_ENTITY':
      return 'LOCATION_FACT';
    case 'FOLLOW_UP_REQUIREMENT':
      return 'FOLLOW_UP_REQUIREMENT';
    case 'DISPUTED_CLAIM':
      return 'UNVERIFIED_ASSERTION';
    case 'ATTRIBUTED_CLAIM':
    default:
      return 'ATTRIBUTED_CLAIM';
  }
}

function mapInterviewFactConfidence(factType: ReporterInterviewFact['factType']): ReporterClaimConfidence {
  switch (factType) {
    case 'DIRECT_OBSERVATION':
    case 'QUOTED_STATEMENT':
    case 'CHRONOLOGY_ITEM':
      return 'MEDIUM';
    case 'DISPUTED_CLAIM':
    case 'FOLLOW_UP_REQUIREMENT':
      return 'LOW';
    default:
      return 'UNKNOWN';
  }
}

export async function createReporterClaimsFromInterviewFacts(params: {
  reporterRunId: string;
  facts: Array<Pick<ReporterInterviewFact, 'factType' | 'summary' | 'detail' | 'sourceLabel'>>;
  createdByUserId?: string | null;
}) {
  const seeds = params.facts
    .filter((fact) => fact.summary.trim())
    .map((fact) => ({
      claimType: mapInterviewFactTypeToClaimType(fact.factType),
      claimText: fact.summary.trim(),
      sourceExcerpt: fact.detail || null,
      attribution: fact.sourceLabel || null,
      confidence: mapInterviewFactConfidence(fact.factType),
      verificationStatus: 'UNREVIEWED' as ReporterClaimVerificationStatus,
      createdBy: 'AGENT' as ReporterClaimCreatedBy,
      createdByUserId: params.createdByUserId || null,
    }));

  return createReporterClaimsFromSeeds(params.reporterRunId, seeds);
}

function inferClaimTypeFromSource(sourceType: string): ReporterClaimType {
  if (sourceType === 'OFFICIAL_URL') {
    return 'OFFICIAL_STATEMENT';
  }
  return 'BACKGROUND_CONTEXT';
}

function inferVerificationStatusFromReliability(
  reliabilityTier: string
): ReporterClaimVerificationStatus {
  return reliabilityTier === 'PRIMARY' || reliabilityTier === 'HIGH'
    ? 'SUPPORTED'
    : 'NEEDS_CORROBORATION';
}

function inferClaimConfidenceFromReliability(reliabilityTier: string): ReporterClaimConfidence {
  switch (reliabilityTier) {
    case 'PRIMARY':
    case 'HIGH':
      return 'HIGH';
    case 'MEDIUM':
      return 'MEDIUM';
    case 'LOW':
      return 'LOW';
    default:
      return 'UNKNOWN';
  }
}

function cleanClaimText(value: string | null | undefined) {
  const trimmed = value?.replace(/\s+/g, ' ').trim();
  return trimmed || null;
}

function splitClaimSentences(value: string | null | undefined) {
  const text = cleanClaimText(value);
  if (!text) {
    return [];
  }

  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 24)
    .slice(0, 2);
}

function buildPublishedAtClaimText(
  publishedAt: Date | null | undefined,
  title: string | null,
  publisher: string | null
) {
  if (!publishedAt) {
    return null;
  }

  const label = title || publisher || 'This source';
  const formattedDate = publishedAt.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  return `${label} was published on ${formattedDate}.`;
}

function buildFollowUpClaimText(sourceType: string, title: string | null, publisher: string | null) {
  const label = title || publisher || sourceType.replace(/_/g, ' ').toLowerCase();
  return `Corroborate key details from ${label} before treating them as established fact.`;
}

export async function createReporterClaimsFromSourcePacketAnalysis(params: {
  reporterRunId: string;
  sources: Array<{
    id: string;
    sourceType: string;
    title: string | null;
    excerpt: string | null;
    contentText: string | null;
    note: string | null;
    publisher: string | null;
    publishedAt?: Date | null;
    reliabilityTier: string;
  }>;
  createdByUserId?: string | null;
}) {
  const seeds = params.sources.flatMap((source) => {
    const verificationStatus = inferVerificationStatusFromReliability(source.reliabilityTier);
    const confidence = inferClaimConfidenceFromReliability(source.reliabilityTier);
    const attribution = source.publisher || source.title || source.sourceType;
    const sourceExcerpt = source.excerpt || source.contentText || source.note || null;
    const seedsForSource: Array<{
      reporterSourceId: string;
      claimType: ReporterClaimType;
      claimText: string;
      sourceExcerpt: string | null;
      attribution: string | null;
      confidence: ReporterClaimConfidence;
      verificationStatus: ReporterClaimVerificationStatus;
      createdBy: ReporterClaimCreatedBy;
      createdByUserId?: string | null;
    }> = [];

    const normalizedTitle = cleanClaimText(source.title);
    if (normalizedTitle) {
      seedsForSource.push({
        reporterSourceId: source.id,
        claimType: inferClaimTypeFromSource(source.sourceType),
        claimText: normalizedTitle.slice(0, 280),
        sourceExcerpt,
        attribution,
        confidence,
        verificationStatus,
        createdBy: 'AGENT',
        createdByUserId: params.createdByUserId || null,
      });
    }

    for (const sentence of splitClaimSentences(source.excerpt || source.contentText || source.note)) {
      seedsForSource.push({
        reporterSourceId: source.id,
        claimType: inferClaimTypeFromSource(source.sourceType),
        claimText: sentence.slice(0, 280),
        sourceExcerpt,
        attribution,
        confidence,
        verificationStatus,
        createdBy: 'AGENT',
        createdByUserId: params.createdByUserId || null,
      });
    }

    const publishedAtClaimText = buildPublishedAtClaimText(
      source.publishedAt,
      normalizedTitle,
      source.publisher
    );
    if (publishedAtClaimText) {
      seedsForSource.push({
        reporterSourceId: source.id,
        claimType: 'DATE_TIME_FACT',
        claimText: publishedAtClaimText,
        sourceExcerpt: null,
        attribution,
        confidence: confidence === 'UNKNOWN' ? 'MEDIUM' : confidence,
        verificationStatus,
        createdBy: 'AGENT',
        createdByUserId: params.createdByUserId || null,
      });
    }

    if (source.reliabilityTier === 'LOW' || source.reliabilityTier === 'UNVERIFIED') {
      seedsForSource.push({
        reporterSourceId: source.id,
        claimType: 'FOLLOW_UP_REQUIREMENT',
        claimText: buildFollowUpClaimText(source.sourceType, normalizedTitle, source.publisher),
        sourceExcerpt,
        attribution,
        confidence: 'LOW',
        verificationStatus: 'UNREVIEWED',
        createdBy: 'AGENT',
        createdByUserId: params.createdByUserId || null,
      });
    }

    const deduped = new Map<string, (typeof seedsForSource)[number]>();
    for (const seed of seedsForSource) {
      const key = `${seed.claimType}:${seed.claimText.trim().toLowerCase()}`;
      if (!deduped.has(key)) {
        deduped.set(key, seed);
      }
    }

    return Array.from(deduped.values());
  });

  return createReporterClaimsFromSeeds(params.reporterRunId, seeds);
}
