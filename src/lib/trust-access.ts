const TRUST_CAPABLE_ROLES = new Set([
  'CONTRIBUTOR',
  'STAFF_WRITER',
  'EDITOR',
  'ADMIN',
  'SUPER_ADMIN',
]);

export type TrustLevelValue = 'ANONYMOUS' | 'REGISTERED' | 'TRUSTED' | 'SUSPENDED';

export function hasTrustedAccess(options: {
  trustLevel?: string | null;
  role?: string | null;
}) {
  if (options.trustLevel === 'SUSPENDED') {
    return false;
  }

  return options.trustLevel === 'TRUSTED' || TRUST_CAPABLE_ROLES.has(options.role ?? '');
}

