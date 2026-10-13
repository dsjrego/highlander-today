import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { getCurrentCommunity } from '@/lib/community';
import { checkPermission } from '@/lib/permissions';
import { logActivity } from '@/lib/activity-log';
import { consumeRateLimit } from '@/lib/rate-limit';
import { stripHtmlToText } from '@/lib/sanitize';
import { readResponseBytes } from '@/lib/security/safe-fetch';
import { assertHeroImageConfigured, generateReporterHeroImage, HeroImageError } from '@/lib/reporter/hero-image';

export const runtime = 'nodejs';
export const maxDuration = 180;
const inFlight = new Set<string>();
const Input = z.object({
  draftId: z.string().uuid(),
  title: z.string().trim().min(3).max(255),
  body: z.string().min(10).max(200000),
}).strict();

export async function POST(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  let lockKey: string | null = null;
  try {
    const { id } = await props.params;
    const userId = request.headers.get('x-user-id');
    const role = request.headers.get('x-user-role') || '';
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!checkPermission(role, 'reporter:convert') || !checkPermission(role, 'articles:edit')) {
      return NextResponse.json({ error: 'An editor is required to generate a hero image.' }, { status: 403 });
    }
    const community = await getCurrentCommunity({ headers: request.headers });
    if (!community) return NextResponse.json({ error: 'Community not found.' }, { status: 404 });
    let bytes: Uint8Array;
    try { bytes = await readResponseBytes(new Response(request.body, { headers: request.headers }), 220 * 1024); }
    catch { return NextResponse.json({ error: 'The story is too large to generate an image.' }, { status: 413 }); }
    const input = Input.parse(JSON.parse(Buffer.from(bytes).toString('utf8')));
    if (stripHtmlToText(input.body).length < 10 || stripHtmlToText(input.title).length < 3) {
      return NextResponse.json({ error: 'Add a headline and story text before generating an image.' }, { status: 400 });
    }
    const run = await db.reporterRun.findFirst({
      where: { id, communityId: community.id },
      include: {
        drafts: { where: { draftType: 'ARTICLE_DRAFT' }, orderBy: { createdAt: 'desc' }, take: 1 },
        linkedArticle: { select: { communityId: true, status: true } },
      },
    });
    if (!run || (run.linkedArticle && run.linkedArticle.communityId !== community.id)) {
      return NextResponse.json({ error: 'Story not found.' }, { status: 404 });
    }
    if (run.status === 'ARCHIVED' || run.linkedArticle?.status === 'PUBLISHED' || run.drafts[0]?.id !== input.draftId) {
      return NextResponse.json({ error: 'This draft changed or is no longer editable. Reload before generating an image.' }, { status: 409 });
    }
    assertHeroImageConfigured();
    const key = `${community.id}:${id}`;
    if (inFlight.has(key)) return NextResponse.json({ error: 'An image is already being generated for this story.' }, { status: 409 });
    const limit = consumeRateLimit(`reporter-hero:${community.id}:${userId}`, 10, 60 * 60 * 1000);
    if (!limit.allowed) return NextResponse.json({ error: 'Image generation limit reached. Please try again later.' }, {
      status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) },
    });
    inFlight.add(key);
    lockKey = key;
    const result = await generateReporterHeroImage({ ...input, runId: run.id, communityId: community.id, userId });
    await logActivity({
      userId, action: 'CREATE', resourceType: 'REPORTER_DRAFT', resourceId: input.draftId,
      ipAddress: request.headers.get('x-client-ip'),
      metadata: { event: 'hero-image-generated', reporterRunId: run.id, ...result },
    });
    // A candidate does not modify the article or publish; the editor chooses and saves it.
    return NextResponse.json({ image: { url: result.url, caption: result.caption } }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError) return NextResponse.json({ error: 'Check the draft, headline and story text.' }, { status: 400 });
    if (error instanceof HeroImageError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error('Reporter hero-image generation failed.');
    return NextResponse.json({ error: 'Unable to generate a hero image. Your story and selected image are unchanged.' }, { status: 500 });
  } finally {
    if (lockKey) inFlight.delete(lockKey);
  }
}
