import { checkPermission } from '@/lib/permissions';

export function hasOrganizationAdminAccess(userRole: string) {
  return checkPermission(userRole, 'articles:approve');
}

export function hasValidPhoneDigits(value: string) {
  const digits = value.replace(/\D/g, '');
  return digits.length === 0 || digits.length === 10;
}

export function formatPhoneInput(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 10);

  if (digits.length === 0) {
    return '';
  }

  if (digits.length < 4) {
    return `(${digits}`;
  }

  if (digits.length < 7) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  }

  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}
