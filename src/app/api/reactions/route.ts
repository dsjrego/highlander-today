import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import {
  ContentReactionBodySchema,
  ContentReactionQuerySchema,
} from '@/lib/analytics/types';
import { createReactionAnalyticsEvent } from '@/lib/analytics/server';

async function ensureContentExists(contentType: string, contentId: string) {
  switch (contentType) {
    case 'ARTICLE':
      return db.article.findUnique({ where: { id: contentId }, select: { id: true } });
    case 'EVENT':
      return db.event.findUnique({ where: { id: contentId }, select: { id: true } });
    case 'MARKETPLACE_LISTING':
      return db.marketplaceListing.findUnique({ where: { id: contentId }, select: { id: true } });
    case 'STOREFRONT':
      return db.store.findUnique({ where: { id: contentId }, select: { id: true } });
    case 'HELP_WANTED_POST':
      return db.helpWantedPost.findUnique({ where: { id: contentId }, select: { id: true } });
    case 'ROADMAP_IDEA':
      return db.roadmapIdea.findUnique({ where: { id: contentId }, select: { id: true } });
    case 'RECIPE':
      return db.recipe.findUnique({ where: { id: contentId }, select: { id: true } });
    case 'ORGANIZATION':
      return db.organization.findUnique({ where: { id: contentId }, select: { id: true } });
    default:
      return { id: contentId };
  }
}

export async function GET(request: NextRequest) {
  try {
    const parsed = ContentReactionQuerySchema.parse({
      contentType: request.nextUrl.searchParams.get('contentType'),
      contentId: request.nextUrl.searchParams.get('contentId'),
    });

    const [summaryRows, currentUserReaction] = await Promise.all([
      db.contentReaction.groupBy({
        by: ['reactionType'],
        where: {
          contentType: parsed.contentType,
          contentId: parsed.contentId,
        },
        _count: {
          _all: true,
        },
      }),
      request.headers.get('x-user-id')
        ? db.contentReaction.findUnique({
            where: {
              userId_contentType_contentId: {
                userId: request.headers.get('x-user-id') as string,
                contentType: parsed.contentType,
                contentId: parsed.contentId,
              },
            },
            select: {
              reactionType: true,
            },
          })
        : Promise.resolve(null),
    ]);

    return NextResponse.json({
      currentUserReaction: currentUserReaction?.reactionType ?? null,
      summary: Object.fromEntries(
        summaryRows.map((row) => [row.reactionType, row._count._all])
      ),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error fetching reactions:', error);
    return NextResponse.json({ error: 'Failed to fetch reactions' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = ContentReactionBodySchema.parse(body);
    const existingContent = await ensureContentExists(parsed.contentType, parsed.contentId);

    if (!existingContent) {
      return NextResponse.json({ error: 'Content not found' }, { status: 404 });
    }

    const previous = await db.contentReaction.findUnique({
      where: {
        userId_contentType_contentId: {
          userId,
          contentType: parsed.contentType,
          contentId: parsed.contentId,
        },
      },
      select: {
        id: true,
        reactionType: true,
      },
    });

    const reaction = await db.contentReaction.upsert({
      where: {
        userId_contentType_contentId: {
          userId,
          contentType: parsed.contentType,
          contentId: parsed.contentId,
        },
      },
      update: {
        reactionType: parsed.reactionType,
      },
      create: {
        communityId: request.headers.get('x-community-id') || null,
        userId,
        contentType: parsed.contentType,
        contentId: parsed.contentId,
        reactionType: parsed.reactionType,
      },
    });

    await createReactionAnalyticsEvent({
      communityId: request.headers.get('x-community-id') || null,
      siteDomain: request.headers.get('x-community-domain') || request.headers.get('host'),
      userId,
      contentType: parsed.contentType,
      contentId: parsed.contentId,
      reactionType: parsed.reactionType,
      previousReactionType: previous?.reactionType ?? null,
    });

    return NextResponse.json(reaction);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error saving reaction:', error);
    return NextResponse.json({ error: 'Failed to save reaction' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const parsed = ContentReactionQuerySchema.parse({
      contentType: request.nextUrl.searchParams.get('contentType'),
      contentId: request.nextUrl.searchParams.get('contentId'),
    });

    await db.contentReaction.deleteMany({
      where: {
        userId,
        contentType: parsed.contentType,
        contentId: parsed.contentId,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error deleting reaction:', error);
    return NextResponse.json({ error: 'Failed to delete reaction' }, { status: 500 });
  }
}
