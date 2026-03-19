import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkPermission } from '@/lib/permissions';
import { z } from 'zod';

const RevokeSchema = z.object({
  userId: z.string().uuid(),
  reason: z.string().optional(),
});

/**
 * POST /api/trust/revoke — Revoke a user's TRUSTED status
 * Sets trustLevel to SUSPENDED. Cascades suspension to all downstream
 * users in the vouching chain (BFS traversal).
 * Requires 'trust:revoke' permission (Admin+ role).
 */
export async function POST(request: NextRequest) {
  try {
    const actorId = request.headers.get('x-user-id');
    if (!actorId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = request.headers.get('x-user-role') || '';
    if (!checkPermission(userRole, 'trust:revoke')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = RevokeSchema.parse(body);

    // Get target user
    const targetUser = await db.user.findUnique({
      where: { id: validated.userId },
      select: { id: true, trustLevel: true, email: true, firstName: true, lastName: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (targetUser.trustLevel !== 'TRUSTED') {
      return NextResponse.json(
        { error: 'User must be TRUSTED to revoke trust' },
        { status: 400 }
      );
    }

    // Suspend the target user
    await db.user.update({
      where: { id: validated.userId },
      data: { trustLevel: 'SUSPENDED' },
    });

    // Log the revocation
    await db.trustAuditLog.create({
      data: {
        actorUserId: actorId,
        targetUserId: validated.userId,
        action: 'TRUST_REVOKED',
        reason: validated.reason || null,
      },
    });

    // BFS cascade: suspend all downstream users in the vouching chain
    const queue: string[] = [validated.userId];
    const visited = new Set<string>([validated.userId]);
    let cascadeCount = 0;

    while (queue.length > 0) {
      const currentId = queue.shift()!;

      // Find all users this user vouched for
      const downstream = await db.vouchRecord.findMany({
        where: { voucherUserId: currentId },
        select: { vouchedUserId: true },
      });

      for (const record of downstream) {
        if (!visited.has(record.vouchedUserId)) {
          visited.add(record.vouchedUserId);
          queue.push(record.vouchedUserId);

          // Suspend downstream user
          await db.user.update({
            where: { id: record.vouchedUserId },
            data: { trustLevel: 'SUSPENDED' },
          });

          // Log cascade action
          await db.trustAuditLog.create({
            data: {
              actorUserId: actorId,
              targetUserId: record.vouchedUserId,
              action: 'SUSPENDED',
              reason: `Cascade from revocation of ${targetUser.firstName} ${targetUser.lastName}`,
            },
          });

          cascadeCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `Trust revoked for ${targetUser.email}`,
      cascadeSuspended: cascadeCount,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error revoking trust:', error);
    return NextResponse.json(
      { error: 'Failed to revoke trust' },
      { status: 500 }
    );
  }
}
