import { ReactNode } from 'react';
import { headers } from 'next/headers';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AdminCommandPalette } from '@/components/admin/AdminCommandPalette';
import { AdminSidebarShell } from '@/components/admin/AdminSidebarShell';
import {
  ADMIN_SIDEBAR_ORDER_SETTING_KEY,
  getVisibleAdminNavSections,
  normalizeAdminNavSections,
  parseAdminSidebarOrder,
} from '@/lib/admin-navigation';
import { getCurrentCommunity } from '@/lib/community';
import { db } from '@/lib/db';

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN';
  const currentCommunity = await getCurrentCommunity({ headers: headers() });
  const sidebarOrderSetting = currentCommunity
    ? await db.siteSetting.findUnique({
        where: {
          communityId_key: {
            communityId: currentCommunity.id,
            key: ADMIN_SIDEBAR_ORDER_SETTING_KEY,
          },
        },
        select: {
          value: true,
        },
      })
    : null;
  const sidebarOrder = parseAdminSidebarOrder(sidebarOrderSetting?.value);
  const visibleNavSections = normalizeAdminNavSections(
    getVisibleAdminNavSections(isSuperAdmin),
    sidebarOrder
  );

  const commandPaletteRoutes = visibleNavSections.flatMap((section) =>
    section.items.map((item) => ({
      href: item.href,
      label: `${section.title}: ${item.label}`,
    }))
  );

  return (
    <div className="admin-shell relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] min-h-screen w-screen">
      <AdminSidebarShell
        sections={visibleNavSections}
        allowCustomization={isSuperAdmin}
        initialSidebarOrder={sidebarOrder}
      />

      <main className="admin-main">
        <div className="admin-topbar">
          <AdminCommandPalette routes={commandPaletteRoutes} />
        </div>
        <div className="admin-main-body">{children}</div>
      </main>
    </div>
  );
}
