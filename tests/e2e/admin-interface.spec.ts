import { test, expect, type BrowserContext } from 'playwright/test';
import { randomUUID } from 'node:crypto';
import { encode } from 'next-auth/jwt';
import AxeBuilder from '@axe-core/playwright';
import { db } from '../../src/lib/db';
import { ensureDefaultSiteSettings } from '../../src/lib/community';

test.use({ launchOptions: { ignoreDefaultArgs: ['--hide-scrollbars'] } });

test.describe('compact admin interface', () => {
  const communityIds: string[] = [];
  let editorId: string;
  let runId: string;
  test.beforeAll(async () => {
    const community = await db.community.create({ data: { name: 'Admin Browser Test Community', slug: `admin-browser-${randomUUID()}`, domain: '127.0.0.1' } });
    communityIds.push(community.id);
    await ensureDefaultSiteSettings(community.id);
    const editor = await db.user.create({ data: {
      email: `${randomUUID()}@example.test`, firstName: 'Test', lastName: 'Editor', trustLevel: 'TRUSTED',
      dateOfBirth: new Date('1980-01-01T00:00:00Z'),
      placeRelationships: { create: { relationshipType: 'CURRENT_RESIDENT', isPrimary: true, isCurrent: true, fallbackLocationText: 'Browser Test County' } },
      memberships: { create: { communityId: community.id, role: 'EDITOR' } },
    } });
    editorId = editor.id;
    const run = await db.reporterRun.create({ data: {
      communityId: community.id, createdByUserId: editor.id, topic: 'County service update', title: 'County service update', status: 'DRAFT_CREATED', mode: 'RESEARCH',
      sources: { create: { sourceType: 'OFFICIAL_URL', title: 'Official notice', url: 'https://county.example/notice', reliabilityTier: 'PRIMARY', contentText: 'The county announced a service update.' } },
      drafts: { create: { headline: 'County service update', body: 'The county announced a service update.', draftType: 'ARTICLE_DRAFT', modelProvider: 'test-fixture' } },
    } });
    runId = run.id;
  });
  test.afterAll(async () => {
    if (communityIds.length) await db.community.deleteMany({ where: { id: { in: communityIds } } });
    if (editorId) await db.user.delete({ where: { id: editorId } });
    await db.$disconnect();
  });
  async function editorSession(context: BrowserContext) {
    const value = await encode({ secret: 'isolated-browser-test-secret', token: {
      sub: editorId, id: editorId, role: 'EDITOR', trust_level: 'TRUSTED',
      tenantMemberships: [{ communityId: communityIds[0], role: 'EDITOR', domains: ['127.0.0.1'] }],
    } });
    await context.addCookies([{ name: 'next-auth.session-token', value, url: 'http://127.0.0.1:3105', httpOnly: true, sameSite: 'Lax' }]);
  }

  test('compact admin tables, icon actions and responsive navigation remain accessible', async ({ page, context }, testInfo) => {
    await editorSession(context);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/admin');
    await page.addStyleTag({ content: 'html { overflow-y: scroll; scrollbar-gutter: stable; } ::-webkit-scrollbar { width: 15px; height: 15px; }' });
    await expect.poll(() => page.evaluate(() => document.documentElement.clientWidth < window.innerWidth)).toBe(true);
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await expect(page.locator('.admin-chrome-header')).toBeVisible();
    await expect(page.locator('.app-masthead')).toHaveCount(0);
    await expect(page.getByRole('table')).toHaveCount(3);
    const management = page.getByRole('table', { name: 'Management overview' });
    await expect(management.getByRole('row')).toHaveCount(7);
    await expect(management.getByRole('columnheader', { name: 'Records', exact: true })).toHaveCSS('text-align', 'right');
    await expect(management.locator('tbody tr').first().locator('td').nth(1)).toHaveCSS('text-align', 'right');
    const manageArticles = management.getByRole('link', { name: 'Manage articles', exact: true });
    await expect(manageArticles.locator('svg')).toBeVisible();
    await expect(manageArticles).toHaveText('');
    await manageArticles.hover();
    await expect(page.getByRole('tooltip')).toHaveText('Manage articles');
    await expect(manageArticles).toHaveAttribute('aria-describedby');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('tooltip')).toHaveCount(0);
    await manageArticles.focus();
    await expect(page.getByRole('tooltip')).toHaveText('Manage articles');
    await page.keyboard.press('Escape');
    const navigation = page.getByRole('navigation', { name: 'Admin navigation' });
    await page.getByRole('button', { name: 'Collapse admin sidebar' }).click();
    const reporter = navigation.getByRole('link', { name: 'Reporter', exact: true });
    await expect(reporter.locator('.admin-sidebar-link-label')).toBeHidden();
    await expect(reporter.locator('svg')).toBeVisible();
    await reporter.focus();
    await expect(page.getByRole('tooltip')).toHaveText('Reporter');
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Expand admin sidebar' }).click();
    const scan = await new AxeBuilder({ page }).include('.admin-page').include('.admin-sidebar').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(scan.violations).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath('admin-dashboard-desktop.png'), fullPage: true });
    for (const width of [390, 768]) {
      await page.setViewportSize({ width, height: 900 });
      await expect(navigation).toBeHidden();
      await page.getByText('Administration navigation', { exact: true }).click();
      await expect(navigation).toBeVisible();
      await page.getByText('Administration navigation', { exact: true }).click();
      await expect(navigation).toBeHidden();
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`admin-dashboard-${width}.png`), fullPage: true });
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.getByRole('table', { name: 'Editor ready stories' }).getByRole('link', { name: 'Review story', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/reporter/${runId}/review$`));
  });

  test('store table keeps review, filters, confirmation and status persistence', async ({ page, context }, testInfo) => {
    const suffix = randomUUID().slice(0, 8);
    const first = await db.store.create({ data: { communityId: communityIds[0], ownerUserId: editorId, name: `Farm store ${suffix}`, slug: `farm-${suffix}`, description: 'Fresh farm produce', contactEmail: 'farm@example.test' } });
    const second = await db.store.create({ data: { communityId: communityIds[0], ownerUserId: editorId, name: `Bakery ${suffix}`, slug: `bakery-${suffix}` } });
    await editorSession(context);
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto('/admin/stores');
    const table = page.getByRole('table', { name: 'Stores', exact: true });
    const firstRow = table.getByRole('row').filter({ has: page.getByRole('button', { name: first.name, exact: true }) });
    const secondRow = table.getByRole('row').filter({ has: page.getByRole('button', { name: second.name, exact: true }) });
    await expect(firstRow).toBeVisible();
    await firstRow.getByRole('button', { name: 'Review store', exact: true }).click();
    await expect(page.getByRole('region', { name: `Details for ${first.name}` })).toContainText('Fresh farm produce');
    await secondRow.getByRole('button', { name: 'Review store', exact: true }).click();
    await expect(page.getByRole('region', { name: `Details for ${first.name}` })).toHaveCount(0);
    await expect(page.getByRole('region', { name: `Details for ${second.name}` })).toBeVisible();
    await secondRow.getByRole('button', { name: 'Close store details', exact: true }).click();
    await page.getByRole('searchbox').fill(second.name);
    await page.getByRole('button', { name: 'Search stores', exact: true }).click();
    await expect(firstRow).toHaveCount(0);
    await expect(secondRow).toBeVisible();
    await page.getByRole('button', { name: 'Clear search', exact: true }).click();
    await expect(firstRow).toBeVisible();
    await firstRow.getByRole('button', { name: 'Approve store', exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    expect((await db.store.findUniqueOrThrow({ where: { id: first.id } })).status).toBe('PENDING_APPROVAL');
    await firstRow.getByRole('button', { name: 'Approve store', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel(/^Reason/).fill('Store reviewed by staff');
    await page.route(`**/api/admin/stores/${first.id}/status`, (route) => route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'Temporary store update failure' }) }));
    await dialog.getByRole('button', { name: 'Confirm', exact: true }).click();
    await expect(dialog.getByRole('alert')).toHaveText('Temporary store update failure');
    await expect(dialog.getByLabel(/^Reason/)).toHaveValue('Store reviewed by staff');
    await page.unroute(`**/api/admin/stores/${first.id}/status`);
    await dialog.getByRole('button', { name: 'Confirm', exact: true }).click();
    await expect(dialog).toHaveCount(0);
    await expect(firstRow.getByRole('link', { name: 'View storefront', exact: true })).toBeVisible();
    const approved = await db.store.findUniqueOrThrow({ where: { id: first.id } });
    expect(approved.status).toBe('APPROVED');
    expect(approved.approvedByUserId).toBe(editorId);
    const audit = await db.activityLog.findFirstOrThrow({ where: { resourceId: first.id, action: 'APPROVE' } });
    expect(audit.metadata).toMatchObject({ reason: 'Store reviewed by staff' });
    await firstRow.getByRole('button', { name: 'Suspend store', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Confirm', exact: true }).click();
    await expect(firstRow.getByText('Suspended', { exact: true })).toBeVisible();
    await expect(firstRow.getByText('Suspended', { exact: true })).toHaveCSS('color', 'rgb(185, 28, 28)');
    await expect(firstRow.getByText('Suspended', { exact: true })).toHaveCSS('background-color', 'rgb(254, 226, 226)');
    await secondRow.getByRole('button', { name: 'Reject store', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Confirm', exact: true }).click();
    await expect(secondRow.getByText('Rejected', { exact: true })).toBeVisible();
    const scan = await new AxeBuilder({ page }).include('.admin-page').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(scan.violations).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath('stores-desktop.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 900 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath('stores-mobile.png'), fullPage: true });
    await page.locator('.admin-chrome-identity').click();
    await expect(page.locator('.app-masthead')).toBeVisible();
    await expect(page.locator('.admin-chrome-header')).toHaveCount(0);
  });

});
