import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkPermission } from '@/lib/permissions';

/**
 * GET /api/trust/graph — Get the trust/vouching graph for visualization
 * Returns nodes (users) and edges (vouch relationships).
 * Requires 'trust:graph' permission (Admin+ role).
 *
 * Query params:
 *   userId — (optional) center the graph on a specific user
 *            If omitted, returns the full community graph
 */
export async function GET(request: NextRequest) {
  try {
    const actorId = request.headers.get('x-user-id');
    if (!actorId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = request.headers.get('x-user-role') || '';
    if (!checkPermission(userRole, 'trust:graph')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('userId');

    if (userId) {
      // Focused graph for a single user
      return await getUserGraph(userId);
    }

    // Full community vouch graph
    return await getFullGraph();
  } catch (error) {
    console.error('Error fetching trust graph:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trust graph' },
      { status: 500 }
    );
  }
}

async function getUserGraph(userId: string) {
  const targetUser = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      trustLevel: true,
      profilePhotoUrl: true,
    },
  });

  if (!targetUser) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  // Vouches this user received (incoming)
  const incomingVouches = await db.vouchRecord.findMany({
    where: { vouchedUserId: userId },
    include: {
      voucherUser: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          trustLevel: true,
          profilePhotoUrl: true,
        },
      },
    },
  });

  // Vouches this user gave (outgoing)
  const outgoingVouches = await db.vouchRecord.findMany({
    where: { voucherUserId: userId },
    include: {
      vouchedUser: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          trustLevel: true,
          profilePhotoUrl: true,
        },
      },
    },
  });

  // Build nodes and edges
  const nodes = new Map();
  const edges: any[] = [];

  // Add target user
  nodes.set(userId, {
    id: userId,
    name: `${targetUser.firstName} ${targetUser.lastName}`,
    trustLevel: targetUser.trustLevel,
    profilePhotoUrl: targetUser.profilePhotoUrl,
    type: 'target',
  });

  // Add incoming vouchers
  for (const vouch of incomingVouches) {
    const v = vouch.voucherUser;
    nodes.set(v.id, {
      id: v.id,
      name: `${v.firstName} ${v.lastName}`,
      trustLevel: v.trustLevel,
      profilePhotoUrl: v.profilePhotoUrl,
      type: 'voucher',
    });
    edges.push({
      from: v.id,
      to: userId,
      type: 'vouch',
      createdAt: vouch.createdAt,
    });
  }

  // Add outgoing vouchees
  for (const vouch of outgoingVouches) {
    const v = vouch.vouchedUser;
    nodes.set(v.id, {
      id: v.id,
      name: `${v.firstName} ${v.lastName}`,
      trustLevel: v.trustLevel,
      profilePhotoUrl: v.profilePhotoUrl,
      type: 'vouchee',
    });
    edges.push({
      from: userId,
      to: v.id,
      type: 'vouch',
      createdAt: vouch.createdAt,
    });
  }

  return NextResponse.json({
    nodes: Array.from(nodes.values()),
    edges,
    stats: {
      incomingVouches: incomingVouches.length,
      outgoingVouches: outgoingVouches.length,
      targetTrustLevel: targetUser.trustLevel,
    },
  });
}

async function getFullGraph() {
  // Get all vouch records with user data
  const vouches = await db.vouchRecord.findMany({
    include: {
      voucherUser: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          trustLevel: true,
          profilePhotoUrl: true,
        },
      },
      vouchedUser: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          trustLevel: true,
          profilePhotoUrl: true,
        },
      },
    },
  });

  const nodes = new Map();
  const edges: any[] = [];

  for (const vouch of vouches) {
    const v = vouch.voucherUser;
    const r = vouch.vouchedUser;

    if (!nodes.has(v.id)) {
      nodes.set(v.id, {
        id: v.id,
        name: `${v.firstName} ${v.lastName}`,
        trustLevel: v.trustLevel,
        profilePhotoUrl: v.profilePhotoUrl,
      });
    }

    if (!nodes.has(r.id)) {
      nodes.set(r.id, {
        id: r.id,
        name: `${r.firstName} ${r.lastName}`,
        trustLevel: r.trustLevel,
        profilePhotoUrl: r.profilePhotoUrl,
      });
    }

    edges.push({
      from: v.id,
      to: r.id,
      type: 'vouch',
      createdAt: vouch.createdAt,
    });
  }

  return NextResponse.json({
    nodes: Array.from(nodes.values()),
    edges,
    stats: {
      totalNodes: nodes.size,
      totalEdges: edges.length,
    },
  });
}
