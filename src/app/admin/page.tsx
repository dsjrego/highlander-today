import Link from 'next/link';
import { headers } from 'next/headers';
import { db } from '@/lib/db';
import { getCurrentCommunity } from '@/lib/community';
import { AdminFilterBar } from '@/components/admin/AdminFilterBar';
import { AdminPage } from '@/components/admin/AdminPage';

function formatCount(value: number) {
  return new Intl.NumberFormat('en-US').format(value);
}

function formatRelativeTime(value: Date) {
  const diffMs = Date.now() - value.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 1) {
    return 'just now';
  }
  if (diffMinutes < 60) {
    return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
  }

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  }

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
}

function getActivityAccent(resourceType: string) {
  switch (resourceType) {
    case 'ARTICLE':
      return 'border-yellow-400 bg-yellow-50';
    case 'EVENT':
      return 'border-blue-400 bg-[var(--article-card-badge-bg)]';
    case 'HELP_WANTED_POST':
      return 'border-teal-400 bg-teal-50';
    case 'MARKETPLACE_LISTING':
      return 'border-purple-400 bg-purple-50';
    case 'USER_PROFILE':
      return 'border-red-400 bg-red-50';
    default:
      return 'border-slate-300 bg-slate-50';
  }
}

function describeActivity(log: {
  action: string;
  resourceType: string;
  metadata: unknown;
  user: { firstName: string; lastName: string };
}) {
  const actorName = `${log.user.firstName} ${log.user.lastName}`.trim();
  const metadataTitle =
    log.metadata && typeof log.metadata === 'object' && 'title' in log.metadata && typeof log.metadata.title === 'string'
      ? log.metadata.title
      : null;
  const subjectLabel = metadataTitle || log.resourceType.toLowerCase().replace(/_/g, ' ');

  switch (log.action) {
    case 'CREATE':
      return `${actorName} created ${subjectLabel}`;
    case 'DELETE':
      return `${actorName} deleted ${subjectLabel}`;
    case 'APPROVE':
      return `${actorName} approved ${subjectLabel}`;
    case 'REJECT':
      return `${actorName} rejected ${subjectLabel}`;
    case 'SEND_MESSAGE':
      return `${actorName} sent a message`;
    default:
      return `${actorName} updated ${subjectLabel}`;
  }
}

