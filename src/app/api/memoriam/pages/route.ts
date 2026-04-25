import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const categorySlug = searchParams.get('category')?.trim() || undefined;
    const parentCategorySlug = searchParams.get('parentCategory')?.trim() || undefined;
    const query = searchParams.get('q')?.trim() || undefined;
    const pageType = searchParams.get('pageType')?.trim() || undefined;
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
    const limit = Math.min(
      Math.max(parseInt(searchParams.get('limit') || '20', 10), 1),
      100
    );
    const communityId = request.headers.get('x-community-id') || undefined;

    const where: Prisma.MemorialPageWhereInput = {
      status: 'PUBLISHED' as const,
      ...(communityId ? { communityId } : {}),
      ...(pageType === 'DEATH_NOTICE' || pageType === 'MEMORIAL_PAGE' ? { pageType } : {}),
      ...(categorySlug
        ? {
            category: {
              slug: categorySlug,
            },
          }
        : parentCategorySlug
          ? {
              category: {
                parentCategory: {
                  slug: parentCategorySlug,
                },
              },
            }
          : {}),
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

    const [total, memorialPages] = await Promise.all([
      db.memorialPage.count({ where }),
      db.memorialPage.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          title: true,
          slug: true,
          shortSummary: true,
          serviceDetails: true,
          pageType: true,
          publishedAt: true,
          memorialPerson: {
            select: {
              fullName: true,
              preferredName: true,
              deathDate: true,
              townName: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        orderBy: [{ publishedAt: 'desc' }, { updatedAt: 'desc' }],
      }),
    ]);

    return NextResponse.json({
      memorialPages,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching memorial pages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch memorial pages' },
      { status: 500 }
    );
  }
}
