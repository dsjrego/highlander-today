import { NextRequest, NextResponse } from 'next/server';
import { getCategories } from '@/lib/categories';

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
    const categories = await getCategories({ parentSlug, topOnly });

    return NextResponse.json({ categories });
  } catch (error) {
    console.error('[Categories API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}
