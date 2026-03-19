import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkPermission } from '@/lib/permissions';
import { z } from 'zod';

const BanSchema = z.object({
  userId: z.string().uuid(),
  reason: z.string().min(1).max(500),
});

/**
 * POST /api/trust/ban — Ban a user permanently
 * Sets trustLevel to SUSPENDED and adds email to BannedEmail table.
 * Requires 'trust:ban' permission (Admin+ role).
 */
export async function POST(request: NextRequest) {
  try {
    const actorId = request.headers.get('x-user-id');
    if (!actorId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = request.headers.get('x-user-role') || '';
    if (!checkPermission(userRole, 'trust:ban')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = BanSchema.parse(body);

    // Get target user
    const targetUser = await db.user.findUnique({
      where: { id: validated.userId },
      select: { id: true, email: true, trustLevel: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (targetUser.id === actorId) {
      return NextResponse.json({ error: 'Cannot ban yourself' }, { status: 400 });
    }

    // Check if email is already banned
    const existingBan = await db.bannedEmail.findUnique({
      where: { email: targetUser.email },
    });

    if (existingBan && !existingBan.unbannedAt) {
      return NextResponse.json(
        { error: 'User is already banned' },
        { status: 400 }
      );
    }

    // Set user to SUSPENDED
    await db.user.update({
      where: { id: validated.userId },
      data: { trustLevel: 'SUSPENDED' },
    });

    // Add to banned emails (prevents re-registration)
    if (existingBan) {
      // Re-ban: clear the unbanned fields
      await db.bannedEmail.update({
        where: { email: targetUser.email },
        data: {
          bannedByUserId: actorId,
          bannedAt: new Date(),
          unbannedByUserId: null,
          unbannedAt: null,
        },
      });
    } else {
      await db.bannedEmail.create({
        data: {
          email: targetUser.email,
          bannedByUserId: actorId,
        },
      });
    }

    // Log to TrustAuditLog
    await db.trustAuditLog.create({
      data: {
        actorUserId: actorId,
        targetUserId: validated.userId,
        action: 'BANNED',
        reason: validated.reason,
      },
    });

    return NextResponse.json({
      success: true,
      message: `User ${targetUser.email} has been banned`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error banning user:', error);
    return NextResponse.json(
      { error: 'Failed to ban user' },
      { status: 500 }
    );
  }
}
