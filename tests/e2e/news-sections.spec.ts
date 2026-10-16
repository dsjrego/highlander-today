import { test, expect } from 'playwright/test';
import { randomUUID } from 'node:crypto';
import { encode } from 'next-auth/jwt';
import AxeBuilder from '@axe-core/playwright';
import { db } from '../../src/lib/db';
import { ensureDefaultSiteSettings } from '../../src/lib/community';

test.describe('automatic news sections', () => {
  const communityIds: string[] = [];
  let authorId: string;
  let sectionSlug: string;
  let latestId: string;
  let childSlug: string;
  let restrictedSlug: string;

  test.beforeAll(async () => {
    const suffix = randomUUID().slice(0, 8);
    sectionSlug = `national-${suffix}`;
    childSlug = `policy-${suffix}`;
    restrictedSlug = `staff-${suffix}`;
    const community = await db.community.create({ data: { name: 'News Test', slug: `news-${suffix}`, domain: '127.0.0.1' } });
    communityIds.push(community.id);
    await ensureDefaultSiteSettings(community.id);
    const foreign = await db.community.create({ data: { name: 'Foreign News Test', slug: `foreign-news-${suffix}` } });
    communityIds.push(foreign.id);
    const author = await db.user.create({ data: {
      email: `news-${suffix}@example.test`, firstName: 'News', lastName: 'Writer', trustLevel: 'TRUSTED',
      dateOfBirth: new Date('1980-01-01T00:00:00Z'),
      placeRelationships: { create: { relationshipType: 'CURRENT_RESIDENT', isPrimary: true, isCurrent: true, fallbackLocationText: 'News Test County' } },
      memberships: { create: { communityId: community.id, role: 'EDITOR' } },
    } });
    authorId = author.id;
    const foreignSection = await db.category.create({ data: { communityId: foreign.id, name: 'Foreign National', slug: sectionSlug, contentModel: 'ARTICLE' } });
    const section = await db.category.create({ data: { communityId: community.id, name: 'National', slug: sectionSlug, contentModel: 'ARTICLE' } });
    const child = await db.category.create({ data: { communityId: community.id, name: 'Policy', slug: childSlug, contentModel: 'ARTICLE', parentCategoryId: section.id } });
    const restricted = await db.category.create({ data: { communityId: community.id, name: 'Staff only', slug: restrictedSlug, contentModel: 'ARTICLE', parentCategoryId: section.id, minTrustLevel: 'TRUSTED' } });
    const archived = await db.category.create({ data: { communityId: community.id, name: 'Archived', slug: `archive-${suffix}`, contentModel: 'ARTICLE', parentCategoryId: section.id, isArchived: true } });
    const local = await db.category.create({ data: { communityId: community.id, name: 'Local Life', slug: 'local-life', contentModel: 'MIXED' } });
    const localNews = await db.category.create({ data: { communityId: community.id, name: 'Local News', slug: 'local-news', contentModel: 'ARTICLE', parentCategoryId: local.id } });
    await db.article.create({ data: { communityId: community.id, authorUserId: authorId, categoryId: localNews.id,
      title: 'Local route regression story', slug: `local-${suffix}`, body: '<p>Local story.</p>', status: 'PUBLISHED', publishedAt: new Date() } });
    const now = Date.now();
    latestId = (await db.article.create({ data: {
      communityId: community.id, authorUserId: authorId, categoryId: section.id,
      title: 'Newest direct section story', slug: `latest-${suffix}`, body: '<p>Published section news.</p>',
      excerpt: 'The latest published article leads this section automatically.', status: 'PUBLISHED', publishedAt: new Date(now - 1000),
      featuredImageUrl: '/branding/highlander-today-facebook-cover.svg',
    } })).id;
    await db.article.createMany({ data: [
      ...Array.from({ length: 13 }, (_, index) => ({
        communityId: community.id, authorUserId: authorId, categoryId: child.id,
        title: `Policy headline ${index + 1}`, slug: `policy-${suffix}-${index}`, body: '<p>Older published news.</p>',
        status: 'PUBLISHED' as const, publishedAt: new Date(now - (index + 2) * 60000), isFeatured: index === 0,
      })),
      ...[
        { title: 'Hidden draft story', status: 'DRAFT' as const, categoryId: section.id, communityId: community.id, publishedAt: new Date(now) },
        { title: 'Future story', status: 'PUBLISHED' as const, categoryId: section.id, communityId: community.id, publishedAt: new Date(now + 86400000) },
        { title: 'Foreign story', status: 'PUBLISHED' as const, categoryId: foreignSection.id, communityId: foreign.id, publishedAt: new Date(now) },
        { title: 'Restricted story', status: 'PUBLISHED' as const, categoryId: restricted.id, communityId: community.id, publishedAt: new Date(now) },
        { title: 'Archived category story', status: 'PUBLISHED' as const, categoryId: archived.id, communityId: community.id, publishedAt: new Date(now) },
      ].map((row, index) => ({ ...row, authorUserId: authorId, slug: `excluded-${suffix}-${index}`, body: '<p>Excluded news fixture.</p>' })),
    ] });
  });

  test.afterAll(async () => {
    await db.community.deleteMany({ where: { id: { in: communityIds } } });
    if (authorId) await db.user.delete({ where: { id: authorId } });
    await db.$disconnect();
  });

  test('leads with latest publication and supports filters, pagination and responsive reading', async ({ page }, testInfo) => {
    await page.goto(`/${sectionSlug}`);
    await page.setViewportSize({ width: 1280, height: 900 });
    const sectionMenu = page.getByRole('button', { name: 'Toggle National submenu' });
    await sectionMenu.focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('menuitem', { name: 'All National' })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(new RegExp(`/${sectionSlug}$`));
    await expect(page.getByRole('heading', { name: 'National', exact: true })).toBeVisible();
    const hero = page.locator('[data-news-hero]');
    await expect(hero.getByRole('heading')).toHaveText('Newest direct section story');
    await expect(hero.getByRole('link')).toHaveAttribute('href', `/local-life/${latestId}`);
    await expect(page.getByRole('heading', { name: 'Policy headline 1', exact: true })).toBeVisible();
    for (const title of ['Hidden draft story', 'Future story', 'Foreign story', 'Restricted story', 'Archived category story']) {
      await expect(page.getByText(title, { exact: true })).toHaveCount(0);
    }
    await expect(page.getByRole('navigation', { name: 'National categories' }).getByRole('link', { name: 'Staff only' })).toHaveCount(0);
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`news-${width}.png`), fullPage: true });
      if (width === 390) {
        await page.getByRole('button', { name: 'Open menu', exact: true }).click();
        await page.getByRole('button', { name: 'National', exact: true }).click();
        await page.getByRole('link', { name: 'All National', exact: true }).click();
        await expect(page).toHaveURL(new RegExp(`/${sectionSlug}$`));
      }
    }
    const scan = await new AxeBuilder({ page }).include('main').analyze();
    expect(scan.violations).toEqual([]);
    await page.getByRole('link', { name: 'Next', exact: true }).click();
    await expect(page.getByText('Page 2 of 2')).toBeVisible();
    await expect(page.locator('[data-news-hero]')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Policy headline 13', exact: true })).toBeVisible();
    await page.goto(`/${sectionSlug}?category=${childSlug}`);
    await expect(page.locator('[data-news-hero] h2')).toHaveText('Policy headline 1');
    await expect(page.getByText('Newest direct section story')).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Policy', exact: true })).toHaveAttribute('aria-current', 'page');
    expect((await page.goto(`/${sectionSlug}?category=${restrictedSlug}`))?.status()).toBe(404);
  });

  test('creates another Article section through Navigation API without a dedicated route', async ({ page, context }) => {
    const token = await encode({ secret: 'isolated-browser-test-secret', token: {
      sub: authorId, id: authorId, role: 'EDITOR', trust_level: 'TRUSTED',
      tenantMemberships: [{ communityId: communityIds[0], role: 'EDITOR', domains: ['127.0.0.1'] }],
    } });
    await context.addCookies([{ name: 'next-auth.session-token', value: token, url: 'http://127.0.0.1:3105', httpOnly: true, sameSite: 'Lax' }]);
    const slug = `sports-${randomUUID().slice(0, 8)}`;
    const response = await page.request.post('/api/admin/categories', { data: { name: 'Sports', slug, contentModel: 'ARTICLE' } });
    expect(response.status()).toBe(201);
    await page.goto(`/${slug}`);
    await expect(page.getByRole('heading', { name: 'Sports', exact: true })).toBeVisible();
    await expect(page.getByText('No published articles in Sports yet.')).toBeVisible();
    const category = await db.category.findFirstOrThrow({ where: { slug, communityId: communityIds[0] } });
    await db.article.create({ data: { communityId: communityIds[0], authorUserId: authorId, categoryId: category.id,
      title: 'Sports publication', slug: `sports-story-${randomUUID()}`, body: '<p>Sports news.</p>', status: 'PUBLISHED', publishedAt: new Date() } });
    await page.reload();
    await expect(page.locator('[data-news-hero] h2')).toHaveText('Sports publication');
    await page.goto('/local-life');
    await expect(page.getByRole('heading', { name: 'Local Life', exact: true })).toBeVisible();
    await expect(page.locator('.article-card').getByRole('link', { name: 'Local route regression story' })).toBeVisible();
    await expect(page.locator('[data-news-hero]')).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Sports publication' })).toHaveCount(0);
  });
});
