import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { Building2 } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { getCurrentCommunity } from '@/lib/community';
import { db } from '@/lib/db';
import { checkPermission } from '@/lib/permissions';
import { AdminPage } from '@/components/admin/AdminPage';
import OrganizationTabs from './OrganizationTabs';

export default async function AdminOrganizationsPage() {
  const session = await getServerSession(authOptions);
  const userRole = session?.user?.role || '';

  if (!checkPermission(userRole, 'articles:approve')) {
    redirect('/');
  }

  const currentCommunity = await getCurrentCommunity({ headers: headers() });

  const organizations = await db.organization.findMany({
    where: currentCommunity?.id ? { communityId: currentCommunity.id } : undefined,
    select: {
      id: true,
      name: true,
      slug: true,
      status: true,
      directoryGroup: true,
      organizationType: true,
      updatedAt: true,
      createdAt: true,
      createdBy: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
      _count: {
        select: {
          memberships: true,
          locations: true,
          departments: true,
          contacts: true,
        },
      },
    },
    orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
  });

  return (
    <AdminPage title="Organizations" count={organizations.length}>
      <div className="admin-card">
        <div className="admin-card-header">
          <div className="flex items-center gap-0">
            <div className="admin-card-header-icon" aria-hidden="true">
              <Building2 className="h-4 w-4" />
            </div>
            <div className="admin-card-header-label">Organizations</div>
          </div>
        </div>
        <div className="admin-card-body">
          <OrganizationTabs organizations={organizations} />
        </div>
        <div className="admin-card-footer">
          <div className="admin-card-footer-label"></div>
          <div className="admin-card-footer-actions"></div>
        </div>
      </div>
    </AdminPage>
  );
}
