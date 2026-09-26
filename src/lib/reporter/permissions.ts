import { checkPermission } from '@/lib/permissions';

export function canCreateReporterRun(userRole: string, trustLevel?: string) {
  return checkPermission(userRole, 'reporter:create', trustLevel);
}

export function canViewReporterRun(userRole: string, trustLevel?: string) {
  return checkPermission(userRole, 'reporter:view', trustLevel);
}

export function canEditReporterRun(userRole: string, trustLevel?: string) {
  return checkPermission(userRole, 'reporter:edit', trustLevel);
}

export function canAssignReporterRun(userRole: string, trustLevel?: string) {
  return checkPermission(userRole, 'reporter:assign', trustLevel);
}

export function canAddReporterSource(userRole: string, trustLevel?: string) {
  return checkPermission(userRole, 'reporter:source:add', trustLevel);
}

export function canGenerateReporterDraft(userRole: string, trustLevel?: string) {
  return checkPermission(userRole, 'reporter:draft', trustLevel);
}

export function canConvertReporterToArticle(userRole: string, trustLevel?: string) {
  return checkPermission(userRole, 'reporter:convert', trustLevel);
}
