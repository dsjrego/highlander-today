import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getCurrentCommunity } from '@/lib/community';
import { hasTrustedAccess } from '@/lib/trust-access';

const SubmissionSchema = z.object({
  answers: z.record(
    z.string(),
    z.union([z.string(), z.array(z.string())]).optional()
  ),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string; formSlug: string } }
) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role') || '';

    const currentCommunity = await getCurrentCommunity({ headers: request.headers });
    if (!currentCommunity) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 });
    }

    const form = await db.organizationForm.findFirst({
      where: {
        slug: params.formSlug,
        status: 'PUBLISHED',
        organization: {
          communityId: currentCommunity.id,
          slug: params.slug,
          status: 'APPROVED',
        },
      },
      select: {
        id: true,
        organizationId: true,
        minimumTrustLevel: true,
        opensAt: true,
        closesAt: true,
        questions: {
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          select: {
            id: true,
            prompt: true,
            type: true,
            isRequired: true,
            options: {
              select: {
                id: true,
                label: true,
              },
            },
          },
        },
      },
    });

    if (!form) {
      return NextResponse.json({ error: 'Form not found' }, { status: 404 });
    }

    const allowsAnonymousResponses = form.minimumTrustLevel === 'ANONYMOUS';

    if (!allowsAnonymousResponses && !userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = userId
      ? await db.user.findUnique({
          where: { id: userId },
          select: {
            trustLevel: true,
          },
        })
      : null;

    if (userId && (!user || user.trustLevel === 'SUSPENDED')) {
      return NextResponse.json({ error: 'Account not allowed to submit forms' }, { status: 403 });
    }

    if (form.minimumTrustLevel === 'REGISTERED' && !userId) {
      return NextResponse.json({ error: 'Sign in is required for this form' }, { status: 401 });
    }

    if (form.minimumTrustLevel === 'TRUSTED' && !hasTrustedAccess({ trustLevel: user?.trustLevel, role: userRole })) {
      return NextResponse.json({ error: 'Trusted access is required for this form' }, { status: 403 });
    }

    const now = new Date();
    if (form.opensAt && form.opensAt > now) {
      return NextResponse.json({ error: 'This form is not open yet' }, { status: 400 });
    }

    if (form.closesAt && form.closesAt < now) {
      return NextResponse.json({ error: 'This form is closed' }, { status: 400 });
    }

    if (!allowsAnonymousResponses && userId) {
      const existingSubmission = await db.organizationFormSubmission.findFirst({
        where: {
          formId: form.id,
          userId,
        },
        select: { id: true },
      });

      if (existingSubmission) {
        return NextResponse.json({ error: 'You have already submitted this form' }, { status: 409 });
      }
    }

    const body = SubmissionSchema.parse(await request.json());
    const answersByQuestionId = body.answers ?? {};
    const answerRows: Array<{ questionId: string; selectedOptionId?: string; textValue?: string }> = [];

    for (const question of form.questions) {
      const rawValue = answersByQuestionId[question.id];

      if (question.type === 'TEXT_SHORT' || question.type === 'TEXT_LONG') {
        const textValue = typeof rawValue === 'string' ? rawValue.trim() : '';

        if (question.isRequired && !textValue) {
          return NextResponse.json({ error: `Answer required for "${question.prompt}"` }, { status: 400 });
        }

        if (textValue) {
          answerRows.push({ questionId: question.id, textValue });
        }
        continue;
      }

      if (question.type === 'SINGLE_CHOICE') {
        const selectedOptionId = typeof rawValue === 'string' ? rawValue : '';
        const isValidOption = question.options.some((option) => option.id === selectedOptionId);

        if (question.isRequired && !selectedOptionId) {
          return NextResponse.json({ error: `Answer required for "${question.prompt}"` }, { status: 400 });
        }

        if (selectedOptionId && !isValidOption) {
          return NextResponse.json({ error: `Invalid answer for "${question.prompt}"` }, { status: 400 });
        }

        if (selectedOptionId) {
          answerRows.push({ questionId: question.id, selectedOptionId });
        }
        continue;
      }

      const selectedOptionIds = Array.isArray(rawValue) ? rawValue : typeof rawValue === 'string' && rawValue ? [rawValue] : [];
      const validOptionIds = new Set(question.options.map((option) => option.id));
      const invalidOptionId = selectedOptionIds.find((optionId) => !validOptionIds.has(optionId));

      if (question.isRequired && selectedOptionIds.length === 0) {
        return NextResponse.json({ error: `Answer required for "${question.prompt}"` }, { status: 400 });
      }

      if (invalidOptionId) {
        return NextResponse.json({ error: `Invalid answer for "${question.prompt}"` }, { status: 400 });
      }

      for (const optionId of selectedOptionIds) {
        answerRows.push({ questionId: question.id, selectedOptionId: optionId });
      }
    }

    await db.organizationFormSubmission.create({
      data: {
        formId: form.id,
        organizationId: form.organizationId,
        userId: allowsAnonymousResponses ? null : userId,
        communityId: currentCommunity.id,
        answers: {
          create: answerRows,
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }

    console.error('Error submitting organization form:', error);
    return NextResponse.json({ error: 'Failed to submit form' }, { status: 500 });
  }
}
