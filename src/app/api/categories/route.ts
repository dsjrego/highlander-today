import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/categories
 * Fetch categories. Supports:
 *   ?parent=<slug>   — children of the parent with this slug
 *   ?top=true        — top-level categories only (no parent)
 *   (no params)      — all categories
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const parentSlug = searchParams.get('parent');
    const topOnly = searchParams.get('top') === 'true';

    const where: any = { isArchived: false };

    if (parentSlug) {
      // Find children of the parent category by slug
      const parent = await db.category.findFirst({
        where: { slug: parentSlug },
      });

      console.log(`[Categories API] Looking for parent slug="${parentSlug}", found:`, parent?.id ?? 'null');

      if (!parent) {
        return NextResponse.json({ categories: [] });
      }
      where.parentCategoryId = parent.id;
    } else if (topOnly) {
      where.parentCategoryId = null;
    }

    const categories = await db.category.findMany({
      where,
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true,
        slug: true,
        parentCategoryId: true,
        sortOrder: true,
        parentCategory: {
          select: { id: true, name: true, slug: true },
        },
      },
    });

    console.log(`[Categories API] Returning ${categories.length} categories`);

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('[Categories API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}
