import { AnthropicReporterProvider } from './provider-anthropic';
import { OpenAIReporterProvider } from './provider-openai';
import type { ReporterProviderAdapter } from './provider-adapter';
import type {
  ReporterDraftTypeValue,
  ReporterGeneratedDraft,
  ReporterProviderMetadata,
  ReporterSourcePacket,
  ReporterValidationResult,
} from './types';
import { REPORTER_DRAFT_TYPE } from './types';
import { validateReporterDraft } from './draft-validator';
import { buildDeterministicSourcePacketAnalysis } from './source-packet-analysis';
import { createFailedReporterAgentTrace, createSuccessfulReporterAgentTrace } from './agent-trace-service';
import {
  assertReporterAgentActionAllowed,
  REPORTER_AGENT_ACTION,
  REPORTER_AGENT_ACTOR,
} from './reporter-agent-permissions';

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
): Promise<ReporterGeneratedDraft & { traceMetadata?: ReporterProviderMetadata }> {
  await assertReporterAgentActionAllowed({
    actor: REPORTER_AGENT_ACTOR.DRAFT_AGENT,
    action: REPORTER_AGENT_ACTION.READ_SOURCE_PACKET,
    reporterRunId: packet.runId,
  });
  await assertReporterAgentActionAllowed({
    actor: REPORTER_AGENT_ACTOR.DRAFT_AGENT,
    action: REPORTER_AGENT_ACTION.CREATE_REPORTER_DRAFT,
    reporterRunId: packet.runId,
  });

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
    traceMetadata: result.metadata,
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
  let draft: ReporterGeneratedDraft & { traceMetadata?: ReporterProviderMetadata };
  const traceType =
    draftType === REPORTER_DRAFT_TYPE.SOURCE_PACKET_SUMMARY
      ? 'SOURCE_PACKET_ANALYSIS'
      : 'DRAFT_GENERATION';

  try {
    draft = await generateReporterDraft(packet, draftType);
    await createSuccessfulReporterAgentTrace({
      reporterRunId: packet.runId,
      traceType,
      provider: draft.modelProvider,
      modelName: draft.modelName,
      promptKey: draft.traceMetadata?.promptKey || null,
      promptVersion: draft.traceMetadata?.promptVersion || null,
      promptHash: draft.traceMetadata?.promptHash || null,
      inputHash: draft.traceMetadata?.inputHash || null,
      inputSnapshotJson: draft.traceMetadata?.inputSnapshotJson,
      rawOutputText: draft.traceMetadata?.rawOutputText || null,
      parsedOutputJson: draft.traceMetadata?.parsedOutputJson,
      latencyMs: draft.traceMetadata?.latencyMs ?? null,
      tokenEstimate: null,
    });
  } catch (error) {
    await createFailedReporterAgentTrace({
      reporterRunId: packet.runId,
      traceType,
      provider: (process.env.REPORTER_MODEL_PROVIDER || 'anthropic').toLowerCase(),
      modelName: process.env.REPORTER_MODEL_NAME || null,
      errorMessage:
        error instanceof Error ? error.message : 'Reporter draft generation failed.',
    });
    if (draftType === REPORTER_DRAFT_TYPE.SOURCE_PACKET_SUMMARY) {
      const message =
        error instanceof Error ? error.message : 'Reporter Agent analysis generation failed.';
      draft = buildDeterministicSourcePacketAnalysis(packet, {
        generationNotes: `Deterministic source-packet analysis replaced a failed model response. ${message}`,
      });
      await createSuccessfulReporterAgentTrace({
        reporterRunId: packet.runId,
        traceType,
        provider: 'fallback',
        modelName: null,
        parsedOutputJson: draft,
        validationJson: { reason: 'provider_failure_fallback' },
      });
    } else {
      throw error;
    }
  }

  let validation = validateGeneratedReporterDraft(draft, packet);
  await assertReporterAgentActionAllowed({
    actor: REPORTER_AGENT_ACTOR.DRAFT_AGENT,
    action: REPORTER_AGENT_ACTION.CREATE_VALIDATION_ISSUE,
    reporterRunId: packet.runId,
  });
  await createSuccessfulReporterAgentTrace({
    reporterRunId: packet.runId,
    traceType: 'DRAFT_VALIDATION',
    provider: draft.modelProvider,
    modelName: draft.modelName,
    validationJson: validation,
    parsedOutputJson: {
      draftType: draft.draftType,
      headline: draft.headline,
    },
  });

  if (draftType === REPORTER_DRAFT_TYPE.SOURCE_PACKET_SUMMARY && validation.hasCriticalIssues) {
    await createFailedReporterAgentTrace({
      reporterRunId: packet.runId,
      traceType: 'DRAFT_VALIDATION',
      provider: draft.modelProvider,
      modelName: draft.modelName,
      errorMessage: 'Reporter Agent analysis failed validation and was replaced with deterministic fallback.',
      validationJson: validation,
    });
    draft = buildDeterministicSourcePacketAnalysis(packet, {
      modelProvider: draft.modelProvider,
      modelName: draft.modelName,
      generationNotes:
        draft.generationNotes ||
        'Deterministic source-packet analysis replaced a weak or invalid model response.',
    });
    validation = validateGeneratedReporterDraft(draft, packet);
    await createSuccessfulReporterAgentTrace({
      reporterRunId: packet.runId,
      traceType,
      provider: 'fallback',
      modelName: null,
      parsedOutputJson: draft,
      validationJson: { reason: 'critical_validation_fallback' },
    });
    await createSuccessfulReporterAgentTrace({
      reporterRunId: packet.runId,
      traceType: 'DRAFT_VALIDATION',
      provider: 'fallback',
      modelName: null,
      validationJson: validation,
    });
  }

  return { draft, validation };
}
