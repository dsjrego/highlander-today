import type { ReporterAgentTask, ReporterAgentTaskStatus, ReporterAgentTaskType } from '@prisma/client';
import { db } from '@/lib/db';
import { toReporterTraceJson } from './agent-trace-service';

const ACTIVE_TASK_STATUSES: ReporterAgentTaskStatus[] = ['PENDING', 'RUNNING', 'BLOCKED'];

export function isReporterAgentTaskActiveStatus(status: ReporterAgentTaskStatus) {
  return ACTIVE_TASK_STATUSES.includes(status);
}

export function buildReporterAgentTaskScopeKey(params: {
  reporterRunId?: string | null;
  scopeKey?: string | null;
}) {
  const explicitScope = params.scopeKey?.trim();
  if (explicitScope) {
    return explicitScope;
  }

  return params.reporterRunId || null;
}

export async function createReporterAgentTask(params: {
  reporterRunId?: string | null;
  scopeKey?: string | null;
  taskType: ReporterAgentTaskType;
  status?: ReporterAgentTaskStatus;
  priority?: number;
  inputJson?: unknown;
  outputJson?: unknown;
  errorMessage?: string | null;
  attempts?: number;
  maxAttempts?: number;
  scheduledFor?: Date | null;
  startedAt?: Date | null;
  completedAt?: Date | null;
  failedAt?: Date | null;
  cancelledAt?: Date | null;
  createdByUserId?: string | null;
  allowDuplicateActiveTask?: boolean;
}) {
  const scopeKey = buildReporterAgentTaskScopeKey(params);

  if (!scopeKey) {
    throw new Error('Reporter agent tasks require a scopeKey or reporterRunId.');
  }

  if (!params.allowDuplicateActiveTask) {
    const existingTask = await db.reporterAgentTask.findFirst({
      where: {
        taskType: params.taskType,
        scopeKey,
        status: { in: ACTIVE_TASK_STATUSES },
      },
      select: { id: true },
    });

    if (existingTask) {
      throw new Error('An active task already exists for this task type and scope.');
    }
  }

  return db.reporterAgentTask.create({
    data: {
      reporterRunId: params.reporterRunId || null,
      scopeKey,
      taskType: params.taskType,
      status: params.status || 'PENDING',
      priority: params.priority ?? 50,
      inputJson: toReporterTraceJson(params.inputJson),
      outputJson: toReporterTraceJson(params.outputJson),
      errorMessage: params.errorMessage || null,
      attempts: params.attempts ?? 0,
      maxAttempts: params.maxAttempts ?? 3,
      scheduledFor: params.scheduledFor || null,
      startedAt: params.startedAt || null,
      completedAt: params.completedAt || null,
      failedAt: params.failedAt || null,
      cancelledAt: params.cancelledAt || null,
      createdByUserId: params.createdByUserId || null,
    },
    include: {
      createdBy: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });
}

export async function markReporterAgentTaskRunning(taskId: string) {
  return db.reporterAgentTask.update({
    where: { id: taskId },
    data: {
      status: 'RUNNING',
      startedAt: new Date(),
      completedAt: null,
      failedAt: null,
      cancelledAt: null,
    },
  });
}

export async function markReporterAgentTaskCompleted(
  taskId: string,
  outputJson?: unknown
) {
  return db.reporterAgentTask.update({
    where: { id: taskId },
    data: {
      status: 'COMPLETED',
      outputJson: toReporterTraceJson(outputJson),
      errorMessage: null,
      completedAt: new Date(),
      failedAt: null,
      cancelledAt: null,
    },
  });
}

export async function markReporterAgentTaskFailed(
  taskId: string,
  errorMessage: string,
  outputJson?: unknown
) {
  return db.reporterAgentTask.update({
    where: { id: taskId },
    data: {
      status: 'FAILED',
      errorMessage,
      outputJson: toReporterTraceJson(outputJson),
      failedAt: new Date(),
      completedAt: null,
      cancelledAt: null,
    },
  });
}

export async function markReporterAgentTaskCancelled(taskId: string, errorMessage?: string | null) {
  return db.reporterAgentTask.update({
    where: { id: taskId },
    data: {
      status: 'CANCELLED',
      errorMessage: errorMessage || null,
      cancelledAt: new Date(),
      completedAt: null,
      failedAt: null,
    },
  });
}

export async function incrementReporterAgentTaskAttemptCount(taskId: string) {
  return db.reporterAgentTask.update({
    where: { id: taskId },
    data: {
      attempts: {
        increment: 1,
      },
    },
  });
}

export async function fetchPendingReporterAgentTasks(limit = 25) {
  return db.reporterAgentTask.findMany({
    where: {
      status: 'PENDING',
      OR: [{ scheduledFor: null }, { scheduledFor: { lte: new Date() } }],
    },
    orderBy: [{ priority: 'desc' }, { scheduledFor: 'asc' }, { createdAt: 'asc' }],
    take: limit,
    include: {
      reporterRun: {
        select: { id: true, topic: true, title: true, status: true },
      },
      createdBy: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });
}

export async function fetchReporterAgentTasksForRun(reporterRunId: string) {
  return db.reporterAgentTask.findMany({
    where: { reporterRunId },
    orderBy: [{ createdAt: 'desc' }],
    include: {
      createdBy: {
        select: { id: true, firstName: true, lastName: true },
      },
      traces: {
        orderBy: [{ createdAt: 'desc' }],
      },
    },
  });
}

export async function fetchReporterAgentTaskById(taskId: string): Promise<ReporterAgentTask | null> {
  return db.reporterAgentTask.findUnique({
    where: { id: taskId },
  });
}
