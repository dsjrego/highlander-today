import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentCommunity } from '@/lib/community';
import { logActivity } from '@/lib/activity-log';
import { canEditReporterRun } from '@/lib/reporter/permissions';

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; itemId: string } }
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

    const existingSource = await db.reporterMonitoredSource.findUnique({
      where: { id: params.id },
      select: { id: true, communityId: true },
    });

    if (!existingSource || existingSource.communityId !== currentCommunity.id) {
      return NextResponse.json({ error: 'Monitored source not found' }, { status: 404 });
    }

    const existingItem = await db.reporterSourceIngestionItem.findFirst({
      where: {
        id: params.itemId,
        monitoredSourceId: params.id,
      },
      select: {
        id: true,
        title: true,
        canonicalUrl: true,
      },
    });

    if (!existingItem) {
      return NextResponse.json({ error: 'Ingestion item not found' }, { status: 404 });
    }

    await db.reporterSourceIngestionItem.delete({
      where: { id: existingItem.id },
    });

    await logActivity({
      userId,
      action: 'DELETE',
      resourceType: 'REPORTER_MONITORED_SOURCE',
      resourceId: existingSource.id,
      ipAddress,
      metadata: {
        deletedIngestionItemId: existingItem.id,
        deletedIngestionItemTitle: existingItem.title,
        deletedIngestionItemUrl: existingItem.canonicalUrl,
        communityId: currentCommunity.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting reporter monitored source ingestion item:', error);
    return NextResponse.json(
      { error: 'Failed to delete monitored source item' },
      { status: 500 }
    );
  }
}
