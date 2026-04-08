import Link from 'next/link';
import { headers } from 'next/headers';
import { db } from '@/lib/db';
import { getCurrentCommunity } from '@/lib/community';

function formatCount(value: number) {
  return new Intl.NumberFormat('en-US').format(value);
}

export default async function AdminDashboard() {
  const currentCommunity = await getCurrentCommunity({ headers: headers() });
  const articleWhere = currentCommunity?.id ? { communityId: currentCommunity.id } : {};
  const organizationWhere = currentCommunity?.id ? { communityId: currentCommunity.id } : {};

  const [totalUsers, totalOrganizations, pendingOrganizations, pendingArticles, publishedArticles, unpublishedArticles] = await Promise.all([
    db.user.count(),
    db.organization.count({ where: organizationWhere }),
    db.organization.count({ where: { ...organizationWhere, status: 'PENDING_APPROVAL' } }),
    db.article.count({ where: { ...articleWhere, status: 'PENDING_REVIEW' } }),
    db.article.count({ where: { ...articleWhere, status: 'PUBLISHED' } }),
    db.article.count({ where: { ...articleWhere, status: 'UNPUBLISHED' } }),
  ]);

  const stats = [
    { label: 'Total Users', value: formatCount(totalUsers), change: 'Open user management', href: '/admin/users' },
    { label: "Events", value: 45, change: "+5" },
    { label: "Marketplace Listings", value: 567, change: "+89" },
  ];

  return (
    <div>
      <h1 className="text-4xl font-bold mb-8 text-[#46A8CC]">Admin Dashboard</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {stats.map((stat, idx) => (
          stat.href ? (
            <Link
              key={idx}
              href={stat.href}
              className="bg-white p-6 rounded-lg border border-[#46A8CC] hover:bg-sky-50 transition"
            >
              <p className="text-gray-600 text-sm mb-2">{stat.label}</p>
              <p className="text-3xl font-bold text-[#46A8CC] mb-2">
                {stat.value}
              </p>
              <p className="text-sm font-semibold text-[#2c7f9e]">{stat.change}</p>
            </Link>
          ) : (
            <div
              key={idx}
              className="bg-white p-6 rounded-lg border border-gray-200"
            >
              <p className="text-gray-600 text-sm mb-2">{stat.label}</p>
              <p className="text-3xl font-bold text-[#46A8CC] mb-2">
                {stat.value}
              </p>
              <p className="text-sm font-semibold text-gray-600">{stat.change}</p>
            </div>
          )
        ))}
        <Link
          href="/admin/organizations"
          className="bg-white p-6 rounded-lg border border-[#46A8CC] hover:bg-sky-50 transition"
        >
          <p className="text-gray-600 text-sm mb-4">Organizations</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">Total</p>
              <p className="text-2xl font-bold text-[#46A8CC]">{formatCount(totalOrganizations)}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-700">Pending</p>
              <p className="text-2xl font-bold text-[#46A8CC]">{formatCount(pendingOrganizations)}</p>
            </div>
          </div>
          <p className="mt-3 text-sm font-semibold text-[#2c7f9e]">Open organization management</p>
        </Link>
        <Link
          href="/admin/articles"
          className="bg-white p-6 rounded-lg border border-[#46A8CC] hover:bg-sky-50 transition"
        >
          <p className="text-gray-600 text-sm mb-4">Articles</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-700">Pending</p>
              <p className="text-2xl font-bold text-[#46A8CC]">{formatCount(pendingArticles)}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-green-700">Approved</p>
              <p className="text-2xl font-bold text-[#46A8CC]">{formatCount(publishedArticles)}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">Archived</p>
              <p className="text-2xl font-bold text-[#46A8CC]">{formatCount(unpublishedArticles)}</p>
            </div>
          </div>
          <p className="mt-3 text-sm font-semibold text-[#2c7f9e]">Open article management</p>
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="bg-white p-6 rounded-lg border border-gray-200 mb-8">
        <h2 className="text-2xl font-bold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a
            href="/admin/content"
            className="p-4 border border-gray-300 rounded-lg hover:border-[#46A8CC] hover:bg-blue-50 transition"
          >
            <p className="font-semibold text-[#46A8CC]">Review Pending Content</p>
            <p className="text-sm text-gray-600">23 items awaiting approval</p>
          </a>
          <a
            href="/admin/users"
            className="p-4 border border-gray-300 rounded-lg hover:border-[#46A8CC] hover:bg-blue-50 transition"
          >
            <p className="font-semibold text-[#46A8CC]">Manage Users</p>
            <p className="text-sm text-gray-600">View and manage user accounts</p>
          </a>
          <a
            href="/admin/trust"
            className="p-4 border border-gray-300 rounded-lg hover:border-[#46A8CC] hover:bg-blue-50 transition"
          >
            <p className="font-semibold text-[#46A8CC]">Trust Management</p>
            <p className="text-sm text-gray-600">Review vouching and trust levels</p>
          </a>
          <a
            href="/admin/audit"
            className="p-4 border border-gray-300 rounded-lg hover:border-[#46A8CC] hover:bg-blue-50 transition"
          >
            <p className="font-semibold text-[#46A8CC]">View Audit Log</p>
            <p className="text-sm text-gray-600">Track system activity</p>
          </a>
          <a
            href="/admin/stores"
            className="p-4 border border-gray-300 rounded-lg hover:border-[#46A8CC] hover:bg-blue-50 transition"
          >
            <p className="font-semibold text-[#46A8CC]">Manage Stores</p>
            <p className="text-sm text-gray-600">Review, approve, reject, and suspend storefronts</p>
          </a>
          <a
            href="/admin/homepage"
            className="p-4 border border-gray-300 rounded-lg hover:border-[#46A8CC] hover:bg-blue-50 transition"
          >
            <p className="font-semibold text-[#46A8CC]">Homepage Curation</p>
            <p className="text-sm text-gray-600">Reorder sections, toggle visibility, and pin homepage content</p>
          </a>
          <a
            href="/admin/content-architecture"
            className="p-4 border border-gray-300 rounded-lg hover:border-[#46A8CC] hover:bg-blue-50 transition"
          >
            <p className="font-semibold text-[#46A8CC]">Content Architecture</p>
            <p className="text-sm text-gray-600">Reference section purpose, model boundaries, and category guidance before editing taxonomy</p>
          </a>
        </div>
      </div>

      {/* Recent Audit Activity */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h2 className="text-2xl font-bold mb-4">Recent Activity</h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 border-l-4 border-yellow-400 bg-yellow-50">
            <span>User reported inappropriate content</span>
            <span className="text-xs text-gray-500">5 minutes ago</span>
          </div>
          <div className="flex justify-between items-center p-3 border-l-4 border-green-400 bg-green-50">
            <span>Article approved by moderator</span>
            <span className="text-xs text-gray-500">23 minutes ago</span>
          </div>
          <div className="flex justify-between items-center p-3 border-l-4 border-red-400 bg-red-50">
            <span>User account suspended</span>
            <span className="text-xs text-gray-500">1 hour ago</span>
          </div>
          <div className="flex justify-between items-center p-3 border-l-4 border-blue-400 bg-blue-50">
            <span>New user registered</span>
            <span className="text-xs text-gray-500">2 hours ago</span>
          </div>
        </div>
      </div>
    </div>
  );
}
