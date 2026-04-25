import { checkPermission } from '@/lib/permissions';
import { hasTrustedAccess } from '@/lib/trust-access';

export function canCreateMemoriamSubmission(userRole?: string | null, trustLevel?: string | null) {
  return hasTrustedAccess({
    role: userRole ?? undefined,
    trustLevel: trustLevel ?? undefined,
  });
}

export function canReviewMemoriam(userRole?: string | null) {
  return checkPermission(userRole || '', 'articles:approve');
}
