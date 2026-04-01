import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logActivity } from '@/lib/activity-log';
import { hasOrganizationAdminAccess } from '@/lib/organization-admin';

const UpdateMembershipSchema = z.object({
  title: z.string().trim().max(160).optional().or(z.literal('')),
  isPublic: z.boolean().optional(),
  isPrimaryContact: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; membershipId: string } }
) {
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
      select: { id: true },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const membership = await db.organizationMembership.findFirst({
      where: {
        id: params.membershipId,
        organizationId: organization.id,
      },
      select: {
        id: true,
      },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Membership not found' }, { status: 404 });
    }

    const validated = UpdateMembershipSchema.parse(await request.json());

    const updated = await db.organizationMembership.update({
      where: { id: membership.id },
      data: {
        title: validated.title === undefined ? undefined : validated.title || null,
        isPublic: validated.isPublic,
        isPrimaryContact: validated.isPrimaryContact,
      },
      select: {
        id: true,
        title: true,
        isPublic: true,
        isPrimaryContact: true,
      },
    });

    if (updated.isPrimaryContact) {
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
      action: 'UPDATE',
      resourceType: 'USER_PROFILE',
      resourceId: organization.id,
      ipAddress: request.headers.get('x-client-ip'),
      metadata: {
        entityType: 'ORGANIZATION_MEMBERSHIP',
        membershipId: membership.id,
      },
    });

    return NextResponse.json({ membership: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }

    console.error('Error updating organization membership:', error);
    return NextResponse.json({ error: 'Failed to update membership' }, { status: 500 });
  }
}
