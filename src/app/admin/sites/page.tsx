import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { Globe } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { AdminPage } from '@/components/admin/AdminPage';
import SitesTabs from './SitesTabs';

export default async function AdminSitesPage() {
  const session = await getServerSession(authOptions);

  if (session?.user?.role !== 'SUPER_ADMIN') {
    redirect('/');
  }

  const communities = await db.community.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      domain: true,
      description: true,
      createdAt: true,
      domains: {
        select: {
          id: true,
          domain: true,
          isPrimary: true,
          status: true,
        },
        orderBy: [{ isPrimary: 'desc' }, { domain: 'asc' }],
      },
    },
    orderBy: [{ createdAt: 'desc' }, { name: 'asc' }],
  });

  return (
    <AdminPage title="Sites" count={communities.length}>
      <div className="admin-card">
        <div className="admin-card-header">
          <div className="flex items-center gap-0">
            <div className="admin-card-header-icon" aria-hidden="true">
              <Globe className="h-4 w-4" />
            </div>
            <div className="admin-card-header-label">Sites</div>
          </div>
        </div>
        <div className="admin-card-body">
          <SitesTabs sites={communities} />
        </div>
        <div className="admin-card-footer">
          <div className="admin-card-footer-label"></div>
          <div className="admin-card-footer-actions"></div>
        </div>
      </div>
    </AdminPage>
  );
}
