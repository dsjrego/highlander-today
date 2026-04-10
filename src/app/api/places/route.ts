import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.get('query')?.trim() || '';
    const limitParam = Number(request.nextUrl.searchParams.get('limit') || '20');
    const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 50) : 20;

    const places = await db.place.findMany({
      where: {
        isActive: true,
        isSelectable: true,
        ...(query
          ? {
              OR: [
                { name: { contains: query, mode: 'insensitive' } },
                { displayName: { contains: query, mode: 'insensitive' } },
                {
                  aliases: {
                    some: {
                      alias: { contains: query, mode: 'insensitive' },
                      isSearchable: true,
                    },
                  },
                },
              ],
            }
          : {}),
      },
      orderBy: [{ countryCode: 'asc' }, { admin1Name: 'asc' }, { name: 'asc' }],
      take: limit,
      select: {
        id: true,
        name: true,
        displayName: true,
        slug: true,
        type: true,
        countryCode: true,
        admin1Code: true,
        admin1Name: true,
        admin2Name: true,
        parentPlace: {
          select: {
            id: true,
            name: true,
            displayName: true,
            slug: true,
            type: true,
          },
        },
      },
    });

    return NextResponse.json({ places });
  } catch (error) {
    console.error('Error listing places:', error);
    return NextResponse.json({ error: 'Failed to list places' }, { status: 500 });
  }
}
