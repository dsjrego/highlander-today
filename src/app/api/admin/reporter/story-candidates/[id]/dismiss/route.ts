import { NextRequest, NextResponse } from 'next/server';
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
        'reporter:edit'
      )
    ) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }
    const community = await getCurrentCommunity({ headers: request.headers });
    if (!community)
      return NextResponse.json(
        { error: 'Community not found' },
        { status: 404 }
      );
    const { id } = await props.params;
    const result = await db.reporterStoryCandidate.updateMany({
      where: { id, communityId: community.id, dismissedAt: null },
      data: { dismissedAt: new Date(), isActive: false },
    });
    if (!result.count) {
      // A repeat dismissal is harmless; never reveal candidates in other tenants.
      const candidate = await db.reporterStoryCandidate.findFirst({
        where: { id, communityId: community.id },
        select: { id: true },
      });
      if (!candidate)
        return NextResponse.json(
          { error: 'Candidate not found' },
          { status: 404 }
        );
    } else {
      await logActivity({
        userId,
        action: 'UPDATE',
        resourceType: 'REPORTER_STORY_CANDIDATE',
        resourceId: id,
        ipAddress: request.headers.get('x-client-ip'),
        metadata: { action: 'dismiss' },
      }).catch(() => {});
    }
    return NextResponse.json({ id, dismissed: true });
  } catch (error) {
    console.error('Unable to dismiss candidate:', error);
    return NextResponse.json(
      { error: 'Unable to dismiss candidate.' },
      { status: 500 }
    );
  }
}
