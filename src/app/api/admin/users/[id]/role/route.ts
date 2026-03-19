import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { z } from 'zod';

const RoleUpdateSchema = z.object({
  role: z.enum(['READER', 'CONTRIBUTOR', 'STAFF_WRITER', 'EDITOR', 'ADMIN', 'SUPER_ADMIN']),
});

/**
 * PATCH /api/admin/users/[id]/role — Update a user's community role
 * Requires MANAGE_USERS permission (Editor+ role).
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const actorId = request.headers.get('x-user-id');
    if (!actorId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const actorRole = request.headers.get('x-user-role') || '';
    // Only admins can change roles
    if (!['ADMIN', 'SUPER_ADMIN'].includes(actorRole)) {
      return NextResponse.json(
        { error: 'Only admins can change user roles' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const validated = RoleUpdateSchema.parse(body);

    const targetId = params.id;

    // Prevent changing own role
    if (actorId === targetId) {
      return NextResponse.json(
        { error: 'Cannot change your own role' },
        { status: 400 }
      );
    }

    // Only SUPER_ADMIN can promote to ADMIN or SUPER_ADMIN
    if (['ADMIN', 'SUPER_ADMIN'].includes(validated.role) && actorRole !== 'SUPER_ADMIN') {
      return NextResponse.json(
        { error: 'Only Super Admins can promote to Admin or Super Admin' },
        { status: 403 }
      );
    }

    // Find the user's membership
    const membership = await db.userCommunityMembership.findFirst({
      where: { userId: targetId },
    });

    if (!membership) {
      return NextResponse.json(
        { error: 'User has no community membership' },
        { status: 404 }
      );
    }

    // Update the role
    const updated = await db.userCommunityMembership.update({
      where: { id: membership.id },
      data: { role: validated.role },
    });

    return NextResponse.json({
      success: true,
      userId: targetId,
      newRole: updated.role,
      message: `User role updated to ${validated.role}`,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error updating user role:', error);
    return NextResponse.json(
      { error: 'Failed to update user role' },
      { status: 500 }
    );
  }
}
