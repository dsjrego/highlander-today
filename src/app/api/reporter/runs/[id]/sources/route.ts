import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getCurrentCommunity } from '@/lib/community';
import { logActivity } from '@/lib/activity-log';
import { canAddReporterSource } from '@/lib/reporter/permissions';

const CreateReporterSourceSchema = z.object({
  sourceType: z.enum([
    'USER_NOTE',
    'STAFF_NOTE',
    'INTERVIEW_NOTE',
    'TRANSCRIPT_EXCERPT',
    'DOCUMENT',
    'OFFICIAL_URL',
    'NEWS_ARTICLE',
    'HIGHLANDER_ARTICLE',
    'EVENT_RECORD',
    'ORGANIZATION_RECORD',
    'PLACE_RECORD',
  ]),
  title: z.string().trim().optional().nullable(),
  url: z.string().trim().url().optional().nullable().or(z.literal('')),
  publisher: z.string().trim().optional().nullable(),
  author: z.string().trim().optional().nullable(),
  excerpt: z.string().trim().optional().nullable(),
  note: z.string().trim().optional().nullable(),
  contentText: z.string().trim().optional().nullable(),
  reliabilityTier: z
    .enum(['PRIMARY', 'HIGH', 'MEDIUM', 'LOW', 'UNVERIFIED'])
    .optional()
    .default('UNVERIFIED'),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role') || '';
    const ipAddress = request.headers.get('x-client-ip');

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canAddReporterSource(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const currentCommunity = await getCurrentCommunity({ headers: request.headers });
    const existingRun = await db.reporterRun.findUnique({
      where: { id: params.id },
      select: { id: true, communityId: true, _count: { select: { sources: true } } },
    });

    if (!existingRun || (currentCommunity && existingRun.communityId !== currentCommunity.id)) {
      return NextResponse.json({ error: 'Reporter run not found' }, { status: 404 });
    }

    const body = await request.json();
    const validated = CreateReporterSourceSchema.parse(body);

    const source = await db.reporterSource.create({
      data: {
        reporterRunId: existingRun.id,
        sourceType: validated.sourceType,
        title: validated.title || null,
        url: validated.url || null,
        publisher: validated.publisher || null,
        author: validated.author || null,
        excerpt: validated.excerpt || null,
        note: validated.note || null,
        contentText: validated.contentText || null,
        reliabilityTier: validated.reliabilityTier,
        sortOrder: existingRun._count.sources,
        createdByUserId: userId,
      },
    });

    await logActivity({
      userId,
      action: 'UPDATE',
      resourceType: 'REPORTER_RUN',
      resourceId: existingRun.id,
      ipAddress,
      metadata: { sourceAdded: source.id, sourceType: source.sourceType },
    });

    return NextResponse.json(source, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating reporter source:', error);
    return NextResponse.json({ error: 'Failed to create source' }, { status: 500 });
  }
}
