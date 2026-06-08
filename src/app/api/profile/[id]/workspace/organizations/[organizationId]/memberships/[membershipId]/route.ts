import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { canGrantOwnerRole, ORGANIZATION_MEMBERSHIP_ROLE_OPTIONS, ORGANIZATION_MEMBERSHIP_STATUS_OPTIONS } from '@/lib/organization-membership';
import { db } from '@/lib/db';
import { getAuthorizedWorkspaceOrganization } from '@/lib/workspace-organization-auth';

const UpdateMembershipSchema = z.object({
  role: z.enum(ORGANIZATION_MEMBERSHIP_ROLE_OPTIONS).optional(),
  status: z.enum(ORGANIZATION_MEMBERSHIP_STATUS_OPTIONS).optional(),
  title: z.string().trim().max(160).optional().or(z.literal('')),
  isPublic: z.boolean().optional(),
  isPrimaryContact: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; organizationId: string; membershipId: string } }
) {
  try {
    const actorUserId = request.headers.get('x-user-id');
    if (!actorUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const authorization = await getAuthorizedWorkspaceOrganization({
      actorUserId,
      profileUserId: params.id,
      organizationId: params.organizationId,
    });

    if (!authorization) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const membership = await db.organizationMembership.findFirst({
      where: {
        id: params.membershipId,
        organizationId: authorization.organization.id,
      },
      select: {
        id: true,
        userId: true,
        role: true,
        status: true,
        title: true,
        isPublic: true,
        isPrimaryContact: true,
      },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Membership not found' }, { status: 404 });
    }

    const validated = UpdateMembershipSchema.parse(await request.json());

    if (membership.role === 'OWNER' && authorization.role !== 'OWNER') {
      return NextResponse.json({ error: 'Only owners can modify owner memberships.' }, { status: 403 });
    }

    if (validated.role === 'OWNER' && !canGrantOwnerRole(authorization.role)) {
      return NextResponse.json({ error: 'Only organization owners can grant the owner role.' }, { status: 403 });
    }

    const nextRole = validated.role ?? membership.role;
    const nextStatus = validated.status ?? membership.status;
    const ownerWillStopBeingActive = membership.role === 'OWNER' && (nextRole !== 'OWNER' || nextStatus !== 'ACTIVE');

    if (ownerWillStopBeingActive) {
      const activeOwnerCount = await db.organizationMembership.count({
        where: {
          organizationId: authorization.organization.id,
          role: 'OWNER',
          status: 'ACTIVE',
        },
      });

      if (activeOwnerCount <= 1) {
        return NextResponse.json({ error: 'This organization must keep at least one active owner.' }, { status: 400 });
      }
    }

    const updated = await db.organizationMembership.update({
      where: { id: membership.id },
      data: {
        role: validated.role,
        status: validated.status,
        title: validated.title === undefined ? undefined : validated.title || null,
        isPublic: validated.isPublic,
        isPrimaryContact: validated.isPrimaryContact,
      },
      select: {
        id: true,
        role: true,
        status: true,
        title: true,
        isPublic: true,
        isPrimaryContact: true,
      },
    });

    if (updated.isPrimaryContact) {
      await db.organizationMembership.updateMany({
        where: {
          organizationId: authorization.organization.id,
          NOT: { id: membership.id },
        },
        data: {
          isPrimaryContact: false,
        },
      });
    }

    return NextResponse.json({ membership: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }

    console.error('Error updating workspace organization membership:', error);
    return NextResponse.json({ error: 'Failed to update membership' }, { status: 500 });
  }
}
