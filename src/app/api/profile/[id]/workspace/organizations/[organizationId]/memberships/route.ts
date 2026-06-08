import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { canGrantOwnerRole, ORGANIZATION_MEMBERSHIP_ROLE_OPTIONS, ORGANIZATION_MEMBERSHIP_STATUS_OPTIONS } from '@/lib/organization-membership';
import { getAuthorizedWorkspaceOrganization } from '@/lib/workspace-organization-auth';

const CreateMembershipSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(ORGANIZATION_MEMBERSHIP_ROLE_OPTIONS),
  status: z.enum(ORGANIZATION_MEMBERSHIP_STATUS_OPTIONS).optional(),
  title: z.string().trim().max(160).optional().or(z.literal('')),
  isPublic: z.boolean().optional(),
  isPrimaryContact: z.boolean().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; organizationId: string } }
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

    const validated = CreateMembershipSchema.parse(await request.json());

    if (validated.role === 'OWNER' && !canGrantOwnerRole(authorization.role)) {
      return NextResponse.json({ error: 'Only organization owners can grant the owner role.' }, { status: 403 });
    }

    const communityMembership = await db.userCommunityMembership.findFirst({
      where: {
        communityId: authorization.organization.communityId,
        userId: validated.userId,
      },
      select: { id: true },
    });

    if (!communityMembership) {
      return NextResponse.json({ error: 'User is not a member of this community' }, { status: 400 });
    }

    const existing = await db.organizationMembership.findFirst({
      where: {
        organizationId: authorization.organization.id,
        userId: validated.userId,
      },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json({ error: 'User is already attached to this organization' }, { status: 409 });
    }

    const membership = await db.organizationMembership.create({
      data: {
        organizationId: authorization.organization.id,
        userId: validated.userId,
        role: validated.role,
        status: validated.status ?? 'ACTIVE',
        title: validated.title || null,
        isPublic: validated.isPublic ?? false,
        isPrimaryContact: validated.isPrimaryContact ?? false,
      },
      select: {
        id: true,
        role: true,
        status: true,
        title: true,
        isPublic: true,
        isPrimaryContact: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    });

    if (membership.isPrimaryContact) {
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

    return NextResponse.json({ membership }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }

    console.error('Error creating workspace organization membership:', error);
    return NextResponse.json({ error: 'Failed to create membership' }, { status: 500 });
  }
}
