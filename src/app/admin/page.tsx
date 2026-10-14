import Link from 'next/link';
import { headers } from 'next/headers';
import { db } from '@/lib/db';
import { getCurrentCommunity } from '@/lib/community';
import { ArrowUpRight, ClipboardCheck, Eye, Home, ShieldCheck } from 'lucide-react';
import { AdminChip } from '@/components/admin/AdminChip';
import { AdminSection } from '@/components/admin/AdminSection';
import { AdminTable } from '@/components/admin/AdminTable';
import { AdminSummary } from '@/components/admin/AdminSummary';
import { CrudActionLink } from '@/components/shared/CrudAction';
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
  const currentCommunity = await getCurrentCommunity({ headers: await headers() });
  const communityWhere = currentCommunity?.id ? { communityId: currentCommunity.id } : {};

  const [
    totalUsers,
    totalStores,
    totalArticles,
    totalOrganizations,
    pendingOrganizations,
    totalRecipes,
    pendingRecipes,
    totalEvents,
    pendingEvents,
    totalListings,
    activeListings,
    pendingArticles,
    pendingHelpWanted,
    pendingStores,
    editorReadyReporterCount,
    editorReadyReporterRuns,
    recentActivity,
  ] = await Promise.all([
    db.user.count(),
    db.store.count({ where: communityWhere }),
    db.article.count({ where: communityWhere }),
    db.organization.count({ where: communityWhere }),
    db.organization.count({ where: { ...communityWhere, status: 'PENDING_APPROVAL' } }),
    db.recipe.count({ where: communityWhere }),
    db.recipe.count({ where: { ...communityWhere, status: 'PENDING_REVIEW' } }),
    db.event.count({ where: communityWhere }),
    db.event.count({ where: { ...communityWhere, status: 'PENDING_REVIEW' } }),
    db.marketplaceListing.count({ where: communityWhere }),
    db.marketplaceListing.count({ where: { ...communityWhere, status: 'ACTIVE' } }),
    db.article.count({ where: { ...communityWhere, status: 'PENDING_REVIEW' } }),
    db.helpWantedPost.count({ where: { ...communityWhere, status: 'PENDING_REVIEW' } }),
    db.store.count({ where: { ...communityWhere, status: 'PENDING_APPROVAL' } }),
    db.reporterRun.count({
      where: {
        ...communityWhere,
        status: 'DRAFT_CREATED',
      },
    }),
    db.reporterRun.findMany({
      where: {
        ...communityWhere,
        status: 'DRAFT_CREATED',
      },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      take: 5,
      select: {
        id: true,
        topic: true,
        title: true,
        updatedAt: true,
        assignedTo: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    }),
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
  const areas = [
    { name: 'Articles', total: totalArticles, pending: pendingArticles, href: '/admin/articles' },
    { name: 'Recipes', total: totalRecipes, pending: pendingRecipes, href: '/admin/recipes' },
    { name: 'Events', total: totalEvents, pending: pendingEvents, href: '/admin/events' },
    { name: 'Organizations', total: totalOrganizations, pending: pendingOrganizations, href: '/admin/organizations' },
    { name: 'Stores', total: totalStores, pending: pendingStores, href: '/admin/stores' },
    { name: 'Users', total: totalUsers, pending: null, href: '/admin/users' },
  ];

  return (
    <AdminPage title="Dashboard" actions={
      <>
        <CrudActionLink href="/admin/homepage" icon={Home} label="Curate homepage" />
        <CrudActionLink href="/admin/trust" icon={ShieldCheck} label="Manage trust" />
        <CrudActionLink href="/admin/audit" icon={ClipboardCheck} label="View audit log" />
      </>
    }>
      <AdminSummary label="Operational summary" items={[
        { label: 'Content awaiting review', value: formatCount(pendingReviewCount) },
        { label: 'Editor ready stories', value: formatCount(editorReadyReporterCount) },
        { label: 'Active marketplace listings', value: <>{formatCount(activeListings)} <span>of {formatCount(totalListings)}</span></> },
      ]} />

      <AdminSection title="Management">
        <AdminTable
          label="Management overview"
          rows={areas}
          rowKey={(area) => area.href}
          emptyMessage="No management areas available."
          columns={[
            { key: 'name', label: 'Area', render: (area) => <Link href={area.href} className="admin-list-link">{area.name}</Link> },
            { key: 'total', label: 'Records', align: 'right', render: (area) => formatCount(area.total) },
            { key: 'pending', label: 'Awaiting review', align: 'right', render: (area) => area.pending === null ? '—' : area.pending ? <AdminChip tone="pend">{formatCount(area.pending)}</AdminChip> : '0' },
            { key: 'actions', label: 'Actions', align: 'right', render: (area) => <CrudActionLink href={area.href} icon={ArrowUpRight} label={`Manage ${area.name.toLowerCase()}`} /> },
          ]}
        />
      </AdminSection>

      <AdminSection title="Editor ready stories" count={editorReadyReporterCount} actions={
        <CrudActionLink href="/admin/reporter?view=editor-ready" icon={ArrowUpRight} label="Open editor ready queue" />
      }>
        <AdminTable
          label="Editor ready stories"
          rows={editorReadyReporterRuns}
          rowKey={(run) => run.id}
          emptyMessage="No stories awaiting editor review."
          columns={[
            { key: 'story', label: 'Story', render: (run) => <Link href={`/admin/reporter/${run.id}?view=drafts`} className="admin-list-link">{run.title || run.topic}</Link> },
            { key: 'assignee', label: 'Assignee', render: (run) => run.assignedTo ? `${run.assignedTo.firstName} ${run.assignedTo.lastName}` : 'Unassigned' },
            { key: 'updated', label: 'Updated', render: (run) => formatRelativeTime(run.updatedAt) },
            { key: 'actions', label: 'Actions', align: 'right', render: (run) => <CrudActionLink href={`/admin/reporter/${run.id}/review`} icon={Eye} label="Review story" /> },
          ]}
        />
      </AdminSection>

      <AdminSection title="Recent activity" actions={
        <CrudActionLink href="/admin/audit" icon={ArrowUpRight} label="Open full audit log" />
      }>
        <AdminTable
          label="Recent activity"
          rows={recentActivity}
          rowKey={(log) => log.id}
          emptyMessage="No recent activity."
          columns={[
            { key: 'activity', label: 'Activity', render: describeActivity },
            { key: 'type', label: 'Type', render: (log) => <AdminChip>{log.resourceType.replace(/_/g, ' ')}</AdminChip> },
            { key: 'when', label: 'When', render: (log) => formatRelativeTime(log.createdAt) },
          ]}
        />
      </AdminSection>
    </AdminPage>
  );
}
