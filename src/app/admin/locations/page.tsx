import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { MapPin } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { getCurrentCommunity } from '@/lib/community';
import { db } from '@/lib/db';
import { checkPermission } from '@/lib/permissions';
import { AdminPage } from '@/components/admin/AdminPage';
import LocationsAdminClient from './LocationsAdminClient';

export default async function AdminLocationsPage() {
  const session = await getServerSession(authOptions);
  const userRole = session?.user?.role || '';

  if (!checkPermission(userRole, 'events:approve')) {
    redirect('/');
  }

  const currentCommunity = await getCurrentCommunity({ headers: headers() });

  const locations = await db.location.findMany({
    where: {
      ...(currentCommunity?.id ? { communityId: currentCommunity.id } : {}),
    },
    select: {
      id: true,
      name: true,
      addressLine1: true,
      addressLine2: true,
      city: true,
      state: true,
      postalCode: true,
      countryCode: true,
      validationStatus: true,
      updatedAt: true,
      _count: {
        select: {
          events: true,
        },
      },
    },
    orderBy: [{ updatedAt: 'desc' }, { name: 'asc' }, { addressLine1: 'asc' }],
  });

  return (
    <AdminPage title="Locations" count={locations.length}>
      <div className="admin-card">
        <div className="admin-card-header">
          <div className="flex items-center gap-0">
            <div className="admin-card-header-icon" aria-hidden="true">
              <MapPin className="h-4 w-4" />
            </div>
            <div className="admin-card-header-label">Locations</div>
          </div>
        </div>
        <div className="admin-card-body">
          <LocationsAdminClient initialLocations={locations} />
        </div>
      </div>
    </AdminPage>
  );
}
