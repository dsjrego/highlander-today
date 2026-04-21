import type {
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

export function buildReporterSourcePacket(
  run: ReporterRunLike,
  sources: ReporterSourceLike[]
): ReporterSourcePacket {
  const orderedSources = [...sources].sort((a, b) => a.sortOrder - b.sortOrder);

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
    sources: orderedSources.map(mapSource),
  };
}
