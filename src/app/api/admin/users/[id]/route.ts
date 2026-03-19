import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { logActivity } from '@/lib/activity-log';

/**
 * DELETE /api/admin/users/[id] — Permanently delete a user and all related data
 * Requires SUPER_ADMIN role.
 * Cascade deletes are handled by Prisma schema (onDelete: Cascade).
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const actorId = request.headers.get('x-user-id');
    if (!actorId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const actorRole = request.headers.get('x-user-role') || '';
    if (actorRole !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Only Super Admins can delete users' },
        { status: 403 }
      );
    }

    const targetId = params.id;

    // Prevent self-deletion
    if (actorId === targetId) {
      return NextResponse.json(
        { error: 'Cannot delete your own account' },
        { status: 400 }
      );
    }

    // Get the target user to confirm they exist and capture info for the audit log
    const targetUser = await db.user.findUnique({
      where: { id: targetId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        trustLevel: true,
        memberships: {
          select: { role: true },
        },
        _count: {
          select: {
            articles: true,
            eventsSubmitted: true,
            marketplaceListings: true,
            comments: true,
            vouchesGiven: true,
            vouchesReceived: true,
          },
        },
      },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const targetRole = targetUser.memberships[0]?.role || 'READER';

    // Prevent deleting other Super Admins
    if (targetRole === 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Cannot delete a Super Admin. Demote them first.' },
        { status: 403 }
      );
    }

    // Log the deletion before it happens (so we have a record of who deleted whom)
    const clientIp = request.headers.get('x-client-ip') || request.headers.get('x-forwarded-for') || 'unknown';
    await logActivity({
      userId: actorId,
      action: 'DELETE',
      resourceType: 'USER_PROFILE',
      resourceId: targetId,
      metadata: {
        deletedUser: {
          email: targetUser.email,
          name: `${targetUser.firstName} ${targetUser.lastName}`,
          trustLevel: targetUser.trustLevel,
          role: targetRole,
          contentCounts: targetUser._count,
        },
      },
      ipAddress: clientIp,
    });

    // Delete the user — Prisma cascades handle all related records
    await db.user.delete({
      where: { id: targetId },
    });

    return NextResponse.json({
      success: true,
      message: `User ${targetUser.firstName} ${targetUser.lastName} (${targetUser.email}) has been permanently deleted`,
      deletedCounts: targetUser._count,
    });
  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json(
      { error: 'Failed to delete user' },
      { status: 500 }
    );
  }
}
