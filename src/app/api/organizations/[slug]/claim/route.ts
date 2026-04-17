import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hasTrustedAccess } from '@/lib/trust-access';

export async function POST(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role') || '';
    const userTrustLevel = request.headers.get('x-user-trust-level') || '';

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasTrustedAccess({ trustLevel: userTrustLevel, role: userRole })) {
      return NextResponse.json(
        { error: 'Trusted membership is required to claim an organization.' },
        { status: 403 }
      );
    }

    const communityId = request.headers.get('x-community-id') || undefined;

    const organization = await db.organization.findFirst({
      where: {
        id: params.slug,
        status: 'APPROVED',
        ...(communityId ? { communityId } : {}),
      },
      select: {
        id: true,
        communityId: true,
        name: true,
      },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    const communityMembership = await db.userCommunityMembership.findFirst({
      where: {
        communityId: organization.communityId,
        userId,
      },
      select: {
        id: true,
      },
    });

    if (!communityMembership) {
      return NextResponse.json(
        { error: 'You must be a member of this community to claim an organization.' },
        { status: 400 }
      );
    }

    const existingMembership = await db.organizationMembership.findFirst({
      where: {
        organizationId: organization.id,
        userId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (existingMembership) {
      return NextResponse.json(
        {
          error:
            existingMembership.status === 'PENDING'
              ? 'You already have a pending claim request for this organization.'
              : 'You are already attached to this organization.',
        },
        { status: 409 }
      );
    }

    const membership = await db.organizationMembership.create({
      data: {
        organizationId: organization.id,
        userId,
        role: 'OWNER',
        status: 'PENDING',
        isPublic: false,
        isPrimaryContact: false,
      },
      select: {
        id: true,
        status: true,
        role: true,
      },
    });

    return NextResponse.json(
      {
        membership,
        organization: {
          id: organization.id,
          name: organization.name,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating organization claim:', error);
    return NextResponse.json({ error: 'Failed to submit claim request' }, { status: 500 });
  }
}
