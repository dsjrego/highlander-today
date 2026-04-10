import { NextRequest, NextResponse } from 'next/server';
import { TenantCoverageType } from '@prisma/client';
import { z } from 'zod';
import { db } from '@/lib/db';

const CreateCoverageSchema = z.object({
  communityId: z.string().uuid(),
  placeId: z.string().uuid(),
  coverageType: z.nativeEnum(TenantCoverageType),
  isPrimary: z.boolean().optional(),
  isActive: z.boolean().optional(),
  notes: z.string().trim().max(500).optional().or(z.literal('')),
});

function isSuperAdmin(request: NextRequest) {
  return request.headers.get('x-user-role') === 'SUPER_ADMIN';
}

export async function GET(request: NextRequest) {
  try {
    if (!isSuperAdmin(request)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const communityId = request.nextUrl.searchParams.get('communityId')?.trim() || '';

    const [communities, coverageAreas] = await Promise.all([
      db.community.findMany({
        orderBy: { name: 'asc' },
        select: {
          id: true,
          name: true,
          slug: true,
        },
      }),
      db.tenantCoverageArea.findMany({
        where: communityId ? { communityId } : {},
        orderBy: [{ community: { name: 'asc' } }, { coverageType: 'asc' }, { place: { displayName: 'asc' } }],
        select: {
          id: true,
          communityId: true,
          coverageType: true,
          isPrimary: true,
          isActive: true,
          notes: true,
          community: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          place: {
            select: {
              id: true,
              displayName: true,
              slug: true,
              type: true,
              admin2Name: true,
            },
          },
        },
      }),
    ]);

    return NextResponse.json({ communities, coverageAreas });
  } catch (error) {
    console.error('Error listing tenant coverage:', error);
    return NextResponse.json({ error: 'Failed to list tenant coverage' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isSuperAdmin(request)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const validated = CreateCoverageSchema.parse(body);

    const coverageArea = await db.tenantCoverageArea.create({
      data: {
        communityId: validated.communityId,
        placeId: validated.placeId,
        coverageType: validated.coverageType,
        isPrimary: validated.isPrimary ?? false,
        isActive: validated.isActive ?? true,
        notes: validated.notes || null,
      },
      select: {
        id: true,
        communityId: true,
        coverageType: true,
        isPrimary: true,
        isActive: true,
        notes: true,
        community: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        place: {
          select: {
            id: true,
            displayName: true,
            slug: true,
            type: true,
            admin2Name: true,
          },
        },
      },
    });

    return NextResponse.json({ coverageArea }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }

    console.error('Error creating tenant coverage area:', error);
    return NextResponse.json({ error: 'Failed to create tenant coverage area' }, { status: 500 });
  }
}
