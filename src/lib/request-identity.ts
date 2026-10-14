import { db } from './db';

/** Refresh authority for each authenticated request; signed JWTs identify the
 * account, while current database state determines trust and tenant privileges. */
export async function getCurrentRequestIdentity(userId: string) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true, email: true, firstName: true, lastName: true, trustLevel: true,
      memberships: {
        orderBy: { joinedAt: 'asc' },
        select: {
          communityId: true, role: true,
          community: { select: {
            domain: true,
            domains: { where: { status: 'ACTIVE' }, select: { domain: true } },
          } },
        },
      },
    },
  });
  if (!user) return null;
  return {
    id: user.id, email: user.email,
    name: `${user.firstName} ${user.lastName}`.trim(),
    trust_level: user.trustLevel,
    role: user.memberships[0]?.role ?? 'READER',
    tenantMemberships: user.memberships.map((membership) => ({
      communityId: membership.communityId, role: membership.role,
      domains: [membership.community.domain, ...membership.community.domains.map((domain) => domain.domain)]
        .filter((domain): domain is string => Boolean(domain)),
    })),
    isPlatformSuperAdmin: user.memberships.some((membership) => membership.role === 'SUPER_ADMIN'),
  };
}
