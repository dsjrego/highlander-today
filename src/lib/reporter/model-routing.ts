import type { ReporterSourcePacket } from './types';

export const REPORTER_MODEL_ROUTING_POLICY_VERSION = 'reporter-gpt-6-luna-medium-v1';

// Owner policy: every OpenAI reporter task, including retries, uses this pair.
export const REPORTER_OPENAI_MODEL = 'gpt-6-luna';
export const REPORTER_OPENAI_REASONING_EFFORT = 'medium' as const;

export const REPORTER_MODEL_TASK = {
  SOURCE_PACKET_ANALYSIS: 'SOURCE_PACKET_ANALYSIS',
  ARTICLE_DRAFT: 'ARTICLE_DRAFT',
  INTERVIEW_NEXT_STEP: 'INTERVIEW_NEXT_STEP',
  INTERVIEW_FACT_EXTRACTION: 'INTERVIEW_FACT_EXTRACTION',
  SUGGEST_FOLLOW_UPS: 'SUGGEST_FOLLOW_UPS',
  CLASSIFY_READINESS: 'CLASSIFY_READINESS',
} as const;

export type ReporterModelTask =
  (typeof REPORTER_MODEL_TASK)[keyof typeof REPORTER_MODEL_TASK];

export type ReporterModelRiskLevel = 'routine' | 'elevated' | 'high';
export type ReporterReasoningEffort = 'none' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';

export interface ReporterModelRoute {
  policyVersion: string;
  task: ReporterModelTask;
  provider: 'openai';
  model: string;
  reasoningEffort: ReporterReasoningEffort;
  riskLevel: ReporterModelRiskLevel;
  attempt: number;
  escalated: boolean;
  reason: string;
}

interface ResolveReporterModelRouteInput {
  task: ReporterModelTask;
  packet?: ReporterSourcePacket | null;
  riskLevel?: ReporterModelRiskLevel;
  attempt?: number;
}

interface BaseRoute {
  model: string;
  reasoningEffort: ReporterReasoningEffort;
  modelEnvironmentKey: string;
  reasoningEnvironmentKey: string;
}

const TASK_ROUTES: Record<ReporterModelTask, BaseRoute> = {
  SOURCE_PACKET_ANALYSIS: {
    model: REPORTER_OPENAI_MODEL,
    reasoningEffort: REPORTER_OPENAI_REASONING_EFFORT,
    modelEnvironmentKey: 'REPORTER_MODEL_SOURCE_ANALYSIS',
    reasoningEnvironmentKey: 'REPORTER_MODEL_SOURCE_ANALYSIS_REASONING_EFFORT',
  },
  ARTICLE_DRAFT: {
    model: REPORTER_OPENAI_MODEL,
    reasoningEffort: REPORTER_OPENAI_REASONING_EFFORT,
    modelEnvironmentKey: 'REPORTER_MODEL_ARTICLE_DRAFT',
    reasoningEnvironmentKey: 'REPORTER_MODEL_ARTICLE_DRAFT_REASONING_EFFORT',
  },
  INTERVIEW_NEXT_STEP: {
    model: REPORTER_OPENAI_MODEL,
    reasoningEffort: REPORTER_OPENAI_REASONING_EFFORT,
    modelEnvironmentKey: 'REPORTER_MODEL_INTERVIEW',
    reasoningEnvironmentKey: 'REPORTER_MODEL_INTERVIEW_REASONING_EFFORT',
  },
  INTERVIEW_FACT_EXTRACTION: {
    model: REPORTER_OPENAI_MODEL,
    reasoningEffort: REPORTER_OPENAI_REASONING_EFFORT,
    modelEnvironmentKey: 'REPORTER_MODEL_FACT_EXTRACTION',
    reasoningEnvironmentKey: 'REPORTER_MODEL_FACT_EXTRACTION_REASONING_EFFORT',
  },
  SUGGEST_FOLLOW_UPS: {
    model: REPORTER_OPENAI_MODEL,
    reasoningEffort: REPORTER_OPENAI_REASONING_EFFORT,
    modelEnvironmentKey: 'REPORTER_MODEL_FOLLOW_UPS',
    reasoningEnvironmentKey: 'REPORTER_MODEL_FOLLOW_UPS_REASONING_EFFORT',
  },
  CLASSIFY_READINESS: {
    model: REPORTER_OPENAI_MODEL,
    reasoningEffort: REPORTER_OPENAI_REASONING_EFFORT,
    modelEnvironmentKey: 'REPORTER_MODEL_CLASSIFICATION',
    reasoningEnvironmentKey: 'REPORTER_MODEL_CLASSIFICATION_REASONING_EFFORT',
  },
};


