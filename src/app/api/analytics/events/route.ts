import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { db } from '@/lib/db';
import {
  AnalyticsEventBatchSchema,
  type AnalyticsClientEventInput,
} from '@/lib/analytics/types';
import { classifyReferrer } from '@/lib/analytics/server';

function normalizeMetadata(
  metadata: Record<string, unknown> | null | undefined
): {
  anonymousVisitorId: string | null;
  sessionId: string | null;
  metadata: Record<string, unknown> | null;
} {
  if (!metadata) {
    return { anonymousVisitorId: null, sessionId: null, metadata: null };
  }

  const next = { ...metadata };
  const anonymousVisitorId =
    typeof next.anonymousVisitorId === 'string' ? next.anonymousVisitorId : null;
  const sessionId = typeof next.sessionId === 'string' ? next.sessionId : null;

  delete next.anonymousVisitorId;
  delete next.sessionId;

  return {
    anonymousVisitorId,
    sessionId,
    metadata: Object.keys(next).length > 0 ? next : null,
  };
}

function toCreateManyInput(request: NextRequest, event: AnalyticsClientEventInput) {
  const siteDomain =
    request.headers.get('x-community-domain') ??
    request.headers.get('host') ??
    null;
  const { referrerType, referrerHost } = classifyReferrer(event.referrerUrl, siteDomain);
  const { anonymousVisitorId, sessionId, metadata } = normalizeMetadata(event.metadata);

  return {
    communityId: request.headers.get('x-community-id') || null,
    siteDomain,
    userId: request.headers.get('x-user-id') || null,
    sessionId: sessionId ?? 'anonymous-session',
    anonymousVisitorId,
    eventName: event.eventName,
    contentType: event.contentType ?? null,
    contentId: event.contentId ?? null,
    pageType: event.pageType,
    pagePath: event.pagePath,
    referrerType,
    referrerHost,
    occurredAt: event.occurredAt ? new Date(event.occurredAt) : new Date(),
    metadata: (metadata ?? undefined) as Prisma.InputJsonValue | undefined,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = AnalyticsEventBatchSchema.parse(body);

    await db.analyticsEvent.createMany({
      data: parsed.events.map((event) => toCreateManyInput(request, event)),
    });

    return NextResponse.json({ ok: true, accepted: parsed.events.length });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error ingesting analytics events:', error);
    return NextResponse.json(
      { error: 'Failed to ingest analytics events' },
      { status: 500 }
    );
  }
}
