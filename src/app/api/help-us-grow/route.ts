import { NextRequest, NextResponse } from 'next/server';
import { getCurrentCommunity } from '@/lib/community';
import { db } from '@/lib/db';
import { hasTrustedAccess } from '@/lib/trust-access';

function getDisplayName(user: { firstName: string; lastName: string }) {
  return `${user.firstName} ${user.lastName}`.trim();
}

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');
    const userTrustLevel = request.headers.get('x-user-trust-level');

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasTrustedAccess({ trustLevel: userTrustLevel, role: userRole })) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const currentCommunity = await getCurrentCommunity({ headers: request.headers });
    if (!currentCommunity) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 });
    }

    const memberships = await db.userCommunityMembership.findMany({
      where: {
        communityId: currentCommunity.id,
        userId: { not: userId },
        user: {
          trustLevel: 'REGISTERED',
        },
      },
      orderBy: [
        { user: { firstName: 'asc' } },
        { user: { lastName: 'asc' } },
        { joinedAt: 'asc' },
      ],
      select: {
        joinedAt: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return NextResponse.json({
      community: {
        id: currentCommunity.id,
        name: currentCommunity.name,
      },
      users: memberships.map((membership) => ({
        id: membership.user.id,
        firstName: membership.user.firstName,
        lastName: membership.user.lastName,
        displayName: getDisplayName(membership.user),
        joinedAt: membership.joinedAt,
      })),
    });
  } catch (error) {
    console.error('Error fetching help-us-grow candidates:', error);
    return NextResponse.json({ error: 'Failed to load members' }, { status: 500 });
  }
}

