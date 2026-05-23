import type { ReporterRunStatus } from '@prisma/client';
import { db } from '@/lib/db';
import {
  createReporterAgentTask,
  markReporterAgentTaskCompleted,
  markReporterAgentTaskFailed,
  markReporterAgentTaskRunning,
} from './agent-task-service';
import { createFailedReporterAgentTrace, createSuccessfulReporterAgentTrace } from './agent-trace-service';
import {
  assertReporterAgentActionAllowed,
  REPORTER_AGENT_ACTION,
  REPORTER_AGENT_ACTOR,
} from './reporter-agent-permissions';

interface ReporterRunTriageInput {
  reporterRunId: string;
  createdByUserId?: string | null;
}

function hoursSince(dateValue?: Date | null) {
  if (!dateValue) {
    return null;
  }

  return Math.floor((Date.now() - dateValue.getTime()) / (1000 * 60 * 60));
}

function classifyRunState(run: {
  status: ReporterRunStatus;
  linkedArticleId: string | null;
  sources: Array<{ reliabilityTier: string }>;
  blockers: Array<{ isResolved: boolean; code: string }>;
  validationIssues: Array<{ isResolved: boolean; severity: string; code: string }>;
  interviewRequests: Array<{
    status: string;
    sessions: Array<{ reviewedAt: Date | null; completedAt: Date | null }>;
  }>;
  updatedAt: Date;
}) {
  const openBlockers = run.blockers.filter((blocker) => !blocker.isResolved);
  const unresolvedValidationIssues = run.validationIssues.filter((issue) => !issue.isResolved);
  const criticalValidationIssues = unresolvedValidationIssues.filter(
    (issue) => issue.severity === 'CRITICAL'
  );
  const completedUnreviewedInterviewSessions = run.interviewRequests.flatMap((interview) =>
    interview.sessions.filter((session) => session.completedAt && !session.reviewedAt)
  );
  const strongSources = run.sources.filter((source) =>
    ['PRIMARY', 'HIGH'].includes(source.reliabilityTier)
  );
  const staleHours = hoursSince(run.updatedAt);

  const classifications: string[] = [];
  const nextSteps: string[] = [];
  const signals: Record<string, unknown> = {
    openBlockerCount: openBlockers.length,
    unresolvedValidationIssueCount: unresolvedValidationIssues.length,
    criticalValidationIssueCount: criticalValidationIssues.length,
    completedUnreviewedInterviewSessionCount: completedUnreviewedInterviewSessions.length,
    sourceCount: run.sources.length,
    strongSourceCount: strongSources.length,
    staleHours,
  };

  if (run.linkedArticleId) {
    classifications.push('linked article exists');
    nextSteps.push('Continue editorial work in the linked article workflow.');
  }

  if (criticalValidationIssues.length > 0) {
    classifications.push('draft has validation issues');
    nextSteps.push('Review and resolve critical validation issues before advancing the run.');
  }

  if (openBlockers.length > 0 || run.status === 'BLOCKED') {
    classifications.push('needs editor decision');
    nextSteps.push('Resolve or reframe the open blockers on this run.');
  }

  if (completedUnreviewedInterviewSessions.length > 0) {
    classifications.push('needs follow-up interview');
    nextSteps.push('Review completed interview output and decide whether follow-up reporting is needed.');
  }

  if (run.sources.length === 0 || strongSources.length === 0) {
    classifications.push('needs source packet work');
    nextSteps.push('Add stronger primary or high-confidence source material before drafting.');
  }

  if (
    run.sources.length > 0 &&
    strongSources.length > 0 &&
    openBlockers.length === 0 &&
    completedUnreviewedInterviewSessions.length === 0 &&
    criticalValidationIssues.length === 0 &&
    !run.linkedArticleId
  ) {
    classifications.push('ready for draft attempt');
    nextSteps.push('This run is structurally ready for another draft or editorial review pass.');
  }

  if (staleHours !== null && staleHours >= 72) {
    classifications.push('stale and needs reassignment');
    nextSteps.push('Reconfirm ownership or editorial priority because the run is stale.');
  }

  if (classifications.length === 0) {
    classifications.push('needs editor decision');
    nextSteps.push('Review the run manually and decide whether to strengthen sourcing, draft, or archive.');
  }

  const summary = [
    `Reporter run status: ${run.status}.`,
    openBlockers.length
      ? `${openBlockers.length} open blocker${openBlockers.length === 1 ? '' : 's'} remain.`
      : 'No open blockers are currently recorded.',
    criticalValidationIssues.length
      ? `${criticalValidationIssues.length} critical validation issue${criticalValidationIssues.length === 1 ? '' : 's'} need attention.`
      : 'No critical validation issues are currently recorded.',
    completedUnreviewedInterviewSessions.length
      ? `${completedUnreviewedInterviewSessions.length} completed interview session${completedUnreviewedInterviewSessions.length === 1 ? '' : 's'} still need review.`
      : 'No completed unreviewed interview sessions are pending.',
    strongSources.length
      ? `${strongSources.length} strong source${strongSources.length === 1 ? '' : 's'} support the current packet.`
      : 'The current packet does not yet contain strong source support.',
  ].join(' ');

  return {
    summary,
    classifications,
    nextSteps,
    signals,
  };
}

