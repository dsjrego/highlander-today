import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { logActivity } from '@/lib/activity-log';
import { hasOrganizationAdminAccess } from '@/lib/organization-admin';

const UpdateOrganizationFormQuestionSchema = z
  .object({
    prompt: z.string().trim().min(3).max(500).optional(),
    helpText: z.string().trim().max(2000).optional().or(z.literal('')),
    type: z.enum(['TEXT_SHORT', 'TEXT_LONG', 'SINGLE_CHOICE', 'MULTIPLE_CHOICE']).optional(),
    isRequired: z.boolean().optional(),
    sortOrder: z.coerce.number().int().min(0).max(9999).optional(),
    options: z.array(z.string().trim().min(1).max(160)).max(50).optional(),
  })
  .superRefine((value, ctx) => {
    const choiceType = value.type === 'SINGLE_CHOICE' || value.type === 'MULTIPLE_CHOICE';
    if (choiceType && value.options && value.options.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['options'],
        message: 'Choice questions need at least two options.',
      });
    }
  });

async function getQuestion(params: { id: string; formId: string; questionId: string }, communityId?: string) {
  return db.organizationFormQuestion.findFirst({
    where: {
      id: params.questionId,
      formId: params.formId,
      form: {
        organizationId: params.id,
        ...(communityId ? { organization: { communityId } } : {}),
      },
    },
    select: {
      id: true,
      formId: true,
      type: true,
      form: {
        select: {
          organizationId: true,
        },
      },
    },
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; formId: string; questionId: string } }
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

    const existing = await getQuestion(params, communityId);
    if (!existing) {
      return NextResponse.json({ error: 'Organization form question not found' }, { status: 404 });
    }

    const validated = UpdateOrganizationFormQuestionSchema.parse(await request.json());
    const nextType = validated.type ?? existing.type;

    if ((nextType === 'SINGLE_CHOICE' || nextType === 'MULTIPLE_CHOICE') && validated.options && validated.options.length < 2) {
      return NextResponse.json({ error: 'Choice questions need at least two options.' }, { status: 400 });
    }

    await db.organizationFormQuestion.update({
      where: { id: existing.id },
      data: {
        prompt: validated.prompt,
        helpText: validated.helpText === undefined ? undefined : validated.helpText || null,
        type: validated.type,
        isRequired: validated.isRequired,
        sortOrder: validated.sortOrder,
      },
    });

    if (validated.options) {
      await db.organizationFormQuestionOption.deleteMany({
        where: { questionId: existing.id },
      });

      if (nextType === 'SINGLE_CHOICE' || nextType === 'MULTIPLE_CHOICE') {
        await db.organizationFormQuestionOption.createMany({
          data: validated.options.map((label, index) => ({
            questionId: existing.id,
            label,
            value: label,
            sortOrder: index,
          })),
        });
      }
    } else if (nextType === 'TEXT_SHORT' || nextType === 'TEXT_LONG') {
      await db.organizationFormQuestionOption.deleteMany({
        where: { questionId: existing.id },
      });
    }

    const question = await db.organizationFormQuestion.findUnique({
      where: { id: existing.id },
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
      where: { id: existing.formId },
      data: {
        updatedByUserId: userId,
      },
    });

    await logActivity({
      userId,
      action: 'UPDATE',
      resourceType: 'USER_PROFILE',
      resourceId: existing.form.organizationId,
      ipAddress: request.headers.get('x-client-ip'),
      metadata: {
        entityType: 'ORGANIZATION_FORM_QUESTION',
        formId: existing.formId,
        questionId: existing.id,
        fields: Object.keys(validated),
      },
    });

    return NextResponse.json({ question });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }

    console.error('Error updating organization form question:', error);
    return NextResponse.json({ error: 'Failed to update organization form question' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; formId: string; questionId: string } }
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

    const existing = await getQuestion(params, communityId);
    if (!existing) {
      return NextResponse.json({ error: 'Organization form question not found' }, { status: 404 });
    }

    await db.organizationFormQuestion.delete({
      where: { id: existing.id },
    });

    await db.organizationForm.update({
      where: { id: existing.formId },
      data: {
        updatedByUserId: userId,
      },
    });

    await logActivity({
      userId,
      action: 'DELETE',
      resourceType: 'USER_PROFILE',
      resourceId: existing.form.organizationId,
      ipAddress: request.headers.get('x-client-ip'),
      metadata: {
        entityType: 'ORGANIZATION_FORM_QUESTION',
        formId: existing.formId,
        questionId: existing.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting organization form question:', error);
    return NextResponse.json({ error: 'Failed to delete organization form question' }, { status: 500 });
  }
}
