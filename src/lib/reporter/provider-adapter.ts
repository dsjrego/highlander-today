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
          'Missing information',
          '- Additional sourcing may still be needed to confirm details and context.',
          '',
          'Recommended next steps',
          '- Review the strongest source items.',
          '- Identify any missing primary-source confirmation.',
          '- Decide whether the run is ready for a public-facing draft.',
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
