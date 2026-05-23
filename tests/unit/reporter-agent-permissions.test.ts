import { beforeEach, describe, expect, it, jest } from '@jest/globals';

const createFailedReporterAgentTraceMock = jest.fn();

jest.mock('@/lib/reporter/agent-trace-service', () => ({
  createFailedReporterAgentTrace: (...args: unknown[]) =>
    createFailedReporterAgentTraceMock(...(args as [])),
}));

const {
  REPORTER_AGENT_ACTION,
  REPORTER_AGENT_ACTOR,
  assertReporterAgentActionAllowed,
  canReporterAgentPerformAction,
} = require('@/lib/reporter/reporter-agent-permissions') as typeof import('@/lib/reporter/reporter-agent-permissions');

describe('reporter agent permissions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createFailedReporterAgentTraceMock as any).mockResolvedValue({ id: 'trace-1' });
  });

  it('allows configured actor actions', () => {
    expect(
      canReporterAgentPerformAction(
        REPORTER_AGENT_ACTOR.DRAFT_AGENT,
        REPORTER_AGENT_ACTION.CREATE_REPORTER_DRAFT
      )
    ).toBe(true);
    expect(
      canReporterAgentPerformAction(
        REPORTER_AGENT_ACTOR.TRIAGE_AGENT,
        REPORTER_AGENT_ACTION.CREATE_TRIAGE_SUMMARY
      )
    ).toBe(true);
  });

  it('denies publish, contact, and browse actions by default', () => {
    expect(
      canReporterAgentPerformAction(
        REPORTER_AGENT_ACTOR.DRAFT_AGENT,
        REPORTER_AGENT_ACTION.PUBLISH_ARTICLE
      )
    ).toBe(false);
    expect(
      canReporterAgentPerformAction(
        REPORTER_AGENT_ACTOR.INTERVIEW_AGENT,
        REPORTER_AGENT_ACTION.CONTACT_EXTERNAL_USER
      )
    ).toBe(false);
    expect(
      canReporterAgentPerformAction(
        REPORTER_AGENT_ACTOR.RESEARCH_AGENT,
        REPORTER_AGENT_ACTION.BROWSE_WEB
      )
    ).toBe(false);
  });

  it('creates a failed trace and throws on denied action when run context is present', async () => {
    await expect(
      assertReporterAgentActionAllowed({
        actor: REPORTER_AGENT_ACTOR.TRIAGE_AGENT,
        action: REPORTER_AGENT_ACTION.PUBLISH_ARTICLE,
        reporterRunId: 'run-1',
      })
    ).rejects.toThrow('TRIAGE_AGENT is not allowed to perform PUBLISH_ARTICLE.');

    expect(createFailedReporterAgentTraceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        reporterRunId: 'run-1',
        provider: 'policy',
        validationJson: expect.objectContaining({
          actor: 'TRIAGE_AGENT',
          action: 'PUBLISH_ARTICLE',
          reason: 'permission_denied',
        }),
      })
    );
  });
});
