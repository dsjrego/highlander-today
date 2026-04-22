import { ReactNode } from 'react';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const adminNavItems = [
  { href: '/admin', label: 'Dashboard' },
  { href: '/admin/homepage', label: 'Homepage Curation' },
  { href: '/admin/articles', label: 'Articles' },
  { href: '/admin/reporter', label: 'Reporter' },
  { href: '/admin/recipes', label: 'Recipes' },
  { href: '/admin/events', label: 'Events' },
  { href: '/admin/organizations', label: 'Organizations' },
  { href: '/admin/categories', label: 'Navigation' },
  { href: '/admin/users', label: 'Users' },
  { href: '/admin/content', label: 'Content Approvals' },
  { href: '/admin/stores', label: 'Store Moderation' },
  { href: '/admin/trust', label: 'Trust Management' },
  { href: '/admin/bans', label: 'Bans' },
  { href: '/admin/content-architecture', label: 'Content Architecture' },
  { href: '/admin/sites', label: 'Sites' },
  { href: '/admin/audit', label: 'Audit Log' },
  { href: '/admin/settings', label: 'Settings' },
] as const;

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const session = await getServerSession(authOptions);
  const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN';
  const visibleNavItems = isSuperAdmin
    ? [
        ...adminNavItems.slice(0, 7),
        { href: '/admin/places', label: 'Places' as const },
        { href: '/admin/coverage', label: 'Coverage' as const },
        { href: '/admin/geography', label: 'Geography' as const },
        { href: '/admin/observed-geo', label: 'Observed Geo' as const },
        { href: '/admin/roadmap', label: 'Roadmap Moderation' as const },
        ...adminNavItems.slice(7),
      ]
    : adminNavItems;

  return (
    <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] flex min-h-screen w-screen bg-[#f7f8fa]">
      {/* Admin Sidebar */}
      <aside className="admin-sidebar w-64 border-r border-slate-200 bg-[#edf2f5] p-5 text-slate-700">
        <h2 className="text-2xl font-bold text-[var(--brand-primary)]">Admin</h2>

        <nav className="admin-sidebar-nav">
          {visibleNavItems.map((item, index) => (
            <a
              key={item.href}
              href={item.href}
              className={`admin-sidebar-link ${index % 2 === 0 ? "admin-sidebar-link-even" : "admin-sidebar-link-odd"}`}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="border-t border-slate-300 pt-4">
          <a href="/" className="admin-sidebar-footer-link">
            Back to Site
          </a>
        </div>
      </aside>

      {/* Main Content */}
      <main className="min-w-0 flex-1 p-[5px]">{children}</main>
    </div>
  );
}
