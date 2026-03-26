import 'server-only';

import { unstable_cache } from 'next/cache';
import { db } from '@/lib/db';

type CategoryQueryArgs = {
  parentSlug?: string | null;
  topOnly?: boolean;
};

const getCachedCategories = unstable_cache(
  async ({ parentSlug, topOnly = false }: CategoryQueryArgs) => {
    const where: Record<string, unknown> = { isArchived: false };

    if (parentSlug) {
      const parent = await db.category.findFirst({
        where: { slug: parentSlug, isArchived: false },
        select: { id: true },
      });

      if (!parent) {
        return [];
      }

      where.parentCategoryId = parent.id;
    } else if (topOnly) {
      where.parentCategoryId = null;
    }

    return db.category.findMany({
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
  },
  ['categories'],
  { revalidate: 3600, tags: ['categories'] }
);

export async function getCategories(args: CategoryQueryArgs = {}) {
  return getCachedCategories(args);
}
