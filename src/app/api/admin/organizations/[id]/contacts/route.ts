import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logActivity } from '@/lib/activity-log';
import { hasOrganizationAdminAccess, hasValidPhoneDigits } from '@/lib/organization-admin';

const ContactSchema = z
  .object({
    label: z.string().trim().max(160).optional().or(z.literal('')),
    name: z.string().trim().max(160).optional().or(z.literal('')),
    title: z.string().trim().max(160).optional().or(z.literal('')),
    email: z.string().trim().email().optional().or(z.literal('')),
    phone: z.string().trim().max(40).optional().or(z.literal('')),
    websiteUrl: z.string().trim().url().optional().or(z.literal('')),
    isPublic: z.boolean().optional(),
    sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
    departmentId: z.string().uuid().optional().or(z.literal('')),
    locationId: z.string().uuid().optional().or(z.literal('')),
    userId: z.string().uuid().optional().or(z.literal('')),
  })
  .superRefine((value, ctx) => {
    if (!hasValidPhoneDigits(value.phone || '')) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['phone'],
        message: 'Phone must include 10 digits.',
      });
    }
  });

async function ensureOrganizationRelationIds(organizationId: string, departmentId?: string | null, locationId?: string | null, userId?: string | null) {
  if (departmentId) {
    const department = await db.organizationDepartment.findFirst({
      where: {
        id: departmentId,
        organizationId,
      },
      select: { id: true },
    });
    if (!department) {
      throw new Error('Department not found for this organization');
    }
  }

  if (locationId) {
    const location = await db.organizationLocation.findFirst({
      where: {
        id: locationId,
        organizationId,
      },
      select: { id: true },
    });
    if (!location) {
      throw new Error('Location not found for this organization');
    }
  }

  if (userId) {
    const membership = await db.organizationMembership.findFirst({
      where: {
        organizationId,
        userId,
      },
      select: { id: true },
    });
    if (!membership) {
      throw new Error('User is not attached to this organization');
    }
  }
}

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

    const validated = ContactSchema.parse(await request.json());
    const departmentId = validated.departmentId || null;
    const locationId = validated.locationId || null;
    const linkedUserId = validated.userId || null;

    await ensureOrganizationRelationIds(organization.id, departmentId, locationId, linkedUserId);

    const contact = await db.organizationContact.create({
      data: {
        organizationId: organization.id,
        departmentId,
        locationId,
        userId: linkedUserId,
        label: validated.label || null,
        name: validated.name || null,
        title: validated.title || null,
        email: validated.email || null,
        phone: validated.phone || null,
        websiteUrl: validated.websiteUrl || null,
        isPublic: validated.isPublic ?? true,
        sortOrder: validated.sortOrder ?? 0,
      },
      select: {
        id: true,
        label: true,
        name: true,
        title: true,
        email: true,
        phone: true,
        websiteUrl: true,
        isPublic: true,
        sortOrder: true,
        departmentId: true,
        locationId: true,
        userId: true,
      },
    });

    await logActivity({
      userId,
      action: 'CREATE',
      resourceType: 'USER_PROFILE',
      resourceId: organization.id,
      ipAddress: request.headers.get('x-client-ip'),
      metadata: {
        entityType: 'ORGANIZATION_CONTACT',
        contactId: contact.id,
      },
    });

    return NextResponse.json({ contact }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error('Error creating organization contact:', error);
    return NextResponse.json({ error: 'Failed to create contact' }, { status: 500 });
  }
}
