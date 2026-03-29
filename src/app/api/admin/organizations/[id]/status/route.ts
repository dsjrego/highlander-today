import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logActivity } from '@/lib/activity-log';
import { checkPermission } from '@/lib/permissions';

const UpdateOrganizationStatusSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED', 'SUSPENDED']),
  reason: z.string().trim().max(1000).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role') || '';

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!checkPermission(userRole, 'articles:approve')) {
      return NextResponse.json(
        { error: 'Insufficient permissions — Editor or above required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = UpdateOrganizationStatusSchema.parse(body);

    const organization = await db.organization.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        status: true,
      },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    if (organization.status === validated.status) {
      return NextResponse.json(
        { error: `Organization is already ${validated.status}` },
        { status: 400 }
      );
    }

    const updated = await db.organization.update({
      where: { id: params.id },
      data: {
        status: validated.status,
        approvedByUserId: validated.status === 'APPROVED' ? userId : organization.status === 'APPROVED' ? null : undefined,
        approvedAt: validated.status === 'APPROVED' ? new Date() : organization.status === 'APPROVED' ? null : undefined,
      },
      select: {
        id: true,
        status: true,
      },
    });

    await logActivity({
      userId,
      action:
        validated.status === 'APPROVED'
          ? 'APPROVE'
          : validated.status === 'SUSPENDED'
            ? 'UPDATE'
            : 'REJECT',
      resourceType: 'USER_PROFILE',
      resourceId: updated.id,
      ipAddress: request.headers.get('x-client-ip'),
      metadata: {
        entityType: 'ORGANIZATION',
        previousStatus: organization.status,
        nextStatus: validated.status,
        reason: validated.reason,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating organization status:', error);
    return NextResponse.json(
      { error: 'Failed to update organization status' },
      { status: 500 }
    );
  }
}
