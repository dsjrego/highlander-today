import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getCurrentCommunity } from '@/lib/community';
import { checkPermission } from '@/lib/permissions';
import { logActivity } from '@/lib/activity-log';

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (
      !checkPermission(
        request.headers.get('x-user-role') || '',
        'reporter:assign'
      )
    ) {
      return NextResponse.json(
        { error: 'An editor must assign stories.' },
        { status: 403 }
      );
    }
    const { assignedToUserId } = z
      .object({ assignedToUserId: z.string().uuid() })
      .parse(await request.json());
    const { id } = await props.params;
    const community = await getCurrentCommunity({ headers: request.headers });
    if (!community)
      return NextResponse.json(
        { error: 'Community not found' },
        { status: 404 }
      );
    const membership = await db.userCommunityMembership.findUnique({
      where: {
        userId_communityId: {
          userId: assignedToUserId,
          communityId: community.id,
        },
      },
      include: { user: { select: { trustLevel: true } } },
    });
    if (
      !membership ||
      membership.user.trustLevel !== 'TRUSTED' ||
      !checkPermission(membership.role, 'reporter:draft')
    ) {
      return NextResponse.json(
        { error: 'Choose a trusted staff reporter in this community.' },
        { status: 400 }
      );
    }
    const candidate = await db.reporterStoryCandidate.findFirst({
      where: { id, communityId: community.id, isActive: true, dismissedAt: null },
      include: {
        candidateItems: {
          include: {
            ingestionItem: {
              include: { monitoredSource: { select: { communityId: true } } },
            },
          },
        },
        linkedReporterRun: { select: { communityId: true } },
      },
    });
    if (!candidate)
      return NextResponse.json(
        { error: 'Story lead not found.' },
        { status: 404 }
      );
    if (
      candidate.candidateItems.some(
        ({ ingestionItem }) =>
          ingestionItem.monitoredSource.communityId !== community.id
      ) ||
      (candidate.linkedReporterRun &&
        candidate.linkedReporterRun.communityId !== community.id)
    ) {
      return NextResponse.json(
        { error: 'This lead has inconsistent source ownership.' },
        { status: 409 }
      );
    }
    if (candidate.linkedReporterRunId)
      return NextResponse.json({ id: candidate.linkedReporterRunId });
    const run = await db.$transaction(async (tx) => {
      const created = await tx.reporterRun.create({
        data: {
          communityId: community.id,
          assignedToUserId,
          createdByUserId: userId,
          title: candidate.title,
          topic: candidate.title,
          requestSummary: candidate.summary,
          mode: 'RESEARCH',
          requestType: 'EDITOR_ASSIGNMENT',
          sources: {
            create: candidate.candidateItems.map(
              ({ ingestionItem: item }, index) => ({
                sourceType: item.canonicalUrl
                  ? ('NEWS_ARTICLE' as const)
                  : ('STAFF_NOTE' as const),
                title: item.title,
                url: item.canonicalUrl,
                publisher: item.publisher,
                contentText: item.contentText || item.excerpt,
                excerpt: item.excerpt,
                publishedAt: item.publishedAt,
                reliabilityTier: 'UNVERIFIED' as const,
                sortOrder: index,
              })
            ),
          },
        },
      });
      const claimed = await tx.reporterStoryCandidate.updateMany({
        where: {
          id,
          communityId: community.id,
          isActive: true,
          dismissedAt: null,
          linkedReporterRunId: null,
        },
        data: { linkedReporterRunId: created.id },
      });
      if (claimed.count !== 1) throw new Error('CANDIDATE_ALREADY_ASSIGNED');
      return created;
    });
    await logActivity({
      userId,
      action: 'CREATE',
      resourceType: 'REPORTER_RUN',
      resourceId: run.id,
      ipAddress: request.headers.get('x-client-ip'),
      metadata: { storyCandidateId: id, assignedToUserId },
    }).catch(() => {});
    return NextResponse.json({ id: run.id }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError)
      return NextResponse.json(
        { error: 'Choose a reporter.' },
        { status: 400 }
      );
    if (
      error instanceof Error &&
      error.message === 'CANDIDATE_ALREADY_ASSIGNED'
    ) {
      return NextResponse.json(
        { error: 'This lead was just assigned. Refresh the page.' },
        { status: 409 }
      );
    }
    console.error('Unable to assign candidate:', error);
    return NextResponse.json(
      { error: 'Unable to assign story.' },
      { status: 500 }
    );
  }
}
