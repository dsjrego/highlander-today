import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkPermission } from '@/lib/permissions';

const STORE_STATUSES = ['PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'SUSPENDED'] as const;

export async function GET(request: NextRequest) {
  try {
    const userRole = request.headers.get('x-user-role') || '';

    if (!checkPermission(userRole, 'articles:approve')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status')?.trim().toUpperCase();
    const query = searchParams.get('q')?.trim();

    const where: {
      status?: (typeof STORE_STATUSES)[number];
      OR?: Array<Record<string, unknown>>;
    } = {};

    if (status && STORE_STATUSES.includes(status as (typeof STORE_STATUSES)[number])) {
      where.status = status as (typeof STORE_STATUSES)[number];
    }

    if (query) {
      where.OR = [
        { name: { contains: query, mode: 'insensitive' } },
        { slug: { contains: query, mode: 'insensitive' } },
        { description: { contains: query, mode: 'insensitive' } },
        { contactEmail: { contains: query, mode: 'insensitive' } },
        { owner: { is: { firstName: { contains: query, mode: 'insensitive' } } } },
        { owner: { is: { lastName: { contains: query, mode: 'insensitive' } } } },
      ];
    }

    const [stores, counts] = await Promise.all([
      db.store.findMany({
        where,
        include: {
          owner: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profilePhotoUrl: true,
              trustLevel: true,
            },
          },
          approvedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
          _count: {
            select: {
              listings: true,
            },
          },
        },
        orderBy: [
          { status: 'asc' },
          { updatedAt: 'desc' },
          { createdAt: 'desc' },
        ],
      }),
      Promise.all([
        db.store.count({ where: { status: 'PENDING_APPROVAL' } }),
        db.store.count({ where: { status: 'APPROVED' } }),
        db.store.count({ where: { status: 'REJECTED' } }),
        db.store.count({ where: { status: 'SUSPENDED' } }),
      ]),
    ]);

    const [pending, approved, rejected, suspended] = counts;

    return NextResponse.json({
      stores,
      counts: {
        all: pending + approved + rejected + suspended,
        pending,
        approved,
        rejected,
        suspended,
      },
    });
  } catch (error) {
    console.error('Error fetching admin stores:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stores' },
      { status: 500 }
    );
  }
}
