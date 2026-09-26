import { NextRequest, NextResponse } from 'next/server';
import { MembershipRole, Prisma, TrustLevel } from '@prisma/client';
import { db } from '@/lib/db';
import { ACTIONS, canPerformAction, type PermissionUser } from '@/lib/permissions';
import { getCurrentCommunity } from '@/lib/community';

/**
 * GET /api/admin/users — List all users with search, filter, and pagination
 * Requires MANAGE_USERS permission (Editor+ role).
 *
 * Query params:
 *   search    — filter by name or email (partial match)
 *   trustLevel — ANONYMOUS | REGISTERED | TRUSTED | SUSPENDED
 *   role      — READER | CONTRIBUTOR | STAFF_WRITER | EDITOR | ADMIN | SUPER_ADMIN
 *   directory — listed | unlisted
 *   page      — 1-based page number (default 1)
 *   limit     — items per page (default 25, max 100)
 *   sort      — field to sort by: createdAt | firstName | lastName | email | trustLevel (default lastName)
 *   order     — asc | desc (default asc)
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = request.headers.get('x-user-role') || '';
    const permissionUser: PermissionUser = {
      id: userId,
      role: userRole,
      trust_level: request.headers.get('x-user-trust-level') || '',
      community_id: request.headers.get('x-community-id') || undefined,
    };
    if (!canPerformAction(permissionUser, ACTIONS.MANAGE_USERS)) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const community = await getCurrentCommunity({
      headers: request.headers,
      nextUrl: request.nextUrl,
    });
    if (!community) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 });
    }

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const trustLevel = searchParams.get('trustLevel') || '';
    const role = searchParams.get('role') || '';
    const directory = searchParams.get('directory') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25', 10)));
    const sort = searchParams.get('sort') || 'lastName';
    const order = searchParams.get('order') === 'desc' ? 'desc' : 'asc';

    // Build where clause
    const where: Prisma.UserWhereInput = {
      memberships: { some: { communityId: community.id } },
    };

    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (trustLevel && ['ANONYMOUS', 'REGISTERED', 'TRUSTED', 'SUSPENDED'].includes(trustLevel)) {
      where.trustLevel = trustLevel as TrustLevel;
    }

    // Role filter requires joining through memberships
    if (role && ['READER', 'CONTRIBUTOR', 'STAFF_WRITER', 'EDITOR', 'ADMIN', 'SUPER_ADMIN'].includes(role)) {
      where.memberships = {
        some: { communityId: community.id, role: role as MembershipRole },
      };
    }

    if (directory === 'listed') {
      where.isDirectoryListed = true;
    } else if (directory === 'unlisted') {
      where.isDirectoryListed = false;
    }

    // Build orderBy
    const allowedSortFields = ['createdAt', 'firstName', 'lastName', 'email', 'trustLevel'];
    const sortField = allowedSortFields.includes(sort) ? sort : 'lastName';

    const orderBy: Prisma.UserOrderByWithRelationInput[] =
      sortField === 'lastName'
        ? [{ lastName: order }, { firstName: order }, { email: order }]
        : sortField === 'firstName'
          ? [{ firstName: order }, { lastName: order }, { email: order }]
          : [{ [sortField]: order }, { lastName: 'asc' }, { firstName: 'asc' }];

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
            where: { communityId: community.id },
            select: {
              role: true,
              communityId: true,
            },
          },
          loginEvents: {
            select: {
              createdAt: true,
            },
            orderBy: {
              createdAt: 'desc',
            },
            take: 1,
          },
          vouchesReceived: {
            select: {
              voucherUser: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
            orderBy: {
              createdAt: 'asc',
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
        orderBy,
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
      lastSeenAt: user.loginEvents[0]?.createdAt ?? null,
      postCount:
        user._count.articles +
        user._count.eventsSubmitted +
        user._count.marketplaceListings,
      vouchedBy: user.vouchesReceived.map((vouch) =>
        `${vouch.voucherUser.firstName} ${vouch.voucherUser.lastName}`.trim()
      ),
      vouchesGiven: user._count.vouchesGiven,
      vouchesReceived: user._count.vouchesReceived,
    }));

    // Also fetch aggregate stats for the page header
    const [totalUsers, trustedCount, registeredCount, suspendedCount] = await Promise.all([
      db.user.count({ where: { memberships: { some: { communityId: community.id } } } }),
      db.user.count({ where: { trustLevel: 'TRUSTED', memberships: { some: { communityId: community.id } } } }),
      db.user.count({ where: { trustLevel: 'REGISTERED', memberships: { some: { communityId: community.id } } } }),
      db.user.count({ where: { trustLevel: 'SUSPENDED', memberships: { some: { communityId: community.id } } } }),
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
