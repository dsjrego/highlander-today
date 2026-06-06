import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { buildNormalizedAddressKey } from '@/lib/location-normalization';
import { checkPermission } from '@/lib/permissions';

const UpdateLocationSchema = z.object({
  name: z.string().trim().max(160).optional().or(z.literal('')),
  addressLine1: z.string().trim().min(3).max(160).optional(),
  addressLine2: z.string().trim().max(160).optional().or(z.literal('')),
  city: z.string().trim().min(2).max(120).optional(),
  state: z.string().trim().min(2).max(80).optional(),
  postalCode: z.string().trim().max(20).optional().or(z.literal('')),
  countryCode: z.string().trim().length(2).optional().or(z.literal('')),
  validationStatus: z.enum(['UNVERIFIED', 'NORMALIZED', 'VERIFIED', 'NEEDS_REVIEW']).optional(),
  forceUpdate: z.boolean().optional(),
});

function hasLocationAdminAccess(userRole: string) {
  return checkPermission(userRole, 'events:approve');
}

async function findLocationForRequest(request: NextRequest, id: string) {
  const communityId = request.headers.get('x-community-id') || undefined;

  return db.location.findFirst({
    where: {
      id,
      ...(communityId ? { communityId } : {}),
    },
    select: {
      id: true,
      communityId: true,
      name: true,
      addressLine1: true,
      addressLine2: true,
      city: true,
      state: true,
      postalCode: true,
      countryCode: true,
      validationStatus: true,
    },
  });
}

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

    if (!hasLocationAdminAccess(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const existing = await findLocationForRequest(request, params.id);
    if (!existing) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    const validated = UpdateLocationSchema.parse(await request.json());
    const nextCountryCode = (validated.countryCode ?? existing.countryCode).toUpperCase();
    const nextAddressLine1 = validated.addressLine1 ?? existing.addressLine1;
    const nextCity = validated.city ?? existing.city;
    const nextState = validated.state ?? existing.state;
    const nextPostalCode =
      validated.postalCode === undefined ? existing.postalCode || '' : validated.postalCode || '';
    const normalizedAddressKey = buildNormalizedAddressKey({
      addressLine1: nextAddressLine1,
      city: nextCity,
      state: nextState,
      postalCode: nextPostalCode,
      countryCode: nextCountryCode,
    });

    const duplicates = await db.location.findMany({
      where: {
        communityId: existing.communityId,
        normalizedAddressKey,
        NOT: { id: existing.id },
      },
      orderBy: [{ name: 'asc' }, { addressLine1: 'asc' }],
      select: {
        id: true,
        name: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        state: true,
        postalCode: true,
        countryCode: true,
        validationStatus: true,
        updatedAt: true,
        _count: {
          select: {
            events: true,
          },
        },
      },
    });

    if (duplicates.length > 0 && !validated.forceUpdate) {
      return NextResponse.json(
        {
          error: 'Possible duplicate location found',
          duplicates,
        },
        { status: 409 }
      );
    }

    const location = await db.location.update({
      where: { id: existing.id },
      data: {
        name: validated.name === undefined ? undefined : validated.name || null,
        addressLine1: validated.addressLine1,
        addressLine2: validated.addressLine2 === undefined ? undefined : validated.addressLine2 || null,
        city: validated.city,
        state: validated.state,
        postalCode: validated.postalCode === undefined ? undefined : validated.postalCode || null,
        countryCode: nextCountryCode,
        normalizedAddressKey,
        validationStatus: validated.validationStatus,
      },
      select: {
        id: true,
        name: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        state: true,
        postalCode: true,
        countryCode: true,
        validationStatus: true,
        updatedAt: true,
        _count: {
          select: {
            events: true,
          },
        },
      },
    });

    return NextResponse.json({ location });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }

    console.error('Error updating location:', error);
    return NextResponse.json({ error: 'Failed to update location' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role') || '';

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasLocationAdminAccess(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const existing = await findLocationForRequest(request, params.id);
    if (!existing) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    const linkedEventCount = await db.event.count({
      where: {
        locationId: existing.id,
      },
    });

    if (linkedEventCount > 0) {
      return NextResponse.json(
        {
          error: 'This location is still assigned to events and cannot be deleted.',
          linkedEventCount,
        },
        { status: 409 }
      );
    }

    await db.location.delete({
      where: { id: existing.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting location:', error);
    return NextResponse.json({ error: 'Failed to delete location' }, { status: 500 });
  }
}
