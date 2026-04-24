import Link from 'next/link';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { BarChart3 } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { getCurrentCommunity } from '@/lib/community';
import { db, hasAnalyticsRollupDelegates } from '@/lib/db';
import { checkPermission } from '@/lib/permissions';
import { AdminPage } from '@/components/admin/AdminPage';

type SupportedAnalyticsContentType =
  | 'ARTICLE'
  | 'EVENT'
  | 'MARKETPLACE_LISTING'
  | 'HELP_WANTED_POST'
  | 'RECIPE';

type RollupMetrics = {
  pageViews: number;
  uniqueVisitors: number;
  opens: number;
  engagedPings: number;
  reactions: number;
  comments: number;
  shares: number;
  messageStarts: number;
};

type ResolvedContentRow = {
  id: string;
  contentType: SupportedAnalyticsContentType;
  title: string;
  subtitle: string;
  href: string;
  categoryLabel: string;
};

type TypeSummaryRow = {
  contentType: SupportedAnalyticsContentType;
  itemCount: number;
  pageViews: number;
  uniqueVisitors: number;
  opens: number;
  engagedPings: number;
  reactions: number;
  comments: number;
  shares: number;
  messageStarts: number;
};

type CategorySummaryRow = {
  label: string;
  contentType: SupportedAnalyticsContentType;
  pageViews: number;
  uniqueVisitors: number;
  opens: number;
  engagedPings: number;
  reactions: number;
  comments: number;
  shares: number;
  messageStarts: number;
};

type HomepageSlotSummaryRow = {
  slotPosition: number;
  boxType: string;
  placement: string;
  impressions: number;
  clicks: number;
};

function formatCount(value: number) {
  return new Intl.NumberFormat('en-US').format(value);
}

function typeLabel(contentType: SupportedAnalyticsContentType) {
  switch (contentType) {
    case 'ARTICLE':
      return 'Article';
    case 'EVENT':
      return 'Event';
    case 'MARKETPLACE_LISTING':
      return 'Marketplace';
    case 'HELP_WANTED_POST':
      return 'Help Wanted';
    case 'RECIPE':
      return 'Recipe';
  }
}

function emptyMetrics(): RollupMetrics {
  return {
    pageViews: 0,
    uniqueVisitors: 0,
    opens: 0,
    engagedPings: 0,
    reactions: 0,
    comments: 0,
    shares: 0,
    messageStarts: 0,
  };
}

