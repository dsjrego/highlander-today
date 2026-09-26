import { NextRequest, NextResponse } from 'next/server';
import { revalidateTag } from 'next/cache';
import { z } from 'zod';
import { CategoryContentModel, TrustLevel } from '@prisma/client';
import { db } from '@/lib/db';
import { checkPermission } from '@/lib/permissions';
import { resolveRequestCommunityId } from '@/lib/community';

const CreateCategorySchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z.string().trim().min(1).max(120).regex(/^[a-z0-9-]+$/),
  contentModel: z.nativeEnum(CategoryContentModel).nullable().optional(),
  minTrustLevel: z.nativeEnum(TrustLevel).optional(),
  parentCategoryId: z.string().uuid().nullable().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function GET(request: NextRequest) {
  try {
    const userRole = request.headers.get('x-user-role') || '';
    const includeArchived = request.nextUrl.searchParams.get('includeArchived') === 'true';

    if (!checkPermission(userRole, 'articles:approve')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const communityId = await resolveRequestCommunityId({
      headers: request.headers,
      nextUrl: request.nextUrl,
    });
    if (!communityId) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 });
    }

    const categories = await db.category.findMany({
      where: {
        OR: [{ communityId }, { communityId: null }],
        ...(includeArchived ? {} : { isArchived: false }),
      },
      orderBy: [{ parentCategoryId: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
      select: {
        id: true,
        name: true,
        slug: true,
        contentModel: true,
        minTrustLevel: true,
        parentCategoryId: true,
        sortOrder: true,
        isArchived: true,
        parentCategory: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
        _count: {
          select: {
            articles: true,
            recipes: true,
            childCategories: true,
          },
        },
      },
    });

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Error fetching admin categories:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userRole = request.headers.get('x-user-role') || '';

    if (!checkPermission(userRole, 'articles:approve')) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const validated = CreateCategorySchema.parse({
      ...body,
      slug: slugify(body.slug || body.name || ''),
    });

    const communityId = await resolveRequestCommunityId({
      headers: request.headers,
      nextUrl: request.nextUrl,
    });
    if (!communityId) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 });
    }

    const existing = await db.category.findFirst({
      where: {
        slug: validated.slug,
        OR: [{ communityId }, { communityId: null }],
      },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json({ error: 'A category with this slug already exists' }, { status: 409 });
    }

    let parentCategoryId: string | null = validated.parentCategoryId ?? null;
    if (parentCategoryId) {
      const parent = await db.category.findUnique({
        where: { id: parentCategoryId },
        select: { id: true },
      });

      if (!parent) {
        return NextResponse.json({ error: 'Parent category not found' }, { status: 404 });
      }

      if (!validated.contentModel) {
        return NextResponse.json(
          { error: 'Subcategories must include a model type' },
          { status: 400 }
        );
      }
    }

    let sortOrder = validated.sortOrder;
    if (sortOrder === undefined) {
      const siblingCount = await db.category.count({
        where: { parentCategoryId },
      });
      sortOrder = siblingCount;
    }

    const category = await db.category.create({
      data: {
        communityId,
        name: validated.name,
        slug: validated.slug,
        contentModel: validated.contentModel ?? null,
        minTrustLevel: validated.minTrustLevel ?? TrustLevel.ANONYMOUS,
        parentCategoryId,
        sortOrder,
      },
    });

    revalidateTag('categories');

    return NextResponse.json({ category }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues[0]?.message || 'Invalid input' }, { status: 400 });
    }

    console.error('Error creating category:', error);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}
