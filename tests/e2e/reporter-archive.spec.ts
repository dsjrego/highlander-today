import { test, expect, type BrowserContext } from 'playwright/test';
import { randomUUID } from 'node:crypto';
import { encode } from 'next-auth/jwt';
import { db } from '../../src/lib/db';
import { ensureDefaultSiteSettings } from '../../src/lib/community';

test.describe('reporter story archiving', () => {
  let communityId: string;
  let otherCommunityId: string;
  let editorId: string;
  let staffId: string;
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
  test('archives an assigned story and keeps it accessible through the Archived filter', async ({ page, context }, testInfo) => {
    await session(context);
    const topic = `Declined assignment ${randomUUID()}`;
    const run = await db.reporterRun.create({ data: {
      communityId, topic, status: 'NEW', assignedToUserId: staffId,
      sources: { create: { sourceType: 'STAFF_NOTE', title: 'Retained reporting', contentText: 'Keep these notes for the archive.' } },
      blockers: { create: { code: 'CONFIRM', message: 'Awaiting confirmation.' } },
    } });
    await page.goto('/admin/reporter?section=assigned');
    const panel = page.getByRole('tabpanel', { name: 'Assigned Stories', exact: true });
    await panel.getByLabel('Search stories').fill(topic);
    const row = panel.getByRole('row').filter({ hasText: topic });
    await expect(panel.getByText('1 story', { exact: true })).toBeVisible();
    await page.route(`**/api/reporter/runs/${run.id}`, (route) => route.fulfill({ status: 500, json: { error: 'Please retry archiving' } }));
    await row.getByRole('button', { name: 'Archive', exact: true }).click();
    await expect(row.getByRole('alert')).toHaveText('Please retry archiving');
    expect((await db.reporterRun.findUniqueOrThrow({ where: { id: run.id } })).status).toBe('NEW');
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`assigned-active-${width}.png`), fullPage: true });
    }
    await page.unroute(`**/api/reporter/runs/${run.id}`);
    let releaseArchive!: () => void;
    const gate = new Promise<void>((resolve) => { releaseArchive = resolve; });
    await page.route(`**/api/reporter/runs/${run.id}`, async (route) => { await gate; await route.continue(); });
    await row.getByRole('button', { name: 'Archive', exact: true }).click();
    await expect(row.getByRole('button', { name: 'Archiving…', exact: true })).toBeDisabled();
    releaseArchive();
    await expect(row).toHaveCount(0);
    await expect(panel.getByText('0 stories', { exact: true })).toBeVisible();
    await page.reload();
    await expect(row).toHaveCount(0);
    await panel.getByLabel('Status', { exact: true }).selectOption('ARCHIVED');
    await expect(row).toBeVisible();
    await expect(row.getByRole('button', { name: 'Archive', exact: true })).toHaveCount(0);
    await expect(row.getByRole('button', { name: 'Prepare Draft', exact: true })).toHaveCount(0);
    await expect(row.getByRole('link', { name: 'View story', exact: true })).toHaveAttribute('href', `/admin/reporter/${run.id}?view=details`);
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`assigned-archive-${width}.png`), fullPage: true });
    }
    const archived = await db.reporterRun.findUniqueOrThrow({ where: { id: run.id }, include: { sources: true, blockers: true } });
    expect(archived.status).toBe('ARCHIVED');
    expect(archived.assignedToUserId).toBe(staffId);
    expect(archived.sources[0].contentText).toBe('Keep these notes for the archive.');
    expect(archived.blockers[0].message).toBe('Awaiting confirmation.');
  });

  test('archives an Editor Ready story from the queue while retaining its article and reporting', async ({ page, context }, testInfo) => {
    await session(context);
    const run = await drafted();
    await page.goto(`/admin/reporter/${run.id}/review`);
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Draft saved.');
    const saved = await db.reporterRun.findUniqueOrThrow({ where: { id: run.id }, include: { linkedArticle: true } });
    await page.goto('/admin/reporter?section=editor-ready');
    const row = page.getByRole('row').filter({ has: page.locator(`a[href="/admin/reporter/${run.id}/review"]`) });
    await page.route(`**/api/reporter/runs/${run.id}`, (route) => route.fulfill({ status: 500, json: { error: 'Please retry archiving' } }));
    await row.getByRole('button', { name: 'Archive', exact: true }).click();
    await expect(row.getByRole('alert')).toHaveText('Please retry archiving');
    await expect(row).toBeVisible();
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`archive-queue-${width}.png`), fullPage: true });
    }
    await page.unroute(`**/api/reporter/runs/${run.id}`);
    let releaseArchive!: () => void;
    const archiveGate = new Promise<void>((resolve) => { releaseArchive = resolve; });
    await page.route(`**/api/reporter/runs/${run.id}`, async (route) => { await archiveGate; await route.continue(); });
    await row.getByRole('button', { name: 'Archive', exact: true }).click();
    await expect(row.getByRole('button', { name: 'Archiving…', exact: true })).toBeDisabled();
    releaseArchive();
    await expect(row).toHaveCount(0);
    await page.reload();
    await expect(row).toHaveCount(0);
    const archived = await db.reporterRun.findUniqueOrThrow({ where: { id: run.id }, include: { sources: true, drafts: true, linkedArticle: true } });
    expect(archived.status).toBe('ARCHIVED');
    expect(archived.sources).toHaveLength(1);
    expect(archived.drafts).toHaveLength(1);
    expect(archived.linkedArticle?.id).toBe(saved.linkedArticleId);
    expect(archived.linkedArticle?.body).toBe(saved.linkedArticle?.body);
    expect(archived.linkedArticle?.status).toBe('DRAFT');
  });

});
