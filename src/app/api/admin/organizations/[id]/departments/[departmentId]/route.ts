import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logActivity } from '@/lib/activity-log';
import { hasOrganizationAdminAccess, hasValidPhoneDigits } from '@/lib/organization-admin';

const UpdateDepartmentSchema = z
  .object({
    name: z.string().trim().min(2).max(160).optional(),
    slug: z.string().trim().max(160).optional().or(z.literal('')),
    description: z.string().trim().max(2000).optional().or(z.literal('')),
    contactEmail: z.string().trim().email().optional().or(z.literal('')),
    contactPhone: z.string().trim().max(40).optional().or(z.literal('')),
    websiteUrl: z.string().trim().url().optional().or(z.literal('')),
    hoursSummary: z.string().trim().max(255).optional().or(z.literal('')),
    isPublic: z.boolean().optional(),
    sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
    locationId: z.string().uuid().optional().or(z.literal('')),
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

async function findDepartment(organizationId: string, departmentId: string) {
  return db.organizationDepartment.findFirst({
    where: {
      id: departmentId,
      organizationId,
    },
    select: { id: true },
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; departmentId: string } }
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

    const existing = await findDepartment(organization.id, params.departmentId);
    if (!existing) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    }

    const validated = UpdateDepartmentSchema.parse(await request.json());
    const locationId = validated.locationId === undefined ? undefined : validated.locationId || null;

    if (locationId) {
      const location = await db.organizationLocation.findFirst({
        where: {
          id: locationId,
          organizationId: organization.id,
        },
        select: { id: true },
      });

      if (!location) {
        return NextResponse.json({ error: 'Location not found for this organization' }, { status: 404 });
      }
    }

    const department = await db.organizationDepartment.update({
      where: { id: params.departmentId },
      data: {
        name: validated.name,
        slug: validated.slug === undefined ? undefined : validated.slug || null,
        description: validated.description === undefined ? undefined : validated.description || null,
        contactEmail: validated.contactEmail === undefined ? undefined : validated.contactEmail || null,
        contactPhone: validated.contactPhone === undefined ? undefined : validated.contactPhone || null,
        websiteUrl: validated.websiteUrl === undefined ? undefined : validated.websiteUrl || null,
        hoursSummary: validated.hoursSummary === undefined ? undefined : validated.hoursSummary || null,
        isPublic: validated.isPublic,
        sortOrder: validated.sortOrder,
        locationId,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        contactEmail: true,
        contactPhone: true,
        websiteUrl: true,
        hoursSummary: true,
        isPublic: true,
        sortOrder: true,
        locationId: true,
      },
    });

    await logActivity({
      userId,
      action: 'UPDATE',
      resourceType: 'USER_PROFILE',
      resourceId: organization.id,
      ipAddress: request.headers.get('x-client-ip'),
      metadata: {
        entityType: 'ORGANIZATION_DEPARTMENT',
        departmentId: department.id,
      },
    });

    return NextResponse.json({ department });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }

    console.error('Error updating organization department:', error);
    return NextResponse.json({ error: 'Failed to update department' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; departmentId: string } }
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

    const existing = await findDepartment(organization.id, params.departmentId);
    if (!existing) {
      return NextResponse.json({ error: 'Department not found' }, { status: 404 });
    }

    await db.organizationDepartment.delete({
      where: { id: params.departmentId },
    });

    await logActivity({
      userId,
      action: 'DELETE',
      resourceType: 'USER_PROFILE',
      resourceId: organization.id,
      ipAddress: request.headers.get('x-client-ip'),
      metadata: {
        entityType: 'ORGANIZATION_DEPARTMENT',
        departmentId: params.departmentId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting organization department:', error);
    return NextResponse.json({ error: 'Failed to delete department' }, { status: 500 });
  }
}
