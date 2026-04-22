import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import ArticlePreview from '@/components/articles/ArticlePreview';
import { authOptions } from '@/lib/auth';
import {
  ADMIN_ARTICLE_TABS,
  buildAdminArticlesQuery,
  parseAdminArticleScope,
  parseAdminArticleTab,
} from '@/lib/admin-articles';
import { getCurrentCommunity } from '@/lib/community';
import { db } from '@/lib/db';
import { checkPermission } from '@/lib/permissions';

interface AdminArticleDetailPageProps {
  params: {
    id: string;
  };
  searchParams?: {
    tab?: string;
    page?: string;
    scope?: string;
  };
}

function formatLongDateTime(value: Date | null) {
  if (!value) {
    return 'Not set';
  }

  return value.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'PUBLISHED':
      return 'Approved';
    case 'UNPUBLISHED':
      return 'Archived';
    case 'PENDING_REVIEW':
      return 'Pending Review';
    default:
      return 'Draft';
  }
}

function getStatusClasses(status: string) {
  switch (status) {
    case 'PUBLISHED':
      return 'bg-green-100 text-green-800';
    case 'UNPUBLISHED':
      return 'bg-slate-200 text-slate-700';
    case 'PENDING_REVIEW':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-blue-100 text-blue-800';
  }
}

export default async function AdminArticleDetailPage({
  params,
  searchParams,
}: AdminArticleDetailPageProps) {
  const session = await getServerSession(authOptions);
  const userRole = session?.user?.role || '';

  if (!checkPermission(userRole, 'articles:approve')) {
    redirect('/');
  }

  const isSuperAdmin = userRole === 'SUPER_ADMIN';
  const currentCommunity = await getCurrentCommunity({ headers: headers() });
  const activeTab = parseAdminArticleTab(searchParams?.tab);
  const activeScope = parseAdminArticleScope(searchParams?.scope, isSuperAdmin);

  const article = await db.article.findUnique({
    where: { id: params.id },
    include: {
      community: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      author: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          profilePhotoUrl: true,
          trustLevel: true,
        },
      },
      category: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      tags: {
        include: {
          tag: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
      },
    },
  });

  if (!article) {
    notFound();
  }

  const canViewAcrossTenants = isSuperAdmin && activeScope === 'all';

  if (!canViewAcrossTenants && currentCommunity && article.communityId !== currentCommunity.id) {
    notFound();
  }

  const backQuery = buildAdminArticlesQuery({
    tab: activeTab,
    page: searchParams?.page ? Number.parseInt(searchParams.page, 10) : undefined,
    scope: activeScope,
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link
            href={`/admin/articles?${backQuery}`}
            className="text-sm font-medium text-[var(--brand-primary)] transition hover:text-[var(--brand-accent)]"
          >
            Back to {ADMIN_ARTICLE_TABS[activeTab].label}
          </Link>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold text-slate-900">{article.title}</h1>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(article.status)}`}>
              {getStatusLabel(article.status)}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            {article.community.name}
            {article.category ? ` • ${article.category.name}` : ''}
            {' • '}
            {article.slug}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href={`/local-life/submit?edit=${article.id}`}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
          >
            Edit Article
          </Link>
          {article.status === 'PUBLISHED' ? (
            <Link
              href={`/local-life/${article.id}`}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
            >
              View Public Page
            </Link>
          ) : null}
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Author</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">
            {article.author.firstName} {article.author.lastName}
          </p>
          <p className="mt-1 text-xs text-slate-500">{article.author.trustLevel}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Created</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">{formatLongDateTime(article.createdAt)}</p>
          <p className="mt-1 text-xs text-slate-500">Updated {formatLongDateTime(article.updatedAt)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Published</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">{formatLongDateTime(article.publishedAt)}</p>
          <p className="mt-1 text-xs text-slate-500">
            {article.status === 'UNPUBLISHED' ? 'Archived article' : getStatusLabel(article.status)}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Tags</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {article.tags.length > 0 ? (
              article.tags.map((articleTag) => (
                <span
                  key={articleTag.tag.id}
                  className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700"
                >
                  #{articleTag.tag.name}
                </span>
              ))
            ) : (
              <p className="text-sm text-slate-500">No tags</p>
            )}
          </div>
        </div>
      </section>

      <ArticlePreview
        title={article.title}
        excerpt={article.excerpt}
        body={article.body}
        featuredImageUrl={article.featuredImageUrl}
        featuredImageCaption={article.featuredImageCaption}
        categoryName={article.category?.name || 'Local Life'}
        tags={article.tags.map((articleTag) => articleTag.tag.name)}
        author={article.author}
        publishedLabel={
          article.publishedAt
            ? formatLongDateTime(article.publishedAt)
            : article.status === 'DRAFT'
              ? 'Draft preview'
              : getStatusLabel(article.status)
        }
        previewLabel="Admin Article Detail"
        previewDescription="Reader-facing preview of the article as stored right now."
      />
    </div>
  );
}