export default async function AdminAnalyticsPage() {
  const session = await getServerSession(authOptions);
  const userRole = session?.user?.role || '';

  if (!checkPermission(userRole, 'analytics:view')) {
    redirect('/');
  }

  const currentCommunity = await getCurrentCommunity({ headers: headers() });
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const communityFilter = currentCommunity?.id ? { communityId: currentCommunity.id } : {};
  const supportedTypes: SupportedAnalyticsContentType[] = [
    'ARTICLE',
    'EVENT',
    'MARKETPLACE_LISTING',
    'HELP_WANTED_POST',
    'RECIPE',
  ];

  if (!hasAnalyticsRollupDelegates(db)) {
    return (
      <AdminPage title="Analytics">
        <div className="admin-section-card">
          <div className="admin-card-header">
            <div className="flex items-center gap-0">
              <div className="admin-card-header-icon" aria-hidden="true">
                <BarChart3 className="h-4 w-4" />
              </div>
              <div className="admin-card-header-label">Analytics</div>
            </div>
            <div className="admin-card-header-actions">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-700">
                Setup Required
              </span>
            </div>
          </div>
          <div className="admin-card-body space-y-3">
            <p className="text-sm text-slate-600">
              The current Prisma client does not expose the analytics rollup models yet, so this page
              cannot read the aggregated metrics tables safely.
            </p>
            <p className="text-sm text-slate-600">
              Regenerate the Prisma client with <code>npm run db:generate</code>, restart the Next.js
              server, and if this environment has not received the analytics schema yet also run{' '}
              <code>npm run db:push</code>.
            </p>
          </div>
        </div>
      </AdminPage>
    );
  }

  const [contentRollups, categoryRollups, homepageSlotRollups, uniqueVisitorRows] = await Promise.all([
    db.contentMetricsDaily.findMany({
      where: {
        date: { gte: since },
        contentType: { in: supportedTypes },
        ...communityFilter,
      },
      select: {
        contentType: true,
        contentId: true,
        categoryLabel: true,
        pageViews: true,
        uniqueVisitors: true,
        opens: true,
        engagedPings: true,
        reactions: true,
        comments: true,
        shares: true,
        messageStarts: true,
      },
    }),
    db.categoryMetricsDaily.findMany({
      where: {
        date: { gte: since },
        contentType: { in: supportedTypes },
        ...communityFilter,
      },
      select: {
        contentType: true,
        categoryLabel: true,
        pageViews: true,
        uniqueVisitors: true,
        opens: true,
        engagedPings: true,
        reactions: true,
        comments: true,
        shares: true,
        messageStarts: true,
      },
    }),
    db.homepageSlotMetricsDaily.findMany({
      where: {
        date: { gte: since },
        ...communityFilter,
      },
      select: {
        slotPosition: true,
        boxType: true,
        placement: true,
        contentType: true,
        contentId: true,
        impressions: true,
        clicks: true,
      },
    }),
    db.analyticsEvent.findMany({
      where: {
        occurredAt: { gte: since },
        eventName: 'page_view',
        anonymousVisitorId: { not: null },
        ...communityFilter,
      },
      distinct: ['anonymousVisitorId'],
      select: { anonymousVisitorId: true },
    }),
  ]);

  const metricsByContentKey = new Map<string, RollupMetrics>();
  const idsByType = new Map<SupportedAnalyticsContentType, Set<string>>();
  for (const contentType of supportedTypes) {
    idsByType.set(contentType, new Set());
  }

  for (const row of contentRollups) {
    idsByType.get(row.contentType as SupportedAnalyticsContentType)?.add(row.contentId);
    const key = `${row.contentType}:${row.contentId}`;
    const existing = metricsByContentKey.get(key) ?? emptyMetrics();
    existing.pageViews += row.pageViews;
    existing.uniqueVisitors += row.uniqueVisitors;
    existing.opens += row.opens;
    existing.engagedPings += row.engagedPings;
    existing.reactions += row.reactions;
    existing.comments += row.comments;
    existing.shares += row.shares;
    existing.messageStarts += row.messageStarts;
    metricsByContentKey.set(key, existing);
  }

  const [articles, events, listings, helpWantedPosts, recipes] = await Promise.all([
    db.article.findMany({
      where: { id: { in: Array.from(idsByType.get('ARTICLE') ?? []) } },
      select: {
        id: true,
        title: true,
        category: { select: { name: true } },
        author: { select: { firstName: true, lastName: true } },
      },
    }),
    db.event.findMany({
      where: { id: { in: Array.from(idsByType.get('EVENT') ?? []) } },
      select: {
        id: true,
        title: true,
        organization: { select: { name: true } },
        submittedBy: { select: { firstName: true, lastName: true } },
      },
    }),
    db.marketplaceListing.findMany({
      where: { id: { in: Array.from(idsByType.get('MARKETPLACE_LISTING') ?? []) } },
      select: {
        id: true,
        title: true,
        category: true,
        store: { select: { name: true } },
      },
    }),
    db.helpWantedPost.findMany({
      where: { id: { in: Array.from(idsByType.get('HELP_WANTED_POST') ?? []) } },
      select: {
        id: true,
        title: true,
        postingType: true,
        author: { select: { firstName: true, lastName: true } },
      },
    }),
    db.recipe.findMany({
      where: { id: { in: Array.from(idsByType.get('RECIPE') ?? []) } },
      select: {
        id: true,
        title: true,
        category: { select: { name: true } },
        author: { select: { firstName: true, lastName: true } },
      },
    }),
  ]);

  const resolvedContent = new Map<string, ResolvedContentRow>();
  for (const article of articles) {
    resolvedContent.set(`ARTICLE:${article.id}`, {
      id: article.id,
      contentType: 'ARTICLE',
      title: article.title,
      subtitle: `${article.author.firstName} ${article.author.lastName}`.trim(),
      href: `/local-life/submit?edit=${article.id}`,
      categoryLabel: article.category?.name ?? 'Uncategorized',
    });
  }
  for (const event of events) {
    resolvedContent.set(`EVENT:${event.id}`, {
      id: event.id,
      contentType: 'EVENT',
      title: event.title,
      subtitle: `${event.submittedBy.firstName} ${event.submittedBy.lastName}`.trim(),
      href: `/admin/events/${event.id}`,
      categoryLabel: event.organization?.name ?? 'General event',
    });
  }
  for (const listing of listings) {
    resolvedContent.set(`MARKETPLACE_LISTING:${listing.id}`, {
      id: listing.id,
      contentType: 'MARKETPLACE_LISTING',
      title: listing.title,
      subtitle: listing.store.name,
      href: `/marketplace/${listing.id}`,
      categoryLabel: listing.category,
    });
  }
  for (const post of helpWantedPosts) {
    resolvedContent.set(`HELP_WANTED_POST:${post.id}`, {
      id: post.id,
      contentType: 'HELP_WANTED_POST',
      title: post.title,
      subtitle: `${post.author.firstName} ${post.author.lastName}`.trim(),
      href: `/help-wanted/${post.id}`,
      categoryLabel: post.postingType,
    });
  }
  for (const recipe of recipes) {
    resolvedContent.set(`RECIPE:${recipe.id}`, {
      id: recipe.id,
      contentType: 'RECIPE',
      title: recipe.title,
      subtitle: `${recipe.author.firstName} ${recipe.author.lastName}`.trim(),
      href: `/recipes/${recipe.id}`,
      categoryLabel: recipe.category?.name ?? 'Recipes',
    });
  }

  const contentRows = Array.from(metricsByContentKey.entries())
    .map(([key, metrics]) => {
      const content = resolvedContent.get(key);
      if (!content) {
        return null;
      }
      return { content, metrics };
    })
    .filter((value): value is { content: ResolvedContentRow; metrics: RollupMetrics } => Boolean(value))
    .sort((left, right) => {
      const leftScore =
        left.metrics.opens +
        left.metrics.messageStarts * 4 +
        left.metrics.reactions * 2 +
        left.metrics.comments * 2;
      const rightScore =
        right.metrics.opens +
        right.metrics.messageStarts * 4 +
        right.metrics.reactions * 2 +
        right.metrics.comments * 2;
      return rightScore - leftScore;
    });

  const typeSummary: TypeSummaryRow[] = supportedTypes
    .map((contentType) => {
      const rows = contentRows.filter((row) => row.content.contentType === contentType);
      return {
        contentType,
        itemCount: rows.length,
        pageViews: rows.reduce((sum, row) => sum + row.metrics.pageViews, 0),
        uniqueVisitors: rows.reduce((sum, row) => sum + row.metrics.uniqueVisitors, 0),
        opens: rows.reduce((sum, row) => sum + row.metrics.opens, 0),
        engagedPings: rows.reduce((sum, row) => sum + row.metrics.engagedPings, 0),
        reactions: rows.reduce((sum, row) => sum + row.metrics.reactions, 0),
        comments: rows.reduce((sum, row) => sum + row.metrics.comments, 0),
        shares: rows.reduce((sum, row) => sum + row.metrics.shares, 0),
        messageStarts: rows.reduce((sum, row) => sum + row.metrics.messageStarts, 0),
      };
    })
    .filter((row) => row.itemCount > 0)
    .sort((a, b) => b.opens - a.opens);

  const categorySummaryMap: Map<string, CategorySummaryRow> = categoryRollups.reduce(
    (acc: Map<string, CategorySummaryRow>, row) => {
      const key = `${row.contentType}:${row.categoryLabel}`;
      const existing = acc.get(key) ?? {
        label: row.categoryLabel,
        contentType: row.contentType as SupportedAnalyticsContentType,
        pageViews: 0,
        uniqueVisitors: 0,
        opens: 0,
        engagedPings: 0,
        reactions: 0,
        comments: 0,
        shares: 0,
        messageStarts: 0,
      };

      existing.pageViews += row.pageViews;
      existing.uniqueVisitors += row.uniqueVisitors;
      existing.opens += row.opens;
      existing.engagedPings += row.engagedPings;
      existing.reactions += row.reactions;
      existing.comments += row.comments;
      existing.shares += row.shares;
      existing.messageStarts += row.messageStarts;
      acc.set(key, existing);
      return acc;
    },
    new Map<string, CategorySummaryRow>()
  );

  const categorySummary = Array.from(categorySummaryMap.values())
    .sort((a, b) => b.opens - a.opens)
    .slice(0, 12);

  const homepageSlotSummaryMap: Map<string, HomepageSlotSummaryRow> = homepageSlotRollups.reduce(
    (acc: Map<string, HomepageSlotSummaryRow>, row) => {
      const key = `${row.slotPosition}:${row.boxType}:${row.placement}`;
      const existing = acc.get(key) ?? {
        slotPosition: row.slotPosition,
        boxType: row.boxType,
        placement: row.placement,
        impressions: 0,
        clicks: 0,
      };
      existing.impressions += row.impressions;
      existing.clicks += row.clicks;
      acc.set(key, existing);
      return acc;
    },
    new Map<string, HomepageSlotSummaryRow>()
  );

  const homepageSlotSummary = Array.from(homepageSlotSummaryMap.values())
    .sort((a, b) => {
      if (a.slotPosition !== b.slotPosition) {
        return a.slotPosition - b.slotPosition;
      }
      return b.clicks - a.clicks;
    });

  return (
    <AdminPage title="Analytics">
      <div className="admin-card">
        <div className="admin-card-header">
          <div className="flex items-center gap-0">
            <div className="admin-card-header-icon" aria-hidden="true">
              <BarChart3 className="h-4 w-4" />
            </div>
            <div className="admin-card-header-label">Analytics</div>
          </div>
          <div className="admin-card-header-actions">
            <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              Last 30 days
            </span>
          </div>
        </div>
        <div className="admin-card-body">
          <p className="text-sm text-slate-600">
            This view now reads from daily rollups instead of scanning the raw event stream for every
            content and category section. Raw events still exist underneath for recompute and future
            deeper reporting, while the editorial view now has a more stable aggregated layer.
          </p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
        {[
          {
            label: 'Visitor IDs',
            value: uniqueVisitorRows.length,
          },
          {
            label: 'Content Opens',
            value: typeSummary.reduce((sum, row) => sum + row.opens, 0),
          },
          {
            label: 'Page Views',
            value: typeSummary.reduce((sum, row) => sum + row.pageViews, 0),
          },
          {
            label: 'Engaged Pings',
            value: typeSummary.reduce((sum, row) => sum + row.engagedPings, 0),
          },
          {
            label: 'Reactions / Comments',
            value: typeSummary.reduce((sum, row) => sum + row.reactions + row.comments, 0),
          },
          {
            label: 'Message Starts',
            value: typeSummary.reduce((sum, row) => sum + row.messageStarts, 0),
          },
        ].map((item) => (
          <div key={item.label} className="admin-card">
            <div className="admin-card-body">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                {item.label}
              </p>
              <p className="mt-2 text-3xl font-black text-slate-950">{formatCount(item.value)}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="admin-card">
        <div className="admin-card-header">
          <div className="admin-card-header-label">By Type</div>
        </div>
        <div className="admin-card-body">
          <div className="admin-list">
            <div className="admin-list-table-wrap">
              <table className="admin-list-table">
                <thead className="admin-list-head">
                  <tr>
                    <th className="admin-list-header-cell">Content Type</th>
                    <th className="admin-list-header-cell">Items</th>
                    <th className="admin-list-header-cell">Opens</th>
                    <th className="admin-list-header-cell">Views</th>
                    <th className="admin-list-header-cell">Engaged</th>
                    <th className="admin-list-header-cell">Reactions</th>
                    <th className="admin-list-header-cell">Comments</th>
                    <th className="admin-list-header-cell">Messages</th>
                  </tr>
                </thead>
                <tbody>
                  {typeSummary.length === 0 ? (
                    <tr className="admin-list-row">
                      <td className="admin-list-empty" colSpan={8}>
                        No rollup metrics have been recorded yet.
                      </td>
                    </tr>
                  ) : (
                    typeSummary.map((row) => (
                      <tr key={row.contentType} className="admin-list-row">
                        <td className="admin-list-cell font-medium text-slate-900">
                          {typeLabel(row.contentType)}
                        </td>
                        <td className="admin-list-cell">{formatCount(row.itemCount)}</td>
                        <td className="admin-list-cell">{formatCount(row.opens)}</td>
                        <td className="admin-list-cell">{formatCount(row.pageViews)}</td>
                        <td className="admin-list-cell">{formatCount(row.engagedPings)}</td>
                        <td className="admin-list-cell">{formatCount(row.reactions)}</td>
                        <td className="admin-list-cell">{formatCount(row.comments)}</td>
                        <td className="admin-list-cell">{formatCount(row.messageStarts)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div className="admin-card">
        <div className="admin-card-header">
          <div className="admin-card-header-label">Top Content</div>
        </div>
        <div className="admin-card-body">
          <div className="admin-list">
            <div className="admin-list-table-wrap">
              <table className="admin-list-table">
                <thead className="admin-list-head">
                  <tr>
                    <th className="admin-list-header-cell">Content</th>
                    <th className="admin-list-header-cell">Type</th>
                    <th className="admin-list-header-cell">Category</th>
                    <th className="admin-list-header-cell">Opens</th>
                    <th className="admin-list-header-cell">Shares</th>
                    <th className="admin-list-header-cell">Reactions</th>
                    <th className="admin-list-header-cell">Messages</th>
                  </tr>
                </thead>
                <tbody>
                  {contentRows.length === 0 ? (
                    <tr className="admin-list-row">
                      <td className="admin-list-empty" colSpan={7}>
                        No content rollups yet.
                      </td>
                    </tr>
                  ) : (
                    contentRows.slice(0, 20).map((row) => (
                      <tr key={`${row.content.contentType}:${row.content.id}`} className="admin-list-row">
                        <td className="admin-list-cell">
                          <div className="font-medium text-slate-900">
                            <Link href={row.content.href} className="admin-list-link">
                              {row.content.title}
                            </Link>
                          </div>
                          <div className="text-xs text-slate-500">{row.content.subtitle}</div>
                        </td>
                        <td className="admin-list-cell">{typeLabel(row.content.contentType)}</td>
                        <td className="admin-list-cell">{row.content.categoryLabel}</td>
                        <td className="admin-list-cell">{formatCount(row.metrics.opens)}</td>
                        <td className="admin-list-cell">{formatCount(row.metrics.shares)}</td>
                        <td className="admin-list-cell">{formatCount(row.metrics.reactions)}</td>
                        <td className="admin-list-cell">{formatCount(row.metrics.messageStarts)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="admin-card">
          <div className="admin-card-header">
            <div className="admin-card-header-label">Category / Segment Trends</div>
          </div>
          <div className="admin-card-body">
            <div className="admin-list">
              <div className="admin-list-table-wrap">
                <table className="admin-list-table">
                  <thead className="admin-list-head">
                    <tr>
                      <th className="admin-list-header-cell">Segment</th>
                      <th className="admin-list-header-cell">Type</th>
                      <th className="admin-list-header-cell">Opens</th>
                      <th className="admin-list-header-cell">Views</th>
                      <th className="admin-list-header-cell">Messages</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categorySummary.length === 0 ? (
                      <tr className="admin-list-row">
                        <td className="admin-list-empty" colSpan={5}>
                          No category rollups yet.
                        </td>
                      </tr>
                    ) : (
                      categorySummary.map((row) => (
                        <tr key={`${row.contentType}:${row.label}`} className="admin-list-row">
                          <td className="admin-list-cell font-medium text-slate-900">{row.label}</td>
                          <td className="admin-list-cell">{typeLabel(row.contentType)}</td>
                          <td className="admin-list-cell">{formatCount(row.opens)}</td>
                          <td className="admin-list-cell">{formatCount(row.pageViews)}</td>
                          <td className="admin-list-cell">{formatCount(row.messageStarts)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <div className="admin-card">
          <div className="admin-card-header">
            <div className="admin-card-header-label">Homepage Slot Performance</div>
          </div>
          <div className="admin-card-body">
            <div className="admin-list">
              <div className="admin-list-table-wrap">
                <table className="admin-list-table">
                  <thead className="admin-list-head">
                    <tr>
                      <th className="admin-list-header-cell">Slot</th>
                      <th className="admin-list-header-cell">Box</th>
                      <th className="admin-list-header-cell">Placement</th>
                      <th className="admin-list-header-cell">Impressions</th>
                      <th className="admin-list-header-cell">Clicks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {homepageSlotSummary.length === 0 ? (
                      <tr className="admin-list-row">
                        <td className="admin-list-empty" colSpan={5}>
                          No homepage slot rollups yet.
                        </td>
                      </tr>
                    ) : (
                      homepageSlotSummary.map((row) => (
                        <tr key={`${row.slotPosition}:${row.boxType}:${row.placement}`} className="admin-list-row">
                          <td className="admin-list-cell font-medium text-slate-900">
                            {formatCount(row.slotPosition)}
                          </td>
                          <td className="admin-list-cell">{row.boxType}</td>
                          <td className="admin-list-cell">{row.placement}</td>
                          <td className="admin-list-cell">{formatCount(row.impressions)}</td>
                          <td className="admin-list-cell">{formatCount(row.clicks)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminPage>
  );
}
