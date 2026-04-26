import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { canReviewMemoriam } from '@/lib/memoriam/permissions';

const AddContributorSchema = z.object({
  userId: z.string().uuid('userId must be a valid UUID'),
  role: z.enum(['STEWARD', 'CO_STEWARD', 'FAMILY']),
  displayName: z.string().trim().max(120).optional().nullable(),
  relationshipToDeceased: z.string().trim().max(120).optional().nullable(),
});

async function getActiveContributor(memorialPageId: string, userId: string) {
  return db.memorialContributor.findFirst({
    where: {
      memorialPageId,
      userId,
      status: 'ACTIVE',
      role: { in: ['STEWARD', 'CO_STEWARD'] },
    },
    select: { id: true, role: true },
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');
    const communityId = request.headers.get('x-community-id') || undefined;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isStaff = canReviewMemoriam(userRole);

    const page = await db.memorialPage.findFirst({
      where: {
        id: params.id,
        ...(communityId ? { communityId } : {}),
      },
      select: { id: true, communityId: true },
    });

    if (!page) {
      return NextResponse.json({ error: 'Memorial page not found' }, { status: 404 });
    }

    if (!isStaff) {
      const caller = await getActiveContributor(page.id, userId);
      if (!caller) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }
    }

    const contributors = await db.memorialContributor.findMany({
      where: { memorialPageId: page.id },
      select: {
        id: true,
        role: true,
        status: true,
        displayName: true,
        relationshipToDeceased: true,
        invitedAt: true,
        approvedAt: true,
        createdAt: true,
        user: {
          select: { id: true, firstName: true, lastName: true },
        },
        invitedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json({ contributors });
  } catch (error) {
    console.error('Error fetching memorial contributors:', error);
    return NextResponse.json({ error: 'Failed to fetch contributors' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');
    const communityId = request.headers.get('x-community-id') || undefined;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const validated = AddContributorSchema.parse(body);

    const page = await db.memorialPage.findFirst({
      where: {
        id: params.id,
        ...(communityId ? { communityId } : {}),
      },
      select: { id: true, communityId: true },
    });

    if (!page) {
      return NextResponse.json({ error: 'Memorial page not found' }, { status: 404 });
    }

    const isStaff = canReviewMemoriam(userRole);

    // Permission gate
    if (validated.role === 'STEWARD') {
      // Only staff may assign STEWARD role
      if (!isStaff) {
        return NextResponse.json(
          { error: 'Only staff may assign the STEWARD role' },
          { status: 403 }
        );
      }
    } else {
      // CO_STEWARD or FAMILY — caller must be staff or the active STEWARD
      if (!isStaff) {
        const caller = await getActiveContributor(page.id, userId);
        if (!caller || caller.role !== 'STEWARD') {
          return NextResponse.json(
            { error: 'Only the active steward or staff may invite contributors' },
            { status: 403 }
          );
        }
      }
    }

    // Enforce single-steward constraint
    if (validated.role === 'STEWARD') {
      const existingSteward = await db.memorialContributor.findFirst({
        where: {
          memorialPageId: page.id,
          role: 'STEWARD',
          status: 'ACTIVE',
        },
        select: { id: true },
      });

      if (existingSteward) {
        return NextResponse.json(
          { error: 'A memorial page may only have one active steward' },
          { status: 409 }
        );
      }
    }

    const now = new Date();
    const auditAction =
      validated.role === 'STEWARD'
        ? 'ASSIGN_STEWARD'
        : validated.role === 'CO_STEWARD'
          ? 'INVITE_CO_STEWARD'
          : 'INVITE_FAMILY';

    const contributor = await db.$transaction(async (tx) => {
      const newContributor = await tx.memorialContributor.create({
        data: {
          memorialPageId: page.id,
          userId: validated.userId,
          invitedByUserId: userId,
          role: validated.role,
          status: 'ACTIVE',
          displayName: validated.displayName?.trim() || null,
          relationshipToDeceased: validated.relationshipToDeceased?.trim() || null,
          invitedAt: now,
          approvedAt: now,
        },
        select: {
          id: true,
          role: true,
          status: true,
          displayName: true,
          relationshipToDeceased: true,
          approvedAt: true,
          createdAt: true,
          user: {
            select: { id: true, firstName: true, lastName: true },
          },
        },
      });

      await tx.memorialAuditLog.create({
        data: {
          communityId: page.communityId,
          memorialPageId: page.id,
          actorUserId: userId,
          action: auditAction,
          note: `${validated.role} assigned to user ${validated.userId}`,
          metadata: {
            contributorId: newContributor.id,
            targetUserId: validated.userId,
            role: validated.role,
          },
        },
      });

      return newContributor;
    });

    return NextResponse.json({ contributor }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error adding memorial contributor:', error);
    return NextResponse.json({ error: 'Failed to add contributor' }, { status: 500 });
  }
}
