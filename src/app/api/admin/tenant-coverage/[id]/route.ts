import { NextRequest, NextResponse } from 'next/server';
import { TenantCoverageType } from '@prisma/client';
import { z } from 'zod';
import { db } from '@/lib/db';

const UpdateCoverageSchema = z.object({
  coverageType: z.nativeEnum(TenantCoverageType).optional(),
  isPrimary: z.boolean().optional(),
  isActive: z.boolean().optional(),
  notes: z.string().trim().max(500).optional().or(z.literal('')),
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
    const validated = UpdateCoverageSchema.parse(body);

    const coverageArea = await db.tenantCoverageArea.update({
      where: { id: params.id },
      data: {
        ...(validated.coverageType !== undefined ? { coverageType: validated.coverageType } : {}),
        ...(validated.isPrimary !== undefined ? { isPrimary: validated.isPrimary } : {}),
        ...(validated.isActive !== undefined ? { isActive: validated.isActive } : {}),
        ...(validated.notes !== undefined ? { notes: validated.notes || null } : {}),
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

    return NextResponse.json({ coverageArea });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }

    console.error('Error updating tenant coverage area:', error);
    return NextResponse.json({ error: 'Failed to update tenant coverage area' }, { status: 500 });
  }
}
