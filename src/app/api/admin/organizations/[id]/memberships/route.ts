import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logActivity } from '@/lib/activity-log';
import { hasOrganizationAdminAccess } from '@/lib/organization-admin';

const CreateMembershipSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['OWNER', 'MANAGER', 'STAFF', 'BOARD_MEMBER', 'VOLUNTEER', 'PASTOR', 'OFFICIAL', 'ADMINISTRATOR']),
  status: z.enum(['PENDING', 'ACTIVE', 'REJECTED', 'REMOVED']).optional(),
  title: z.string().trim().max(160).optional().or(z.literal('')),
  isPublic: z.boolean().optional(),
  isPrimaryContact: z.boolean().optional(),
});

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role') || '';
    const communityId = request.headers.get('x-community-id') || undefined;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasOrganizationAdminAccess(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const organization = await db.organization.findFirst({
      where: {
        id: params.id,
        ...(communityId ? { communityId } : {}),
      },
      select: {
        id: true,
        communityId: true,
      },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const validated = CreateMembershipSchema.parse(await request.json());

    const communityMembership = await db.userCommunityMembership.findFirst({
      where: {
        communityId: organization.communityId,
        userId: validated.userId,
      },
      select: {
        id: true,
      },
    });

    if (!communityMembership) {
      return NextResponse.json({ error: 'User is not a member of this community' }, { status: 400 });
    }

    const existing = await db.organizationMembership.findFirst({
      where: {
        organizationId: organization.id,
        userId: validated.userId,
      },
      select: {
        id: true,
      },
    });

    if (existing) {
      return NextResponse.json({ error: 'User is already attached to this organization' }, { status: 409 });
    }

    const membership = await db.organizationMembership.create({
      data: {
        organizationId: organization.id,
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
          organizationId: organization.id,
          NOT: { id: membership.id },
        },
        data: {
          isPrimaryContact: false,
        },
      });
    }

    await logActivity({
      userId,
      action: 'CREATE',
      resourceType: 'USER_PROFILE',
      resourceId: organization.id,
      ipAddress: request.headers.get('x-client-ip'),
      metadata: {
        entityType: 'ORGANIZATION_MEMBERSHIP',
        membershipId: membership.id,
        attachedUserId: membership.user.id,
        role: membership.role,
        status: membership.status,
      },
    });

    return NextResponse.json({ membership }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }

    console.error('Error creating organization membership:', error);
    return NextResponse.json({ error: 'Failed to create membership' }, { status: 500 });
  }
}
