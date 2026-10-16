import type { Mock } from 'jest-mock';
jest.mock('server-only', () => ({}));
jest.mock('next/headers', () => ({ headers: jest.fn(() => new Headers({ host: 'tenant.test' })) }));
jest.mock('@/lib/tenant', () => ({ resolveCommunityIdByDomain: jest.fn() }));
jest.mock('@/lib/db', () => ({ db: { category: { findMany: jest.fn() }, article: { count: jest.fn(), findMany: jest.fn() } } }));

import { getNewsSectionData } from '@/lib/news-sections';
import { resolveCommunityIdByDomain } from '@/lib/tenant';
import { db } from '@/lib/db';

const category = (id: string, parentCategoryId: string | null = null, extra = {}) => ({
  id, slug: id, name: id, parentCategoryId, sortOrder: 0, communityId: 'tenant-a', parentCategory: parentCategoryId ? { slug: parentCategoryId } : null, contentModel: 'ARTICLE', minTrustLevel: 'ANONYMOUS', ...extra,
});
beforeEach(() => {
  jest.clearAllMocks();
  (resolveCommunityIdByDomain as unknown as Mock<(...args: unknown[]) => Promise<unknown>>).mockResolvedValue('tenant-a');
  (db.category.findMany as unknown as Mock<(...args: unknown[]) => Promise<unknown>>).mockResolvedValue([
    category('national'), category('policy', 'national'), category('health', 'policy'),
    category('staff', 'national', { minTrustLevel: 'TRUSTED' }), category('staff-child', 'staff'),
    category('recipes', 'national', { contentModel: 'RECIPE' }), category('sports'),
  ]);
  (db.article.count as unknown as Mock<(...args: unknown[]) => Promise<unknown>>).mockResolvedValue(14);
  (db.article.findMany as unknown as Mock<(...args: unknown[]) => Promise<unknown>>).mockResolvedValue([{ id: 'latest' }, { id: 'older' }]);
});

it('includes direct and descendant assignments, enforcing tenant/publication scope and ignoring featured priority', async () => {
  const data = await getNewsSectionData({ sectionSlug: 'national' });
  expect(data?.articles[0].id).toBe('latest');
  expect(db.article.findMany).toHaveBeenCalledWith(expect.objectContaining({
    where: { communityId: 'tenant-a', status: 'PUBLISHED', publishedAt: { lte: expect.any(Date) }, categoryId: { in: ['national', 'policy', 'health'] } },
    orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }], take: 12, skip: 0,
  }));
  expect(data?.categories.map((row) => row.id)).toEqual(['policy', 'health']);
});

it('limits a filter to its subtree and preserves pagination bounds', async () => {
  await getNewsSectionData({ sectionSlug: 'national', categorySlug: 'policy', page: '999999999' });
  expect(db.article.findMany).toHaveBeenCalledWith(expect.objectContaining({
    where: expect.objectContaining({ categoryId: { in: ['policy', 'health'] } }), skip: 12,
  }));
});

it.each(['NaN', '-1', '1.5', 'Infinity'])('normalizes invalid page %s', async (page) => {
  expect((await getNewsSectionData({ sectionSlug: 'national', page }))?.pagination.page).toBe(1);
});

it.each(['sports', 'staff', 'recipes', 'missing'])('rejects foreign, restricted or non-article filter %s', async (categorySlug) => {
  expect(await getNewsSectionData({ sectionSlug: 'national', categorySlug })).toBeNull();
  expect(db.article.findMany).not.toHaveBeenCalled();
});

it('fails closed for an unresolved tenant', async () => {
  (resolveCommunityIdByDomain as unknown as Mock<(...args: unknown[]) => Promise<unknown>>).mockResolvedValue(null);
  expect(await getNewsSectionData({ sectionSlug: 'national' })).toBeNull();
  expect(db.category.findMany).not.toHaveBeenCalled();
  expect(db.article.count).not.toHaveBeenCalled();
});

it.each([null, 'MIXED', 'PLANNED'])('does not turn model %s into a news page', async (contentModel) => {
  (db.category.findMany as unknown as Mock<(...args: unknown[]) => Promise<unknown>>).mockResolvedValue([category('national', null, { contentModel })]);
  expect(await getNewsSectionData({ sectionSlug: 'national' })).toBeNull();
  expect(db.article.count).not.toHaveBeenCalled();
});

it('enforces section trust on direct page access and permits a trusted editor', async () => {
  (db.category.findMany as unknown as Mock<(...args: unknown[]) => Promise<unknown>>).mockResolvedValue([category('national', null, { minTrustLevel: 'TRUSTED' })]);
  expect(await getNewsSectionData({ sectionSlug: 'national' })).toBeNull();
  expect(await getNewsSectionData({ sectionSlug: 'national', viewer: { id: 'reader', trust_level: 'REGISTERED' } })).toBeNull();
  expect(await getNewsSectionData({ sectionSlug: 'national', viewer: { id: 'editor', role: 'EDITOR' } })).not.toBeNull();
  expect(await getNewsSectionData({ sectionSlug: 'national', viewer: { id: 'editor', role: 'EDITOR', trust_level: 'SUSPENDED' } })).toBeNull();
});

it('includes restricted descendants for authorized viewers', async () => {
  const data = await getNewsSectionData({ sectionSlug: 'national', viewer: { id: 'trusted', trust_level: 'TRUSTED' } });
  expect(data?.categories.map((row) => row.id)).toEqual(['policy', 'staff', 'health', 'staff-child']);
});

it('uses tenant-scoped active categories and prefers a tenant override to a shared section', async () => {
  (db.category.findMany as unknown as Mock<(...args: unknown[]) => Promise<unknown>>).mockResolvedValue([
    category('shared-root', null, { slug: 'national', communityId: null }),
    category('own-root', null, { slug: 'national' }),
    category('shared-child', 'shared-root'),
    category('own-child', 'own-root'),
  ]);
  const data = await getNewsSectionData({ sectionSlug: 'national' });
  expect(db.category.findMany).toHaveBeenCalledWith(expect.objectContaining({
    where: { isArchived: false, OR: [{ communityId: 'tenant-a' }, { communityId: null }] },
  }));
  expect(data?.section.id).toBe('own-root');
  expect(db.article.findMany).toHaveBeenCalledWith(expect.objectContaining({
    where: expect.objectContaining({ categoryId: { in: ['own-root', 'own-child'] } }),
  }));
});
