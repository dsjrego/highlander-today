import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { prismaMock } from '@/__mocks__/prisma';

jest.mock('@/lib/db', () => ({
  db: prismaMock,
}));

const decideNextInterviewStepMock = jest.fn();
jest.mock('@/lib/reporter/interview-agent', () => ({
  decideNextInterviewStep: (...args: unknown[]) =>
    decideNextInterviewStepMock(...(args as [])),
}));

const sessionRoute = require('@/app/api/reporter/interviews/[id]/session/route') as typeof import('@/app/api/reporter/interviews/[id]/session/route');
const answerRoute = require('@/app/api/reporter/interviews/[id]/session/answer/route') as typeof import('@/app/api/reporter/interviews/[id]/session/answer/route');

function buildRequest(url: string, method: 'GET' | 'POST', body?: unknown) {
  const request = new Request(url, {
    method,
    headers: {
      'content-type': 'application/json',
      'x-user-id': 'user-1',
      'x-user-role': 'READER',
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  }) as any;
  request.nextUrl = new URL(url);
  return request;
}

describe('reporter interview session routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    decideNextInterviewStepMock.mockReset();
  });

  it('starts a new interview session for the invited email account', async () => {
    (prismaMock.reporterInterviewRequest.findUnique as any).mockResolvedValue({
      id: 'interview-1',
      status: 'READY',
      interviewType: 'GENERAL_SOURCE',
      purpose: 'Explain what happened.',
      mustLearn: 'Key facts.',
      relationshipToStory: 'Resident',
      intervieweeName: 'Jordan',
      intervieweeUserId: null,
      inviteEmail: 'reader@example.com',
      suggestedLanguage: 'ENGLISH',
      interviewLanguage: null,
      sessions: [],
      reporterRun: { id: 'run-1', topic: 'Road closure', title: null },
    });
    (prismaMock.user.findUnique as any).mockResolvedValue({
      id: 'user-1',
      email: 'reader@example.com',
    });
    (prismaMock.reporterInterviewSession.create as any).mockResolvedValue({
      id: 'session-1',
      status: 'ACTIVE',
      language: 'ENGLISH',
      currentStep: 0,
      turns: [
        {
          id: 'turn-1',
          sortOrder: 0,
          questionKey: 'opening_context',
          questionText: 'To start, please explain your connection to this story in your own words. Explain what happened. Key facts. Resident',
          questionLanguage: 'ENGLISH',
        },
      ],
    });
    (prismaMock.reporterInterviewRequest.update as any).mockResolvedValue({});
    (decideNextInterviewStepMock as any).mockResolvedValue({
      questionKey: 'opening_context',
      questionText:
        'To start, what is your connection to this story and what made this matter to you personally?',
      language: 'SPANISH',
      shouldComplete: false,
      source: 'model',
      questionCount: 6,
      rationale: 'Start with source relationship and context.',
    });

    const response = await sessionRoute.POST(
      buildRequest('http://localhost/api/reporter/interviews/interview-1/session', 'POST', {
        language: 'SPANISH',
      }),
      { params: { id: 'interview-1' } }
    );

    expect(response).toBeDefined();
    if (!response) {
      throw new Error('Expected response');
    }
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      session: expect.objectContaining({
        id: 'session-1',
        status: 'ACTIVE',
      }),
      currentQuestion: expect.objectContaining({
        key: 'opening_context',
      }),
    });
    expect(prismaMock.reporterInterviewSession.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          language: 'SPANISH',
        }),
      })
    );
  });

  it('submits an answer and advances to the next question', async () => {
    (prismaMock.user.findUnique as any).mockResolvedValue({
      id: 'user-1',
      email: 'reader@example.com',
    });
    (prismaMock.reporterInterviewRequest.findUnique as any).mockResolvedValue({
      id: 'interview-1',
      status: 'IN_PROGRESS',
      interviewType: 'GENERAL_SOURCE',
      purpose: 'Explain what happened.',
      mustLearn: 'Key facts.',
      relationshipToStory: 'Resident',
      intervieweeName: 'Jordan',
      intervieweeUserId: null,
      inviteEmail: 'reader@example.com',
      suggestedLanguage: 'ENGLISH',
      interviewLanguage: 'ENGLISH',
      sessions: [
        {
          id: 'session-1',
          status: 'ACTIVE',
          language: 'ENGLISH',
          turns: [
            {
              id: 'turn-1',
              sortOrder: 0,
              questionKey: 'opening_context',
              questionText: 'What is your connection to this story?',
              answerText: null,
              answeredAt: null,
            },
          ],
        },
      ],
    });
    (prismaMock.reporterInterviewTurn.update as any).mockResolvedValue({
      id: 'turn-1',
      sortOrder: 0,
      questionKey: 'opening_context',
      questionText: 'What is your connection to this story?',
      answerText: 'I live on the block.',
    });
    (prismaMock.reporterInterviewTurn.create as any).mockResolvedValue({
      id: 'turn-2',
      sortOrder: 1,
      questionKey: 'timeline',
      questionText: 'Please walk through the timeline in order, including when this started, what happened next, and what is still unresolved.',
      questionLanguage: 'ENGLISH',
    });
    (prismaMock.reporterInterviewSession.update as any).mockResolvedValue({
      id: 'session-1',
      status: 'ACTIVE',
      language: 'ENGLISH',
      turns: [
        {
          id: 'turn-1',
          sortOrder: 0,
          questionText: 'What is your connection to this story?',
          answerText: 'I live on the block.',
        },
        {
          id: 'turn-2',
          sortOrder: 1,
          questionText: 'Please walk through the timeline in order, including when this started, what happened next, and what is still unresolved.',
          answerText: null,
        },
      ],
    });
    (decideNextInterviewStepMock as any).mockResolvedValue({
      questionKey: 'timeline',
      questionText:
        'When did you first realize something was wrong, and what happened in the next few minutes?',
      language: 'ENGLISH',
      shouldComplete: false,
      source: 'model',
      questionCount: 6,
      rationale: 'Need chronology after learning source relationship.',
    });

    const response = await answerRoute.POST(
      buildRequest(
        'http://localhost/api/reporter/interviews/interview-1/session/answer',
        'POST',
        { answerText: 'I live on the block.' }
      ),
      { params: { id: 'interview-1' } }
    );

    expect(response).toBeDefined();
    if (!response) {
      throw new Error('Expected response');
    }
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      answeredCount: 1,
      isComplete: false,
      currentQuestion: expect.objectContaining({
        key: 'timeline',
      }),
    });
  });

  it('completes an interview, stores facts, and creates a reporter source', async () => {
    (prismaMock.user.findUnique as any).mockResolvedValue({
      id: 'user-1',
      email: 'reader@example.com',
    });
    (prismaMock.reporterInterviewRequest.findUnique as any).mockResolvedValue({
      id: 'interview-1',
      status: 'IN_PROGRESS',
      reporterRunId: 'run-1',
      interviewType: 'GENERAL_SOURCE',
      purpose: 'Explain what happened.',
      mustLearn: 'Key facts.',
      relationshipToStory: 'Resident',
      intervieweeName: 'Jordan',
      intervieweeUserId: null,
      inviteEmail: 'reader@example.com',
      suggestedLanguage: 'ENGLISH',
      interviewLanguage: 'ENGLISH',
      sessions: [
        {
          id: 'session-1',
          status: 'ACTIVE',
          language: 'ENGLISH',
          turns: [
            {
              id: 'turn-0',
              sortOrder: 0,
              questionKey: 'opening_context',
              questionText: 'What is your connection to this story?',
              answerText: 'I live on the block.',
              answeredAt: new Date().toISOString(),
            },
            {
              id: 'turn-0b',
              sortOrder: 1,
              questionKey: 'timeline',
              questionText: 'Walk through the timeline.',
              answerText: 'The closure started around 8 a.m.',
              answeredAt: new Date().toISOString(),
            },
            {
              id: 'turn-0c',
              sortOrder: 2,
              questionKey: 'evidence',
              questionText: 'What did you directly see?',
              answerText: 'I saw crews arrive.',
              answeredAt: new Date().toISOString(),
            },
            {
              id: 'turn-0d',
              sortOrder: 3,
              questionKey: 'names_dates_locations',
              questionText: 'What names and locations matter?',
              answerText: 'It happened near Main Street.',
              answeredAt: new Date().toISOString(),
            },
            {
              id: 'turn-1',
              sortOrder: 4,
              questionKey: 'follow_up',
              questionText: 'What important detail have we not covered yet, and who else should we speak with to verify or deepen this reporting?',
              answerText: null,
              answeredAt: null,
            },
          ],
        },
      ],
    });
    (prismaMock.reporterInterviewTurn.update as any).mockResolvedValue({
      id: 'turn-1',
      sortOrder: 0,
      questionKey: 'follow_up',
      questionText: 'What important detail have we not covered yet, and who else should we speak with to verify or deepen this reporting?',
      answerText: 'Please verify the timeline with the borough manager and keep my name anonymous.',
    });
    (prismaMock.reporterInterviewSession.update as any).mockResolvedValue({
      id: 'session-1',
      status: 'COMPLETED',
      language: 'ENGLISH',
      turns: [
        {
          id: 'turn-1',
          sortOrder: 4,
          questionText: 'What important detail have we not covered yet, and who else should we speak with to verify or deepen this reporting?',
          answerText: 'Please verify the timeline with the borough manager and keep my name anonymous.',
        },
      ],
      facts: [
        {
          id: 'fact-1',
          factType: 'FOLLOW_UP_REQUIREMENT',
          summary: 'Please verify the timeline with the borough manager.',
        },
      ],
      safetyFlags: [
        {
          id: 'flag-1',
          flagType: 'ANONYMITY_REQUEST',
          headline: 'Anonymity request mentioned',
          blockerId: 'blocker-1',
        },
      ],
      transcriptText:
        'Q1: What important detail have we not covered yet, and who else should we speak with to verify or deepen this reporting?\nA1: Please verify the timeline with the borough manager and keep my name anonymous.',
      englishSummary: 'Please verify the timeline with the borough manager and keep my name anonymous.',
    });
    (prismaMock.reporterInterviewRequest.update as any).mockResolvedValue({});
    (prismaMock.reporterRun.findUnique as any).mockResolvedValue({
      id: 'run-1',
      status: 'READY_FOR_DRAFT',
      _count: { sources: 2 },
    });
    (prismaMock.reporterBlocker.create as any).mockResolvedValue({
      id: 'blocker-1',
      reporterRunId: 'run-1',
      code: 'INTERVIEW_FLAG_ANONYMITY',
    });
    (prismaMock.reporterSource.create as any).mockResolvedValue({
      id: 'source-3',
      reporterRunId: 'run-1',
      sourceType: 'INTERVIEW_NOTE',
    });
    (prismaMock.reporterRun.update as any).mockResolvedValue({
      id: 'run-1',
      status: 'BLOCKED',
    });
    (decideNextInterviewStepMock as any).mockResolvedValue({
      questionKey: null,
      questionText: null,
      language: 'ENGLISH',
      shouldComplete: true,
      source: 'model',
      questionCount: 5,
      rationale: 'Required topics covered; conclude and route to review.',
    });

    const response = await answerRoute.POST(
      buildRequest(
        'http://localhost/api/reporter/interviews/interview-1/session/answer',
        'POST',
        { answerText: 'Please verify the timeline with the borough manager and keep my name anonymous.' }
      ),
      { params: { id: 'interview-1' } }
    );

    expect(response).toBeDefined();
    if (!response) {
      throw new Error('Expected response');
    }
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      answeredCount: 5,
      isComplete: true,
      currentQuestion: null,
      safetyFlags: [expect.objectContaining({ flagType: 'ANONYMITY_REQUEST' })],
    });
    expect(prismaMock.reporterInterviewSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'COMPLETED',
          facts: expect.objectContaining({
            create: expect.any(Array),
          }),
          safetyFlags: expect.objectContaining({
            create: expect.any(Array),
          }),
        }),
      })
    );
    expect(prismaMock.reporterBlocker.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          reporterRunId: 'run-1',
          code: 'INTERVIEW_FLAG_ANONYMITY',
        }),
      })
    );
    expect(prismaMock.reporterSource.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          reporterRunId: 'run-1',
          sourceType: 'INTERVIEW_NOTE',
          reliabilityTier: 'PRIMARY',
        }),
      })
    );
    expect(prismaMock.reporterRun.update).toHaveBeenCalledWith({
      where: { id: 'run-1' },
      data: { status: 'BLOCKED' },
    });
  });

  it('denies session start while the interview is still draft-only', async () => {
    (prismaMock.reporterInterviewRequest.findUnique as any).mockResolvedValue({
      id: 'interview-1',
      status: 'DRAFT',
      interviewType: 'GENERAL_SOURCE',
      purpose: 'Explain what happened.',
      mustLearn: 'Key facts.',
      relationshipToStory: 'Resident',
      intervieweeName: 'Jordan',
      intervieweeUserId: null,
      inviteEmail: 'reader@example.com',
      suggestedLanguage: 'ENGLISH',
      interviewLanguage: null,
      sessions: [],
      reporterRun: { id: 'run-1', topic: 'Road closure', title: null },
    });
    (prismaMock.user.findUnique as any).mockResolvedValue({
      id: 'user-1',
      email: 'reader@example.com',
    });

    const response = await sessionRoute.POST(
      buildRequest('http://localhost/api/reporter/interviews/interview-1/session', 'POST'),
      { params: { id: 'interview-1' } }
    );

    expect(response).toBeDefined();
    if (!response) {
      throw new Error('Expected response');
    }
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: 'Interview is not ready to open yet.',
    });
  });
});