function getEnvironmentValue(key: string) {
  const value = process.env[key]?.trim();
  return value || null;
}

function getModelEnvironmentValue(key: string, fallback: string) {
  const value = getEnvironmentValue(key);
  return value === REPORTER_OPENAI_MODEL ? value : fallback;
}

function getReasoningEnvironmentValue(
  key: string,
  fallback: ReporterReasoningEffort
): ReporterReasoningEffort {
  const value = getEnvironmentValue(key);
  return value === REPORTER_OPENAI_REASONING_EFFORT
    ? (value as ReporterReasoningEffort)
    : fallback;
}

export function inferReporterPacketRisk(
  packet?: ReporterSourcePacket | null
): ReporterModelRiskLevel {
  if (!packet) {
    return 'routine';
  }

  if (
    packet.supportedClaims.some((claim) =>
      ['DISPUTED', 'REJECTED'].includes(claim.verificationStatus)
    )
  ) {
    return 'high';
  }

  const hasWeakSource = packet.sources.some((source) =>
    ['LOW', 'UNVERIFIED'].includes(source.reliabilityTier)
  );
  const hasProvisionalClaim = packet.supportedClaims.some(
    (claim) =>
      ['UNREVIEWED', 'NEEDS_CORROBORATION'].includes(claim.verificationStatus) ||
      ['LOW', 'UNKNOWN'].includes(claim.confidence)
  );

  if (packet.sources.length < 2 || hasWeakSource || hasProvisionalClaim) {
    return 'elevated';
  }

  return 'routine';
}

export function resolveReporterModelRoute(
  input: ResolveReporterModelRouteInput
): ReporterModelRoute {
  const base = TASK_ROUTES[input.task];
  const attempt = Math.max(0, input.attempt ?? 0);
  const riskLevel = input.riskLevel ?? inferReporterPacketRisk(input.packet);
  const retryEscalation = attempt > 0;
  const riskEscalation = riskLevel === 'high';
  const escalated = retryEscalation || riskEscalation;

  let model = getModelEnvironmentValue(base.modelEnvironmentKey, base.model);
  let reasoningEffort = getReasoningEnvironmentValue(
    base.reasoningEnvironmentKey,
    base.reasoningEffort
  );
  let reason = `Default ${input.task.toLowerCase()} route.`;

  if (input.task === REPORTER_MODEL_TASK.SOURCE_PACKET_ANALYSIS && riskLevel === 'elevated') {
    reasoningEffort = getReasoningEnvironmentValue(
      base.reasoningEnvironmentKey,
      'medium'
    );
    reason = 'Evidence is thin or provisional; the fixed GPT-6 Luna medium route is retained.';
  }

  if (escalated) {
    model = getModelEnvironmentValue('REPORTER_MODEL_ESCALATION', REPORTER_OPENAI_MODEL);
    reasoningEffort = getReasoningEnvironmentValue(
      'REPORTER_MODEL_ESCALATION_REASONING_EFFORT',
      REPORTER_OPENAI_REASONING_EFFORT
    );
    reason = retryEscalation
      ? `Retry attempt ${attempt}; the fixed GPT-6 Luna medium route is retained.`
      : input.task === REPORTER_MODEL_TASK.INTERVIEW_NEXT_STEP
        ? 'Sensitive interview context flagged; the fixed GPT-6 Luna medium route is retained.'
        : 'High-risk or disputed evidence flagged; the fixed GPT-6 Luna medium route is retained.';
  }

  return {
    policyVersion: REPORTER_MODEL_ROUTING_POLICY_VERSION,
    task: input.task,
    provider: 'openai',
    model,
    reasoningEffort,
    riskLevel,
    attempt,
    escalated,
    reason,
  };
}
