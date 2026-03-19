import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkPermission } from '@/lib/permissions';
import { logActivity } from '@/lib/activity-log';
import { z } from 'zod';

const ApproveStoreSchema = z.object({
  approved: z.boolean(),
  rejectionReason: z.string().trim().max(1000).optional(),
});

export async function POST(
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
    const validated = ApproveStoreSchema.parse(body);

    const store = await db.store.findUnique({
      where: { id: params.id },
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
      },
    });

    if (!store) {
      return NextResponse.json({ error: 'Store not found' }, { status: 404 });
    }

    if (store.status !== 'PENDING_APPROVAL') {
      return NextResponse.json(
        { error: `Store is not pending approval (current status: ${store.status})` },
        { status: 400 }
      );
    }

    const updated = await db.store.update({
      where: { id: params.id },
      data: {
        status: validated.approved ? 'APPROVED' : 'REJECTED',
        approvedByUserId: validated.approved ? userId : null,
        approvedAt: validated.approved ? new Date() : null,
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
        _count: {
          select: {
            listings: true,
          },
        },
      },
    });

    const ipAddress = request.headers.get('x-client-ip');
    await logActivity({
      userId,
      action: validated.approved ? 'APPROVE' : 'REJECT',
      resourceType: 'USER_PROFILE',
      resourceId: store.id,
      ipAddress,
      metadata: {
        entityType: 'STORE',
        name: store.name,
        approved: validated.approved,
        rejectionReason: validated.rejectionReason,
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
    console.error('Error approving store:', error);
    return NextResponse.json(
      { error: 'Failed to approve store' },
      { status: 500 }
    );
  }
}
