import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { checkPermission } from '@/lib/permissions';

/**
 * GET /api/admin/vouches — List all vouch records with user details
 * Requires VIEW_AUDIT_LOG permission (Admin+ role).
 *
 * Query params:
 *   search — filter by voucher or recipient name/email (partial match)
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
    if (!checkPermission(userRole, 'audit:view')) {
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

    if (search) {
      where.OR = [
        { voucherUser: { firstName: { contains: search, mode: 'insensitive' } } },
        { voucherUser: { lastName: { contains: search, mode: 'insensitive' } } },
        { voucherUser: { email: { contains: search, mode: 'insensitive' } } },
        { vouchedUser: { firstName: { contains: search, mode: 'insensitive' } } },
        { vouchedUser: { lastName: { contains: search, mode: 'insensitive' } } },
        { vouchedUser: { email: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [vouches, total] = await Promise.all([
      db.vouchRecord.findMany({
        where,
        include: {
          voucherUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              trustLevel: true,
            },
          },
          vouchedUser: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              trustLevel: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.vouchRecord.count({ where }),
    ]);

    const formattedVouches = vouches.map((vouch) => ({
      id: vouch.id,
      voucherId: vouch.voucherUserId,
      voucherName: `${vouch.voucherUser.firstName} ${vouch.voucherUser.lastName}`,
      voucherEmail: vouch.voucherUser.email,
      voucherTrustLevel: vouch.voucherUser.trustLevel,
      recipientId: vouch.vouchedUserId,
      recipientName: `${vouch.vouchedUser.firstName} ${vouch.vouchedUser.lastName}`,
      recipientEmail: vouch.vouchedUser.email,
      recipientTrustLevel: vouch.vouchedUser.trustLevel,
      createdAt: vouch.createdAt,
    }));

    // Stats
    const totalVouches = await db.vouchRecord.count();

    return NextResponse.json({
      vouches: formattedVouches,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
        totalVouches,
      },
    });
  } catch (error) {
    console.error('Error fetching vouches:', error);
    return NextResponse.json(
      { error: 'Failed to fetch vouches' },
      { status: 500 }
    );
  }
}
