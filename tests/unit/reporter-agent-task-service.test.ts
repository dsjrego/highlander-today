import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { prismaMock } from '@/__mocks__/prisma';

jest.mock('@/lib/db', () => ({
  db: prismaMock,
}));

const {
  buildReporterAgentTaskScopeKey,
  createReporterAgentTask,
  incrementReporterAgentTaskAttemptCount,
  markReporterAgentTaskCancelled,
  markReporterAgentTaskCompleted,
  markReporterAgentTaskFailed,
  markReporterAgentTaskRunning,
} = require('@/lib/reporter/agent-task-service') as typeof import('@/lib/reporter/agent-task-service');

describe('reporter agent task service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('builds scope keys from explicit scope or reporter run id', () => {
    expect(
      buildReporterAgentTaskScopeKey({
        reporterRunId: 'run-1',
        scopeKey: null,
      })
    ).toBe('run-1');
    expect(
      buildReporterAgentTaskScopeKey({
        reporterRunId: 'run-1',
        scopeKey: 'GLOBAL_TRIAGE',
      })
    ).toBe('GLOBAL_TRIAGE');
  });

  it('prevents duplicate active tasks by task type and scope key', async () => {
    (prismaMock.reporterAgentTask.findFirst as any).mockResolvedValue({ id: 'task-existing' });

    await expect(
      createReporterAgentTask({
        reporterRunId: 'run-1',
        taskType: 'TRIAGE_REPORTER_RUN',
      })
    ).rejects.toThrow('An active task already exists for this task type and scope.');

    expect(prismaMock.reporterAgentTask.findFirst).toHaveBeenCalledWith({
      where: {
        taskType: 'TRIAGE_REPORTER_RUN',
        scopeKey: 'run-1',
        status: { in: ['PENDING', 'RUNNING', 'BLOCKED'] },
      },
      select: { id: true },
    });
  });

  it('creates a scoped task when no active duplicate exists', async () => {
    (prismaMock.reporterAgentTask.findFirst as any).mockResolvedValue(null);
    (prismaMock.reporterAgentTask.create as any).mockResolvedValue({
      id: 'task-1',
      scopeKey: 'GLOBAL_TRIAGE',
      status: 'PENDING',
    });

    await createReporterAgentTask({
      scopeKey: 'GLOBAL_TRIAGE',
      taskType: 'TRIAGE_REPORTER_RUN',
      inputJson: { trigger: 'manual' },
      createdByUserId: 'editor-1',
    });

    expect(prismaMock.reporterAgentTask.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          scopeKey: 'GLOBAL_TRIAGE',
          reporterRunId: null,
          taskType: 'TRIAGE_REPORTER_RUN',
          status: 'PENDING',
          inputJson: { trigger: 'manual' },
          createdByUserId: 'editor-1',
        }),
      })
    );
  });

  it('updates lifecycle fields for running, completed, failed, and cancelled tasks', async () => {
    (prismaMock.reporterAgentTask.update as any).mockResolvedValue({ id: 'task-1' });

    await markReporterAgentTaskRunning('task-1');
    expect(prismaMock.reporterAgentTask.update).toHaveBeenLastCalledWith({
      where: { id: 'task-1' },
      data: expect.objectContaining({
        status: 'RUNNING',
        startedAt: expect.any(Date),
        completedAt: null,
        failedAt: null,
        cancelledAt: null,
      }),
    });

    await markReporterAgentTaskCompleted('task-1', { ok: true });
    expect(prismaMock.reporterAgentTask.update).toHaveBeenLastCalledWith({
      where: { id: 'task-1' },
      data: expect.objectContaining({
        status: 'COMPLETED',
        outputJson: { ok: true },
        errorMessage: null,
        completedAt: expect.any(Date),
        failedAt: null,
        cancelledAt: null,
      }),
    });

    await markReporterAgentTaskFailed('task-1', 'boom', { ok: false });
    expect(prismaMock.reporterAgentTask.update).toHaveBeenLastCalledWith({
      where: { id: 'task-1' },
      data: expect.objectContaining({
        status: 'FAILED',
        errorMessage: 'boom',
        outputJson: { ok: false },
        failedAt: expect.any(Date),
        completedAt: null,
        cancelledAt: null,
      }),
    });

    await markReporterAgentTaskCancelled('task-1', 'stopped');
    expect(prismaMock.reporterAgentTask.update).toHaveBeenLastCalledWith({
      where: { id: 'task-1' },
      data: expect.objectContaining({
        status: 'CANCELLED',
        errorMessage: 'stopped',
        cancelledAt: expect.any(Date),
        completedAt: null,
        failedAt: null,
      }),
    });
  });

  it('increments the task attempt count', async () => {
    (prismaMock.reporterAgentTask.update as any).mockResolvedValue({ id: 'task-1' });

    await incrementReporterAgentTaskAttemptCount('task-1');

    expect(prismaMock.reporterAgentTask.update).toHaveBeenCalledWith({
      where: { id: 'task-1' },
      data: {
        attempts: {
          increment: 1,
        },
      },
    });
  });
});
