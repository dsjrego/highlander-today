import { Prisma, TenantDomainStatus } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createCommunity } from '@/lib/community';
import { db } from '@/lib/db';

const CreateSiteSchema = z.object({
  name: z.string().trim().min(3).max(120),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must use lowercase letters, numbers, and hyphens only.'),
  primaryDomain: z.string().trim().max(255).optional().or(z.literal('')),
  primaryDomainStatus: z.nativeEnum(TenantDomainStatus).default(TenantDomainStatus.PENDING),
  description: z.string().trim().max(500).optional().or(z.literal('')),
});

async function getCommunityWithDomains(communityId: string) {
  return createCommunityRecord(
    await db.community.findUniqueOrThrow({
      where: { id: communityId },
      select: {
        id: true,
        name: true,
        slug: true,
        domain: true,
        description: true,
        createdAt: true,
        domains: {
          select: {
            id: true,
            domain: true,
            isPrimary: true,
            status: true,
          },
          orderBy: [{ isPrimary: 'desc' }, { domain: 'asc' }],
        },
      },
    })
  );
}

function createCommunityRecord(community: {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  description: string | null;
  createdAt: Date;
  domains: Array<{
    id: string;
    domain: string;
    isPrimary: boolean;
    status: TenantDomainStatus;
  }>;
}) {
  return {
    ...community,
    createdAt: community.createdAt.toISOString(),
  };
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (userRole !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const validated = CreateSiteSchema.parse(body);

    const community = await createCommunity({
      name: validated.name,
      slug: validated.slug,
      domain: validated.primaryDomain || null,
      primaryDomainStatus:
        validated.primaryDomain && validated.primaryDomain.trim()
          ? validated.primaryDomainStatus
          : undefined,
      description: validated.description || null,
    });

    const hydrated = await getCommunityWithDomains(community.id);

    return NextResponse.json({ site: hydrated }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json(
        { error: 'A site with that slug or domain already exists.' },
        { status: 409 }
      );
    }

    console.error('Error creating site:', error);
    return NextResponse.json({ error: 'Failed to create site' }, { status: 500 });
  }
}
