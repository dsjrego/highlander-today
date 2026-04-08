import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logActivity } from '@/lib/activity-log';
import { hasOrganizationAdminAccess } from '@/lib/organization-admin';
import { slugifyOrganizationFormTitle } from '@/lib/organization-forms';
import { sanitizeArticleHtml } from '@/lib/sanitize';

const OrganizationFormSchema = z.object({
  title: z.string().trim().min(3).max(160),
  description: z.string().trim().max(4000).optional().or(z.literal('')),
  status: z.enum(['DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED']).optional(),
  isPubliclyListed: z.boolean().optional(),
  minimumTrustLevel: z.enum(['REGISTERED', 'TRUSTED']).optional(),
  opensAt: z.string().datetime().optional().or(z.literal('')),
  closesAt: z.string().datetime().optional().or(z.literal('')),
});

function buildFormTimestamps(status: 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'ARCHIVED') {
  const now = new Date();

  return {
    publishedAt: status === 'PUBLISHED' ? now : null,
    closedAt: status === 'CLOSED' ? now : null,
  };
}

async function buildUniqueFormSlug(organizationId: string, title: string) {
  const baseSlug = slugifyOrganizationFormTitle(title) || 'form';
  const existing = await db.organizationForm.findMany({
    where: {
      organizationId,
      slug: {
        startsWith: baseSlug,
      },
    },
    select: {
      slug: true,
    },
  });

  const taken = new Set(existing.map((entry) => entry.slug));

  if (!taken.has(baseSlug)) {
    return baseSlug;
  }

  let suffix = 2;
  while (taken.has(`${baseSlug}-${suffix}`)) {
    suffix += 1;
  }

  return `${baseSlug}-${suffix}`;
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
      select: {
        id: true,
      },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const validated = OrganizationFormSchema.parse(await request.json());
    const status = validated.status ?? 'DRAFT';
    const timestamps = buildFormTimestamps(status);
    const slug = await buildUniqueFormSlug(organization.id, validated.title);

    const form = await db.organizationForm.create({
      data: {
        organizationId: organization.id,
        createdByUserId: userId,
        updatedByUserId: userId,
        title: validated.title,
        slug,
        description: validated.description ? sanitizeArticleHtml(validated.description) : null,
        status,
        isPubliclyListed: validated.isPubliclyListed ?? false,
        minimumTrustLevel: validated.minimumTrustLevel ?? 'REGISTERED',
        opensAt: validated.opensAt ? new Date(validated.opensAt) : null,
        closesAt: validated.closesAt ? new Date(validated.closesAt) : null,
        publishedAt: timestamps.publishedAt,
        closedAt: timestamps.closedAt,
      },
      select: {
        id: true,
        title: true,
        slug: true,
        description: true,
        status: true,
        isPubliclyListed: true,
        minimumTrustLevel: true,
        opensAt: true,
        closesAt: true,
        publishedAt: true,
        closedAt: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            questions: true,
            submissions: true,
          },
        },
        questions: {
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          select: {
            id: true,
            prompt: true,
            helpText: true,
            type: true,
            isRequired: true,
            sortOrder: true,
            options: {
              orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
              select: {
                id: true,
                label: true,
                value: true,
                sortOrder: true,
              },
            },
          },
        },
      },
    });

    await logActivity({
      userId,
      action: 'CREATE',
      resourceType: 'USER_PROFILE',
      resourceId: organization.id,
      ipAddress: request.headers.get('x-client-ip'),
      metadata: {
        entityType: 'ORGANIZATION_FORM',
        formId: form.id,
      },
    });

    return NextResponse.json({ form }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }

    console.error('Error creating organization form:', error);
    return NextResponse.json({ error: 'Failed to create organization form' }, { status: 500 });
  }
}
