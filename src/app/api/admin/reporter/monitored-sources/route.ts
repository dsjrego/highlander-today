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
import { canEditReporterRun, canViewReporterRun } from '@/lib/reporter/permissions';

const createMonitoredSourceSchema = z.object({
  label: z.string().trim().min(2).max(160),
  sourceType: z.nativeEnum(ReporterMonitoredSourceType),
  sourceFormat: z.nativeEnum(ReporterMonitoredSourceFormat),
  url: z.string().trim().min(3).max(2048),
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

async function getScopedCommunity(request: NextRequest) {
  return getCurrentCommunity({ headers: request.headers });
}

export async function GET(request: NextRequest) {
  try {
    const userRole = request.headers.get('x-user-role') || '';

    if (!canViewReporterRun(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const currentCommunity = await getScopedCommunity(request);
    if (!currentCommunity) {
      return NextResponse.json({ error: 'Community context not found' }, { status: 400 });
    }

    const [sources, coverageAreas] = await Promise.all([
      db.reporterMonitoredSource.findMany({
        where: {
          communityId: currentCommunity.id,
        },
        orderBy: [{ status: 'asc' }, { label: 'asc' }],
        select: monitoredSourceSelect,
      }),
      db.tenantCoverageArea.findMany({
        where: {
          communityId: currentCommunity.id,
          isActive: true,
        },
        orderBy: [{ isPrimary: 'desc' }, { place: { displayName: 'asc' } }],
        select: {
          place: {
            select: {
              id: true,
              displayName: true,
              slug: true,
              type: true,
            },
          },
        },
      }),
    ]);

    return NextResponse.json({
      community: currentCommunity,
      sources,
      coveragePlaces: coverageAreas.map(({ place }) => place),
    });
  } catch (error) {
    console.error('Error listing reporter monitored sources:', error);
    return NextResponse.json(
      { error: 'Failed to list reporter monitored sources' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role') || '';
    const ipAddress = request.headers.get('x-client-ip');

    if (!userId || !canEditReporterRun(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const currentCommunity = await getScopedCommunity(request);
    if (!currentCommunity) {
      return NextResponse.json({ error: 'Community context not found' }, { status: 400 });
    }

    const body = await request.json();
    const validated = createMonitoredSourceSchema.parse(body);

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

    const source = await db.reporterMonitoredSource.create({
      data: {
        communityId: currentCommunity.id,
        createdByUserId: userId,
        label: validated.label,
        sourceType: validated.sourceType,
        sourceFormat: validated.sourceFormat,
        url: normalizeUrl(validated.url),
        publisher: validated.publisher || null,
        notes: validated.notes || null,
        placeId: validated.placeId || null,
        status: validated.status || 'ACTIVE',
        fetchFrequencyMinutes: validated.fetchFrequencyMinutes || 1440,
      },
      select: monitoredSourceSelect,
    });

    await logActivity({
      userId,
      action: 'CREATE',
      resourceType: 'REPORTER_MONITORED_SOURCE',
      resourceId: source.id,
      ipAddress,
      metadata: {
        communityId: currentCommunity.id,
        sourceType: source.sourceType,
        sourceFormat: source.sourceFormat,
        placeId: source.place?.id || null,
      },
    });

    return NextResponse.json({ source }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating reporter monitored source:', error);
    return NextResponse.json(
      { error: 'Failed to create reporter monitored source' },
      { status: 500 }
    );
  }
}
