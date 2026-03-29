import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { isValidOrganizationType } from '@/lib/organization-taxonomy';
import { checkPermission } from '@/lib/permissions';

function hasValidPhoneDigits(value: string) {
  const digits = value.replace(/\D/g, '');
  return digits.length === 0 || digits.length === 10;
}

const CreateOrganizationSchema = z.object({
  name: z.string().trim().min(3).max(160),
  directoryGroup: z.enum(['BUSINESS', 'GOVERNMENT', 'ORGANIZATION']),
  organizationType: z.string().trim().min(2).max(80),
  description: z.string().trim().max(4000).optional().or(z.literal('')),
  websiteUrl: z.string().trim().url().optional().or(z.literal('')),
  contactEmail: z.string().trim().email().optional().or(z.literal('')),
  contactPhone: z.string().trim().max(40).optional().or(z.literal('')),
  isPublicMemberRoster: z.boolean().optional(),
  status: z.enum(['PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'SUSPENDED']).default('PENDING_APPROVAL'),
}).superRefine((value, ctx) => {
  if (!isValidOrganizationType(value.directoryGroup, value.organizationType)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['organizationType'],
      message: 'Organization type is not valid for the selected group.',
    });
  }

  if (!hasValidPhoneDigits(value.contactPhone || '')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['contactPhone'],
      message: 'Contact phone must include 10 digits.',
    });
  }
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

function createBaseSlug(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || 'organization';
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role') || '';

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!checkPermission(userRole, 'articles:approve')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const communityId = await resolveCommunityId(request);
    if (!communityId) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 });
    }

    const body = await request.json();
    const validated = CreateOrganizationSchema.parse(body);

    const baseSlug = createBaseSlug(validated.name);
    const existingCount = await db.organization.count({
      where: {
        communityId,
        slug: {
          startsWith: baseSlug,
        },
      },
    });
    const slug = existingCount > 0 ? `${baseSlug}-${existingCount + 1}` : baseSlug;

    const approvedAt = validated.status === 'APPROVED' ? new Date() : null;
    const approvedByUserId = validated.status === 'APPROVED' ? userId : null;

    const organization = await db.organization.create({
      data: {
        communityId,
        createdByUserId: userId,
        approvedByUserId,
        name: validated.name,
        slug,
        description: validated.description || null,
        websiteUrl: validated.websiteUrl || null,
        contactEmail: validated.contactEmail || null,
        contactPhone: validated.contactPhone || null,
        directoryGroup: validated.directoryGroup,
        organizationType: validated.organizationType,
        isPublicMemberRoster: validated.isPublicMemberRoster ?? false,
        status: validated.status,
        approvedAt,
        memberships: {
          create: {
            userId,
            role: 'OWNER',
            status: 'ACTIVE',
            isPublic: false,
            isPrimaryContact: true,
          },
        },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        directoryGroup: true,
        organizationType: true,
        updatedAt: true,
        createdAt: true,
        createdBy: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: {
            memberships: true,
            locations: true,
            departments: true,
            contacts: true,
          },
        },
      },
    });

    return NextResponse.json({ organization }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating organization:', error);
    return NextResponse.json(
      { error: 'Failed to create organization' },
      { status: 500 }
    );
  }
}
