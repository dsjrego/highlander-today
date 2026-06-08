import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { hasValidPhoneDigits } from '@/lib/organization-admin';
import { getAuthorizedWorkspaceOrganization } from '@/lib/workspace-organization-auth';

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

async function ensureOrganizationRelationIds(organizationId: string, locationId?: string | null, userId?: string | null) {
  if (locationId) {
    const location = await db.organizationLocation.findFirst({
      where: { id: locationId, organizationId },
      select: { id: true },
    });
    if (!location) {
      throw new Error('Location not found for this organization');
    }
  }

  if (userId) {
    const membership = await db.organizationMembership.findFirst({
      where: { organizationId, userId, status: 'ACTIVE' },
      select: { id: true },
    });
    if (!membership) {
      throw new Error('User is not an active member of this organization');
    }
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string; organizationId: string } }
) {
  try {
    const actorUserId = request.headers.get('x-user-id');
    if (!actorUserId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const authorization = await getAuthorizedWorkspaceOrganization({
      actorUserId,
      profileUserId: params.id,
      organizationId: params.organizationId,
    });

    if (!authorization) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const validated = ContactSchema.parse(await request.json());
    const locationId = validated.locationId || null;
    const linkedUserId = validated.userId || null;
    await ensureOrganizationRelationIds(authorization.organization.id, locationId, linkedUserId);

    const contact = await db.organizationContact.create({
      data: {
        organizationId: authorization.organization.id,
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
        locationId: true,
        userId: true,
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
    console.error('Error creating workspace organization contact:', error);
    return NextResponse.json({ error: 'Failed to create contact' }, { status: 500 });
  }
}
