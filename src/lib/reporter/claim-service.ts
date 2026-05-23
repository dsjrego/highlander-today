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
    reliabilityTier: string;
  }>;
  createdByUserId?: string | null;
}) {
  const seeds = params.sources
    .map((source) => {
      const claimText =
        source.excerpt?.trim() ||
        source.note?.trim() ||
        source.contentText?.trim() ||
        source.title?.trim() ||
        '';

      if (!claimText) {
        return null;
      }

      return {
        reporterSourceId: source.id,
        claimType: inferClaimTypeFromSource(source.sourceType),
        claimText: claimText.slice(0, 280),
        sourceExcerpt: source.excerpt || source.contentText || source.note || null,
        attribution: source.publisher || source.title || source.sourceType,
        confidence: inferClaimConfidenceFromReliability(source.reliabilityTier),
        verificationStatus:
          source.reliabilityTier === 'PRIMARY' || source.reliabilityTier === 'HIGH'
            ? ('SUPPORTED' as ReporterClaimVerificationStatus)
            : ('NEEDS_CORROBORATION' as ReporterClaimVerificationStatus),
        createdBy: 'AGENT' as ReporterClaimCreatedBy,
        createdByUserId: params.createdByUserId || null,
      };
    })
    .filter((seed): seed is NonNullable<typeof seed> => Boolean(seed));

  return createReporterClaimsFromSeeds(params.reporterRunId, seeds);
}
