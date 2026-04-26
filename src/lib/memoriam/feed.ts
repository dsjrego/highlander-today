import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';

export type MemoriamFeedItem = Awaited<ReturnType<typeof getMemoriamFeed>>[number];

export async function getMemoriamFeed(opts: {
  communityId?: string;
  query?: string;
  type?: 'all' | 'death-notices' | 'memorial-pages';
  limit?: number;
}) {
  const { communityId, query, type = 'all', limit = 60 } = opts;

  const where: Prisma.MemorialPageWhereInput = {
    status: 'PUBLISHED',
    ...(communityId ? { communityId } : {}),
    ...(type === 'death-notices' ? { pageType: 'DEATH_NOTICE' } : {}),
    ...(type === 'memorial-pages' ? { pageType: 'MEMORIAL_PAGE' } : {}),
    ...(query
      ? {
          OR: [
            { title: { contains: query, mode: 'insensitive' } },
            { shortSummary: { contains: query, mode: 'insensitive' } },
            { serviceDetails: { contains: query, mode: 'insensitive' } },
            {
              memorialPerson: {
                is: {
                  OR: [
                    { fullName: { contains: query, mode: 'insensitive' } },
                    { preferredName: { contains: query, mode: 'insensitive' } },
                    { townName: { contains: query, mode: 'insensitive' } },
                  ],
                },
              },
            },
          ],
        }
      : {}),
  };

  return db.memorialPage.findMany({
    where,
    orderBy: [{ publishedAt: 'desc' }, { updatedAt: 'desc' }],
    take: limit,
    select: {
      id: true,
      title: true,
      slug: true,
      pageType: true,
      shortSummary: true,
      serviceDetails: true,
      publishedAt: true,
      heroImageUrl: true,
      memorialPerson: {
        select: {
          fullName: true,
          preferredName: true,
          birthDate: true,
          deathDate: true,
          townName: true,
        },
      },
    },
  });
}

/**
 * Asymmetric hero sizing for the photo-forward grid.
 * The first item is featured; items 4 and 5 take a wider tile.
 * Items without a hero image always render at default size.
 */
export function heroSizeFor(
  index: number,
  hasImage: boolean
): 'default' | 'lg' | 'xl' {
  if (!hasImage) return 'default';
  if (index === 0) return 'xl';
  if (index === 3 || index === 4) return 'lg';
  return 'default';
}