export async function runReporterTriageForRun(input: ReporterRunTriageInput) {
  const task = await createReporterAgentTask({
    reporterRunId: input.reporterRunId,
    taskType: 'TRIAGE_REPORTER_RUN',
    createdByUserId: input.createdByUserId || null,
  });

  await markReporterAgentTaskRunning(task.id);

  try {
    await assertReporterAgentActionAllowed({
      actor: REPORTER_AGENT_ACTOR.TRIAGE_AGENT,
      action: REPORTER_AGENT_ACTION.READ_REPORTER_RUN,
      reporterRunId: input.reporterRunId,
      reporterAgentTaskId: task.id,
    });
    await assertReporterAgentActionAllowed({
      actor: REPORTER_AGENT_ACTOR.TRIAGE_AGENT,
      action: REPORTER_AGENT_ACTION.CREATE_TRIAGE_SUMMARY,
      reporterRunId: input.reporterRunId,
      reporterAgentTaskId: task.id,
    });

    const run = await db.reporterRun.findUnique({
      where: { id: input.reporterRunId },
      include: {
        sources: {
          select: { id: true, reliabilityTier: true },
        },
        blockers: {
          select: { id: true, isResolved: true, code: true },
        },
        validationIssues: {
          select: { id: true, isResolved: true, severity: true, code: true },
        },
        interviewRequests: {
          select: {
            status: true,
            sessions: {
              select: {
                reviewedAt: true,
                completedAt: true,
              },
            },
          },
        },
      },
    });

    if (!run) {
      throw new Error('Reporter run not found for triage.');
    }

    const triageSummary = classifyRunState(run);

    const completedTask = await markReporterAgentTaskCompleted(task.id, triageSummary);
    const trace = await createSuccessfulReporterAgentTrace({
      reporterRunId: input.reporterRunId,
      reporterAgentTaskId: task.id,
      traceType: 'TRIAGE_SUMMARY',
      provider: 'deterministic',
      modelName: null,
      parsedOutputJson: triageSummary,
      validationJson: {
        mode: 'deterministic',
        classificationCount: triageSummary.classifications.length,
      },
    });

    return {
      task: completedTask,
      trace,
      triageSummary,
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Reporter triage execution failed.';

    const failedTask = await markReporterAgentTaskFailed(task.id, message);
    const trace = await createFailedReporterAgentTrace({
      reporterRunId: input.reporterRunId,
      reporterAgentTaskId: task.id,
      traceType: 'TRIAGE_SUMMARY',
      provider: 'deterministic',
      modelName: null,
      errorMessage: message,
    });

    throw Object.assign(new Error(message), {
      triageTask: failedTask,
      triageTrace: trace,
    });
  }
}
