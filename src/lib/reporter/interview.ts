import {
  REPORTER_INTERVIEW_PRIORITY,
  REPORTER_INTERVIEW_REQUEST_STATUS,
  REPORTER_INTERVIEW_SESSION_STATUS,
  REPORTER_INTERVIEW_TYPE,
  REPORTER_SUPPORTED_LANGUAGE,
} from './types';

export const REPORTER_INTERVIEW_REQUEST_STATUS_OPTIONS = Object.values(
  REPORTER_INTERVIEW_REQUEST_STATUS
);

export const REPORTER_INTERVIEW_TYPE_OPTIONS = Object.values(REPORTER_INTERVIEW_TYPE);

export const REPORTER_INTERVIEW_PRIORITY_OPTIONS = Object.values(
  REPORTER_INTERVIEW_PRIORITY
);

export const REPORTER_SUPPORTED_LANGUAGE_OPTIONS = Object.values(
  REPORTER_SUPPORTED_LANGUAGE
);

export const REPORTER_INTERVIEW_SESSION_STATUS_OPTIONS = Object.values(
  REPORTER_INTERVIEW_SESSION_STATUS
);

export function getReporterInterviewAccessState(status: string) {
  return {
    isDraft: status === 'DRAFT',
    isInvited: status === 'INVITED',
    isReady: status === 'READY',
    isInProgress: status === 'IN_PROGRESS',
    isCompleted: status === 'COMPLETED',
    isBlocked: status === 'BLOCKED',
    isClosed: ['DECLINED', 'NO_SHOW', 'CANCELLED'].includes(status),
    canOpenSession: ['INVITED', 'READY', 'IN_PROGRESS', 'COMPLETED', 'BLOCKED'].includes(status),
  };
}

export function normalizeOptionalReporterText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

export function normalizeReporterBoolean(value: boolean | null | undefined) {
  return Boolean(value);
}
