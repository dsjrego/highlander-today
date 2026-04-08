import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logActivity } from '@/lib/activity-log';
import { hasOrganizationAdminAccess } from '@/lib/organization-admin';
import { sanitizeArticleHtml } from '@/lib/sanitize';

const UpdateOrganizationFormSchema = z.object({
  title: z.string().trim().min(3).max(160).optional(),
  description: z.string().trim().max(4000).optional().or(z.literal('')),
  status: z.enum(['DRAFT', 'PUBLISHED', 'CLOSED', 'ARCHIVED']).optional(),
  isPubliclyListed: z.boolean().optional(),
  minimumTrustLevel: z.enum(['REGISTERED', 'TRUSTED']).optional(),
  opensAt: z.string().datetime().optional().or(z.literal('')),
  closesAt: z.string().datetime().optional().or(z.literal('')),
});

function buildStatusTimestampPatch(
  currentStatus: 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'ARCHIVED',
  nextStatus: 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'ARCHIVED'
) {
  const now = new Date();
  const patch: {
    publishedAt?: Date | null;
    closedAt?: Date | null;
  } = {};

  if (nextStatus === 'PUBLISHED' && currentStatus !== 'PUBLISHED') {
    patch.publishedAt = now;
    patch.closedAt = null;
  }

  if (nextStatus === 'CLOSED' && currentStatus !== 'CLOSED') {
    patch.closedAt = now;
  }

  if (nextStatus === 'DRAFT') {
    patch.publishedAt = null;
    patch.closedAt = null;
  }

  return patch;
}

async function getOrganizationForm(params: { id: string; formId: string }, communityId?: string) {
  return db.organizationForm.findFirst({
    where: {
      id: params.formId,
      organizationId: params.id,
      organization: communityId ? { communityId } : undefined,
    },
    select: {
      id: true,
      organizationId: true,
      status: true,
    },
  });
}

const formSelect = Prisma.validator<Prisma.OrganizationFormSelect>()({
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
    orderBy: [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }],
    select: {
      id: true,
      prompt: true,
      helpText: true,
      type: true,
      isRequired: true,
      sortOrder: true,
      options: {
        orderBy: [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }],
        select: {
          id: true,
          label: true,
          value: true,
          sortOrder: true,
        },
      },
    },
  },
  submissions: {
    orderBy: [{ submittedAt: 'desc' as const }],
    select: {
      id: true,
      submittedAt: true,
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
        },
      },
      answers: {
        select: {
          id: true,
          questionId: true,
          selectedOptionId: true,
          textValue: true,
        },
      },
    },
  },
});

export async function PATCH(request: NextRequest, { params }: { params: { id: string; formId: string } }) {
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

    const existing = await getOrganizationForm(params, communityId);
    if (!existing) {
      return NextResponse.json({ error: 'Organization form not found' }, { status: 404 });
    }

    const validated = UpdateOrganizationFormSchema.parse(await request.json());
    const nextStatus = validated.status ?? existing.status;

    const form = await db.organizationForm.update({
      where: { id: existing.id },
      data: {
        title: validated.title,
        description:
          validated.description === undefined ? undefined : validated.description ? sanitizeArticleHtml(validated.description) : null,
        status: validated.status,
        isPubliclyListed: validated.isPubliclyListed,
        minimumTrustLevel: validated.minimumTrustLevel,
        opensAt: validated.opensAt === undefined ? undefined : validated.opensAt ? new Date(validated.opensAt) : null,
        closesAt: validated.closesAt === undefined ? undefined : validated.closesAt ? new Date(validated.closesAt) : null,
        updatedByUserId: userId,
        ...buildStatusTimestampPatch(existing.status, nextStatus),
      },
      select: formSelect,
    });

    await logActivity({
      userId,
      action: 'UPDATE',
      resourceType: 'USER_PROFILE',
      resourceId: existing.organizationId,
      ipAddress: request.headers.get('x-client-ip'),
      metadata: {
        entityType: 'ORGANIZATION_FORM',
        formId: existing.id,
        fields: Object.keys(validated),
      },
    });

    return NextResponse.json({ form });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }

    console.error('Error updating organization form:', error);
    return NextResponse.json({ error: 'Failed to update organization form' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string; formId: string } }) {
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

    const existing = await getOrganizationForm(params, communityId);
    if (!existing) {
      return NextResponse.json({ error: 'Organization form not found' }, { status: 404 });
    }

    await db.organizationForm.delete({
      where: { id: existing.id },
    });

    await logActivity({
      userId,
      action: 'DELETE',
      resourceType: 'USER_PROFILE',
      resourceId: existing.organizationId,
      ipAddress: request.headers.get('x-client-ip'),
      metadata: {
        entityType: 'ORGANIZATION_FORM',
        formId: existing.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting organization form:', error);
    return NextResponse.json({ error: 'Failed to delete organization form' }, { status: 500 });
  }
}
