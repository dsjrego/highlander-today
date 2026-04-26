import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { canReviewMemoriam } from '@/lib/memoriam/permissions';

const CreatePhotoSchema = z.object({
  imageUrl: z.string().url('imageUrl must be a valid URL'),
  caption: z.string().trim().max(500).optional().nullable(),
  altText: z.string().trim().max(500).optional().nullable(),
  setAsHero: z.boolean().optional().default(false),
});

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

    // Non-staff callers must be an active steward or co-steward to view all statuses;
    // otherwise they only see APPROVED photos.
    let statusFilter: object | undefined;
    if (!isStaff) {
      const contributor = await db.memorialContributor.findFirst({
        where: {
          memorialPageId: page.id,
          userId,
          status: 'ACTIVE',
          role: { in: ['STEWARD', 'CO_STEWARD'] },
        },
        select: { id: true },
      });

      if (!contributor) {
        statusFilter = { status: 'APPROVED' };
      }
    }

    const photos = await db.memorialPhoto.findMany({
      where: {
        memorialPageId: page.id,
        ...statusFilter,
      },
      select: {
        id: true,
        imageUrl: true,
        caption: true,
        altText: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        reviewedAt: true,
        createdBy: {
          select: { id: true, firstName: true, lastName: true },
        },
        reviewedBy: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ photos });
  } catch (error) {
    console.error('Error fetching memorial photos:', error);
    return NextResponse.json({ error: 'Failed to fetch photos' }, { status: 500 });
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
    const validated = CreatePhotoSchema.parse(body);

    const page = await db.memorialPage.findFirst({
      where: {
        id: params.id,
        ...(communityId ? { communityId } : {}),
      },
      select: { id: true, communityId: true, heroImageUrl: true },
    });

    if (!page) {
      return NextResponse.json({ error: 'Memorial page not found' }, { status: 404 });
    }

    const isStaff = canReviewMemoriam(userRole);

    let autoApproved = isStaff;

    if (!autoApproved) {
      const contributor = await db.memorialContributor.findFirst({
        where: {
          memorialPageId: page.id,
          userId,
          status: 'ACTIVE',
          role: { in: ['STEWARD', 'CO_STEWARD'] },
        },
        select: { id: true },
      });

      if (contributor) {
        autoApproved = true;
      }
    }

    if (!autoApproved) {
      return NextResponse.json(
        { error: 'Only staff or active stewards may upload photos to a memorial page' },
        { status: 403 }
      );
    }

    const photoStatus = 'APPROVED';
    const now = new Date();

    const result = await db.$transaction(async (tx) => {
      const photo = await tx.memorialPhoto.create({
        data: {
          communityId: page.communityId,
          memorialPageId: page.id,
          createdByUserId: userId,
          reviewedByUserId: userId,
          imageUrl: validated.imageUrl,
          caption: validated.caption?.trim() || null,
          altText: validated.altText?.trim() || null,
          status: photoStatus,
          reviewedAt: now,
        },
        select: {
          id: true,
          imageUrl: true,
          caption: true,
          altText: true,
          status: true,
          createdAt: true,
        },
      });

      await tx.memorialAuditLog.create({
        data: {
          communityId: page.communityId,
          memorialPageId: page.id,
          memorialPhotoId: photo.id,
          actorUserId: userId,
          action: 'ADD_PHOTO',
          note: `Photo uploaded${validated.setAsHero ? ' and set as hero image' : ''}`,
        },
      });

      if (validated.setAsHero) {
        await tx.memorialPage.update({
          where: { id: page.id },
          data: { heroImageUrl: validated.imageUrl },
        });
      }

      return photo;
    });

    return NextResponse.json({ photo: result }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error uploading memorial photo:', error);
    return NextResponse.json({ error: 'Failed to upload photo' }, { status: 500 });
  }
}
