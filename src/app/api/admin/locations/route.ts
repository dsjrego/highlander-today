import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { buildNormalizedAddressKey } from '@/lib/location-normalization';
import { checkPermission } from '@/lib/permissions';

const CreateLocationSchema = z.object({
  name: z.string().trim().max(160).optional().or(z.literal('')),
  addressLine1: z.string().trim().min(3).max(160),
  addressLine2: z.string().trim().max(160).optional().or(z.literal('')),
  city: z.string().trim().min(2).max(120),
  state: z.string().trim().min(2).max(80),
  postalCode: z.string().trim().max(20).optional().or(z.literal('')),
  countryCode: z.string().trim().length(2).optional().or(z.literal('')),
  forceCreate: z.boolean().optional(),
});

async function resolveCommunityId(request: NextRequest) {
  const headerCommunityId = request.headers.get('x-community-id');

  if (headerCommunityId) {
    return headerCommunityId;
  }

  const community = await db.community.findFirst({
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  });

  return community?.id ?? null;
}

function hasLocationAdminAccess(userRole: string) {
  return checkPermission(userRole, 'events:approve');
}

export async function GET(request: NextRequest) {
  try {
    const userRole = request.headers.get('x-user-role') || '';

    if (!hasLocationAdminAccess(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const communityId = await resolveCommunityId(request);
    if (!communityId) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 });
    }

    const query = request.nextUrl.searchParams.get('query')?.trim() || '';

    const locations = await db.location.findMany({
      where: {
        communityId,
        ...(query
          ? {
              OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { addressLine1: { contains: query, mode: 'insensitive' } },
                { city: { contains: query, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: [{ name: 'asc' }, { addressLine1: 'asc' }],
      take: query ? 20 : 50,
      select: {
        id: true,
        name: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        state: true,
        postalCode: true,
        validationStatus: true,
      },
    });

    return NextResponse.json({ locations });
  } catch (error) {
    console.error('Error listing locations:', error);
    return NextResponse.json({ error: 'Failed to list locations' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role') || '';

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasLocationAdminAccess(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const communityId = await resolveCommunityId(request);
    if (!communityId) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 });
    }

    const body = await request.json();
    const validated = CreateLocationSchema.parse(body);
    const countryCode = (validated.countryCode || 'US').toUpperCase();
    const normalizedAddressKey = buildNormalizedAddressKey({
      addressLine1: validated.addressLine1,
      city: validated.city,
      state: validated.state,
      postalCode: validated.postalCode || '',
      countryCode,
    });

    const duplicates = await db.location.findMany({
      where: {
        communityId,
        normalizedAddressKey,
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
        validationStatus: true,
      },
    });

    if (duplicates.length > 0 && !validated.forceCreate) {
      return NextResponse.json(
        {
          error: 'Possible duplicate location found',
          duplicates,
        },
        { status: 409 }
      );
    }

    const location = await db.location.create({
      data: {
        communityId,
        name: validated.name || null,
        addressLine1: validated.addressLine1,
        addressLine2: validated.addressLine2 || null,
        city: validated.city,
        state: validated.state,
        postalCode: validated.postalCode || null,
        countryCode,
        normalizedAddressKey,
        validationStatus: 'UNVERIFIED',
      },
      select: {
        id: true,
        name: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        state: true,
        postalCode: true,
        validationStatus: true,
      },
    });

    return NextResponse.json({ location }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating location:', error);
    return NextResponse.json({ error: 'Failed to create location' }, { status: 500 });
  }
}
