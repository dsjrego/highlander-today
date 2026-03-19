import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkPermission } from '@/lib/permissions';
import { logActivity } from '@/lib/activity-log';
import { z } from 'zod';

const UpdateStoreStatusSchema = z.object({
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
    const validated = UpdateStoreStatusSchema.parse(body);

    const store = await db.store.findUnique({
      where: { id: params.id },
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            trustLevel: true,
          },
        },
      },
    });

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    if (store.status === validated.status) {
      return NextResponse.json(
        { error: `Store is already ${validated.status}` },
        { status: 400 }
      );
    }

    const updated = await db.store.update({
      where: { id: params.id },
      data: {
        status: validated.status,
        approvedByUserId: validated.status === 'APPROVED' ? userId : store.approvedByUserId,
        approvedAt: validated.status === 'APPROVED' ? new Date() : store.approvedAt,
      },
      include: {
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhotoUrl: true,
            trustLevel: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: {
            listings: true,
          },
        },
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
        entityType: 'STORE',
        previousStatus: store.status,
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

    console.error('Error updating store status:', error);
    return NextResponse.json(
      { error: 'Failed to update store status' },
      { status: 500 }
    );
  }
}
