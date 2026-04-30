export type OrganizationFormStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'ARCHIVED';
export type OrganizationFormQuestionType = 'TEXT_SHORT' | 'TEXT_LONG' | 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE';
export type OrganizationFormMinimumTrustLevel = 'ANONYMOUS' | 'REGISTERED' | 'TRUSTED';

export const ORGANIZATION_FORM_STATUS_OPTIONS: Array<{ value: OrganizationFormStatus; label: string }> = [
  { value: 'DRAFT', label: 'Draft' },
  { value: 'PUBLISHED', label: 'Published' },
  { value: 'CLOSED', label: 'Closed' },
  { value: 'ARCHIVED', label: 'Archived' },
];

export const ORGANIZATION_FORM_MINIMUM_TRUST_OPTIONS: Array<{
  value: OrganizationFormMinimumTrustLevel;
  label: string;
}> = [
  { value: 'ANONYMOUS', label: 'Anonymous' },
  { value: 'REGISTERED', label: 'Registered' },
  { value: 'TRUSTED', label: 'Trusted' },
];

export const ORGANIZATION_FORM_QUESTION_TYPE_OPTIONS: Array<{
  value: OrganizationFormQuestionType;
  label: string;
}> = [
  { value: 'TEXT_SHORT', label: 'Short text' },
  { value: 'TEXT_LONG', label: 'Long text' },
  { value: 'SINGLE_CHOICE', label: 'Single choice' },
  { value: 'MULTIPLE_CHOICE', label: 'Multiple choice' },
];

export function formatOrganizationFormStatusLabel(status: OrganizationFormStatus) {
  return ORGANIZATION_FORM_STATUS_OPTIONS.find((option) => option.value === status)?.label || status;
}

export function formatOrganizationFormQuestionTypeLabel(type: OrganizationFormQuestionType) {
  return ORGANIZATION_FORM_QUESTION_TYPE_OPTIONS.find((option) => option.value === type)?.label || type;
}

export function slugifyOrganizationFormTitle(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
