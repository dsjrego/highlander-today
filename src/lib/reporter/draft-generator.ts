import { AnthropicReporterProvider } from './provider-anthropic';
import { OpenAIReporterProvider } from './provider-openai';
import type { ReporterProviderAdapter } from './provider-adapter';
import type {
  ReporterDraftTypeValue,
  ReporterGeneratedDraft,
  ReporterSourcePacket,
  ReporterValidationResult,
} from './types';
import { REPORTER_DRAFT_TYPE } from './types';
import { validateReporterDraft } from './draft-validator';
import { buildDeterministicSourcePacketAnalysis } from './source-packet-analysis';

export function createReporterProviderAdapter(): ReporterProviderAdapter {
  const provider = (process.env.REPORTER_MODEL_PROVIDER || 'anthropic').toLowerCase();

  if (provider === 'openai') {
    return new OpenAIReporterProvider();
  }

  return new AnthropicReporterProvider();
}

export async function generateReporterDraft(
  packet: ReporterSourcePacket,
  draftType: ReporterDraftTypeValue = REPORTER_DRAFT_TYPE.ARTICLE_DRAFT
): Promise<ReporterGeneratedDraft> {
  const provider = createReporterProviderAdapter();
  const result = await provider.generateDraft({ packet, draftType });

  return {
    headline: result.headline,
    dek: result.dek,
    body: result.body,
    draftType: result.draftType,
    modelProvider: result.modelProvider,
    modelName: result.modelName,
    generationNotes: result.generationNotes,
  };
}

export function validateGeneratedReporterDraft(
  draft: ReporterGeneratedDraft,
  packet: ReporterSourcePacket
): ReporterValidationResult {
  return validateReporterDraft(draft, packet);
}

export async function generateReporterDraftWithValidation(
  packet: ReporterSourcePacket,
  draftType: ReporterDraftTypeValue = REPORTER_DRAFT_TYPE.ARTICLE_DRAFT
) {
  let draft: ReporterGeneratedDraft;

  try {
    draft = await generateReporterDraft(packet, draftType);
  } catch (error) {
    if (draftType === REPORTER_DRAFT_TYPE.SOURCE_PACKET_SUMMARY) {
      const message =
        error instanceof Error ? error.message : 'Reporter Agent analysis generation failed.';
      draft = buildDeterministicSourcePacketAnalysis(packet, {
        generationNotes: `Deterministic source-packet analysis replaced a failed model response. ${message}`,
      });
    } else {
      throw error;
    }
  }

  let validation = validateGeneratedReporterDraft(draft, packet);

  if (draftType === REPORTER_DRAFT_TYPE.SOURCE_PACKET_SUMMARY && validation.hasCriticalIssues) {
    draft = buildDeterministicSourcePacketAnalysis(packet, {
      modelProvider: draft.modelProvider,
      modelName: draft.modelName,
      generationNotes:
        draft.generationNotes ||
        'Deterministic source-packet analysis replaced a weak or invalid model response.',
    });
    validation = validateGeneratedReporterDraft(draft, packet);
  }

  return { draft, validation };
}
