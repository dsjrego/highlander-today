import { NextRequest, NextResponse } from 'next/server';
import { type HelpWantedStatus } from '@prisma/client';
import { db } from '@/lib/db';
import { ACTIONS, canPerformAction, type PermissionUser } from '@/lib/permissions';
import { logActivity } from '@/lib/activity-log';
import { z } from 'zod';

const CREATE_STATUSES = ['DRAFT', 'PENDING_REVIEW'] as const;
const POSTING_TYPES = ['EMPLOYMENT', 'SERVICE_REQUEST', 'GIG_TASK'] as const;
const COMPENSATION_TYPES = [
  'HOURLY',
  'SALARY',
  'FIXED',
  'NEGOTIABLE',
  'VOLUNTEER',
  'UNSPECIFIED',
] as const;
const PUBLIC_STATUSES = ['PUBLISHED', 'FILLED', 'CLOSED'] as const;

const CreateHelpWantedSchema = z.object({
  title: z.string().trim().min(3).max(255),
  description: z.string().trim().min(20).max(5000),
  postingType: z.enum(POSTING_TYPES),
  compensationType: z.enum(COMPENSATION_TYPES).nullable().optional(),
  compensationText: z.string().trim().max(255).nullable().optional(),
  locationText: z.string().trim().max(255).nullable().optional(),
  scheduleText: z.string().trim().max(255).nullable().optional(),
  photoUrl: z.string().trim().max(2048).nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  status: z.enum(CREATE_STATUSES).optional(),
});

function buildPermissionUser(request: NextRequest): PermissionUser | null {
  const userId = request.headers.get('x-user-id');
  const userRole = request.headers.get('x-user-role') || '';
  const userTrustLevel = request.headers.get('x-user-trust-level') || '';
  const communityId = request.headers.get('x-community-id') || undefined;

  if (!userId) {
    return null;
  }

  return {
    id: userId,
    role: userRole,
    trust_level: userTrustLevel,
    community_id: communityId,
  };
}

async function resolveCommunityId(request: NextRequest) {
  const headerCommunityId = request.headers.get('x-community-id');

  if (headerCommunityId) {
    return headerCommunityId;
  }

  const community = await db.community.findFirst({
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  });

  return community?.id ?? null;
}

export async function GET(request: NextRequest) {
  try {
    const permissionUser = buildPermissionUser(request);
    const searchParams = request.nextUrl.searchParams;
    const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
    const limit = Math.min(
      Math.max(parseInt(searchParams.get('limit') || '20', 10), 1),
      100
    );
    const postingType = searchParams.get('postingType')?.trim().toUpperCase();
    const includeResolved = searchParams.get('includeResolved') === 'true';
    const mineOnly = searchParams.get('mine') === '1';
    const communityId = await resolveCommunityId(request);

    if (mineOnly && !permissionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!communityId) {
      return NextResponse.json({
        posts: [],
        pagination: { page, limit, total: 0, pages: 0 },
      });
    }

    const where = {
      communityId,
      ...(mineOnly
        ? {
            authorUserId: permissionUser!.id,
          }
        : {
            status: {
              in: (includeResolved
                ? [...PUBLIC_STATUSES]
                : ['PUBLISHED']) as HelpWantedStatus[],
            },
          }),
      ...(postingType && POSTING_TYPES.includes(postingType as (typeof POSTING_TYPES)[number])
        ? {
            postingType: postingType as (typeof POSTING_TYPES)[number],
          }
        : {}),
    };

    const total = await db.helpWantedPost.count({ where });
    const posts = await db.helpWantedPost.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhotoUrl: true,
            trustLevel: true,
          },
        },
      },
      orderBy: mineOnly
        ? [{ updatedAt: 'desc' }, { createdAt: 'desc' }]
        : [{ publishedAt: 'desc' }, { createdAt: 'desc' }],
    });

    return NextResponse.json({
      posts,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error fetching Help Wanted posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch Help Wanted posts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const permissionUser = buildPermissionUser(request);

    if (!permissionUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canPerformAction(permissionUser, ACTIONS.CREATE_HELP_WANTED)) {
      return NextResponse.json(
        { error: 'Only trusted users can post to Help Wanted' },
        { status: 403 }
      );
    }

    const communityId = await resolveCommunityId(request);
    if (!communityId) {
      return NextResponse.json({ error: 'Community not found' }, { status: 404 });
    }

    const body = await request.json();
    const validated = CreateHelpWantedSchema.parse(body);
    const ipAddress = request.headers.get('x-client-ip');
    const initialStatus = validated.status ?? 'PENDING_REVIEW';

    const post = await db.helpWantedPost.create({
      data: {
        communityId,
        authorUserId: permissionUser.id,
        title: validated.title,
        description: validated.description,
        postingType: validated.postingType,
        compensationType: validated.compensationType ?? null,
        compensationText: validated.compensationText ?? null,
        locationText: validated.locationText ?? null,
        scheduleText: validated.scheduleText ?? null,
        photoUrl: validated.photoUrl ?? null,
        expiresAt: validated.expiresAt ? new Date(validated.expiresAt) : null,
        status: initialStatus,
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePhotoUrl: true,
            trustLevel: true,
          },
        },
      },
    });

    logActivity({
      userId: permissionUser.id,
      action: 'CREATE',
      resourceType: 'HELP_WANTED_POST',
      resourceId: post.id,
      ipAddress,
      metadata: {
        title: post.title,
        postingType: post.postingType,
        status: post.status,
      },
    }).catch(() => {});

    return NextResponse.json(post, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating Help Wanted post:', error);
    return NextResponse.json(
      { error: 'Failed to create Help Wanted post' },
      { status: 500 }
    );
  }
}
