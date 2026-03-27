import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkPermission } from '@/lib/permissions';
import { logActivity } from '@/lib/activity-log';
import { sanitizeArticleHtml } from '@/lib/sanitize';
import { z } from 'zod';

const CreateArticleSchema = z.object({
  title: z.string().min(3).max(255),
  body: z.string().min(10),
  excerpt: z.string().max(500).optional(),
  categoryId: z.string().uuid().optional(),
  tags: z.array(z.string()).optional(),
  featuredImageUrl: z.string().optional(),
  featuredImageCaption: z.string().max(300).optional(),
  status: z.enum(['DRAFT', 'PENDING_REVIEW']).optional().default('DRAFT'),
});

/**
 * GET /api/articles
 * Public listing of published articles.
 * Query params: page, limit, category (slug), parentCategory (slug), tag
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const categorySlug = searchParams.get('category');
    const parentCategorySlug = searchParams.get('parentCategory');
    const tag = searchParams.get('tag');
    // For author's own articles (drafts, pending, etc.)
    const authorId = searchParams.get('authorId');
    const statusFilter = searchParams.get('status');

    const where: any = {
      status: 'PUBLISHED',
    };

    // If requesting own articles, allow filtering by status instead
    if (authorId && statusFilter) {
      where.authorUserId = authorId;
      where.status = statusFilter;
    }

    // Filter by specific category slug
    if (categorySlug) {
      where.category = { slug: categorySlug };
    }

    // Filter by parent category slug (all children of e.g. "local-life")
    if (parentCategorySlug) {
      where.category = {
        parentCategory: { slug: parentCategorySlug },
      };
    }

    // Filter by tag
    if (tag) {
      where.tags = {
        some: {
          tag: { slug: tag },
        },
      };
    }

    const [total, articles] = await Promise.all([
      db.article.count({ where }),
      db.article.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          author: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profilePhotoUrl: true,
            },
          },
          category: {
            select: { id: true, name: true, slug: true },
          },
          tags: {
            include: { tag: true },
          },
        },
        orderBy: { publishedAt: 'desc' },
      }),
    ]);

    return NextResponse.json({
      articles,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching articles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch articles' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/articles
 * Create a new article as DRAFT or submit directly for PENDING_REVIEW.
 */
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role') || '';

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!checkPermission(userRole, 'articles:create')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = CreateArticleSchema.parse(body);

    // Sanitize HTML body to prevent XSS
    validated.body = sanitizeArticleHtml(validated.body);

    // If submitting directly for review, category is required
    if (validated.status === 'PENDING_REVIEW' && !validated.categoryId) {
      return NextResponse.json(
        { error: 'Category is required when submitting for review' },
        { status: 400 }
      );
    }

    // Generate slug from title
    const baseSlug = validated.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const communityId = request.headers.get('x-community-id') || '';
    const community = communityId
      ? await db.community.findUnique({ where: { id: communityId } })
      : await db.community.findFirst();
    if (!community) {
      return NextResponse.json(
        { error: 'Community not found' },
        { status: 500 }
      );
    }

    // Ensure slug uniqueness within community
    const existingSlug = await db.article.findUnique({
      where: { communityId_slug: { communityId: community.id, slug: baseSlug } },
    });
    const slug = existingSlug
      ? `${baseSlug}-${Date.now().toString(36)}`
      : baseSlug;

    // Handle tags: find or create each tag, then connect via ArticleTag
    const tagConnections = [];
    if (validated.tags && validated.tags.length > 0) {
      for (const tagName of validated.tags) {
        const tagSlug = tagName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        const tag = await db.tag.upsert({
          where: { slug: tagSlug },
          create: { name: tagName, slug: tagSlug },
          update: {},
        });
        tagConnections.push({ tagId: tag.id });
      }
    }

    const article = await db.article.create({
      data: {
        title: validated.title,
        slug,
        excerpt: validated.excerpt || null,
        body: validated.body,
        featuredImageUrl: validated.featuredImageUrl || null,
        featuredImageCaption: validated.featuredImageCaption?.trim() || null,
        status: validated.status,
        categoryId: validated.categoryId,
        authorUserId: userId,
        communityId: community.id,
        tags: {
          create: tagConnections,
        },
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhotoUrl: true,
          },
        },
        category: {
          select: { id: true, name: true, slug: true },
        },
        tags: {
          include: { tag: true },
        },
      },
    });

    // Log activity (fire-and-forget)
    const ipAddress = request.headers.get('x-client-ip');
    logActivity({
      userId,
      action: 'CREATE',
      resourceType: 'ARTICLE',
      resourceId: article.id,
      ipAddress,
      metadata: { title: article.title, status: article.status },
    }).catch(() => {});

    return NextResponse.json(article, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating article:', error);
    return NextResponse.json(
      { error: 'Failed to create article' },
      { status: 500 }
    );
  }
}
