import { test, expect, type BrowserContext } from 'playwright/test';
import { randomUUID } from 'node:crypto';
import { encode } from 'next-auth/jwt';
import sharp from 'sharp';
import { db } from '../../src/lib/db';
import { ensureDefaultSiteSettings } from '../../src/lib/community';

test.describe('Reporter hero images', () => {
  let communityId: string;
  let otherCommunityId: string;
  let editorId: string;
  let staffId: string;
  let categoryId: string;
  test.beforeAll(async () => {
    communityId = (await db.community.create({ data: { name: 'Simple Newsroom', slug: `simple-${randomUUID()}`, domain: '127.0.0.1' } })).id;
    otherCommunityId = (await db.community.create({ data: { name: 'Other newsroom', slug: `other-${randomUUID()}` } })).id;
    await ensureDefaultSiteSettings(communityId);
    for (const role of ['EDITOR', 'STAFF_WRITER'] as const) {
      const user = await db.user.create({ data: {
        email: `${randomUUID()}@example.test`, firstName: role === 'EDITOR' ? 'Test' : 'Staff', lastName: 'Reporter', trustLevel: 'TRUSTED', dateOfBirth: new Date('1980-01-01'),
        placeRelationships: { create: { relationshipType: 'CURRENT_RESIDENT', isPrimary: true, isCurrent: true, fallbackLocationText: 'County' } },
        memberships: { create: { communityId, role } },
      } });
      if (role === 'EDITOR') editorId = user.id; else staffId = user.id;
    }
    categoryId = (await db.category.create({ data: { communityId, name: 'Local News', slug: 'local-news', contentModel: 'ARTICLE' } })).id;
  });
  test.afterAll(async () => {
    await db.community.deleteMany({ where: { id: { in: [communityId, otherCommunityId].filter(Boolean) } } });
    await db.user.deleteMany({ where: { id: { in: [editorId, staffId].filter(Boolean) } } });
    await db.$disconnect();
  });
  async function session(context: BrowserContext, role: 'EDITOR' | 'STAFF_WRITER' = 'EDITOR') {
    const id = role === 'EDITOR' ? editorId : staffId;
    const value = await encode({ secret: 'isolated-browser-test-secret', token: { sub: id, id, role, trust_level: 'TRUSTED', tenantMemberships: [{ communityId, role, domains: ['127.0.0.1'] }] } });
    await context.addCookies([{ name: 'next-auth.session-token', value, url: 'http://127.0.0.1:3105', httpOnly: true, sameSite: 'Lax' }]);
  }
  async function drafted(tenantId = communityId) {
    return db.reporterRun.create({ data: {
      communityId: tenantId, topic: `Bridge repair ${randomUUID()}`, status: 'DRAFT_CREATED', assignedToUserId: staffId,
      sources: { create: { sourceType: 'OFFICIAL_URL', title: 'County notice', url: 'https://county.example/notice', contentText: 'The bridge closes Monday for repairs.', reliabilityTier: 'PRIMARY' } },
      drafts: { create: { headline: 'Bridge closes Monday', body: 'The bridge closes Monday for repairs, according to the county notice.', draftType: 'ARTICLE_DRAFT', modelProvider: 'fixture' } },
    }, include: { drafts: true } });
  }

  test('reviews, regenerates and selects an editorial hero image before saving it', async ({ page, context }, testInfo) => {
    await session(context);
    const run = await drafted();
    const caption = 'AI-generated editorial illustration; not a photograph of a reported event.';
    const imageBytes = await sharp({ create: { width: 1536, height: 1024, channels: 3, background: '#d9e5e0' } }).png().toBuffer();
    await page.route('**/uploads/article/hero-*.webp', (route) => route.fulfill({ contentType: 'image/png', body: imageBytes }));
    let attempts = 0;
    let releaseGeneration!: () => void;
    const generationGate = new Promise<void>((resolve) => { releaseGeneration = resolve; });
    await page.route(`**/api/reporter/runs/${run.id}/hero-image`, async (route) => {
      const content = route.request().postDataJSON();
      expect(content.draftId).toBe(run.drafts[0].id);
      expect(content.title).toBe('Editor’s bridge repair headline');
      expect(content.body).toContain('thematic illustration');
      attempts++;
      if (attempts === 1) await generationGate;
      if (attempts === 2) return route.fulfill({ status: 502, json: { error: 'The image provider is unavailable.' } });
      return route.fulfill({ status: 201, json: { image: { url: `/uploads/article/hero-${attempts}.webp`, caption } } });
    });
    await page.goto(`/admin/reporter/${run.id}/review`);
    await page.getByLabel('Headline (required)').fill('Editor’s bridge repair headline');
    await page.getByRole('textbox', { name: 'Story', exact: true }).fill('The story needs a thematic illustration about bridge maintenance.');
    await page.getByRole('button', { name: 'Generate hero image', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Generating hero image…', exact: true })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Save', exact: true })).toBeDisabled();
    await expect(page.getByRole('button', { name: 'Re-Run', exact: true })).toBeDisabled();
    releaseGeneration();
    await expect(page.getByRole('button', { name: 'Use this image', exact: true })).toBeFocused();
    await expect(page.getByLabel('Caption / photo credit (optional)')).toHaveCount(0);
    expect((await db.reporterRun.findUniqueOrThrow({ where: { id: run.id } })).linkedArticleId).toBeNull();
    await page.getByRole('button', { name: 'Regenerate hero image', exact: true }).click();
    await expect(page.getByRole('alert').filter({ hasText: 'image provider is unavailable' })).toBeVisible();
    await expect(page.getByRole('img', { name: 'Generated conceptual editorial illustration for review' })).toHaveAttribute('src', '/uploads/article/hero-1.webp');
    await page.getByRole('button', { name: 'Regenerate hero image', exact: true }).click();
    await expect(page.getByRole('img', { name: 'Generated conceptual editorial illustration for review' })).toHaveAttribute('src', '/uploads/article/hero-3.webp');
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`hero-image-review-${width}.png`), fullPage: true });
    }
    await page.getByRole('button', { name: 'Use this image', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Generate hero image', exact: true })).toBeFocused();
    await expect(page.getByLabel('Caption / photo credit (optional)')).toHaveValue(caption);
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Draft saved.');
    const saved = await db.reporterRun.findUniqueOrThrow({ where: { id: run.id }, include: { linkedArticle: true } });
    expect(saved.linkedArticle).toMatchObject({ status: 'DRAFT', featuredImageUrl: '/uploads/article/hero-3.webp', featuredImageCaption: caption });
    await page.reload();
    await expect(page.getByLabel('Caption / photo credit (optional)')).toHaveValue(caption);
    await page.getByRole('button', { name: 'Generate hero image', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Use this image', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Discard generated image', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Generate hero image', exact: true })).toBeFocused();
    await expect(page.getByRole('img', { name: 'Generated conceptual editorial illustration for review' })).toHaveCount(0);
    await expect(page.getByLabel('Caption / photo credit (optional)')).toHaveValue(caption);
    await page.getByLabel('Category (required to publish)').selectOption(categoryId);
    await page.getByRole('button', { name: 'Publish', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Story published.');
    expect((await db.article.findUniqueOrThrow({ where: { id: saved.linkedArticleId! } }))).toMatchObject({ status: 'PUBLISHED', featuredImageUrl: '/uploads/article/hero-3.webp', featuredImageCaption: caption });
  });

});
