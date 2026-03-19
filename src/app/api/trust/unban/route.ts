import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkPermission } from '@/lib/permissions';
import { z } from 'zod';

const UnbanSchema = z.object({
  userId: z.string().uuid(),
});

/**
 * POST /api/trust/unban — Unban a user
 * Removes email from BannedEmail table and reinstates user to REGISTERED.
 * (They must be re-vouched to become TRUSTED again.)
 * Requires 'trust:ban' permission (Admin+ role).
 */
export async function POST(request: NextRequest) {
  try {
    const actorId = request.headers.get('x-user-id');
    if (!actorId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = request.headers.get('x-user-role') || '';
    if (!checkPermission(userRole, 'trust:unban')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = UnbanSchema.parse(body);

    // Get target user
    const targetUser = await db.user.findUnique({
      where: { id: validated.userId },
      select: { id: true, email: true, trustLevel: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if email is actually banned
    const bannedEmail = await db.bannedEmail.findUnique({
      where: { email: targetUser.email },
    });

    if (!bannedEmail || bannedEmail.unbannedAt) {
      return NextResponse.json(
        { error: 'User is not currently banned' },
        { status: 400 }
      );
    }

    // Mark as unbanned (soft-delete — keep the record for audit trail)
    await db.bannedEmail.update({
      where: { email: targetUser.email },
      data: {
        unbannedByUserId: actorId,
        unbannedAt: new Date(),
      },
    });

    // Reinstate user to REGISTERED (they need to be re-vouched for TRUSTED)
    await db.user.update({
      where: { id: validated.userId },
      data: { trustLevel: 'REGISTERED' },
    });

    // Log to TrustAuditLog
    await db.trustAuditLog.create({
      data: {
        actorUserId: actorId,
        targetUserId: validated.userId,
        action: 'UNBANNED',
      },
    });

    return NextResponse.json({
      success: true,
      message: `User ${targetUser.email} has been unbanned`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error unbanning user:', error);
    return NextResponse.json(
      { error: 'Failed to unban user' },
      { status: 500 }
    );
  }
}
