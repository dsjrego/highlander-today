import { db } from '@/lib/db';
import { canManageOrganizationMembership } from '@/lib/organization-membership';

export async function getAuthorizedWorkspaceOrganization(params: {
  actorUserId: string;
  profileUserId: string;
  organizationId: string;
}) {
  if (params.actorUserId !== params.profileUserId) {
    return null;
  }

  const membership = await db.organizationMembership.findFirst({
    where: {
      organizationId: params.organizationId,
      userId: params.actorUserId,
    },
    select: {
      role: true,
      status: true,
      organization: {
        select: {
          id: true,
          communityId: true,
        },
      },
    },
  });

  if (!membership || !canManageOrganizationMembership({ role: membership.role, status: membership.status })) {
    return null;
  }

  return membership;
}
