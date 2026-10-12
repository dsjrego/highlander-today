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
import {
  REPORTER_MODEL_TASK,
  resolveReporterModelRoute,
  type ReporterModelRoute,
} from './model-routing';

export function createReporterProviderAdapter(
  routing: ReporterModelRoute | null = null
): ReporterProviderAdapter {
  const provider = (process.env.REPORTER_MODEL_PROVIDER || 'openai').toLowerCase();

  if (provider === 'openai') {
    const selectedRoute =
      routing ||
      resolveReporterModelRoute({
        task: REPORTER_MODEL_TASK.ARTICLE_DRAFT,
      });
    return new OpenAIReporterProvider(selectedRoute);
  }

  return new AnthropicReporterProvider();
}

export async function generateReporterDraft(
  packet: ReporterSourcePacket,
  draftType: ReporterDraftTypeValue = REPORTER_DRAFT_TYPE.ARTICLE_DRAFT,
  routing: ReporterModelRoute | null = null
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

  const provider = createReporterProviderAdapter(routing);
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
  let draft: (ReporterGeneratedDraft & { traceMetadata?: ReporterProviderMetadata }) | null = null;
  const traceType =
    draftType === REPORTER_DRAFT_TYPE.SOURCE_PACKET_SUMMARY
      ? 'SOURCE_PACKET_ANALYSIS'
      : 'DRAFT_GENERATION';
  const configuredProvider = (process.env.REPORTER_MODEL_PROVIDER || 'openai').toLowerCase();
  const modelTask =
    draftType === REPORTER_DRAFT_TYPE.SOURCE_PACKET_SUMMARY
      ? REPORTER_MODEL_TASK.SOURCE_PACKET_ANALYSIS
      : REPORTER_MODEL_TASK.ARTICLE_DRAFT;
  const routing =
    configuredProvider === 'openai'
      ? resolveReporterModelRoute({
          task: modelTask,
          packet,
        })
      : null;

  const generateAndTrace = async (selectedRouting: ReporterModelRoute | null, sourcePacket = packet) => {
    const generatedDraft = await generateReporterDraft(sourcePacket, draftType, selectedRouting);
    await createSuccessfulReporterAgentTrace({
      reporterRunId: packet.runId,
      traceType,
      provider: generatedDraft.modelProvider,
      modelName: generatedDraft.modelName,
      promptKey: generatedDraft.traceMetadata?.promptKey || null,
      promptVersion: generatedDraft.traceMetadata?.promptVersion || null,
      promptHash: generatedDraft.traceMetadata?.promptHash || null,
      inputHash: generatedDraft.traceMetadata?.inputHash || null,
      inputSnapshotJson: generatedDraft.traceMetadata?.inputSnapshotJson,
      rawOutputText: generatedDraft.traceMetadata?.rawOutputText || null,
      parsedOutputJson: generatedDraft.traceMetadata?.parsedOutputJson,
      latencyMs: generatedDraft.traceMetadata?.latencyMs ?? null,
      tokenEstimate: null,
    });
    return generatedDraft;
  };

  const traceFailure = async (error: unknown, selectedRouting: ReporterModelRoute | null) => {
    await createFailedReporterAgentTrace({
      reporterRunId: packet.runId,
      traceType,
      provider: configuredProvider,
      modelName: selectedRouting?.model || process.env.REPORTER_MODEL_NAME || null,
      inputSnapshotJson: selectedRouting ? { routing: selectedRouting } : undefined,
      errorMessage:
        error instanceof Error ? error.message : 'Reporter draft generation failed.',
    });
  };

  try {
    draft = await generateAndTrace(routing);
  } catch (initialError) {
    await traceFailure(initialError, routing);
    let finalError: unknown = initialError;

    if (configuredProvider === 'openai') {
      const retryRouting = resolveReporterModelRoute({
        task: modelTask,
        packet,
        attempt: 1,
      });

      try {
        draft = await generateAndTrace(retryRouting);
      } catch (retryError) {
        finalError = retryError;
        await traceFailure(retryError, retryRouting);
      }
    }

    if (!draft) {
      if (draftType === REPORTER_DRAFT_TYPE.SOURCE_PACKET_SUMMARY) {
        const message =
          finalError instanceof Error
            ? finalError.message
            : 'Reporter Agent analysis generation failed.';
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
        throw finalError;
      }
    }
  }

  if (!draft) {
    throw new Error('Reporter draft generation completed without a draft.');
  }

  let validation = validateGeneratedReporterDraft(draft, packet);
  if (draftType === REPORTER_DRAFT_TYPE.ARTICLE_DRAFT && validation.issues.some((issue) => issue.code === 'DRAFT_UNDERDEVELOPED')) {
    await createFailedReporterAgentTrace({ reporterRunId: packet.runId, traceType: 'DRAFT_VALIDATION', provider: draft.modelProvider,
      modelName: draft.modelName, errorMessage: 'Article stopped at the lead despite sufficient supported context; requesting one bounded revision.', validationJson: validation });
    const revisionRouting = configuredProvider === 'openai' ? resolveReporterModelRoute({ task: modelTask, packet, attempt: 1 }) : null;
    try {
      draft = await generateAndTrace(revisionRouting, { ...packet, editorNotes: [packet.editorNotes,
        'REQUIRED REVISION: Write at least two short paragraphs separated by a blank line. Keep the supported lead, then report meaningful supporting facts from the assessed claims in the body. A dek or generation note does not count as a body paragraph. Do not add unsupported material.'
      ].filter(Boolean).join('\n') });
      validation = validateGeneratedReporterDraft(draft, packet);
    } catch (error) {
      await traceFailure(error, revisionRouting);
    }
  }
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
