import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkPermission } from '@/lib/permissions';

/**
 * GET /api/users/[id] — View any user's public profile
 * Requires authentication and 'users:view' permission.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const user = await db.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        bio: true,
        profilePhotoUrl: true,
        trustLevel: true,
        createdAt: true,
        memberships: {
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
            articles: true,
            eventsSubmitted: true,
            marketplaceListings: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const role = user.memberships?.[0]?.role ?? 'READER';
    const community = user.memberships?.[0]?.community ?? null;
    const totalPosts =
      user._count.articles +
      user._count.eventsSubmitted +
      user._count.marketplaceListings;

    return NextResponse.json({
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      bio: user.bio,
      profilePhotoUrl: user.profilePhotoUrl,
      trustLevel: user.trustLevel,
      role,
      community,
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
