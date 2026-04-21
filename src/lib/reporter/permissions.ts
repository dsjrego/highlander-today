import { checkPermission } from '@/lib/permissions';

export function canCreateReporterRun(userRole: string) {
  return checkPermission(userRole, 'reporter:create');
}

export function canViewReporterRun(userRole: string) {
  return checkPermission(userRole, 'reporter:view');
}

export function canEditReporterRun(userRole: string) {
  return checkPermission(userRole, 'reporter:edit');
}

export function canAssignReporterRun(userRole: string) {
  return checkPermission(userRole, 'reporter:assign');
}

export function canAddReporterSource(userRole: string) {
  return checkPermission(userRole, 'reporter:source:add');
}

export function canGenerateReporterDraft(userRole: string) {
  return checkPermission(userRole, 'reporter:draft');
}

export function canConvertReporterToArticle(userRole: string) {
  return checkPermission(userRole, 'reporter:convert');
}
