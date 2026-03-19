import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkPermission } from '@/lib/permissions';

/**
 * GET /api/admin/content
 * Fetch articles, events, and Help Wanted posts pending review for the approval queue.
 * Store moderation now lives on /admin/stores, but the pending count is still returned for dashboard summaries.
 * Requires content approval permissions (Editor+).
 */
export async function GET(request: NextRequest) {
  try {
    const userRole = request.headers.get('x-user-role') || '';

    if (!checkPermission(userRole, 'articles:approve')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const [articles, events, helpWantedPosts, articlePendingCount, eventPendingCount, helpWantedPendingCount, storePendingCount, publishedTodayCount, totalPublished] =
      await Promise.all([
        db.article.findMany({
          where: { status: 'PENDING_REVIEW' },
          include: {
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profilePhotoUrl: true,
                trustLevel: true,
              },
            },
            category: {
              select: { id: true, name: true, slug: true },
            },
            tags: {
              include: { tag: true },
            },
          },
          orderBy: { updatedAt: 'asc' },
        }),
        db.event.findMany({
          where: { status: 'PENDING_REVIEW' },
          include: {
            submittedBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profilePhotoUrl: true,
                trustLevel: true,
              },
            },
          },
          orderBy: { updatedAt: 'asc' },
        }),
        db.helpWantedPost.findMany({
          where: { status: 'PENDING_REVIEW' },
          include: {
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                profilePhotoUrl: true,
                trustLevel: true,
              },
            },
          },
          orderBy: { updatedAt: 'asc' },
        }),
        db.article.count({ where: { status: 'PENDING_REVIEW' } }),
        db.event.count({ where: { status: 'PENDING_REVIEW' } }),
        db.helpWantedPost.count({ where: { status: 'PENDING_REVIEW' } }),
        db.store.count({ where: { status: 'PENDING_APPROVAL' } }),
        Promise.all([
          db.article.count({
            where: {
              status: 'PUBLISHED',
              publishedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
            },
          }),
          db.event.count({
            where: {
              status: 'PUBLISHED',
              updatedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
            },
          }),
          db.helpWantedPost.count({
            where: {
              status: 'PUBLISHED',
              publishedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
            },
          }),
        ]).then(([articlesToday, eventsToday, helpWantedToday]) => articlesToday + eventsToday + helpWantedToday),
        Promise.all([
          db.article.count({ where: { status: 'PUBLISHED' } }),
          db.event.count({ where: { status: 'PUBLISHED' } }),
          db.helpWantedPost.count({ where: { status: 'PUBLISHED' } }),
        ]).then(([publishedArticles, publishedEvents, publishedHelpWanted]) => publishedArticles + publishedEvents + publishedHelpWanted),
      ]);

    return NextResponse.json({
      articles,
      events,
      helpWantedPosts,
      stats: {
        pendingReview:
          articlePendingCount +
          eventPendingCount +
          helpWantedPendingCount +
          storePendingCount,
        pendingArticles: articlePendingCount,
        pendingEvents: eventPendingCount,
        pendingHelpWanted: helpWantedPendingCount,
        pendingStores: storePendingCount,
        publishedToday: publishedTodayCount,
        totalPublished,
      },
    });
  } catch (error) {
    console.error('Error fetching admin content:', error);
    return NextResponse.json(
      { error: 'Failed to fetch content queue' },
      { status: 500 }
    );
  }
}
