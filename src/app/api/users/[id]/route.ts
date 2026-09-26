import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkPermission } from '@/lib/permissions';
import { getCurrentCommunity } from '@/lib/community';

/**
 * GET /api/users/[id] — View any user's public profile
 * Requires authentication and 'users:view' permission.
 */
export async function GET(request: NextRequest, props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
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

    const community = await getCurrentCommunity({
      headers: request.headers,
      nextUrl: request.nextUrl,
    });
    if (!community) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 });
    }

    const user = await db.user.findFirst({
      where: {
        id: params.id,
        memberships: { some: { communityId: community.id } },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        bio: true,
        profilePhotoUrl: true,
        createdAt: true,
        memberships: {
          where: { communityId: community.id },
          select: {
            role: true,
            community: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
        vouchesReceived: {
          select: { id: true, voucherUserId: true },
        },
        _count: {
          select: {
            articles: { where: { communityId: community.id } },
            eventsSubmitted: { where: { communityId: community.id } },
            marketplaceListings: { where: { communityId: community.id } },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const role = user.memberships?.[0]?.role ?? 'READER';
    const profileCommunity = user.memberships?.[0]?.community ?? null;
    const totalPosts =
      user._count.articles +
      user._count.eventsSubmitted +
      user._count.marketplaceListings;

    return NextResponse.json({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      bio: user.bio,
      profilePhotoUrl: user.profilePhotoUrl,
      role,
      community: profileCommunity,
      createdAt: user.createdAt,
      vouchCount: user.vouchesReceived.length,
      postCount: totalPosts,
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user' },
      { status: 500 }
    );
  }
}
