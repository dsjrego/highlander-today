import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkPermission } from '@/lib/permissions';

/**
 * GET /api/admin/users — List all users with search, filter, and pagination
 * Requires MANAGE_USERS permission (Editor+ role).
 *
 * Query params:
 *   search    — filter by name or email (partial match)
 *   trustLevel — ANONYMOUS | REGISTERED | TRUSTED | SUSPENDED
 *   role      — READER | CONTRIBUTOR | STAFF_WRITER | EDITOR | ADMIN | SUPER_ADMIN
 *   page      — 1-based page number (default 1)
 *   limit     — items per page (default 25, max 100)
 *   sort      — field to sort by: createdAt | firstName | email | trustLevel (default createdAt)
 *   order     — asc | desc (default desc)
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = request.headers.get('x-user-role') || '';
    if (!checkPermission(userRole, 'users:view')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const trustLevel = searchParams.get('trustLevel') || '';
    const role = searchParams.get('role') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25', 10)));
    const sort = searchParams.get('sort') || 'createdAt';
    const order = searchParams.get('order') === 'asc' ? 'asc' : 'desc';

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (trustLevel && ['ANONYMOUS', 'REGISTERED', 'TRUSTED', 'SUSPENDED'].includes(trustLevel)) {
      where.trustLevel = trustLevel;
    }

    // Role filter requires joining through memberships
    if (role && ['READER', 'CONTRIBUTOR', 'STAFF_WRITER', 'EDITOR', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
      where.memberships = {
        some: { role },
      };
    }

    // Build orderBy
    const allowedSortFields = ['createdAt', 'firstName', 'lastName', 'email', 'trustLevel'];
    const sortField = allowedSortFields.includes(sort) ? sort : 'createdAt';

    const [users, total] = await Promise.all([
      db.user.findMany({
        where,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          trustLevel: true,
          profilePhotoUrl: true,
          isIdentityLocked: true,
          createdAt: true,
          memberships: {
            select: {
              role: true,
              communityId: true,
            },
          },
          _count: {
            select: {
              articles: true,
              eventsSubmitted: true,
              marketplaceListings: true,
              vouchesGiven: true,
              vouchesReceived: true,
            },
          },
        },
        orderBy: { [sortField]: order },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.user.count({ where }),
    ]);

    // Transform to flat structure for the frontend
    const formattedUsers = users.map((user) => ({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      trustLevel: user.trustLevel,
      role: user.memberships[0]?.role || 'READER',
      communityId: user.memberships[0]?.communityId || null,
      profilePhotoUrl: user.profilePhotoUrl,
      isIdentityLocked: user.isIdentityLocked,
      createdAt: user.createdAt,
      postCount:
        user._count.articles +
        user._count.eventsSubmitted +
        user._count.marketplaceListings,
      vouchesGiven: user._count.vouchesGiven,
      vouchesReceived: user._count.vouchesReceived,
    }));

    // Also fetch aggregate stats for the page header
    const [totalUsers, trustedCount, registeredCount, suspendedCount] = await Promise.all([
      db.user.count(),
      db.user.count({ where: { trustLevel: 'TRUSTED' } }),
      db.user.count({ where: { trustLevel: 'REGISTERED' } }),
      db.user.count({ where: { trustLevel: 'SUSPENDED' } }),
    ]);

    return NextResponse.json({
      users: formattedUsers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        totalUsers,
        trustedCount,
        registeredCount,
        suspendedCount,
      },
    });
  } catch (error) {
    console.error('Error fetching admin users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
