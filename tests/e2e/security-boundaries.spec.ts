import { test, expect } from 'playwright/test';
import { randomUUID } from 'node:crypto';
import { encode } from 'next-auth/jwt';
import { db } from '../../src/lib/db';

let communityId: string;
let userId: string;
test.beforeAll(async () => {
  communityId = (await db.community.create({ data: { name: 'Security checks', slug: `security-${randomUUID()}`, domain: '127.0.0.1' } })).id;
  await db.category.create({data:{communityId,name:'Own category',slug:'own-category'}});
  userId = (await db.user.create({ data: { email: `${randomUUID()}@example.test`, firstName: 'Security', lastName: 'Editor', trustLevel: 'TRUSTED', memberships: { create: { communityId, role: 'EDITOR' } } } })).id;
});
test.afterAll(async () => {
  if (communityId) await db.community.delete({ where: { id: communityId } });
  if (userId) await db.user.deleteMany({ where: { id: userId } });
  await db.$disconnect();
});
test.beforeEach(async ({ context }) => {
  await db.user.update({ where: { id:userId }, data: { trustLevel:'TRUSTED' } });
  await db.userCommunityMembership.upsert({ where:{ userId_communityId:{userId,communityId} }, update:{role:'EDITOR'}, create:{userId,communityId,role:'EDITOR'} });
  const value = await encode({ secret:'isolated-browser-test-secret', token:{ sub:userId,id:userId,role:'EDITOR',trust_level:'TRUSTED',tenantMemberships:[{communityId,role:'EDITOR',domains:['127.0.0.1']}] } });
  await context.addCookies([{name:'next-auth.session-token',value,url:'http://127.0.0.1:3105',httpOnly:true,sameSite:'Lax'}]);
});

test('revokes stale JWT privileges after role, membership, and trust changes', async ({ page }) => {
  await db.userCommunityMembership.update({ where:{userId_communityId:{userId,communityId}},data:{role:'READER'} });
  await page.goto('/admin/reporter');
  await expect(page).toHaveURL((url)=>url.pathname === '/');
  await db.userCommunityMembership.delete({ where:{userId_communityId:{userId,communityId}} });
  await page.goto('/admin/reporter');
  await expect(page).toHaveURL((url)=>url.pathname === '/');
  await db.user.update({ where:{id:userId},data:{trustLevel:'SUSPENDED'} });
  await page.goto('/admin/reporter');
  await expect(page).toHaveURL(/\/login/);
});

test('rejects foreign and opaque mutation origins with a valid session', async ({ page }) => {
  for (const origin of ['https://attacker.example','null']) {
    const response = await page.request.post('/api/reporter/runs/not-a-run/convert-to-article',{headers:{origin}});
    expect(response.status()).toBe(403);
    expect(await response.json()).toEqual({error:'Cross-origin mutation rejected'});
  }
});

test('deleted accounts cannot reuse their JWT', async ({ page }) => {
  await db.user.delete({where:{id:userId}});
  await page.goto('/admin/reporter');
  await expect(page).toHaveURL(/\/login/);
});
