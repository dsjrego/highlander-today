import {
  REPORTER_DRAFT_TYPE,
  type ReporterDraftGenerationInput,
  type ReporterProviderDraftResult,
} from './types';

export interface ReporterProviderAdapter {
  readonly provider: string;
  readonly model: string;
  generateDraft(input: ReporterDraftGenerationInput): Promise<ReporterProviderDraftResult>;
}

function buildSourceSummary(input: ReporterDraftGenerationInput) {
  const sourceLines = input.packet.sources
    .map((source, index) => {
      const primaryText =
        source.excerpt ||
        source.contentText ||
        source.note ||
        source.url ||
        source.title ||
        'Source provided';
      return `${index + 1}. ${primaryText}`;
    })
    .join('\n');

  return sourceLines || 'No source packet items were provided.';
}

function buildFallbackCoverageRecommendation(input: ReporterDraftGenerationInput) {
  const hasHighConfidenceSource = input.packet.sources.some(
    (source) => source.reliabilityTier === 'PRIMARY' || source.reliabilityTier === 'HIGH'
  );

  if (hasHighConfidenceSource) {
    return '- Coverage recommendation: draft-ready if the current facts and attributions are enough for a tightly scoped local story.';
  }

  if (input.packet.sources.length >= 2) {
    return '- Coverage recommendation: brief-ready only. The packet has some usable signal, but it still needs stronger confirmation before a full draft.';
  }

  return '- Coverage recommendation: needs more sourcing before a reliable article draft.';
}

export function buildFallbackDraft(
  provider: string,
  model: string,
  input: ReporterDraftGenerationInput
): ReporterProviderDraftResult {
  const body =
    input.draftType === REPORTER_DRAFT_TYPE.SOURCE_PACKET_SUMMARY
      ? [
          `Reporter Agent analysis for "${input.packet.topic}"`,
          '',
          'What we know',
          buildSourceSummary(input),
          '',
          'Source strength',
          '- Strongest current source: identify the item with the clearest direct factual basis before drafting from this packet.',
          '- Weakest current source: any unsupported note, single-source claim, or unattributed assertion should stay provisional.',
          '',
          'Missing information',
          '- Exact unanswered questions should be listed here before a draft moves forward.',
          '',
          'Reporting gaps',
          '- State what is weak, missing, single-sourced, or still unverified in this packet.',
          '',
          'Coverage recommendation',
          buildFallbackCoverageRecommendation(input),
          '',
          'Next steps',
          '- Request the missing facts, named sources, or official confirmation tied to this story.',
        ].join('\n')
      : [
          `${input.packet.topic}`,
          '',
          'This draft was generated from the current source packet only.',
          buildSourceSummary(input),
        ].join('\n');

  return {
    headline:
      input.draftType === REPORTER_DRAFT_TYPE.ARTICLE_DRAFT
        ? input.packet.title ?? input.packet.topic
        : `Reporter Agent Analysis: ${input.packet.title ?? input.packet.topic}`,
    dek: null,
    body,
    draftType: input.draftType ?? REPORTER_DRAFT_TYPE.ARTICLE_DRAFT,
    modelProvider: provider,
    modelName: model,
    generationNotes: 'Fallback draft generated without calling an external provider.',
    metadata: {
      provider,
      model,
    },
  };
}
