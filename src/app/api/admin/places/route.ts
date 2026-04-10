import { NextRequest, NextResponse } from 'next/server';
import { PlaceType } from '@prisma/client';
import { z } from 'zod';
import { db } from '@/lib/db';

const CreatePlaceSchema = z.object({
  name: z.string().trim().min(1).max(160),
  displayName: z.string().trim().min(1).max(200),
  slug: z.string().trim().min(1).max(160),
  type: z.nativeEnum(PlaceType),
  countryCode: z.string().trim().min(2).max(2),
  admin1Code: z.string().trim().max(10).optional().or(z.literal('')),
  admin1Name: z.string().trim().max(120).optional().or(z.literal('')),
  admin2Name: z.string().trim().max(120).optional().or(z.literal('')),
  parentPlaceId: z.string().uuid().optional().nullable().or(z.literal('')),
});

function isSuperAdmin(request: NextRequest) {
  return request.headers.get('x-user-role') === 'SUPER_ADMIN';
}

export async function GET(request: NextRequest) {
  try {
    if (!isSuperAdmin(request)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const query = request.nextUrl.searchParams.get('query')?.trim() || '';

    const places = await db.place.findMany({
      where: {
        ...(query
          ? {
              OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { displayName: { contains: query, mode: 'insensitive' } },
                { slug: { contains: query, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ type: 'asc' }, { admin2Name: 'asc' }, { name: 'asc' }],
      take: query ? 100 : 200,
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
        parentPlace: {
          select: {
            id: true,
            displayName: true,
          },
        },
        aliases: {
          where: { isSearchable: true },
          select: {
            id: true,
            alias: true,
          },
          orderBy: { alias: 'asc' },
        },
      },
    });

    return NextResponse.json({ places });
  } catch (error) {
    console.error('Error listing admin places:', error);
    return NextResponse.json({ error: 'Failed to list places' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isSuperAdmin(request)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const validated = CreatePlaceSchema.parse(body);

    const place = await db.place.create({
      data: {
        name: validated.name,
        displayName: validated.displayName,
        slug: validated.slug,
        type: validated.type,
        countryCode: validated.countryCode.toUpperCase(),
        admin1Code: validated.admin1Code || null,
        admin1Name: validated.admin1Name || null,
        admin2Name: validated.admin2Name || null,
        parentPlaceId:
          typeof validated.parentPlaceId === 'string' && validated.parentPlaceId.length > 0
            ? validated.parentPlaceId
            : null,
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

    return NextResponse.json({ place }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }

    console.error('Error creating admin place:', error);
    return NextResponse.json({ error: 'Failed to create place' }, { status: 500 });
  }
}
