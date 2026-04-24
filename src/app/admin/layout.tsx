import { ReactNode } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { AdminCommandPalette } from '@/components/admin/AdminCommandPalette';
import { AdminSidebarShell } from '@/components/admin/AdminSidebarShell';

const adminNavSections = [
  {
    title: 'Overview',
    items: [
      { href: '/admin', label: 'Dashboard' },
      { href: '/admin/homepage', label: 'Homepage' },
      { href: '/admin/analytics', label: 'Analytics' },
    ],
  },
  {
    title: 'Publishing',
    items: [
      { href: '/admin/content', label: 'Content Approvals' },
      { href: '/admin/articles', label: 'Articles' },
      { href: '/admin/reporter', label: 'Reporter' },
      { href: '/admin/recipes', label: 'Recipes' },
      { href: '/admin/events', label: 'Events' },
      { href: '/admin/organizations', label: 'Organizations' },
      { href: '/admin/categories', label: 'Navigation' },
    ],
  },
  {
    title: 'Community',
    items: [
      { href: '/admin/users', label: 'Users' },
      { href: '/admin/trust', label: 'Trust' },
      { href: '/admin/bans', label: 'Bans' },
      { href: '/admin/stores', label: 'Stores' },
    ],
  },
  {
    title: 'Platform',
    items: [
      { href: '/admin/sites', label: 'Sites' },
      { href: '/admin/content-architecture', label: 'Content Architecture' },
      { href: '/admin/audit', label: 'Audit Log' },
      { href: '/admin/settings', label: 'Settings' },
    ],
  },
] as const;

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN';
  const visibleNavSections = isSuperAdmin
    ? [
        ...adminNavSections,
        {
          title: 'Super Admin',
          items: [
            { href: '/admin/places', label: 'Places' },
            { href: '/admin/coverage', label: 'Coverage' },
            { href: '/admin/geography', label: 'Geography' },
            { href: '/admin/observed-geo', label: 'Observed Geo' },
            { href: '/admin/roadmap', label: 'Roadmap' },
          ],
        },
      ]
    : adminNavSections;

  const commandPaletteRoutes = visibleNavSections.flatMap((section) =>
    section.items.map((item) => ({
      href: item.href,
      label: `${section.title}: ${item.label}`,
    }))
  );

  return (
    <div className="admin-shell relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] min-h-screen w-screen">
      <AdminSidebarShell sections={visibleNavSections} allowCustomization={isSuperAdmin} />

      <main className="admin-main">
        <div className="admin-topbar">
          <AdminCommandPalette routes={commandPaletteRoutes} />
        </div>
        <div className="admin-main-body">{children}</div>
      </main>
    </div>
  );
}
