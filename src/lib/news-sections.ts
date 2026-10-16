import 'server-only';

import { headers } from 'next/headers';
import { db } from '@/lib/db';
import { resolveCommunityIdByDomain } from '@/lib/tenant';
import { hasTrustedAccess } from '@/lib/trust-access';

const PAGE_SIZE = 12;
type Viewer = { id?: string; trust_level?: string; role?: string };

function canReadCategory(minTrustLevel: string, viewer?: Viewer) {
  if (minTrustLevel === 'ANONYMOUS') return true;
  if (minTrustLevel === 'REGISTERED') return Boolean(viewer?.id);
  if (minTrustLevel === 'TRUSTED') {
    return hasTrustedAccess({ trustLevel: viewer?.trust_level, role: viewer?.role });
  }
  return false;
}

export async function getNewsSectionData({
  sectionSlug,
  categorySlug,
  page: requestedPage,
  viewer,
}: {
  sectionSlug: string;
  categorySlug?: string;
  page?: string;
  viewer?: Viewer;
}) {
  const requestHeaders = await headers();
  const communityId = await resolveCommunityIdByDomain(requestHeaders.get('host') || '');
  if (!communityId) return null;

  // Scope here as well as articles: the shared navigation accessor may have a
  // different cache/deployment lifecycle from this section renderer.
  const records = await db.category.findMany({
    where: { isArchived: false, OR: [{ communityId }, { communityId: null }] },
    orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    select: {
      id: true, name: true, slug: true, contentModel: true, minTrustLevel: true,
      parentCategoryId: true, sortOrder: true, communityId: true,
      parentCategory: { select: { slug: true } },
    },
  });
  const byPath = new Map<string, typeof records[number]>();
  for (const category of records) {
    const key = JSON.stringify([category.parentCategory?.slug ?? null, category.slug]);
    if (!byPath.has(key) || category.communityId === communityId) byPath.set(key, category);
  }
  const categories = [...byPath.values()].sort((a, b) => a.sortOrder - b.sortOrder);
  const section = categories.find((category) =>
    category.slug === sectionSlug && category.parentCategoryId === null
  );
  if (!section || section.contentModel !== 'ARTICLE' || !canReadCategory(section.minTrustLevel, viewer)) {
    return null;
  }

  // Walk the selected tenant's tree; a hidden or non-article ancestor excludes its branch.
  const visibleCategories = [section];
  const seen = new Set([section.id]);
  for (let index = 0; index < visibleCategories.length; index++) {
    const parent = visibleCategories[index];
    for (const category of categories) {
      if (category.parentCategoryId === parent.id && !seen.has(category.id) &&
          category.contentModel === 'ARTICLE' && canReadCategory(category.minTrustLevel, viewer)) {
        seen.add(category.id);
        visibleCategories.push(category);
      }
    }
  }
  const activeCategory = categorySlug
    ? visibleCategories.find((category) => category.id !== section.id && category.slug === categorySlug)
    : null;
  if (categorySlug && !activeCategory) return null;

  const includedIds = new Set([activeCategory?.id ?? section.id]);
  for (const category of visibleCategories) {
    if (category.parentCategoryId && includedIds.has(category.parentCategoryId)) includedIds.add(category.id);
  }
  const where = {
    communityId,
    status: 'PUBLISHED' as const,
    publishedAt: { lte: new Date() },
    categoryId: { in: [...includedIds] },
  };
  const total = await db.article.count({ where });
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const parsedPage = Number(requestedPage || '1');
  const page = Number.isSafeInteger(parsedPage) && parsedPage > 0 ? Math.min(parsedPage, pages) : 1;
  const articles = await db.article.findMany({
    where,
    orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
    select: {
      id: true, title: true, excerpt: true, featuredImageUrl: true, publishedAt: true,
      category: { select: { name: true } },
      author: { select: { firstName: true, lastName: true, profilePhotoUrl: true, trustLevel: true } },
    },
  });
  return {
    section,
    categories: visibleCategories.filter((category) => category.id !== section.id),
    activeCategory: activeCategory ?? null,
    articles,
    pagination: { page, pages, total },
  };
}

export type NewsSectionData = NonNullable<Awaited<ReturnType<typeof getNewsSectionData>>>;
