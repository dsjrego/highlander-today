import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logActivity } from '@/lib/activity-log';
import { hasOrganizationAdminAccess, hasValidPhoneDigits } from '@/lib/organization-admin';

const DepartmentSchema = z
  .object({
    name: z.string().trim().min(2).max(160),
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

    const validated = DepartmentSchema.parse(await request.json());
    const locationId = validated.locationId || null;

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

    const department = await db.organizationDepartment.create({
      data: {
        organizationId: organization.id,
        locationId,
        name: validated.name,
        slug: validated.slug || null,
        description: validated.description || null,
        contactEmail: validated.contactEmail || null,
        contactPhone: validated.contactPhone || null,
        websiteUrl: validated.websiteUrl || null,
        hoursSummary: validated.hoursSummary || null,
        isPublic: validated.isPublic ?? true,
        sortOrder: validated.sortOrder ?? 0,
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
      action: 'CREATE',
      resourceType: 'USER_PROFILE',
      resourceId: organization.id,
      ipAddress: request.headers.get('x-client-ip'),
      metadata: {
        entityType: 'ORGANIZATION_DEPARTMENT',
        departmentId: department.id,
      },
    });

    return NextResponse.json({ department }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }

    console.error('Error creating organization department:', error);
    return NextResponse.json({ error: 'Failed to create department' }, { status: 500 });
  }
}
