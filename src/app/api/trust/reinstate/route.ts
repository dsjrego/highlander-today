import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkPermission } from '@/lib/permissions';
import { z } from 'zod';

const ReinstateSchema = z.object({
  userId: z.string().uuid(),
  trustLevel: z.enum(['REGISTERED', 'TRUSTED']).default('TRUSTED'),
  reason: z.string().optional(),
});

/**
 * POST /api/trust/reinstate — Reinstate a suspended user
 * Restores trustLevel to TRUSTED (default) or REGISTERED.
 * Does NOT reinstate downstream users — they must be reinstated individually.
 * Requires 'trust:reinstate' permission (Admin+ role).
 */
export async function POST(request: NextRequest) {
  try {
    const actorId = request.headers.get('x-user-id');
    if (!actorId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = request.headers.get('x-user-role') || '';
    if (!checkPermission(userRole, 'trust:reinstate')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = ReinstateSchema.parse(body);

    // Get target user
    const targetUser = await db.user.findUnique({
      where: { id: validated.userId },
      select: { id: true, trustLevel: true, email: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (targetUser.trustLevel !== 'SUSPENDED') {
      return NextResponse.json(
        { error: 'User must be SUSPENDED to reinstate' },
        { status: 400 }
      );
    }

    // Check if the user is email-banned — they must be unbanned first
    const bannedEmail = await db.bannedEmail.findUnique({
      where: { email: targetUser.email },
    });

    if (bannedEmail && !bannedEmail.unbannedAt) {
      return NextResponse.json(
        { error: 'User is email-banned. Unban them first before reinstating.' },
        { status: 400 }
      );
    }

    // Reinstate user
    await db.user.update({
      where: { id: validated.userId },
      data: {
        trustLevel: validated.trustLevel,
        ...(validated.trustLevel === 'TRUSTED' ? { isDirectoryListed: true } : {}),
      },
    });

    // Log to TrustAuditLog
    await db.trustAuditLog.create({
      data: {
        actorUserId: actorId,
        targetUserId: validated.userId,
        action: 'REINSTATED',
        reason: validated.reason || null,
      },
    });

    return NextResponse.json({
      success: true,
      message: `User ${targetUser.email} reinstated to ${validated.trustLevel}`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error reinstating user:', error);
    return NextResponse.json(
      { error: 'Failed to reinstate user' },
      { status: 500 }
    );
  }
}