export default async function AdminDashboard() {
  const currentCommunity = await getCurrentCommunity({ headers: headers() });
  const communityWhere = currentCommunity?.id ? { communityId: currentCommunity.id } : {};

  const [
    totalUsers,
    totalOrganizations,
    pendingOrganizations,
    totalRecipes,
    pendingRecipes,
    publishedRecipes,
    unpublishedRecipes,
    totalEvents,
    pendingEvents,
    totalListings,
    activeListings,
    pendingArticles,
    publishedArticles,
    unpublishedArticles,
    pendingHelpWanted,
    pendingStores,
    recentActivity,
  ] = await Promise.all([
    db.user.count(),
    db.organization.count({ where: communityWhere }),
    db.organization.count({ where: { ...communityWhere, status: 'PENDING_APPROVAL' } }),
    db.recipe.count({ where: communityWhere }),
    db.recipe.count({ where: { ...communityWhere, status: 'PENDING_REVIEW' } }),
    db.recipe.count({ where: { ...communityWhere, status: 'PUBLISHED' } }),
    db.recipe.count({ where: { ...communityWhere, status: 'UNPUBLISHED' } }),
    db.event.count({ where: communityWhere }),
    db.event.count({ where: { ...communityWhere, status: 'PENDING_REVIEW' } }),
    db.marketplaceListing.count({ where: communityWhere }),
    db.marketplaceListing.count({ where: { ...communityWhere, status: 'ACTIVE' } }),
    db.article.count({ where: { ...communityWhere, status: 'PENDING_REVIEW' } }),
    db.article.count({ where: { ...communityWhere, status: 'PUBLISHED' } }),
    db.article.count({ where: { ...communityWhere, status: 'UNPUBLISHED' } }),
    db.helpWantedPost.count({ where: { ...communityWhere, status: 'PENDING_REVIEW' } }),
    db.store.count({ where: { ...communityWhere, status: 'PENDING_APPROVAL' } }),
    db.activityLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 4,
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    }),
  ]);

  const pendingReviewCount = pendingArticles + pendingEvents + pendingHelpWanted + pendingStores;
  const stats = [
    {
      label: 'Total Users',
      value: formatCount(totalUsers),
      change: 'Open user management',
      href: '/admin/users',
    },
    {
      label: 'Events',
      value: formatCount(totalEvents),
      change: `${formatCount(pendingEvents)} pending review`,
      href: '/admin/events',
    },
    {
      label: 'Marketplace Listings',
      value: formatCount(totalListings),
      change: `${formatCount(activeListings)} active now`,
      href: '/admin/stores',
    },
  ];

  return (
    <AdminPage title="Dashboard">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} className="admin-stat-card">
            <p className="admin-stat-card-label">{stat.label}</p>
            <p className="admin-stat-card-value">{stat.value}</p>
            <p className="admin-stat-card-note">{stat.change}</p>
          </Link>
        ))}
        <Link href="/admin/organizations" className="admin-stat-card">
          <p className="admin-stat-card-label">Organizations</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="admin-stat-card-kicker">Total</p>
              <p className="admin-stat-card-value-sm">{formatCount(totalOrganizations)}</p>
            </div>
            <div>
              <p className="admin-stat-card-kicker admin-stat-card-kicker-pending">Pending</p>
              <p className="admin-stat-card-value-sm">{formatCount(pendingOrganizations)}</p>
            </div>
          </div>
          <p className="admin-stat-card-note">Open organization management</p>
        </Link>
        <Link href="/admin/recipes" className="admin-stat-card">
          <p className="admin-stat-card-label">Recipes</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="admin-stat-card-kicker admin-stat-card-kicker-pending">Pending</p>
              <p className="admin-stat-card-value-sm">{formatCount(pendingRecipes)}</p>
            </div>
            <div>
              <p className="admin-stat-card-kicker admin-stat-card-kicker-ok">Approved</p>
              <p className="admin-stat-card-value-sm">{formatCount(publishedRecipes)}</p>
            </div>
            <div>
              <p className="admin-stat-card-kicker">Archived</p>
              <p className="admin-stat-card-value-sm">{formatCount(unpublishedRecipes)}</p>
            </div>
          </div>
          <p className="admin-stat-card-note">
            Open recipe management ({formatCount(totalRecipes)} total)
          </p>
        </Link>
        <Link href="/admin/articles" className="admin-stat-card">
          <p className="admin-stat-card-label">Articles</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="admin-stat-card-kicker admin-stat-card-kicker-pending">Pending</p>
              <p className="admin-stat-card-value-sm">{formatCount(pendingArticles)}</p>
            </div>
            <div>
              <p className="admin-stat-card-kicker admin-stat-card-kicker-ok">Approved</p>
              <p className="admin-stat-card-value-sm">{formatCount(publishedArticles)}</p>
            </div>
            <div>
              <p className="admin-stat-card-kicker">Archived</p>
              <p className="admin-stat-card-value-sm">{formatCount(unpublishedArticles)}</p>
            </div>
          </div>
          <p className="admin-stat-card-note">Open article management</p>
        </Link>
      </div>

      <div className="admin-section-card">
        <div className="admin-section-card-head">
          <h2 className="admin-section-card-title">Quick Actions</h2>
        </div>
        <AdminFilterBar
          right={
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Jump into a filtered queue
            </span>
          }
        >
          <Link href="/admin/content?view=pending" className="admin-facet">Pending Content</Link>
          <Link href="/admin/users" className="admin-facet">Users</Link>
          <Link href="/admin/trust" className="admin-facet">Trust</Link>
          <Link href="/admin/audit" className="admin-facet">Audit Log</Link>
          <Link href="/admin/stores" className="admin-facet">Stores</Link>
          <Link href="/admin/homepage" className="admin-facet">Homepage</Link>
          <Link href="/admin/content-architecture" className="admin-facet">Content Architecture</Link>
        </AdminFilterBar>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <Link
            href="/admin/content"
            className="admin-dashboard-action"
          >
            <p className="admin-dashboard-action-title">Review Pending Content</p>
            <p className="admin-dashboard-action-copy">{formatCount(pendingReviewCount)} items awaiting approval</p>
          </Link>
          <Link
            href="/admin/users"
            className="admin-dashboard-action"
          >
            <p className="admin-dashboard-action-title">Manage Users</p>
            <p className="admin-dashboard-action-copy">View and manage user accounts</p>
          </Link>
          <Link
            href="/admin/trust"
            className="admin-dashboard-action"
          >
            <p className="admin-dashboard-action-title">Trust Management</p>
            <p className="admin-dashboard-action-copy">Review vouching and trust levels</p>
          </Link>
          <Link
            href="/admin/audit"
            className="admin-dashboard-action"
          >
            <p className="admin-dashboard-action-title">View Audit Log</p>
            <p className="admin-dashboard-action-copy">Track system activity</p>
          </Link>
          <Link
            href="/admin/stores"
            className="admin-dashboard-action"
          >
            <p className="admin-dashboard-action-title">Manage Stores</p>
            <p className="admin-dashboard-action-copy">
              {formatCount(pendingStores)} stores pending approval
            </p>
          </Link>
          <Link
            href="/admin/homepage"
            className="admin-dashboard-action"
          >
            <p className="admin-dashboard-action-title">Homepage Curation</p>
            <p className="admin-dashboard-action-copy">Reorder sections, toggle visibility, and pin homepage content</p>
          </Link>
          <Link
            href="/admin/content-architecture"
            className="admin-dashboard-action"
          >
            <p className="admin-dashboard-action-title">Content Architecture</p>
            <p className="admin-dashboard-action-copy">Reference section purpose, model boundaries, and category guidance before editing taxonomy</p>
          </Link>
        </div>
      </div>

      <div className="admin-section-card">
        <div className="admin-section-card-head">
          <h2 className="admin-section-card-title">Recent Activity</h2>
        </div>
        <div className="admin-list">
          <div className="admin-list-table-wrap">
            <table className="admin-list-table">
              <thead className="admin-list-head">
                <tr>
                  <th className="admin-list-header-cell">Activity</th>
                  <th className="admin-list-header-cell">Type</th>
                  <th className="admin-list-header-cell">When</th>
                </tr>
              </thead>
              <tbody>
          {recentActivity.length ? (
            recentActivity.map((log) => (
                  <tr key={log.id} className="admin-list-row">
                    <td className="admin-list-cell font-medium text-slate-900">{describeActivity(log)}</td>
                    <td className="admin-list-cell">
                      <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${getActivityAccent(log.resourceType)}`}>
                        {log.resourceType.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="admin-list-cell">{formatRelativeTime(log.createdAt)}</td>
                  </tr>
            ))
          ) : (
                  <tr className="admin-list-row">
                    <td className="admin-list-empty" colSpan={3}>
                      No recent activity logged yet.
                    </td>
                  </tr>
          )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AdminPage>
  );
}
