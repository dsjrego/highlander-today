import { test, expect, type BrowserContext } from 'playwright/test';
import { randomUUID } from 'node:crypto';
import { encode } from 'next-auth/jwt';
import AxeBuilder from '@axe-core/playwright';
import { db } from '../../src/lib/db';
import { ensureDefaultSiteSettings } from '../../src/lib/community';

test.describe('simple reporter workflow', () => {
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
  test('assigns a lead, prepares its draft and publishes from one review page', async ({ page, context }, testInfo) => {
    await session(context);
    const source = await db.reporterMonitoredSource.create({ data: { communityId, label: 'County notices', sourceType: 'MUNICIPAL_AGENDA', sourceFormat: 'HTML', url: 'https://county.example/notices' } });
    const item = await db.reporterSourceIngestionItem.create({ data: { monitoredSourceId: source.id, dedupeKey: randomUUID(), title: 'Bridge closes Monday', canonicalUrl: 'https://county.example/bridge', contentText: 'The bridge closes Monday for repairs.', excerpt: 'The bridge closes Monday.' } });
    const candidate = await db.reporterStoryCandidate.create({ data: { communityId, title: 'Bridge closes Monday', signalLevel: 'LIKELY', score: 10, latestSourceAt: new Date(), sourceCount: 1, itemCount: 1, candidateItems: { create: { ingestionItemId: item.id } } } });
    await page.goto('/admin/reporter?section=candidates');
    const row = page.getByRole('row').filter({ hasText: 'Bridge closes Monday' });
    await row.getByLabel('Reporter', { exact: true }).selectOption(staffId);
    await expect(row.getByRole('link', { name: 'View assigned story' })).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/reporter\?section=candidates$/);
    await expect(page.getByRole('tabpanel', { name: 'Candidates', exact: true })).toBeVisible();
    const run = await db.reporterRun.findFirstOrThrow({ where: { storyCandidates: { some: { id: candidate.id } } }, include: { sources: true } });
    expect(run.assignedToUserId).toBe(staffId);
    expect(run.sources[0].contentText).toBe(item.contentText);
    await page.reload();
    await expect(row.getByRole('link', { name: 'View assigned story' })).toHaveAttribute('href', `/admin/reporter/${run.id}`);
    await page.getByRole('tab', { name: 'Assigned Stories', exact: true }).click();
    await expect(page.getByRole('tabpanel', { name: 'Assigned Stories', exact: true }).getByRole('tablist')).toHaveCount(0);
    await expect(page.getByText('1 source', { exact: true })).toBeVisible();
    // Only model inference is stubbed; persistence, navigation and publication are real.
    await page.route(`**/api/reporter/runs/${run.id}/draft`, async (route) => {
      expect(route.request().postDataJSON()).toEqual({ draftType: 'ARTICLE_DRAFT' });
      const draft = await db.reporterDraft.create({ data: { reporterRunId: run.id, headline: 'Bridge closes Monday', body: 'The bridge closes Monday for repairs, according to the county notice.', draftType: 'ARTICLE_DRAFT', modelProvider: 'fixture' } });
      await db.reporterRun.update({ where: { id: run.id }, data: { status: 'DRAFT_CREATED' } });
      await route.fulfill({ json: { draft, validation: { hasCriticalIssues: false, issues: [] } } });
    });
    await page.getByRole('row').filter({ hasText: 'Bridge closes Monday' }).getByRole('button', { name: 'Prepare Draft' }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/reporter/${run.id}/review$`));
    await page.getByLabel('Headline (required)').fill('Bridge repair starts Monday');
    await page.getByLabel('Category (required to publish)').selectOption(categoryId);
    await page.getByRole('textbox', { name: 'Story', exact: true }).fill('The county says bridge repairs begin Monday. Drivers should use the signed detour.');
    await page.getByRole('button', { name: 'Save', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Draft saved.');
    const saved = await db.reporterRun.findUniqueOrThrow({ where: { id: run.id }, include: { linkedArticle: true } });
    expect(saved.linkedArticle?.status).toBe('DRAFT');
    expect(saved.linkedArticle?.body).toContain('signed detour');
    const scan = await new AxeBuilder({ page }).include('.admin-main').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze();
    expect(scan.violations).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath('review-publish-desktop.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('review-publish-mobile.png'), fullPage: true });
    await page.getByRole('button', { name: 'Publish', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Story published.');
    expect(await db.article.count({ where: { id: saved.linkedArticleId!, communityId, status: 'PUBLISHED' } })).toBe(1);
    await expect(page.getByRole('link', { name: 'View published story' })).toHaveAttribute('href', `/local-life/${saved.linkedArticleId}`);
    await page.goto('/admin/reporter');
    await expect(page.getByRole('tabpanel', { name: 'Editor Ready', exact: true }).getByText('Bridge repair starts Monday')).toHaveCount(0);
  });

  test('candidate assignment autosaves, disables pending controls and retries a failed save in place', async ({ page, context }) => {
    await session(context);
    const candidate = await db.reporterStoryCandidate.create({ data: {
      communityId, title: `Autosave candidate ${randomUUID()}`, signalLevel: 'POSSIBLE',
      score: 5, latestSourceAt: new Date(),
    } });
    const endpoint = `**/api/admin/reporter/story-candidates/${candidate.id}/assign`;
    let finishFailure!: () => void;
    const pendingFailure = new Promise<void>((resolve) => { finishFailure = resolve; });
    let requests = 0;
    await page.route(endpoint, async (route) => {
      requests += 1;
      expect(route.request().postDataJSON()).toEqual({ assignedToUserId: staffId });
      await pendingFailure;
      await route.fulfill({ status: 500, json: { error: 'Assignment unavailable. Please try again.' } });
    });
    await page.goto('/admin/reporter?section=candidates');
    const panel = page.getByRole('tabpanel', { name: 'Candidates', exact: true });
    const row = panel.getByRole('row').filter({ hasText: candidate.title });
    const reporter = row.getByLabel('Reporter', { exact: true });
    expect(requests).toBe(0);
    await reporter.selectOption(staffId);
    await expect(reporter).toBeDisabled();
    await expect(row.getByRole('button', { name: 'Dismiss candidate' })).toBeDisabled();
    await expect(row.getByRole('status')).toHaveText('Saving…');
    await expect.poll(() => requests).toBe(1);
    finishFailure();
    await expect(row.getByRole('alert')).toHaveText('Assignment unavailable. Please try again.');
    await expect(reporter).toBeEnabled();
    await expect(reporter).toHaveValue('');
    expect((await db.reporterStoryCandidate.findUniqueOrThrow({ where: { id: candidate.id } })).linkedReporterRunId).toBeNull();
    await expect(page).toHaveURL(/\/admin\/reporter\?section=candidates$/);
    await page.unroute(endpoint);
    await reporter.selectOption(staffId);
    await expect(row.getByRole('link', { name: 'View assigned story' })).toBeVisible();
    await expect(row.getByRole('status')).toHaveText('Story assigned.');
    await expect(row.getByRole('alert')).toHaveCount(0);
    await expect(panel).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/reporter\?section=candidates$/);
    const run = await db.reporterRun.findFirstOrThrow({ where: { storyCandidates: { some: { id: candidate.id } } } });
    expect(run.assignedToUserId).toBe(staffId);
    expect(await db.reporterRun.count({ where: { communityId, topic: candidate.title } })).toBe(1);
    await page.reload();
    await expect(row.getByRole('link', { name: 'View assigned story' })).toHaveAttribute('href', `/admin/reporter/${run.id}`);
    await expect(panel).toBeVisible();
  });

  test('keeps candidate rows compact and dismisses leads durably without removing assigned stories', async ({ page, context }, testInfo) => {
    await session(context);
    const topic = `Candidate dismissal ${randomUUID()}`;
    const summary = 'The county announced a public hearing on the school budget. '.repeat(20);
    const source = await db.reporterMonitoredSource.create({ data: {
      communityId, label: 'Candidate dismissal notices', sourceType: 'MUNICIPAL_AGENDA',
      sourceFormat: 'HTML', url: 'https://county.example/dismissal-notices',
    } });
    const item = await db.reporterSourceIngestionItem.create({ data: {
      monitoredSourceId: source.id, dedupeKey: randomUUID(), title: topic,
      canonicalUrl: 'https://county.example/dismissal-hearing', excerpt: summary,
    } });
    const run = await db.reporterRun.create({ data: { communityId, topic, assignedToUserId: staffId } });
    const candidate = await db.reporterStoryCandidate.create({ data: {
      communityId, title: topic, summary, signalLevel: 'LIKELY', score: 10,
      latestSourceAt: new Date(), sourceCount: 1, itemCount: 1,
      candidateItems: { create: { ingestionItemId: item.id } },
    } });
    await page.goto('/admin/reporter?section=candidates');
    const panel = page.getByRole('tabpanel', { name: 'Candidates', exact: true });
    const row = panel.getByRole('row').filter({ hasText: topic });
    await expect(panel.getByRole('columnheader', { name: 'Readiness' })).toHaveCount(0);
    await expect(row.getByLabel('Reporter', { exact: true })).toBeVisible();
    await expect(row.getByText('Reporter', { exact: true })).toHaveClass('sr-only');
    await expect(row.getByRole('button', { name: 'Assign story', exact: true })).toHaveCount(0);
    expect((await row.boundingBox())!.height).toBeLessThanOrEqual(65);
    const accessibility = await new AxeBuilder({ page }).include('#reporter-panel-candidates').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(accessibility.violations).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath('candidates-compact-desktop.png'), fullPage: true });
    await row.locator('summary').click();
    await expect(row.locator('details')).toHaveAttribute('open', '');
    expect((await row.boundingBox())!.height).toBeGreaterThan(65);
    await row.locator('summary').click();
    const dismissalUrl = `**/api/admin/reporter/story-candidates/${candidate.id}/dismiss`;
    let finishFailure!: () => void;
    const pendingFailure = new Promise<void>((resolve) => { finishFailure = resolve; });
    await page.route(dismissalUrl, async (route) => {
      await pendingFailure;
      await route.fulfill({ status: 500, json: { error: 'Try again later.' } });
    });
    await row.getByRole('button', { name: 'Dismiss candidate', exact: true }).click();
    await expect(row.getByRole('button', { name: 'Dismiss candidate', exact: true })).toBeDisabled();
    await expect(row.getByLabel('Reporter', { exact: true })).toBeDisabled();
    finishFailure();
    await expect(row.getByRole('alert')).toHaveText('Try again later.');
    expect((await db.reporterStoryCandidate.findUniqueOrThrow({ where: { id: candidate.id } })).dismissedAt).toBeNull();
    await page.unroute(dismissalUrl);
    // Dismissal of an already assigned lead keeps the linked assignment intact.
    await db.reporterStoryCandidate.update({ where: { id: candidate.id }, data: { linkedReporterRunId: run.id } });
    await page.reload();
    await expect(row.getByRole('link', { name: 'View assigned story' })).toHaveAttribute('href', `/admin/reporter/${run.id}`);
    for (const width of [1280, 390]) {
      await page.setViewportSize({ width, height: 900 });
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      expect((await row.boundingBox())!.height).toBeLessThanOrEqual(65);
      await page.screenshot({ path: testInfo.outputPath(`candidates-compact-${width}.png`), fullPage: true });
    }
    await row.getByRole('button', { name: 'Dismiss candidate', exact: true }).click();
    await expect(row).toHaveCount(0);
    const dismissed = await db.reporterStoryCandidate.findUniqueOrThrow({ where: { id: candidate.id }, include: { candidateItems: true } });
    expect(dismissed.dismissedAt).not.toBeNull();
    expect(dismissed.linkedReporterRunId).toBe(run.id);
    expect(dismissed.candidateItems).toHaveLength(1);
    expect(await db.reporterRun.count({ where: { id: run.id } })).toBe(1);
    expect(await db.reporterSourceIngestionItem.count({ where: { id: item.id } })).toBe(1);
    const refresh = await page.request.post('/api/admin/reporter/story-candidates/refresh', { data: {} });
    expect(refresh.ok()).toBe(true);
    await page.reload();
    await expect(row).toHaveCount(0);
    expect(await db.reporterStoryCandidate.count({ where: { communityId, dismissedAt: null, candidateItems: { some: { ingestionItemId: item.id } } } })).toBe(0);
    const assignment = await page.request.post(`/api/admin/reporter/story-candidates/${candidate.id}/assign`, { data: { assignedToUserId: staffId } });
    expect(assignment.status()).toBe(404);
    const foreignCandidate = await db.reporterStoryCandidate.create({ data: {
      communityId: otherCommunityId, title: 'Other tenant', signalLevel: 'LOW', score: 0, latestSourceAt: new Date(),
    } });
    expect((await page.request.post(`/api/admin/reporter/story-candidates/${foreignCandidate.id}/dismiss`)).status()).toBe(404);
    expect((await db.reporterStoryCandidate.findUniqueOrThrow({ where: { id: foreignCandidate.id } })).dismissedAt).toBeNull();
  });

});
