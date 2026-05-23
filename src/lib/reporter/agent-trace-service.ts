import type { Prisma, ReporterAgentTraceType } from '@prisma/client';
import { db } from '@/lib/db';

interface CreateReporterAgentTraceInput {
  reporterRunId?: string | null;
  reporterAgentTaskId?: string | null;
  traceType: ReporterAgentTraceType;
  provider?: string | null;
  modelName?: string | null;
  promptKey?: string | null;
  promptVersion?: string | null;
  promptHash?: string | null;
  inputHash?: string | null;
  inputSnapshotJson?: unknown;
  rawOutputText?: string | null;
  parsedOutputJson?: unknown;
  validationJson?: unknown;
  latencyMs?: number | null;
  tokenEstimate?: number | null;
  wasSuccessful?: boolean | null;
  errorMessage?: string | null;
}

export function toReporterTraceJson(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function createReporterAgentTrace(input: CreateReporterAgentTraceInput) {
  return db.reporterAgentTrace.create({
    data: {
      reporterRunId: input.reporterRunId || null,
      reporterAgentTaskId: input.reporterAgentTaskId || null,
      traceType: input.traceType,
      provider: input.provider || null,
      modelName: input.modelName || null,
      promptKey: input.promptKey || null,
      promptVersion: input.promptVersion || null,
      promptHash: input.promptHash || null,
      inputHash: input.inputHash || null,
      inputSnapshotJson: toReporterTraceJson(input.inputSnapshotJson),
      rawOutputText: input.rawOutputText || null,
      parsedOutputJson: toReporterTraceJson(input.parsedOutputJson),
      validationJson: toReporterTraceJson(input.validationJson),
      latencyMs: input.latencyMs ?? null,
      tokenEstimate: input.tokenEstimate ?? null,
      wasSuccessful: input.wasSuccessful ?? null,
      errorMessage: input.errorMessage || null,
    },
  });
}

export async function createSuccessfulReporterAgentTrace(
  input: Omit<CreateReporterAgentTraceInput, 'wasSuccessful' | 'errorMessage'>
) {
  return createReporterAgentTrace({
    ...input,
    wasSuccessful: true,
    errorMessage: null,
  });
}

export async function createFailedReporterAgentTrace(
  input: Omit<CreateReporterAgentTraceInput, 'wasSuccessful'> & { errorMessage: string }
) {
  return createReporterAgentTrace({
    ...input,
    wasSuccessful: false,
  });
}

export async function fetchReporterAgentTracesForRun(reporterRunId: string) {
  return db.reporterAgentTrace.findMany({
    where: { reporterRunId },
    orderBy: [{ createdAt: 'desc' }],
  });
}
