import type {
  ReporterSourcePacketClaimItem,
  ReporterModeValue,
  ReporterRequestTypeValue,
  ReporterReliabilityTierValue,
  ReporterSourcePacket,
  ReporterSourcePacketItem,
  ReporterSourceTypeValue,
} from './types';

interface ReporterRunLike {
  id: string;
  mode: ReporterModeValue;
  requestType: ReporterRequestTypeValue;
  topic: string;
  title: string | null;
  subjectName: string | null;
  requestedArticleType: string | null;
  requestSummary: string | null;
  editorNotes: string | null;
}

interface ReporterSourceLike {
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

interface ReporterClaimLike {
  id: string;
  claimType: string;
  claimText: string;
  sourceExcerpt: string | null;
  attribution: string | null;
  confidence: string;
  verificationStatus: string;
}

function mapSource(source: ReporterSourceLike): ReporterSourcePacketItem {
  return {
    id: source.id,
    sourceType: source.sourceType,
    title: source.title,
    url: source.url,
    publisher: source.publisher,
    author: source.author,
    publishedAt: source.publishedAt?.toISOString() ?? null,
    excerpt: source.excerpt,
    note: source.note,
    contentText: source.contentText,
    reliabilityTier: source.reliabilityTier,
  };
}

function mapClaim(claim: ReporterClaimLike): ReporterSourcePacketClaimItem {
  return {
    id: claim.id,
    claimType: claim.claimType,
    claimText: claim.claimText,
    sourceExcerpt: claim.sourceExcerpt,
    attribution: claim.attribution,
    confidence: claim.confidence,
    verificationStatus: claim.verificationStatus,
  };
}

export function buildReporterSourcePacket(
  run: ReporterRunLike,
  sources: ReporterSourceLike[],
  claims: ReporterClaimLike[] = []
): ReporterSourcePacket {
  const orderedSources = [...sources].sort((a, b) => a.sortOrder - b.sortOrder);
  const prioritizedClaims = [...claims].sort((left, right) => {
    const verificationScore =
      (left.verificationStatus === 'SUPPORTED' ? 3 : left.verificationStatus === 'UNREVIEWED' ? 2 : 1) -
      (right.verificationStatus === 'SUPPORTED' ? 3 : right.verificationStatus === 'UNREVIEWED' ? 2 : 1);
    if (verificationScore !== 0) {
      return verificationScore * -1;
    }

    const confidenceScore =
      (left.confidence === 'HIGH' ? 4 : left.confidence === 'MEDIUM' ? 3 : left.confidence === 'LOW' ? 2 : 1) -
      (right.confidence === 'HIGH' ? 4 : right.confidence === 'MEDIUM' ? 3 : right.confidence === 'LOW' ? 2 : 1);
    return confidenceScore * -1;
  });

  return {
    runId: run.id,
    mode: run.mode,
    requestType: run.requestType,
    topic: run.topic,
    title: run.title,
    subjectName: run.subjectName,
    requestedArticleType: run.requestedArticleType,
    requestSummary: run.requestSummary,
    editorNotes: run.editorNotes,
    supportedClaims: prioritizedClaims.map(mapClaim),
    sources: orderedSources.map(mapSource),
  };
}
