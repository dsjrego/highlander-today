import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logActivity } from '@/lib/activity-log';
import { hasOrganizationAdminAccess } from '@/lib/organization-admin';

const OrganizationFormQuestionSchema = z
  .object({
    prompt: z.string().trim().min(3).max(500),
    helpText: z.string().trim().max(2000).optional().or(z.literal('')),
    type: z.enum(['TEXT_SHORT', 'TEXT_LONG', 'SINGLE_CHOICE', 'MULTIPLE_CHOICE']),
    isRequired: z.boolean().optional(),
    sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
    options: z.array(z.string().trim().min(1).max(160)).max(50).optional(),
  })
  .superRefine((value, ctx) => {
    if ((value.type === 'SINGLE_CHOICE' || value.type === 'MULTIPLE_CHOICE') && (!value.options || value.options.length < 2)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['options'],
        message: 'Choice questions need at least two options.',
      });
    }
  });

export async function POST(request: NextRequest, { params }: { params: { id: string; formId: string } }) {
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

    const form = await db.organizationForm.findFirst({
      where: {
        id: params.formId,
        organizationId: params.id,
        organization: communityId ? { communityId } : undefined,
      },
      select: {
        id: true,
        organizationId: true,
      },
    });

    if (!form) {
      return NextResponse.json({ error: 'Organization form not found' }, { status: 404 });
    }

    const validated = OrganizationFormQuestionSchema.parse(await request.json());
    const options = (validated.options || []).map((label, index) => ({
      label,
      value: label,
      sortOrder: index,
    }));

    const question = await db.organizationFormQuestion.create({
      data: {
        formId: form.id,
        prompt: validated.prompt,
        helpText: validated.helpText || null,
        type: validated.type,
        isRequired: validated.isRequired ?? false,
        sortOrder: validated.sortOrder ?? 0,
        options: options.length
          ? {
              create: options,
            }
          : undefined,
      },
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
    });

    await db.organizationForm.update({
      where: { id: form.id },
      data: {
        updatedByUserId: userId,
      },
    });

    await logActivity({
      userId,
      action: 'CREATE',
      resourceType: 'USER_PROFILE',
      resourceId: form.organizationId,
      ipAddress: request.headers.get('x-client-ip'),
      metadata: {
        entityType: 'ORGANIZATION_FORM_QUESTION',
        formId: form.id,
        questionId: question.id,
      },
    });

    return NextResponse.json({ question }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }

    console.error('Error creating organization form question:', error);
    return NextResponse.json({ error: 'Failed to create organization form question' }, { status: 500 });
  }
}
