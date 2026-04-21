import { REPORTER_RUN_STATUS, type ReporterRunStatusValue } from './types';

const allowedTransitions: Partial<Record<ReporterRunStatusValue, ReporterRunStatusValue[]>> = {
  [REPORTER_RUN_STATUS.NEW]: [
    REPORTER_RUN_STATUS.NEEDS_REVIEW,
    REPORTER_RUN_STATUS.SOURCE_PACKET_IN_PROGRESS,
    REPORTER_RUN_STATUS.BLOCKED,
    REPORTER_RUN_STATUS.ARCHIVED,
  ],
  [REPORTER_RUN_STATUS.NEEDS_REVIEW]: [
    REPORTER_RUN_STATUS.SOURCE_PACKET_IN_PROGRESS,
    REPORTER_RUN_STATUS.BLOCKED,
    REPORTER_RUN_STATUS.ARCHIVED,
  ],
  [REPORTER_RUN_STATUS.SOURCE_PACKET_IN_PROGRESS]: [
    REPORTER_RUN_STATUS.READY_FOR_DRAFT,
    REPORTER_RUN_STATUS.BLOCKED,
    REPORTER_RUN_STATUS.ARCHIVED,
  ],
  [REPORTER_RUN_STATUS.READY_FOR_DRAFT]: [
    REPORTER_RUN_STATUS.DRAFT_CREATED,
    REPORTER_RUN_STATUS.BLOCKED,
    REPORTER_RUN_STATUS.ARCHIVED,
  ],
  [REPORTER_RUN_STATUS.BLOCKED]: [
    REPORTER_RUN_STATUS.SOURCE_PACKET_IN_PROGRESS,
    REPORTER_RUN_STATUS.READY_FOR_DRAFT,
    REPORTER_RUN_STATUS.ARCHIVED,
  ],
  [REPORTER_RUN_STATUS.DRAFT_CREATED]: [
    REPORTER_RUN_STATUS.CONVERTED_TO_ARTICLE,
    REPORTER_RUN_STATUS.BLOCKED,
    REPORTER_RUN_STATUS.ARCHIVED,
  ],
  [REPORTER_RUN_STATUS.CONVERTED_TO_ARTICLE]: [REPORTER_RUN_STATUS.ARCHIVED],
};

export function canTransitionReporterRunStatus(
  currentStatus: ReporterRunStatusValue,
  nextStatus: ReporterRunStatusValue
) {
  return allowedTransitions[currentStatus]?.includes(nextStatus) ?? false;
}

export function assertReporterRunStatusTransition(
  currentStatus: ReporterRunStatusValue,
  nextStatus: ReporterRunStatusValue
) {
  if (!canTransitionReporterRunStatus(currentStatus, nextStatus)) {
    throw new Error(
      `Invalid reporter run status transition: ${currentStatus} -> ${nextStatus}`
    );
  }
}
