import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { Newspaper } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { getCurrentCommunity } from '@/lib/community';
import { db } from '@/lib/db';
import { checkPermission } from '@/lib/permissions';
import ArticleTabs from './ArticleTabs';

export default async function AdminArticlesPage() {
  const session = await getServerSession(authOptions);
  const userRole = session?.user?.role || '';

  if (!checkPermission(userRole, 'articles:approve')) {
    redirect('/');
  }

  const currentCommunity = await getCurrentCommunity({ headers: headers() });

  const articles = await db.article.findMany({
    where: {
      status: {
        in: ['DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'UNPUBLISHED'],
      },
      ...(currentCommunity?.id ? { communityId: currentCommunity.id } : {}),
    },
    select: {
      id: true,
      title: true,
      slug: true,
      status: true,
      publishedAt: true,
      updatedAt: true,
      author: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
      category: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: [{ updatedAt: 'desc' }, { publishedAt: 'desc' }],
  });

  const articleCategories = await db.category.findMany({
    where: {
      isArchived: false,
      parentCategory: {
        slug: 'local-life',
      },
      OR: currentCommunity?.id
        ? [{ communityId: currentCommunity.id }, { communityId: null }]
        : [{ communityId: null }],
    },
    select: {
      id: true,
      name: true,
      slug: true,
    },
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });

  return (
    <div className="space-y-4">
      <div className="admin-card">
        <div className="admin-card-header">
          <div className="flex items-center gap-0">
            <div className="admin-card-header-icon" aria-hidden="true">
              <Newspaper className="h-4 w-4" />
            </div>
            <div className="admin-card-header-label">Articles</div>
          </div>
        </div>
        <div className="admin-card-body">
          <ArticleTabs articles={articles} articleCategories={articleCategories} />
        </div>
        <div className="admin-card-footer">
          <div className="admin-card-footer-label"></div>
          <div className="admin-card-footer-actions"></div>
        </div>
      </div>
    </div>
  );
}
