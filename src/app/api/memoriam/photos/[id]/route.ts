import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { canReviewMemoriam } from '@/lib/memoriam/permissions';

const PatchPhotoSchema = z.object({
  caption: z.string().trim().max(500).nullable().optional(),
  altText: z.string().trim().max(500).nullable().optional(),
  status: z.enum(['APPROVED', 'REJECTED', 'HIDDEN']).optional(),
  setAsHero: z.boolean().optional(),
});

export async function PATCH(
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
    const validated = PatchPhotoSchema.parse(body);

    const photo = await db.memorialPhoto.findFirst({
      where: {
        id: params.id,
        ...(communityId ? { communityId } : {}),
      },
      select: {
        id: true,
        communityId: true,
        memorialPageId: true,
        imageUrl: true,
        status: true,
        memorialPage: {
          select: { id: true, heroImageUrl: true },
        },
      },
    });

    if (!photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    const isStaff = canReviewMemoriam(userRole);

    let activeSteward = false;
    if (!isStaff) {
      const contributor = await db.memorialContributor.findFirst({
        where: {
          memorialPageId: photo.memorialPageId,
          userId,
          status: 'ACTIVE',
          role: { in: ['STEWARD', 'CO_STEWARD'] },
        },
        select: { id: true },
      });
      activeSteward = !!contributor;
    }

    if (!isStaff && !activeSteward) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    // Stewards can set HIDDEN but not REJECTED; only staff can set REJECTED
    if (validated.status === 'REJECTED' && !isStaff) {
      return NextResponse.json(
        { error: 'Only staff may reject a photo; stewards may only hide it' },
        { status: 403 }
      );
    }

    // Stewards cannot change status to APPROVED (only staff can)
    if (validated.status === 'APPROVED' && !isStaff) {
      return NextResponse.json(
        { error: 'Only staff may approve a photo' },
        { status: 403 }
      );
    }

    const now = new Date();
    const isStatusChange = validated.status !== undefined && validated.status !== photo.status;

    const updated = await db.$transaction(async (tx) => {
      const updatedPhoto = await tx.memorialPhoto.update({
        where: { id: photo.id },
        data: {
          ...(validated.caption !== undefined ? { caption: validated.caption?.trim() || null } : {}),
          ...(validated.altText !== undefined ? { altText: validated.altText?.trim() || null } : {}),
          ...(validated.status !== undefined ? { status: validated.status } : {}),
          ...(isStatusChange
            ? { reviewedByUserId: userId, reviewedAt: now }
            : {}),
        },
        select: {
          id: true,
          imageUrl: true,
          caption: true,
          altText: true,
          status: true,
          reviewedAt: true,
          updatedAt: true,
        },
      });

      const changedFields: string[] = [];
      if (validated.caption !== undefined) changedFields.push('caption');
      if (validated.altText !== undefined) changedFields.push('altText');
      if (validated.status !== undefined) changedFields.push(`status → ${validated.status}`);
      if (validated.setAsHero) changedFields.push('heroImageUrl');

      await tx.memorialAuditLog.create({
        data: {
          communityId: photo.communityId,
          memorialPageId: photo.memorialPageId,
          memorialPhotoId: photo.id,
          actorUserId: userId,
          action: 'UPDATE_PHOTO',
          note: `Updated: ${changedFields.join(', ')}`,
        },
      });

      if (validated.setAsHero) {
        await tx.memorialPage.update({
          where: { id: photo.memorialPageId },
          data: { heroImageUrl: photo.imageUrl },
        });
      }

      return updatedPhoto;
    });

    return NextResponse.json({ photo: updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating memorial photo:', error);
    return NextResponse.json({ error: 'Failed to update photo' }, { status: 500 });
  }
}

export async function DELETE(
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

    const photo = await db.memorialPhoto.findFirst({
      where: {
        id: params.id,
        ...(communityId ? { communityId } : {}),
      },
      select: {
        id: true,
        communityId: true,
        memorialPageId: true,
        imageUrl: true,
        memorialPage: {
          select: { id: true, heroImageUrl: true },
        },
      },
    });

    if (!photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    const isStaff = canReviewMemoriam(userRole);

    if (!isStaff) {
      const contributor = await db.memorialContributor.findFirst({
        where: {
          memorialPageId: photo.memorialPageId,
          userId,
          status: 'ACTIVE',
          role: { in: ['STEWARD', 'CO_STEWARD'] },
        },
        select: { id: true },
      });

      if (!contributor) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }
    }

    const isHero = photo.memorialPage?.heroImageUrl === photo.imageUrl;

    await db.$transaction(async (tx) => {
      await tx.memorialPhoto.delete({ where: { id: photo.id } });

      if (isHero) {
        await tx.memorialPage.update({
          where: { id: photo.memorialPageId },
          data: { heroImageUrl: null },
        });
      }

      // Audit log written to the page since the photo row is now deleted
      await tx.memorialAuditLog.create({
        data: {
          communityId: photo.communityId,
          memorialPageId: photo.memorialPageId,
          actorUserId: userId,
          action: 'DELETE_PHOTO',
          note: `Photo deleted${isHero ? '; hero image cleared' : ''}`,
          metadata: { deletedPhotoId: photo.id, imageUrl: photo.imageUrl },
        },
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting memorial photo:', error);
    return NextResponse.json({ error: 'Failed to delete photo' }, { status: 500 });
  }
}
