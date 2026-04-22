import { REPORTER_DRAFT_TYPE, type ReporterGeneratedDraft, type ReporterSourcePacket } from './types';

function isUrlOnly(value: string | null | undefined) {
  return Boolean(value && /^https?:\/\//i.test(value.trim()));
}

function summarizeSource(source: ReporterSourcePacket['sources'][number]) {
  const strongestText =
    source.excerpt ||
    source.contentText ||
    source.note ||
    source.title ||
    'Source provided';

  return strongestText.replace(/\s+/g, ' ').trim();
}

function describeSource(source: ReporterSourcePacket['sources'][number]) {
  const baseLabel =
    source.title ||
    source.publisher ||
    (source.sourceType === 'OFFICIAL_URL'
      ? 'Official announcement'
      : source.sourceType.replace(/_/g, ' ').toLowerCase());

  if (source.publisher && source.title && source.publisher !== source.title) {
    return `${source.title} (${source.publisher})`;
  }

  return baseLabel;
}

function getReliabilityScore(tier: string) {
  switch (tier) {
    case 'PRIMARY':
      return 5;
    case 'HIGH':
      return 4;
    case 'MEDIUM':
      return 3;
    case 'LOW':
      return 2;
    default:
      return 1;
  }
}

function isEventLike(packet: ReporterSourcePacket) {
  const text = [
    packet.topic,
    packet.title,
    packet.requestSummary,
    ...packet.sources.flatMap((source) => [source.title, source.excerpt, source.contentText, source.note]),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return /\b(run|5k|event|registration|students|course|saturday|sunday|monday|tuesday|wednesday|thursday|friday)\b/.test(
    text
  );
}

function getStrongestSource(packet: ReporterSourcePacket) {
  return [...packet.sources].sort(
    (left, right) =>
      getReliabilityScore(right.reliabilityTier) - getReliabilityScore(left.reliabilityTier)
  )[0];
}

function getWeakestSource(packet: ReporterSourcePacket) {
  return [...packet.sources].sort(
    (left, right) =>
      getReliabilityScore(left.reliabilityTier) - getReliabilityScore(right.reliabilityTier)
  )[0];
}

function buildCoverageRecommendation(packet: ReporterSourcePacket) {
  const strongestSource = getStrongestSource(packet);
  const sourceCount = packet.sources.length;
  const eventLike = isEventLike(packet);
  const strongestScore = strongestSource ? getReliabilityScore(strongestSource.reliabilityTier) : 0;
  const hasOfficialAnnouncement = packet.sources.some(
    (source) =>
      source.sourceType === 'OFFICIAL_URL' ||
      Boolean(source.publisher && /school|district|borough|township|county|foundation|organization/i.test(source.publisher))
  );

  if (eventLike && sourceCount <= 2 && (strongestScore >= 3 || hasOfficialAnnouncement)) {
    return {
      label: 'brief-ready',
      message:
        'brief-ready. The packet supports a short attributed community brief or event item, but it does not support a fuller reported article without additional reporting.',
    };
  }

  if (sourceCount >= 2 && strongestScore >= 4) {
    return {
      label: 'draft-ready',
      message:
        'draft-ready. The packet contains enough attributed factual material to support a tightly scoped first draft.',
    };
  }

  return {
    label: 'needs more sourcing',
    message:
      'needs more sourcing. The packet is too thin or too weakly attributed to support even a narrow article draft with confidence.',
  };
}

export function buildDeterministicSourcePacketAnalysis(
  packet: ReporterSourcePacket,
  options?: { generationNotes?: string | null; modelProvider?: string | null; modelName?: string | null }
): ReporterGeneratedDraft {
  const strongestSource = getStrongestSource(packet);
  const weakestSource = getWeakestSource(packet);
  const recommendation = buildCoverageRecommendation(packet);
  const sourceSummaries = packet.sources.slice(0, 3).map((source, index) => {
    const summary = summarizeSource(source);
    const sourceLabel = describeSource(source);

    if (!summary || isUrlOnly(summary)) {
      return `${index + 1}. ${sourceLabel}.`;
    }

    return `${index + 1}. ${summary}`;
  });

  const strongestLabel = strongestSource ? describeSource(strongestSource) : 'No strong source identified';
  const weakestLabel = weakestSource ? describeSource(weakestSource) : 'No weak source identified';

  const eventLike = isEventLike(packet);
  const sameSource = strongestSource && weakestSource && strongestSource.id === weakestSource.id;
  const body = [
    `Reporter Agent analysis for "${packet.topic}"`,
    '',
    'What we know',
    ...(sourceSummaries.length > 0 ? sourceSummaries : ['1. No source packet items were provided.']),
    '',
    'Source strength',
    `- Strongest current source: ${strongestLabel}. It is the clearest attributed basis for the current item.`,
    sameSource
      ? `- Weakest current source: this is also the only substantive source in the packet, so every key claim is still single-sourced and should remain provisional beyond a short brief.`
      : `- Weakest current source: ${weakestLabel}. Any unsupported or single-source detail from this packet should remain provisional.`,
    '',
    'Missing information',
    eventLike
      ? '- The packet does not establish whether there is any broader community significance beyond a straightforward event announcement.'
      : '- The packet does not establish enough independently attributed detail to support a fuller reported article.',
    eventLike
      ? '- The packet does not include organizer comment beyond the announcement itself, so tone, turnout expectations, and beneficiary context remain thin.'
      : '- The packet does not include corroborating sourcing, deeper context, or direct comment that would support a stronger story angle.',
    '',
    'Reporting gaps',
    eventLike
      ? '- This appears to rely primarily on an announcement-style source, so the current material is appropriate for a concise brief but not for a fuller narrative article.'
      : '- The current packet is too thin and too weakly sourced to support more than a minimal informational item.',
    '- The packet lacks enough independently reported detail to move beyond the announced facts.',
    '',
    'Coverage recommendation',
    `- ${recommendation.message}`,
    '',
    'Next steps',
    recommendation.label === 'brief-ready'
      ? '- If this runs now, publish it as a short attributed brief or event item rather than a fuller reported story.'
      : '- Do not move this into a fuller article draft until stronger attributed material is added.',
    recommendation.label === 'brief-ready'
      ? '- If no additional material exists, stop at the brief and avoid inventing extra narrative weight.'
      : '- If stronger coverage is desired later, add direct organizer comment, independent confirmation, or additional factual context first.',
  ].join('\n');

  return {
    headline: `Reporter Agent Analysis: ${packet.title ?? packet.topic}`,
    dek: null,
    body,
    draftType: REPORTER_DRAFT_TYPE.SOURCE_PACKET_SUMMARY,
    modelProvider: options?.modelProvider ?? 'system',
    modelName: options?.modelName ?? 'deterministic-analysis',
    generationNotes:
      options?.generationNotes ??
      'Deterministic source-packet analysis generated because the model output was weak or structurally invalid.',
  };
}
