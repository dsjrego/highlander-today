import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

const createSuccessfulReporterAgentTraceMock = jest.fn();

jest.mock('@/lib/reporter/agent-trace-service', () => ({
  createSuccessfulReporterAgentTrace: (...args: unknown[]) =>
    createSuccessfulReporterAgentTraceMock(...args),
  createFailedReporterAgentTrace: jest.fn(),
}));

const { decideNextInterviewStep } = require('@/lib/reporter/interview-agent') as typeof import('@/lib/reporter/interview-agent');

const originalFetch = global.fetch;
const originalProvider = process.env.REPORTER_MODEL_PROVIDER;
const originalApiKey = process.env.OPENAI_API_KEY;

function buildRequest(sensitivityNotes: string | null = null) {
  return {
    interviewType: 'GENERAL_SOURCE' as const,
    purpose: 'Understand why the bridge closed.',
    mustLearn: 'Closure timing and public impact.',
    relationshipToStory: 'County spokesperson',
    intervieweeName: 'Taylor Morgan',
    editorBrief: null,
    knownContext: 'The county issued a closure notice.',
    sensitivityNotes,
  };
}

describe('reporter interview model routing', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.REPORTER_MODEL_PROVIDER = 'openai';
    process.env.OPENAI_API_KEY = 'test-key';
    global.fetch = jest.fn(async () => ({
      ok: true,
      json: async () => ({
        output_text: JSON.stringify({
          shouldComplete: false,
          questionKey: 'what_happened',
          questionText: 'What happened when the bridge was closed?',
          rationale: 'Start with a direct account.',
        }),
      }),
    })) as any;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    if (originalProvider === undefined) {
      delete process.env.REPORTER_MODEL_PROVIDER;
    } else {
      process.env.REPORTER_MODEL_PROVIDER = originalProvider;
    }
    if (originalApiKey === undefined) {
      delete process.env.OPENAI_API_KEY;
    } else {
      process.env.OPENAI_API_KEY = originalApiKey;
    }
  });

  it('uses Luna medium for a routine next-question decision and records the route', async () => {
    await decideNextInterviewStep({
      request: buildRequest(),
      language: 'ENGLISH',
      turns: [],
      reporterRunId: 'run-1',
    });

    const request = (global.fetch as jest.Mock).mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(request.body))).toMatchObject({
      model: 'gpt-6-luna',
      reasoning: { effort: 'medium' },
    });
    expect(createSuccessfulReporterAgentTraceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        modelName: 'gpt-6-luna',
        inputSnapshotJson: expect.objectContaining({
          routing: expect.objectContaining({
            policyVersion: 'reporter-gpt-6-luna-medium-v1',
            task: 'INTERVIEW_NEXT_STEP',
            riskLevel: 'routine',
          }),
        }),
      })
    );
  });

  it('flags a sensitive interview while retaining Luna medium', async () => {
    await decideNextInterviewStep({
      request: buildRequest('Potential retaliation against the source.'),
      language: 'ENGLISH',
      turns: [],
      reporterRunId: 'run-2',
    });

    const request = (global.fetch as jest.Mock).mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(request.body))).toMatchObject({
      model: 'gpt-6-luna',
      reasoning: { effort: 'medium' },
    });
  });
});
