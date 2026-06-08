import type { OrganizationMembershipRole, OrganizationMembershipStatus } from '@prisma/client';

const ORGANIZATION_MANAGEMENT_ROLES: ReadonlySet<OrganizationMembershipRole> = new Set([
  'OWNER',
  'MANAGER',
  'ADMINISTRATOR',
]);

export const ORGANIZATION_MEMBERSHIP_ROLE_OPTIONS = [
  'OWNER',
  'MANAGER',
  'STAFF',
  'BOARD_MEMBER',
  'VOLUNTEER',
  'PASTOR',
  'OFFICIAL',
  'ADMINISTRATOR',
] as const satisfies ReadonlyArray<OrganizationMembershipRole>;

export const ORGANIZATION_MEMBERSHIP_STATUS_OPTIONS = [
  'PENDING',
  'ACTIVE',
  'REJECTED',
  'REMOVED',
] as const satisfies ReadonlyArray<OrganizationMembershipStatus>;

export function canManageOrganizationMembership(params: {
  role: OrganizationMembershipRole;
  status: OrganizationMembershipStatus;
}) {
  return params.status === 'ACTIVE' && ORGANIZATION_MANAGEMENT_ROLES.has(params.role);
}

export function canGrantOwnerRole(actorRole: OrganizationMembershipRole) {
  return actorRole === 'OWNER';
}
