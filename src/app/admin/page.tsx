import Link from 'next/link';
import { headers } from 'next/headers';
import { db } from '@/lib/db';
import { getCurrentCommunity } from '@/lib/community';

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
    <div>
      <h1 className="mb-8 text-4xl font-bold text-[var(--brand-primary)]">Dashboard</h1>

      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="rounded-lg border border-[var(--brand-primary)] bg-white p-6 transition hover:bg-sky-50"
          >
            <p className="mb-2 text-sm text-gray-600">{stat.label}</p>
            <p className="mb-2 text-3xl font-bold text-[var(--brand-primary)]">{stat.value}</p>
            <p className="text-sm font-semibold text-[var(--brand-primary)]">{stat.change}</p>
          </Link>
        ))}
        <Link
          href="/admin/organizations"
          className="rounded-lg border border-[var(--brand-primary)] bg-white p-6 transition hover:bg-sky-50"
        >
          <p className="mb-4 text-sm text-gray-600">Organizations</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">Total</p>
              <p className="text-2xl font-bold text-[var(--brand-primary)]">{formatCount(totalOrganizations)}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-700">Pending</p>
              <p className="text-2xl font-bold text-[var(--brand-primary)]">{formatCount(pendingOrganizations)}</p>
            </div>
          </div>
          <p className="mt-3 text-sm font-semibold text-[var(--brand-primary)]">Open organization management</p>
        </Link>
        <Link
          href="/admin/recipes"
          className="rounded-lg border border-[var(--brand-primary)] bg-white p-6 transition hover:bg-sky-50"
        >
          <p className="mb-4 text-sm text-gray-600">Recipes</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-700">Pending</p>
              <p className="text-2xl font-bold text-[var(--brand-primary)]">{formatCount(pendingRecipes)}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-green-700">Approved</p>
              <p className="text-2xl font-bold text-[var(--brand-primary)]">{formatCount(publishedRecipes)}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">Archived</p>
              <p className="text-2xl font-bold text-[var(--brand-primary)]">{formatCount(unpublishedRecipes)}</p>
            </div>
          </div>
          <p className="mt-3 text-sm font-semibold text-[var(--brand-primary)]">
            Open recipe management ({formatCount(totalRecipes)} total)
          </p>
        </Link>
        <Link
          href="/admin/articles"
          className="rounded-lg border border-[var(--brand-primary)] bg-white p-6 transition hover:bg-sky-50"
        >
          <p className="mb-4 text-sm text-gray-600">Articles</p>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-700">Pending</p>
              <p className="text-2xl font-bold text-[var(--brand-primary)]">{formatCount(pendingArticles)}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-green-700">Approved</p>
              <p className="text-2xl font-bold text-[var(--brand-primary)]">{formatCount(publishedArticles)}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">Archived</p>
              <p className="text-2xl font-bold text-[var(--brand-primary)]">{formatCount(unpublishedArticles)}</p>
            </div>
          </div>
          <p className="mt-3 text-sm font-semibold text-[var(--brand-primary)]">Open article management</p>
        </Link>
      </div>

      <div className="mb-8 rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-2xl font-bold">Quick Actions</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Link
            href="/admin/content"
            className="rounded-lg border border-gray-300 p-4 transition hover:border-[var(--brand-primary)] hover:bg-[var(--article-card-badge-bg)]"
          >
            <p className="font-semibold text-[var(--brand-primary)]">Review Pending Content</p>
            <p className="text-sm text-gray-600">{formatCount(pendingReviewCount)} items awaiting approval</p>
          </Link>
          <Link
            href="/admin/users"
            className="rounded-lg border border-gray-300 p-4 transition hover:border-[var(--brand-primary)] hover:bg-[var(--article-card-badge-bg)]"
          >
            <p className="font-semibold text-[var(--brand-primary)]">Manage Users</p>
            <p className="text-sm text-gray-600">View and manage user accounts</p>
          </Link>
          <Link
            href="/admin/trust"
            className="rounded-lg border border-gray-300 p-4 transition hover:border-[var(--brand-primary)] hover:bg-[var(--article-card-badge-bg)]"
          >
            <p className="font-semibold text-[var(--brand-primary)]">Trust Management</p>
            <p className="text-sm text-gray-600">Review vouching and trust levels</p>
          </Link>
          <Link
            href="/admin/audit"
            className="rounded-lg border border-gray-300 p-4 transition hover:border-[var(--brand-primary)] hover:bg-[var(--article-card-badge-bg)]"
          >
            <p className="font-semibold text-[var(--brand-primary)]">View Audit Log</p>
            <p className="text-sm text-gray-600">Track system activity</p>
          </Link>
          <Link
            href="/admin/stores"
            className="rounded-lg border border-gray-300 p-4 transition hover:border-[var(--brand-primary)] hover:bg-[var(--article-card-badge-bg)]"
          >
            <p className="font-semibold text-[var(--brand-primary)]">Manage Stores</p>
            <p className="text-sm text-gray-600">
              {formatCount(pendingStores)} stores pending approval
            </p>
          </Link>
          <Link
            href="/admin/homepage"
            className="rounded-lg border border-gray-300 p-4 transition hover:border-[var(--brand-primary)] hover:bg-[var(--article-card-badge-bg)]"
          >
            <p className="font-semibold text-[var(--brand-primary)]">Homepage Curation</p>
            <p className="text-sm text-gray-600">Reorder sections, toggle visibility, and pin homepage content</p>
          </Link>
          <Link
            href="/admin/content-architecture"
            className="rounded-lg border border-gray-300 p-4 transition hover:border-[var(--brand-primary)] hover:bg-[var(--article-card-badge-bg)]"
          >
            <p className="font-semibold text-[var(--brand-primary)]">Content Architecture</p>
            <p className="text-sm text-gray-600">Reference section purpose, model boundaries, and category guidance before editing taxonomy</p>
          </Link>
        </div>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="mb-4 text-2xl font-bold">Recent Activity</h2>
        <div className="space-y-3">
          {recentActivity.length ? (
            recentActivity.map((log) => (
              <div
                key={log.id}
                className={`flex items-center justify-between border-l-4 p-3 ${getActivityAccent(log.resourceType)}`}
              >
                <span>{describeActivity(log)}</span>
                <span className="text-xs text-gray-500">{formatRelativeTime(log.createdAt)}</span>
              </div>
            ))
          ) : (
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
              No recent activity logged yet.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
