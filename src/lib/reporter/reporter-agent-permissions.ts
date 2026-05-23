import { createFailedReporterAgentTrace } from './agent-trace-service';

export const REPORTER_AGENT_ACTOR = {
  INTERVIEW_AGENT: 'INTERVIEW_AGENT',
  DRAFT_AGENT: 'DRAFT_AGENT',
  TRIAGE_AGENT: 'TRIAGE_AGENT',
  RESEARCH_AGENT: 'RESEARCH_AGENT',
} as const;

export type ReporterAgentActor =
  (typeof REPORTER_AGENT_ACTOR)[keyof typeof REPORTER_AGENT_ACTOR];

export const REPORTER_AGENT_ACTION = {
  READ_REPORTER_RUN: 'READ_REPORTER_RUN',
  READ_SOURCE_PACKET: 'READ_SOURCE_PACKET',
  CREATE_INTERVIEW_TURN: 'CREATE_INTERVIEW_TURN',
  CREATE_REPORTER_DRAFT: 'CREATE_REPORTER_DRAFT',
  CREATE_VALIDATION_ISSUE: 'CREATE_VALIDATION_ISSUE',
  CREATE_REPORTER_CLAIM: 'CREATE_REPORTER_CLAIM',
  CREATE_TRIAGE_SUMMARY: 'CREATE_TRIAGE_SUMMARY',
  PUBLISH_ARTICLE: 'PUBLISH_ARTICLE',
  CONTACT_EXTERNAL_USER: 'CONTACT_EXTERNAL_USER',
  BROWSE_WEB: 'BROWSE_WEB',
} as const;

export type ReporterAgentAction =
  (typeof REPORTER_AGENT_ACTION)[keyof typeof REPORTER_AGENT_ACTION];

const REPORTER_AGENT_POLICY: Record<ReporterAgentActor, Set<ReporterAgentAction>> = {
  INTERVIEW_AGENT: new Set([
    REPORTER_AGENT_ACTION.READ_REPORTER_RUN,
    REPORTER_AGENT_ACTION.CREATE_INTERVIEW_TURN,
  ]),
  DRAFT_AGENT: new Set([
    REPORTER_AGENT_ACTION.READ_REPORTER_RUN,
    REPORTER_AGENT_ACTION.READ_SOURCE_PACKET,
    REPORTER_AGENT_ACTION.CREATE_REPORTER_DRAFT,
    REPORTER_AGENT_ACTION.CREATE_VALIDATION_ISSUE,
  ]),
  TRIAGE_AGENT: new Set([
    REPORTER_AGENT_ACTION.READ_REPORTER_RUN,
    REPORTER_AGENT_ACTION.CREATE_TRIAGE_SUMMARY,
  ]),
  RESEARCH_AGENT: new Set([
    REPORTER_AGENT_ACTION.READ_REPORTER_RUN,
    REPORTER_AGENT_ACTION.READ_SOURCE_PACKET,
    REPORTER_AGENT_ACTION.CREATE_REPORTER_CLAIM,
  ]),
};

function getPermissionDeniedTraceType(actor: ReporterAgentActor) {
  switch (actor) {
    case REPORTER_AGENT_ACTOR.INTERVIEW_AGENT:
      return 'INTERVIEW_NEXT_STEP';
    case REPORTER_AGENT_ACTOR.DRAFT_AGENT:
      return 'DRAFT_GENERATION';
    case REPORTER_AGENT_ACTOR.TRIAGE_AGENT:
      return 'TRIAGE_SUMMARY';
    case REPORTER_AGENT_ACTOR.RESEARCH_AGENT:
      return 'SOURCE_PACKET_ANALYSIS';
    default:
      return 'SOURCE_PACKET_ANALYSIS';
  }
}

export function canReporterAgentPerformAction(
  actor: ReporterAgentActor,
  action: ReporterAgentAction
) {
  return REPORTER_AGENT_POLICY[actor]?.has(action) ?? false;
}

export async function assertReporterAgentActionAllowed(params: {
  actor: ReporterAgentActor;
  action: ReporterAgentAction;
  reporterRunId?: string | null;
  reporterAgentTaskId?: string | null;
}) {
  if (canReporterAgentPerformAction(params.actor, params.action)) {
    return;
  }

  const message = `${params.actor} is not allowed to perform ${params.action}.`;

  if (params.reporterRunId) {
    await createFailedReporterAgentTrace({
      reporterRunId: params.reporterRunId,
      reporterAgentTaskId: params.reporterAgentTaskId || null,
      traceType: getPermissionDeniedTraceType(params.actor),
      provider: 'policy',
      modelName: null,
      errorMessage: message,
      validationJson: {
        actor: params.actor,
        action: params.action,
        reason: 'permission_denied',
      },
    });
  }

  throw new Error(message);
}
