import { NextRequest, NextResponse } from 'next/server';
import { ReporterSourceFetchStatus } from '@prisma/client';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getCurrentCommunity } from '@/lib/community';
import { logActivity } from '@/lib/activity-log';
import { canEditReporterRun } from '@/lib/reporter/permissions';
import { recordReporterMonitoredSourceFetch } from '@/lib/reporter/monitored-source-ingestion';

const recordFetchSchema = z.object({
  status: z.nativeEnum(ReporterSourceFetchStatus),
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  httpStatus: z.number().int().min(100).max(599).optional(),
  responseEtag: z.string().trim().max(255).optional().or(z.literal('')),
  responseLastModified: z.string().trim().max(255).optional().or(z.literal('')),
  errorMessage: z.string().trim().max(1000).optional().or(z.literal('')),
  items: z
    .array(
      z.object({
        dedupeKey: z.string().trim().max(255).optional(),
        externalId: z.string().trim().max(255).optional(),
        canonicalUrl: z.string().trim().max(2048).optional(),
        title: z.string().trim().min(1).max(300),
        excerpt: z.string().trim().max(4000).optional(),
        publishedAt: z.string().datetime().optional(),
        retrievedAt: z.string().datetime().optional(),
        publisher: z.string().trim().max(255).optional(),
        contentText: z.string().trim().max(12000).optional(),
        metadataJson: z.any().optional(),
      })
    )
    .max(100)
    .optional(),
});

function hasValidMachineIngestToken(request: NextRequest) {
  const configuredToken = process.env.REPORTER_SOURCE_INGEST_TOKEN?.trim();
  if (!configuredToken) {
    return false;
  }

  const authorization = request.headers.get('authorization') || '';
  const bearerMatch = authorization.match(/^Bearer\s+(.+)$/i);
  return Boolean(bearerMatch?.[1] && bearerMatch[1].trim() === configuredToken);
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const usingMachineToken = hasValidMachineIngestToken(request);
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role') || '';
    const ipAddress = request.headers.get('x-client-ip');

    if (!usingMachineToken && (!userId || !canEditReporterRun(userRole))) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const currentCommunity = usingMachineToken
      ? null
      : await getCurrentCommunity({ headers: request.headers });
    if (!usingMachineToken && !currentCommunity) {
      return NextResponse.json({ error: 'Community context not found' }, { status: 400 });
    }

    const existing = await db.reporterMonitoredSource.findUnique({
      where: { id: params.id },
      select: { id: true, communityId: true },
    });

    if (!existing || (!usingMachineToken && existing.communityId !== currentCommunity?.id)) {
      return NextResponse.json({ error: 'Monitored source not found' }, { status: 404 });
    }

    const body = await request.json();
    const validated = recordFetchSchema.parse(body);

    const result = await recordReporterMonitoredSourceFetch({
      monitoredSourceId: params.id,
      status: validated.status,
      startedAt: validated.startedAt,
      completedAt: validated.completedAt,
      httpStatus: validated.httpStatus,
      responseEtag: validated.responseEtag,
      responseLastModified: validated.responseLastModified,
      errorMessage: validated.errorMessage,
      items: validated.items,
    });

    await logActivity({
      userId: userId || 'reporter-local-collector',
      action: 'CREATE',
      resourceType: 'REPORTER_SOURCE_FETCH',
      resourceId: result.fetch.id,
      ipAddress,
      metadata: {
        monitoredSourceId: params.id,
        status: validated.status,
        itemCount: result.summary.itemCount,
        newItemCount: result.summary.newItemCount,
        changedItemCount: result.summary.changedItemCount,
        ingestedBy: usingMachineToken ? 'machine-token' : 'editor-session',
      },
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.error('Error recording reporter monitored source fetch:', error);
    return NextResponse.json(
      { error: 'Failed to record reporter monitored source fetch' },
      { status: 500 }
    );
  }
}
