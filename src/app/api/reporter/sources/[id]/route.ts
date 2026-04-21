import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getCurrentCommunity } from '@/lib/community';
import { logActivity } from '@/lib/activity-log';
import { canAddReporterSource } from '@/lib/reporter/permissions';

const UpdateReporterSourceSchema = z.object({
  sourceType: z
    .enum([
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
    ])
    .optional(),
  title: z.string().trim().optional().nullable(),
  url: z.string().trim().url().optional().nullable().or(z.literal('')),
  publisher: z.string().trim().optional().nullable(),
  author: z.string().trim().optional().nullable(),
  excerpt: z.string().trim().optional().nullable(),
  note: z.string().trim().optional().nullable(),
  contentText: z.string().trim().optional().nullable(),
  reliabilityTier: z.enum(['PRIMARY', 'HIGH', 'MEDIUM', 'LOW', 'UNVERIFIED']).optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export async function PATCH(
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
    const existing = await db.reporterSource.findUnique({
      where: { id: params.id },
      include: { reporterRun: { select: { id: true, communityId: true } } },
    });

    if (
      !existing ||
      (currentCommunity && existing.reporterRun.communityId !== currentCommunity.id)
    ) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    const body = await request.json();
    const validated = UpdateReporterSourceSchema.parse(body);

    const updated = await db.reporterSource.update({
      where: { id: params.id },
      data: {
        ...(validated.sourceType !== undefined ? { sourceType: validated.sourceType } : {}),
        ...(validated.title !== undefined ? { title: validated.title || null } : {}),
        ...(validated.url !== undefined ? { url: validated.url || null } : {}),
        ...(validated.publisher !== undefined ? { publisher: validated.publisher || null } : {}),
        ...(validated.author !== undefined ? { author: validated.author || null } : {}),
        ...(validated.excerpt !== undefined ? { excerpt: validated.excerpt || null } : {}),
        ...(validated.note !== undefined ? { note: validated.note || null } : {}),
        ...(validated.contentText !== undefined
          ? { contentText: validated.contentText || null }
          : {}),
        ...(validated.reliabilityTier !== undefined
          ? { reliabilityTier: validated.reliabilityTier }
          : {}),
        ...(validated.sortOrder !== undefined ? { sortOrder: validated.sortOrder } : {}),
      },
    });

    await logActivity({
      userId,
      action: 'UPDATE',
      resourceType: 'REPORTER_RUN',
      resourceId: existing.reporterRunId,
      ipAddress,
      metadata: { sourceUpdated: updated.id },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error updating reporter source:', error);
    return NextResponse.json({ error: 'Failed to update source' }, { status: 500 });
  }
}

export async function DELETE(
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
    const existing = await db.reporterSource.findUnique({
      where: { id: params.id },
      include: { reporterRun: { select: { id: true, communityId: true } } },
    });

    if (
      !existing ||
      (currentCommunity && existing.reporterRun.communityId !== currentCommunity.id)
    ) {
      return NextResponse.json({ error: 'Source not found' }, { status: 404 });
    }

    await db.reporterSource.delete({ where: { id: params.id } });

    await logActivity({
      userId,
      action: 'UPDATE',
      resourceType: 'REPORTER_RUN',
      resourceId: existing.reporterRunId,
      ipAddress,
      metadata: { sourceDeleted: existing.id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting reporter source:', error);
    return NextResponse.json({ error: 'Failed to delete source' }, { status: 500 });
  }
}
