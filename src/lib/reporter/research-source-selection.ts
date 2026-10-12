import type { ReporterSourcePacket, ReporterSourcePacketItem } from './types';

export const REPORTER_PUBLIC_SOURCE_TYPES = new Set(['NEWS_ARTICLE', 'OFFICIAL_URL', 'DOCUMENT']);
const COMMON_WORDS = new Set(['about', 'after', 'also', 'before', 'from', 'have', 'into', 'more', 'news', 'other', 'said', 'says', 'that', 'their', 'these', 'they', 'this', 'those', 'through', 'today', 'urges', 'were', 'what', 'when', 'where', 'which', 'with', 'work']);

function words(value: string): Set<string> {
  return new Set((value.toLowerCase().match(/[a-z]{4,}/g) || []).filter((word) => !COMMON_WORDS.has(word)).map((word) => word.replace(/s$/, '')));
}

export function reporterStoryRelevance(packet: ReporterSourcePacket, title: string | null, url: string): number {
  let pathname = '';
  try { pathname = new URL(url).pathname; } catch { return 0; }
  const topic = words(`${packet.title || ''} ${packet.topic}`);
  const candidate = words(`${title || ''} ${pathname}`);
  return [...topic].filter((word) => candidate.has(word)).length;
}

/** Reserve most of the retrieval budget for original evidence, not attached leads. */
export function selectReporterResearchSeeds(packet: ReporterSourcePacket): ReporterSourcePacketItem[] {
  const ranked = packet.sources.filter((source) => source.url && REPORTER_PUBLIC_SOURCE_TYPES.has(source.sourceType))
    .map((source) => ({ source, score: reporterStoryRelevance(packet, source.title, source.url!) }))
    .sort((left, right) => right.score - left.score);
  const best = ranked[0];
  if (!best) return [];
  // Generic assignments still get a lead, but never an arbitrary batch of eight.
  if (!best.score) return [best.source];
  const threshold = Math.min(best.score, Math.max(2, Math.ceil(best.score / 4)));
  return ranked.filter((candidate) => candidate.score >= threshold).slice(0, 3).map(({ source }) => source);
}
