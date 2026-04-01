import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logActivity } from '@/lib/activity-log';
import { hasOrganizationAdminAccess, hasValidPhoneDigits } from '@/lib/organization-admin';

const UpdateContactSchema = z
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

async function findContact(organizationId: string, contactId: string) {
  return db.organizationContact.findFirst({
    where: {
      id: contactId,
      organizationId,
    },
    select: { id: true },
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; contactId: string } }
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

    const existing = await findContact(organization.id, params.contactId);
    if (!existing) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    const validated = UpdateContactSchema.parse(await request.json());
    const departmentId = validated.departmentId === undefined ? undefined : validated.departmentId || null;
    const locationId = validated.locationId === undefined ? undefined : validated.locationId || null;
    const linkedUserId = validated.userId === undefined ? undefined : validated.userId || null;

    await ensureOrganizationRelationIds(
      organization.id,
      departmentId === undefined ? null : departmentId,
      locationId === undefined ? null : locationId,
      linkedUserId === undefined ? null : linkedUserId
    );

    const contact = await db.organizationContact.update({
      where: { id: params.contactId },
      data: {
        departmentId,
        locationId,
        userId: linkedUserId,
        label: validated.label === undefined ? undefined : validated.label || null,
        name: validated.name === undefined ? undefined : validated.name || null,
        title: validated.title === undefined ? undefined : validated.title || null,
        email: validated.email === undefined ? undefined : validated.email || null,
        phone: validated.phone === undefined ? undefined : validated.phone || null,
        websiteUrl: validated.websiteUrl === undefined ? undefined : validated.websiteUrl || null,
        isPublic: validated.isPublic,
        sortOrder: validated.sortOrder,
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
      action: 'UPDATE',
      resourceType: 'USER_PROFILE',
      resourceId: organization.id,
      ipAddress: request.headers.get('x-client-ip'),
      metadata: {
        entityType: 'ORGANIZATION_CONTACT',
        contactId: contact.id,
      },
    });

    return NextResponse.json({ contact });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error('Error updating organization contact:', error);
    return NextResponse.json({ error: 'Failed to update contact' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; contactId: string } }
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

    const existing = await findContact(organization.id, params.contactId);
    if (!existing) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 });
    }

    await db.organizationContact.delete({
      where: { id: params.contactId },
    });

    await logActivity({
      userId,
      action: 'DELETE',
      resourceType: 'USER_PROFILE',
      resourceId: organization.id,
      ipAddress: request.headers.get('x-client-ip'),
      metadata: {
        entityType: 'ORGANIZATION_CONTACT',
        contactId: params.contactId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting organization contact:', error);
    return NextResponse.json({ error: 'Failed to delete contact' }, { status: 500 });
  }
}
