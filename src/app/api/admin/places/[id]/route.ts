import { NextRequest, NextResponse } from 'next/server';
import { PlaceType } from '@prisma/client';
import { z } from 'zod';
import { db } from '@/lib/db';

const UpdatePlaceSchema = z.object({
  name: z.string().trim().min(1).max(160).optional(),
  displayName: z.string().trim().min(1).max(200).optional(),
  slug: z.string().trim().min(1).max(160).optional(),
  type: z.nativeEnum(PlaceType).optional(),
  countryCode: z.string().trim().min(2).max(2).optional(),
  admin1Code: z.string().trim().max(10).optional().or(z.literal('')),
  admin1Name: z.string().trim().max(120).optional().or(z.literal('')),
  admin2Name: z.string().trim().max(120).optional().or(z.literal('')),
  parentPlaceId: z.string().uuid().optional().nullable().or(z.literal('')),
  isSelectable: z.boolean().optional(),
  isActive: z.boolean().optional(),
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
    const validated = UpdatePlaceSchema.parse(body);

    const place = await db.place.update({
      where: { id: params.id },
      data: {
        ...(validated.name !== undefined ? { name: validated.name } : {}),
        ...(validated.displayName !== undefined ? { displayName: validated.displayName } : {}),
        ...(validated.slug !== undefined ? { slug: validated.slug } : {}),
        ...(validated.type !== undefined ? { type: validated.type } : {}),
        ...(validated.countryCode !== undefined ? { countryCode: validated.countryCode.toUpperCase() } : {}),
        ...(validated.admin1Code !== undefined ? { admin1Code: validated.admin1Code || null } : {}),
        ...(validated.admin1Name !== undefined ? { admin1Name: validated.admin1Name || null } : {}),
        ...(validated.admin2Name !== undefined ? { admin2Name: validated.admin2Name || null } : {}),
        ...(validated.parentPlaceId !== undefined
          ? {
              parentPlaceId:
                typeof validated.parentPlaceId === 'string' && validated.parentPlaceId.length > 0
                  ? validated.parentPlaceId
                  : null,
            }
          : {}),
        ...(validated.isSelectable !== undefined ? { isSelectable: validated.isSelectable } : {}),
        ...(validated.isActive !== undefined ? { isActive: validated.isActive } : {}),
      },
      select: {
        id: true,
        name: true,
        displayName: true,
        slug: true,
        type: true,
        countryCode: true,
        admin1Code: true,
        admin1Name: true,
        admin2Name: true,
        isSelectable: true,
        isActive: true,
      },
    });

    return NextResponse.json({ place });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }

    console.error('Error updating admin place:', error);
    return NextResponse.json({ error: 'Failed to update place' }, { status: 500 });
  }
}
