import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getCurrentCommunity } from '@/lib/community';
import { logActivity } from '@/lib/activity-log';
import { canCreateReporterRun, canViewReporterRun } from '@/lib/reporter/permissions';
import { normalizeReporterRunInput } from '@/lib/reporter/run-normalizer';

const CreateReporterRunSchema = z.object({
  topic: z.string().trim().optional().nullable(),
  title: z.string().trim().optional().nullable(),
  subjectName: z.string().trim().optional().nullable(),
  requestedArticleType: z.string().trim().optional().nullable(),
  requestSummary: z.string().trim().optional().nullable(),
  whatHappened: z.string().trim().optional().nullable(),
  whoIsInvolved: z.string().trim().optional().nullable(),
  whereDidItHappen: z.string().trim().optional().nullable(),
  whenDidItHappen: z.string().trim().optional().nullable(),
  whyItMatters: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
  supportingLinks: z.array(z.string().trim()).optional().default([]),
  requesterName: z.string().trim().optional().nullable(),
  requesterEmail: z.string().trim().optional().nullable(),
  requesterPhone: z.string().trim().optional().nullable(),
});

function hasAnonymousContactInfo(payload: z.infer<typeof CreateReporterRunSchema>) {
  return Boolean(
    payload.requesterName?.trim() ||
      payload.requesterEmail?.trim() ||
      payload.requesterPhone?.trim()
  );
}

export async function GET(request: NextRequest) {
  try {
    const userRole = request.headers.get('x-user-role') || '';

    if (!canViewReporterRun(userRole)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const currentCommunity = await getCurrentCommunity({ headers: request.headers });
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status')?.trim() || undefined;
    const assignedTo = searchParams.get('assignedTo')?.trim() || undefined;
    const query = searchParams.get('q')?.trim();

    const runs = await db.reporterRun.findMany({
      where: {
        ...(currentCommunity?.id ? { communityId: currentCommunity.id } : {}),
        ...(status ? { status: status as never } : {}),
        ...(assignedTo ? { assignedToUserId: assignedTo } : {}),
        ...(query
          ? {
              OR: [
                { topic: { contains: query, mode: 'insensitive' } },
                { title: { contains: query, mode: 'insensitive' } },
                { subjectName: { contains: query, mode: 'insensitive' } },
                { requesterName: { contains: query, mode: 'insensitive' } },
                { requesterEmail: { contains: query, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        status: true,
        mode: true,
        requestType: true,
        topic: true,
        title: true,
        subjectName: true,
        requesterName: true,
        requesterEmail: true,
        createdAt: true,
        updatedAt: true,
        assignedTo: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        _count: {
          select: {
            sources: true,
            blockers: true,
            drafts: true,
          },
        },
      },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      take: 100,
    });

    return NextResponse.json({ runs });
  } catch (error) {
    console.error('Error fetching reporter runs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reporter runs' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role') || '';
    const ipAddress = request.headers.get('x-client-ip');
    const body = await request.json();
    const payload = CreateReporterRunSchema.parse(body);

    if (userId) {
      if (!canCreateReporterRun(userRole)) {
        return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
      }
    } else if (!hasAnonymousContactInfo(payload)) {
      return NextResponse.json(
        {
          error:
            'Anonymous story requests must include at least one contact field.',
        },
        { status: 400 }
      );
    }

    const normalized = normalizeReporterRunInput(payload);
    const currentCommunity = await getCurrentCommunity({ headers: request.headers });
    const fallbackCommunity = currentCommunity
      ? currentCommunity
      : await db.community.findFirst({
          select: { id: true, name: true, slug: true, domain: true },
          orderBy: { createdAt: 'asc' },
        });

    if (!fallbackCommunity) {
      return NextResponse.json({ error: 'Community not found' }, { status: 500 });
    }

    const createdRun = await db.reporterRun.create({
      data: {
        communityId: fallbackCommunity.id,
        createdByUserId: userId || null,
        requesterUserId: userId || null,
        title: normalized.title,
        topic: normalized.topic,
        subjectName: normalized.subjectName,
        requestedArticleType: normalized.requestedArticleType,
        requesterName: normalized.requesterName,
        requesterEmail: normalized.requesterEmail,
        requesterPhone: normalized.requesterPhone,
        requestSummary: normalized.requestSummary,
        publicDescription: normalized.publicDescription,
        sources: {
          create: normalized.initialSources.map((source, index) => ({
            sourceType: source.sourceType,
            title: source.title,
            url: source.url,
            contentText: source.contentText,
            excerpt: source.excerpt,
            note: source.note,
            reliabilityTier: source.reliabilityTier,
            sortOrder: index,
            createdByUserId: userId || null,
          })),
        },
      },
      select: {
        id: true,
        status: true,
        mode: true,
        requestType: true,
        topic: true,
        title: true,
        subjectName: true,
        requesterName: true,
        requesterEmail: true,
        requesterPhone: true,
        requestSummary: true,
        publicDescription: true,
        createdAt: true,
        updatedAt: true,
        sources: {
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            sourceType: true,
            title: true,
            url: true,
            contentText: true,
            reliabilityTier: true,
            sortOrder: true,
          },
        },
      },
    });

    if (userId) {
      await logActivity({
        userId,
        action: 'CREATE',
        resourceType: 'REPORTER_RUN',
        resourceId: createdRun.id,
        ipAddress,
        metadata: {
          topic: createdRun.topic,
          requestType: createdRun.requestType,
          sourceCount: createdRun.sources.length,
        },
      });
    }

    return NextResponse.json(createdRun, { status: 201 });
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

    console.error('Error creating reporter run:', error);
    return NextResponse.json(
      { error: 'Failed to create reporter run' },
      { status: 500 }
    );
  }
}
