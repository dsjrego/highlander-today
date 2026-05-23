import { NextRequest, NextResponse } from 'next/server';
import {
  ReporterMonitoredSourceFormat,
  ReporterMonitoredSourceStatus,
  ReporterMonitoredSourceType,
} from '@prisma/client';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getCurrentCommunity } from '@/lib/community';
import { logActivity } from '@/lib/activity-log';
import { canEditReporterRun } from '@/lib/reporter/permissions';

const updateMonitoredSourceSchema = z.object({
  label: z.string().trim().min(2).max(160).optional(),
  sourceType: z.nativeEnum(ReporterMonitoredSourceType).optional(),
  sourceFormat: z.nativeEnum(ReporterMonitoredSourceFormat).optional(),
  url: z.string().trim().min(3).max(2048).optional(),
  publisher: z.string().trim().max(160).optional().or(z.literal('')),
  notes: z.string().trim().max(1000).optional().or(z.literal('')),
  placeId: z.string().uuid().optional().nullable(),
  status: z.nativeEnum(ReporterMonitoredSourceStatus).optional(),
  fetchFrequencyMinutes: z.number().int().min(15).max(10080).optional(),
});

function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

const monitoredSourceSelect = {
  id: true,
  communityId: true,
  label: true,
  sourceType: true,
  sourceFormat: true,
  url: true,
  publisher: true,
  notes: true,
  status: true,
  fetchFrequencyMinutes: true,
  lastFetchedAt: true,
  lastSuccessfulAt: true,
  lastChangedAt: true,
  lastErrorAt: true,
  lastErrorMessage: true,
  lastHttpStatus: true,
  createdAt: true,
  updatedAt: true,
  place: {
    select: {
      id: true,
      displayName: true,
      slug: true,
      type: true,
    },
  },
  _count: {
    select: {
      fetches: true,
      ingestionItems: true,
    },
  },
  fetches: {
    orderBy: [{ startedAt: 'desc' as const }],
    take: 3,
    select: {
      id: true,
      status: true,
      startedAt: true,
      completedAt: true,
      httpStatus: true,
      itemCount: true,
      newItemCount: true,
      changedItemCount: true,
      errorMessage: true,
    },
  },
};

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role') || '';
    const ipAddress = request.headers.get('x-client-ip');

    if (!userId || !canEditReporterRun(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const currentCommunity = await getCurrentCommunity({ headers: request.headers });
    if (!currentCommunity) {
      return NextResponse.json({ error: 'Community context not found' }, { status: 400 });
    }

    const existing = await db.reporterMonitoredSource.findUnique({
      where: { id: params.id },
      select: { id: true, communityId: true },
    });

    if (!existing || existing.communityId !== currentCommunity.id) {
      return NextResponse.json({ error: 'Monitored source not found' }, { status: 404 });
    }

    const body = await request.json();
    const validated = updateMonitoredSourceSchema.parse(body);

    if (validated.placeId) {
      const coverageArea = await db.tenantCoverageArea.findFirst({
        where: {
          communityId: currentCommunity.id,
          placeId: validated.placeId,
          isActive: true,
        },
        select: { id: true },
      });

      if (!coverageArea) {
        return NextResponse.json(
          { error: 'Selected place is not part of the active tenant coverage list.' },
          { status: 400 }
        );
      }
    }

    const source = await db.reporterMonitoredSource.update({
      where: { id: params.id },
      data: {
        ...(validated.label !== undefined ? { label: validated.label } : {}),
        ...(validated.sourceType !== undefined ? { sourceType: validated.sourceType } : {}),
        ...(validated.sourceFormat !== undefined ? { sourceFormat: validated.sourceFormat } : {}),
        ...(validated.url !== undefined ? { url: normalizeUrl(validated.url) } : {}),
        ...(validated.publisher !== undefined ? { publisher: validated.publisher || null } : {}),
        ...(validated.notes !== undefined ? { notes: validated.notes || null } : {}),
        ...(validated.placeId !== undefined ? { placeId: validated.placeId || null } : {}),
        ...(validated.status !== undefined ? { status: validated.status } : {}),
        ...(validated.fetchFrequencyMinutes !== undefined
          ? { fetchFrequencyMinutes: validated.fetchFrequencyMinutes }
          : {}),
      },
      select: monitoredSourceSelect,
    });

    await logActivity({
      userId,
      action: 'UPDATE',
      resourceType: 'REPORTER_MONITORED_SOURCE',
      resourceId: source.id,
      ipAddress,
      metadata: {
        communityId: currentCommunity.id,
        status: source.status,
        fetchFrequencyMinutes: source.fetchFrequencyMinutes,
      },
    });

    return NextResponse.json({ source });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating reporter monitored source:', error);
    return NextResponse.json(
      { error: 'Failed to update reporter monitored source' },
      { status: 500 }
    );
  }
}
