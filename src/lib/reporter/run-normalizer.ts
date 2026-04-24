import {
  REPORTER_RELIABILITY_TIER,
  REPORTER_SOURCE_TYPE,
  type ReporterRunIntakePayload,
  type ReporterRunNormalizedInput,
  type ReporterSourceSeed,
} from './types';

function cleanString(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function isLikelyUrl(value: string) {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function buildInitialSources(payload: ReporterRunIntakePayload): ReporterSourceSeed[] {
  const sources: ReporterSourceSeed[] = [];

  const whatHappened = cleanString(payload.whatHappened);
  if (whatHappened) {
    sources.push({
      sourceType: REPORTER_SOURCE_TYPE.USER_NOTE,
      title: 'What happened',
      url: null,
      contentText: whatHappened,
      excerpt: null,
      note: null,
      reliabilityTier: REPORTER_RELIABILITY_TIER.UNVERIFIED,
    });
  }

  const notes = cleanString(payload.notes);
  if (notes) {
    sources.push({
      sourceType: REPORTER_SOURCE_TYPE.USER_NOTE,
      title: 'Additional notes',
      url: null,
      contentText: notes,
      excerpt: null,
      note: null,
      reliabilityTier: REPORTER_RELIABILITY_TIER.UNVERIFIED,
    });
  }

  for (const link of payload.supportingLinks || []) {
    const normalizedLink = cleanString(link);
    if (!normalizedLink || !isLikelyUrl(normalizedLink)) {
      continue;
    }

    sources.push({
      sourceType: REPORTER_SOURCE_TYPE.OFFICIAL_URL,
      title: normalizedLink,
      url: normalizedLink,
      contentText: null,
      excerpt: null,
      note: null,
      reliabilityTier: REPORTER_RELIABILITY_TIER.UNVERIFIED,
    });
  }

  return sources;
}

export function normalizeReporterRunInput(
  payload: ReporterRunIntakePayload
): ReporterRunNormalizedInput {
  const topic =
    cleanString(payload.topic) ??
    cleanString(payload.title) ??
    cleanString(payload.whatHappened);

  if (!topic) {
    throw new Error('Reporter run requires a topic or story description');
  }

  const whoIsInvolved = cleanString(payload.whoIsInvolved);
  const whereDidItHappen = cleanString(payload.whereDidItHappen);
  const whenDidItHappen = cleanString(payload.whenDidItHappen);
  const whyItMatters = cleanString(payload.whyItMatters);
  const requestSummaryParts = [
    cleanString(payload.requestSummary),
    whoIsInvolved ? `Who: ${whoIsInvolved}` : null,
    whereDidItHappen ? `Where: ${whereDidItHappen}` : null,
    whenDidItHappen ? `When: ${whenDidItHappen}` : null,
    whyItMatters ? `Why it matters: ${whyItMatters}` : null,
  ].filter(Boolean);

  return {
    mode: payload.mode ?? null,
    requestType: payload.requestType ?? null,
    title: cleanString(payload.title),
    topic,
    subjectName: cleanString(payload.subjectName),
    requestedArticleType: cleanString(payload.requestedArticleType),
    requesterName: cleanString(payload.requesterName),
    requesterEmail: cleanString(payload.requesterEmail),
    requesterPhone: cleanString(payload.requesterPhone),
    requestSummary: requestSummaryParts.length > 0 ? requestSummaryParts.join('\n') : null,
    editorNotes: cleanString(payload.editorNotes),
    publicDescription: cleanString(payload.whatHappened),
    initialSources: buildInitialSources(payload),
  };
}
