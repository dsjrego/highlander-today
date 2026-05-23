import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { prismaMock } from '@/__mocks__/prisma';

jest.mock('@/lib/db', () => ({
  db: prismaMock,
}));

const createReporterAgentTaskMock = jest.fn();
const markReporterAgentTaskRunningMock = jest.fn();
const markReporterAgentTaskCompletedMock = jest.fn();
const markReporterAgentTaskFailedMock = jest.fn();

jest.mock('@/lib/reporter/agent-task-service', () => ({
  createReporterAgentTask: (...args: unknown[]) => createReporterAgentTaskMock(...(args as [])),
  markReporterAgentTaskRunning: (...args: unknown[]) =>
    markReporterAgentTaskRunningMock(...(args as [])),
  markReporterAgentTaskCompleted: (...args: unknown[]) =>
    markReporterAgentTaskCompletedMock(...(args as [])),
  markReporterAgentTaskFailed: (...args: unknown[]) =>
    markReporterAgentTaskFailedMock(...(args as [])),
}));

const createSuccessfulReporterAgentTraceMock = jest.fn();
const createFailedReporterAgentTraceMock = jest.fn();

jest.mock('@/lib/reporter/agent-trace-service', () => ({
  createSuccessfulReporterAgentTrace: (...args: unknown[]) =>
    createSuccessfulReporterAgentTraceMock(...(args as [])),
  createFailedReporterAgentTrace: (...args: unknown[]) =>
    createFailedReporterAgentTraceMock(...(args as [])),
}));

const { runReporterTriageForRun } = require('@/lib/reporter/reporter-triage-service') as typeof import('@/lib/reporter/reporter-triage-service');

describe('reporter triage service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (createReporterAgentTaskMock as any).mockResolvedValue({
      id: 'task-1',
      reporterRunId: 'run-1',
      taskType: 'TRIAGE_REPORTER_RUN',
      status: 'PENDING',
    });
    (markReporterAgentTaskRunningMock as any).mockResolvedValue({
      id: 'task-1',
      status: 'RUNNING',
    });
    (markReporterAgentTaskCompletedMock as any).mockResolvedValue({
      id: 'task-1',
      status: 'COMPLETED',
    });
    (createSuccessfulReporterAgentTraceMock as any).mockResolvedValue({
      id: 'trace-1',
      traceType: 'TRIAGE_SUMMARY',
    });
  });

  it('creates a completed triage task and deterministic summary for a ready run', async () => {
    (prismaMock.reporterRun.findUnique as any).mockResolvedValue({
      id: 'run-1',
      status: 'READY_FOR_DRAFT',
      linkedArticleId: null,
      updatedAt: new Date(),
      sources: [{ id: 'source-1', reliabilityTier: 'HIGH' }],
      blockers: [],
      validationIssues: [],
      interviewRequests: [],
    });

    const result = await runReporterTriageForRun({
      reporterRunId: 'run-1',
      createdByUserId: 'editor-1',
    });

    expect(createReporterAgentTaskMock).toHaveBeenCalledWith(
      expect.objectContaining({
        reporterRunId: 'run-1',
        taskType: 'TRIAGE_REPORTER_RUN',
      })
    );
    expect(markReporterAgentTaskCompletedMock).toHaveBeenCalledWith(
      'task-1',
      expect.objectContaining({
        classifications: expect.arrayContaining(['ready for draft attempt']),
      })
    );
    expect(createSuccessfulReporterAgentTraceMock).toHaveBeenCalledWith(
      expect.objectContaining({
        reporterRunId: 'run-1',
        reporterAgentTaskId: 'task-1',
        traceType: 'TRIAGE_SUMMARY',
        provider: 'deterministic',
      })
    );
    expect(result.triageSummary.classifications).toContain('ready for draft attempt');
  });
});
