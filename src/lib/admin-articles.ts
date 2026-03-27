import { ArticleStatus, Prisma } from '@prisma/client';
import { db } from './db';

export const ADMIN_ARTICLE_PAGE_SIZE = 20;

export const ADMIN_ARTICLE_TABS = {
  drafts: {
    label: 'Drafts',
    status: ArticleStatus.DRAFT,
  },
  pending: {
    label: 'Pending',
    status: ArticleStatus.PENDING_REVIEW,
  },
  approved: {
    label: 'Approved',
    status: ArticleStatus.PUBLISHED,
  },
  archived: {
    label: 'Archived',
    status: ArticleStatus.UNPUBLISHED,
  },
} as const;

export type AdminArticleTab = keyof typeof ADMIN_ARTICLE_TABS;
export type AdminArticleScope = 'tenant' | 'all';

interface GetAdminArticlesPageOptions {
  tab: AdminArticleTab;
  page: number;
  limit?: number;
  communityId?: string;
}

function isValidAdminArticleTab(value: string): value is AdminArticleTab {
  return value in ADMIN_ARTICLE_TABS;
}

export function parseAdminArticleTab(value?: string | string[] | null): AdminArticleTab {
  const normalizedValue = Array.isArray(value) ? value[0] : value;

  if (normalizedValue && isValidAdminArticleTab(normalizedValue)) {
    return normalizedValue;
  }

  return 'drafts';
}

export function parseAdminArticleScope(
  value?: string | string[] | null,
  allowAllTenants = false
): AdminArticleScope {
  const normalizedValue = Array.isArray(value) ? value[0] : value;

  if (allowAllTenants && normalizedValue === 'all') {
    return 'all';
  }

  return 'tenant';
}

export function parsePageNumber(value?: string | string[] | null) {
  const normalizedValue = Array.isArray(value) ? value[0] : value;
  const page = Number.parseInt(normalizedValue || '1', 10);

  if (Number.isNaN(page) || page < 1) {
    return 1;
  }

  return page;
}

export function buildAdminArticlesQuery(params: {
  tab: AdminArticleTab;
  page?: number;
  scope?: AdminArticleScope;
}) {
  const searchParams = new URLSearchParams();
  searchParams.set('tab', params.tab);

  if (params.page && params.page > 1) {
    searchParams.set('page', String(params.page));
  }

  if (params.scope === 'all') {
    searchParams.set('scope', 'all');
  }

  return searchParams.toString();
}

function buildAdminArticlesWhere(
  tab: AdminArticleTab,
  communityId?: string
): Prisma.ArticleWhereInput {
  return {
    status: ADMIN_ARTICLE_TABS[tab].status,
    ...(communityId ? { communityId } : {}),
  };
}

export async function getAdminArticleCounts(communityId?: string) {
  const baseWhere = communityId ? { communityId } : {};

  const [drafts, pending, approved, archived] = await Promise.all([
    db.article.count({
      where: {
        ...baseWhere,
        status: ArticleStatus.DRAFT,
      },
    }),
    db.article.count({
      where: {
        ...baseWhere,
        status: ArticleStatus.PENDING_REVIEW,
      },
    }),
    db.article.count({
      where: {
        ...baseWhere,
        status: ArticleStatus.PUBLISHED,
      },
    }),
    db.article.count({
      where: {
        ...baseWhere,
        status: ArticleStatus.UNPUBLISHED,
      },
    }),
  ]);

  return {
    drafts,
    pending,
    approved,
    archived,
  };
}

export async function getAdminArticlesPage({
  tab,
  page,
  limit = ADMIN_ARTICLE_PAGE_SIZE,
  communityId,
}: GetAdminArticlesPageOptions) {
  const where = buildAdminArticlesWhere(tab, communityId);
  const safePage = Math.max(1, page);
  const orderBy =
    tab === 'approved'
      ? [{ publishedAt: 'desc' as const }, { updatedAt: 'desc' as const }]
      : [{ updatedAt: 'desc' as const }, { createdAt: 'desc' as const }];

  const [total, articles] = await Promise.all([
    db.article.count({ where }),
    db.article.findMany({
      where,
      skip: (safePage - 1) * limit,
      take: limit,
      select: {
        id: true,
        title: true,
        slug: true,
        excerpt: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        publishedAt: true,
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
          },
        },
        category: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
      orderBy,
    }),
  ]);

  return {
    articles,
    pagination: {
      page: safePage,
      limit,
      total,
      pages: Math.max(1, Math.ceil(total / limit)),
    },
  };
}
