import { NextRequest, NextResponse } from 'next/server';
import { ObservedGeoReviewStatus } from '@prisma/client';
import { z } from 'zod';
import { db } from '@/lib/db';

const UpdateObservedGeoSchema = z.object({
  matchedPlaceId: z.string().uuid().optional().nullable().or(z.literal('')),
  reviewStatus: z.nativeEnum(ObservedGeoReviewStatus).optional(),
});

function isSuperAdmin(request: NextRequest) {
  return request.headers.get('x-user-role') === 'SUPER_ADMIN';
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    if (!isSuperAdmin(request)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const validated = UpdateObservedGeoSchema.parse(body);

    const matchedPlaceId =
      typeof validated.matchedPlaceId === 'string' && validated.matchedPlaceId.length > 0
        ? validated.matchedPlaceId
        : null;

    if (matchedPlaceId) {
      const place = await db.place.findFirst({
        where: {
          id: matchedPlaceId,
          isActive: true,
        },
        select: { id: true },
      });

      if (!place) {
        return NextResponse.json({ error: 'Selected place not found' }, { status: 400 });
      }
    }

    const nextReviewStatus =
      validated.reviewStatus !== undefined
        ? validated.reviewStatus
        : matchedPlaceId
          ? ObservedGeoReviewStatus.MATCHED_TO_PLACE
          : undefined;

    const observedGeo = await db.observedGeoLocation.update({
      where: { id: params.id },
      data: {
        ...(validated.matchedPlaceId !== undefined ? { matchedPlaceId } : {}),
        ...(nextReviewStatus !== undefined ? { reviewStatus: nextReviewStatus } : {}),
      },
      select: {
        id: true,
        normalizedLabel: true,
        city: true,
        region: true,
        country: true,
        reviewStatus: true,
        firstSeenAt: true,
        lastSeenAt: true,
        loginCount: true,
        distinctUserCount: true,
        matchedPlace: {
          select: {
            id: true,
            displayName: true,
            slug: true,
            type: true,
          },
        },
      },
    });

    return NextResponse.json({ observedGeo });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }

    console.error('Error updating observed geo:', error);
    return NextResponse.json({ error: 'Failed to update observed geo' }, { status: 500 });
  }
}
