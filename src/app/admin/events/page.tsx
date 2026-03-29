import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { CalendarDays } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { getCurrentCommunity } from '@/lib/community';
import { db } from '@/lib/db';
import { checkPermission } from '@/lib/permissions';
import EventTabs from './EventTabs';

export default async function AdminEventsPage() {
  const session = await getServerSession(authOptions);
  const userRole = session?.user?.role || '';

  if (!checkPermission(userRole, 'events:approve')) {
    redirect('/');
  }

  const currentCommunity = await getCurrentCommunity({ headers: headers() });

  const events = await db.event.findMany({
    where: {
      status: {
        in: ['PENDING_REVIEW', 'PUBLISHED', 'UNPUBLISHED'],
      },
      ...(currentCommunity?.id ? { communityId: currentCommunity.id } : {}),
    },
    select: {
      id: true,
      title: true,
      status: true,
      startDatetime: true,
      endDatetime: true,
      updatedAt: true,
      locationText: true,
      submittedBy: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
    orderBy: [{ updatedAt: 'desc' }, { startDatetime: 'asc' }],
  });

  return (
    <div className="space-y-4">
      <div className="admin-card">
        <div className="admin-card-header">
          <div className="flex items-center gap-0">
            <div className="admin-card-header-icon" aria-hidden="true">
              <CalendarDays className="h-4 w-4" />
            </div>
            <div className="admin-card-header-label">Events</div>
          </div>
        </div>
        <div className="admin-card-body">
          <EventTabs events={events} />
        </div>
        <div className="admin-card-footer">
          <div className="admin-card-footer-label"></div>
          <div className="admin-card-footer-actions"></div>
        </div>
      </div>
    </div>
  );
}
