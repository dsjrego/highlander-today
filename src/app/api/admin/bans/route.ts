import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkPermission } from '@/lib/permissions';

/**
 * GET /api/admin/bans — List all banned emails with details
 * Requires BAN_USER permission (Admin+ role).
 *
 * Query params:
 *   search — filter by email (partial match)
 *   page   — 1-based page number (default 1)
 *   limit  — items per page (default 25, max 100)
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = request.headers.get('x-user-role') || '';
    if (!checkPermission(userRole, 'trust:ban')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '25', 10)));

    const where: any = {};

    // Only show active bans (not unbanned)
    where.unbannedAt = null;

    if (search) {
      where.email = { contains: search, mode: 'insensitive' };
    }

    const [bans, total] = await Promise.all([
      db.bannedEmail.findMany({
        where,
        include: {
          bannedByUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
          unbannedByUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: { bannedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.bannedEmail.count({ where }),
    ]);

    // Also get the associated user records if they exist
    const formattedBans = await Promise.all(
      bans.map(async (ban) => {
        // Try to find the user with this email
        const user = await db.user.findUnique({
          where: { email: ban.email },
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        });

        return {
          id: ban.id,
          email: ban.email,
          userId: user?.id || null,
          firstName: user?.firstName || null,
          lastName: user?.lastName || null,
          bannedAt: ban.bannedAt,
          bannedBy: ban.bannedByUser
            ? `${ban.bannedByUser.firstName} ${ban.bannedByUser.lastName}`
            : 'Unknown',
          bannedByUserId: ban.bannedByUserId,
          unbannedAt: ban.unbannedAt,
          unbannedBy: ban.unbannedByUser
            ? `${ban.unbannedByUser.firstName} ${ban.unbannedByUser.lastName}`
            : null,
        };
      })
    );

    // Get the reason from TrustAuditLog for each ban
    const bansWithReasons = await Promise.all(
      formattedBans.map(async (ban) => {
        // Look for the most recent BAN action for this user
        let reason = null;
        if (ban.userId) {
          const auditEntry = await db.trustAuditLog.findFirst({
            where: {
              targetUserId: ban.userId,
              action: 'BANNED',
            },
            orderBy: { timestamp: 'desc' },
            select: { reason: true },
          });
          reason = auditEntry?.reason || null;
        }
        return { ...ban, reason };
      })
    );

    return NextResponse.json({
      bans: bansWithReasons,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        totalActiveBans: total,
      },
    });
  } catch (error) {
    console.error('Error fetching bans:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bans' },
      { status: 500 }
    );
  }
}
