import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkPermission } from '@/lib/permissions';

/**
 * POST /api/users/[id]/vouch — Vouch for a user
 * Creates a VouchRecord and promotes the target to TRUSTED
 * if they are currently REGISTERED.
 * Requires 'users:vouch' permission.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const actorId = request.headers.get('x-user-id');
    if (!actorId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userRole = request.headers.get('x-user-role') || '';
    if (!checkPermission(userRole, 'users:vouch')) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      );
    }

    const targetId = params.id;

    // Cannot vouch for self
    if (actorId === targetId) {
      return NextResponse.json(
        { error: 'Cannot vouch for yourself' },
        { status: 400 }
      );
    }

    // Get target user
    const targetUser = await db.user.findUnique({
      where: { id: targetId },
      select: { id: true, trustLevel: true, email: true, firstName: true, lastName: true, dateOfBirth: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (targetUser.trustLevel === 'SUSPENDED') {
      return NextResponse.json(
        { error: 'Cannot vouch for a suspended user' },
        { status: 400 }
      );
    }

    if (targetUser.trustLevel === 'TRUSTED') {
      return NextResponse.json(
        { error: 'User is already trusted' },
        { status: 400 }
      );
    }

    // Target must have date of birth filled out before they can be vouched for
    if (!targetUser.dateOfBirth) {
      return NextResponse.json(
        { error: 'This user must fill out their date of birth before they can be vouched for' },
        { status: 400 }
      );
    }

    // Get voucher to validate trust level
    const voucher = await db.user.findUnique({
      where: { id: actorId },
      select: { id: true, trustLevel: true },
    });

    if (!voucher || voucher.trustLevel !== 'TRUSTED') {
      return NextResponse.json(
        { error: 'You must be TRUSTED to vouch for users' },
        { status: 403 }
      );
    }

    // Check if already vouched
    const existing = await db.vouchRecord.findUnique({
      where: {
        voucherUserId_vouchedUserId: {
          voucherUserId: actorId,
          vouchedUserId: targetId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'You have already vouched for this user' },
        { status: 400 }
      );
    }

    // Check vouch limits (max 10 given per user)
    const givenCount = await db.vouchRecord.count({
      where: { voucherUserId: actorId },
    });
    if (givenCount >= 10) {
      return NextResponse.json(
        { error: 'You have reached the maximum number of vouches (10)' },
        { status: 400 }
      );
    }

    // Check received limits (max 50 per user)
    const receivedCount = await db.vouchRecord.count({
      where: { vouchedUserId: targetId },
    });
    if (receivedCount >= 50) {
      return NextResponse.json(
        { error: 'This user has reached the maximum number of received vouches' },
        { status: 400 }
      );
    }

    // Create vouch record
    const vouch = await db.vouchRecord.create({
      data: {
        voucherUserId: actorId,
        vouchedUserId: targetId,
      },
    });

    // Promote to TRUSTED and lock identity (single vouch from a trusted user is sufficient)
    if (targetUser.trustLevel === 'REGISTERED') {
      await db.user.update({
        where: { id: targetId },
        data: { trustLevel: 'TRUSTED', isIdentityLocked: true },
      });

      // Log the trust grant
      await db.trustAuditLog.create({
        data: {
          actorUserId: actorId,
          targetUserId: targetId,
          action: 'TRUST_GRANTED',
          reason: `Vouched by user`,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: `Successfully vouched for ${targetUser.firstName} ${targetUser.lastName}`,
      vouch,
    }, { status: 201 });
  } catch (error) {
    console.error('Error vouching for user:', error);
    return NextResponse.json(
      { error: 'Failed to vouch for user' },
      { status: 500 }
    );
  }
}
