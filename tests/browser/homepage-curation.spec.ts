import { test, expect } from 'playwright/test';
import { randomUUID } from 'node:crypto';
import { encode } from 'next-auth/jwt';
import { db } from '../../src/lib/db';
import { ensureDefaultSiteSettings } from '../../src/lib/community';
import { ensureHomepageBoxes } from '../../src/lib/homepage';

test('hero replacement and removal preserve other articles through save and reload, including a full list', async ({ page, context }, testInfo) => {
  let communityId: string | undefined;
  let editorId: string | undefined;
  try {
    const community = await db.community.create({ data: { name: 'Homepage Test', slug: `homepage-${randomUUID()}`, domain: '127.0.0.1' } });
    communityId = community.id;
    await ensureDefaultSiteSettings(community.id);
    const editor = await db.user.create({ data: {
      email: `${randomUUID()}@example.test`, firstName: 'Homepage', lastName: 'Editor', trustLevel: 'TRUSTED',
      dateOfBirth: new Date('1980-01-01'),
      placeRelationships: { create: { relationshipType: 'CURRENT_RESIDENT', isPrimary: true, isCurrent: true, fallbackLocationText: 'Test County' } },
      memberships: { create: { communityId: community.id, role: 'EDITOR' } },
    } });
    editorId = editor.id;
    const articles = [];
    for (let index = 0; index < 7; index++) {
      articles.push(await db.article.create({ data: {
        communityId: community.id, authorUserId: editor.id, title: `Homepage article ${index}`,
        slug: `homepage-article-${index}`, body: 'Published local test article.', status: 'PUBLISHED', publishedAt: new Date(),
      } }));
    }
    const boxes = await ensureHomepageBoxes(community.id);
    const articleBox = boxes.find((box) => box.boxType === 'ARTICLES')!;
    const value = await encode({ secret: 'isolated-browser-test-secret', token: {
      sub: editor.id, id: editor.id, role: 'EDITOR', trust_level: 'TRUSTED',
      tenantMemberships: [{ communityId: community.id, role: 'EDITOR', domains: ['127.0.0.1'] }],
    } });
    await context.addCookies([{ name: 'next-auth.session-token', value, url: 'http://127.0.0.1:3105', httpOnly: true, sameSite: 'Lax' }]);

    for (const linkCount of [2, 5]) {
      await db.homepageBoxItem.deleteMany({ where: { homepageBoxId: articleBox.id } });
      await db.homepageBoxItem.createMany({ data: articles.slice(0, linkCount + 1).map((article, index) => ({
        homepageBoxId: articleBox.id, contentType: 'ARTICLE', contentId: article.id,
        role: index === 0 ? 'HERO' : 'LINK', sortOrder: index + 1, pinnedByUserId: editor.id,
      })) });
      await page.goto('/admin/homepage');
      const section = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Local Life', exact: true }) });
      const supporting = section.locator('div').filter({ has: page.getByRole('heading', { name: 'Supporting Links', exact: true }) }).filter({ has: page.locator('p.font-semibold') }).last();
      const candidate = section.locator('div.rounded-xl').filter({ has: page.getByText(articles[6].title, { exact: true }) });
      await candidate.getByRole('button', { name: 'Replace Hero', exact: true }).click();
      const expectedLinks = [articles[0], ...articles.slice(1, linkCount + 1)].slice(0, 5);
      await expect(supporting.locator('p.font-semibold')).toHaveText(expectedLinks.map((article) => article.title));
      expect((await db.homepageBoxItem.findFirstOrThrow({ where: { homepageBoxId: articleBox.id, role: 'HERO' } })).contentId).toBe(articles[0].id);
      await page.getByRole('button', { name: 'Save Curation', exact: true }).first().click();
      await expect(page.getByText('Homepage curation saved.', { exact: true })).toBeVisible();
      const saved = await db.homepageBoxItem.findMany({ where: { homepageBoxId: articleBox.id }, orderBy: { sortOrder: 'asc' } });
      expect(saved.map((item) => item.contentId)).toEqual([articles[6].id, ...expectedLinks.map((article) => article.id)]);
      await page.reload();
      await expect(supporting.locator('p.font-semibold')).toHaveText(expectedLinks.map((article) => article.title));
      await page.screenshot({ path: testInfo.outputPath(`homepage-${linkCount}-links.png`), fullPage: true });

      const hero = section.locator('div').filter({ has: page.getByRole('heading', { name: 'Hero Item', exact: true }) }).filter({ has: page.locator('p.font-semibold') }).last();
      await hero.getByRole('button', { name: 'Remove', exact: true }).click();
      await expect(hero.locator('p.font-semibold')).toHaveText(expectedLinks[0].title);
      await expect(supporting.locator('p.font-semibold')).toHaveText(expectedLinks.slice(1).map((article) => article.title));
      expect((await db.homepageBoxItem.findFirstOrThrow({ where: { homepageBoxId: articleBox.id, role: 'HERO' } })).contentId).toBe(articles[6].id);
      await page.getByRole('button', { name: 'Save Curation', exact: true }).first().click();
      await expect(page.getByText('Homepage curation saved.', { exact: true })).toBeVisible();
      const afterRemoval = await db.homepageBoxItem.findMany({ where: { homepageBoxId: articleBox.id }, orderBy: { sortOrder: 'asc' } });
      expect(afterRemoval.map((item) => item.contentId)).toEqual(expectedLinks.map((article) => article.id));
      expect(afterRemoval[0].role).toBe('HERO');
      expect(afterRemoval.slice(1).every((item) => item.role === 'LINK')).toBe(true);
      await page.reload();
      await expect(hero.locator('p.font-semibold')).toHaveText(expectedLinks[0].title);
      await expect(supporting.locator('p.font-semibold')).toHaveText(expectedLinks.slice(1).map((article) => article.title));
    }
  } finally {
    if (communityId) await db.community.deleteMany({ where: { id: communityId } });
    if (editorId) await db.user.deleteMany({ where: { id: editorId } });
    await db.$disconnect();
  }
});
