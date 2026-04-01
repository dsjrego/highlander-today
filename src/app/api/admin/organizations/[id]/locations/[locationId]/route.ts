import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logActivity } from '@/lib/activity-log';
import { hasOrganizationAdminAccess, hasValidPhoneDigits } from '@/lib/organization-admin';

const UpdateLocationSchema = z
  .object({
    label: z.string().trim().max(160).optional().or(z.literal('')),
    addressLine1: z.string().trim().min(3).max(160).optional(),
    addressLine2: z.string().trim().max(160).optional().or(z.literal('')),
    city: z.string().trim().min(2).max(120).optional(),
    state: z.string().trim().min(2).max(80).optional(),
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

async function findLocation(organizationId: string, locationId: string) {
  return db.organizationLocation.findFirst({
    where: {
      id: locationId,
      organizationId,
    },
    select: {
      id: true,
    },
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; locationId: string } }
) {
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

    const existing = await findLocation(organization.id, params.locationId);
    if (!existing) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    const validated = UpdateLocationSchema.parse(await request.json());

    const location = await db.organizationLocation.update({
      where: { id: params.locationId },
      data: {
        label: validated.label === undefined ? undefined : validated.label || null,
        addressLine1: validated.addressLine1,
        addressLine2: validated.addressLine2 === undefined ? undefined : validated.addressLine2 || null,
        city: validated.city,
        state: validated.state,
        postalCode: validated.postalCode === undefined ? undefined : validated.postalCode || null,
        municipality: validated.municipality === undefined ? undefined : validated.municipality || null,
        contactEmail: validated.contactEmail === undefined ? undefined : validated.contactEmail || null,
        contactPhone: validated.contactPhone === undefined ? undefined : validated.contactPhone || null,
        websiteUrl: validated.websiteUrl === undefined ? undefined : validated.websiteUrl || null,
        hoursSummary: validated.hoursSummary === undefined ? undefined : validated.hoursSummary || null,
        isPrimary: validated.isPrimary,
        isPublic: validated.isPublic,
        sortOrder: validated.sortOrder,
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
      action: 'UPDATE',
      resourceType: 'USER_PROFILE',
      resourceId: organization.id,
      ipAddress: request.headers.get('x-client-ip'),
      metadata: {
        entityType: 'ORGANIZATION_LOCATION',
        locationId: location.id,
      },
    });

    return NextResponse.json({ location });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }

    console.error('Error updating organization location:', error);
    return NextResponse.json({ error: 'Failed to update location' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; locationId: string } }
) {
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

    const existing = await findLocation(organization.id, params.locationId);
    if (!existing) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    await db.organizationLocation.delete({
      where: { id: params.locationId },
    });

    await logActivity({
      userId,
      action: 'DELETE',
      resourceType: 'USER_PROFILE',
      resourceId: organization.id,
      ipAddress: request.headers.get('x-client-ip'),
      metadata: {
        entityType: 'ORGANIZATION_LOCATION',
        locationId: params.locationId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting organization location:', error);
    return NextResponse.json({ error: 'Failed to delete location' }, { status: 500 });
  }
}
