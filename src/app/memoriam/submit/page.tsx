import { headers } from 'next/headers';
import { db } from '@/lib/db';
import { getCurrentCommunity } from '@/lib/community';
import MemoriamSubmitClient from './MemoriamSubmitClient';

export default async function MemoriamSubmitPage() {
  const currentCommunity = await getCurrentCommunity({ headers: headers() });

  const categories = await db.category.findMany({
    where: {
      contentModel: 'MEMORIAM',
      isArchived: false,
      OR: currentCommunity?.id
        ? [{ communityId: currentCommunity.id }, { communityId: null }]
        : [{ communityId: null }],
    },
    select: {
      id: true,
      name: true,
      slug: true,
      parentCategory: {
        select: {
          name: true,
        },
      },
    },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });

  return <MemoriamSubmitClient categories={categories} />;
}
