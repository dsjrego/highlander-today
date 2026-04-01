import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logActivity } from '@/lib/activity-log';
import { hasOrganizationAdminAccess, hasValidPhoneDigits } from '@/lib/organization-admin';

const LocationSchema = z
  .object({
    label: z.string().trim().max(160).optional().or(z.literal('')),
    addressLine1: z.string().trim().min(3).max(160),
    addressLine2: z.string().trim().max(160).optional().or(z.literal('')),
    city: z.string().trim().min(2).max(120),
    state: z.string().trim().min(2).max(80),
    postalCode: z.string().trim().max(20).optional().or(z.literal('')),
    municipality: z.string().trim().max(120).optional().or(z.literal('')),
    contactEmail: z.string().trim().email().optional().or(z.literal('')),
    contactPhone: z.string().trim().max(40).optional().or(z.literal('')),
    websiteUrl: z.string().trim().url().optional().or(z.literal('')),
    hoursSummary: z.string().trim().max(255).optional().or(z.literal('')),
    isPrimary: z.boolean().optional(),
    isPublic: z.boolean().optional(),
    sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
  })
  .superRefine((value, ctx) => {
    if (!hasValidPhoneDigits(value.contactPhone || '')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['contactPhone'],
        message: 'Contact phone must include 10 digits.',
      });
    }
  });

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role') || '';
    const communityId = request.headers.get('x-community-id') || undefined;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasOrganizationAdminAccess(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const organization = await db.organization.findFirst({
      where: {
        id: params.id,
        ...(communityId ? { communityId } : {}),
      },
      select: { id: true },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const validated = LocationSchema.parse(await request.json());

    const location = await db.organizationLocation.create({
      data: {
        organizationId: organization.id,
        label: validated.label || null,
        addressLine1: validated.addressLine1,
        addressLine2: validated.addressLine2 || null,
        city: validated.city,
        state: validated.state,
        postalCode: validated.postalCode || null,
        municipality: validated.municipality || null,
        contactEmail: validated.contactEmail || null,
        contactPhone: validated.contactPhone || null,
        websiteUrl: validated.websiteUrl || null,
        hoursSummary: validated.hoursSummary || null,
        isPrimary: validated.isPrimary ?? false,
        isPublic: validated.isPublic ?? true,
        sortOrder: validated.sortOrder ?? 0,
      },
      select: {
        id: true,
        label: true,
        addressLine1: true,
        addressLine2: true,
        city: true,
        state: true,
        postalCode: true,
        municipality: true,
        contactEmail: true,
        contactPhone: true,
        websiteUrl: true,
        hoursSummary: true,
        isPrimary: true,
        isPublic: true,
        sortOrder: true,
      },
    });

    if (location.isPrimary) {
      await db.organizationLocation.updateMany({
        where: {
          organizationId: organization.id,
          NOT: { id: location.id },
        },
        data: {
          isPrimary: false,
        },
      });
    }

    await logActivity({
      userId,
      action: 'CREATE',
      resourceType: 'USER_PROFILE',
      resourceId: organization.id,
      ipAddress: request.headers.get('x-client-ip'),
      metadata: {
        entityType: 'ORGANIZATION_LOCATION',
        locationId: location.id,
      },
    });

    return NextResponse.json({ location }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }

    console.error('Error creating organization location:', error);
    return NextResponse.json({ error: 'Failed to create location' }, { status: 500 });
  }
}
