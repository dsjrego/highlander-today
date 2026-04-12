import { Prisma, TenantDomainStatus } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { normalizeDomain } from '@/lib/tenant';

const CreateSiteDomainSchema = z.object({
  domain: z.string().trim().min(3).max(255),
  status: z.nativeEnum(TenantDomainStatus).default(TenantDomainStatus.PENDING),
  isPrimary: z.boolean().optional().default(false),
});

function serializeSite(site: {
  id: string;
  name: string;
  slug: string;
  domain: string | null;
  description: string | null;
  createdAt: Date;
  siteSettings: Array<{
    key: string;
    value: string;
  }>;
  tenantCoverageAreas: Array<{
    id: string;
    coverageType: string;
    isPrimary: boolean;
    isActive: boolean;
    place: {
      id: string;
      displayName: string;
      type: string;
    };
  }>;
  domains: Array<{
    id: string;
    domain: string;
    isPrimary: boolean;
    status: TenantDomainStatus;
  }>;
}) {
  return {
    id: site.id,
    name: site.name,
    slug: site.slug,
    domain: site.domain,
    description: site.description,
    createdAt: site.createdAt.toISOString(),
    domains: site.domains,
    provisioning: {
      launchStatus:
        site.siteSettings.find((setting) => setting.key === 'launch_status')?.value || 'PRELAUNCH',
      themeManifestSlug:
        site.siteSettings.find((setting) => setting.key === 'theme_manifest_slug')?.value || '',
      provisioningNotes:
        site.siteSettings.find((setting) => setting.key === 'provisioning_notes')?.value || '',
    },
    coverageAreas: site.tenantCoverageAreas,
  };
}

async function getSite(id: string) {
  return db.community.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      slug: true,
      domain: true,
      description: true,
      createdAt: true,
      siteSettings: {
        where: {
          key: {
            in: ['launch_status', 'theme_manifest_slug', 'provisioning_notes'],
          },
        },
        select: {
          key: true,
          value: true,
        },
      },
      tenantCoverageAreas: {
        where: { isActive: true },
        orderBy: [{ isPrimary: 'desc' }, { coverageType: 'asc' }, { place: { displayName: 'asc' } }],
        select: {
          id: true,
          coverageType: true,
          isPrimary: true,
          isActive: true,
          place: {
            select: {
              id: true,
              displayName: true,
              type: true,
            },
          },
        },
      },
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
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (userRole !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const existingSite = await db.community.findUnique({
      where: { id: params.id },
      select: { id: true },
    });

    if (!existingSite) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    const body = await request.json();
    const validated = CreateSiteDomainSchema.parse(body);
    const normalizedDomain = normalizeDomain(validated.domain);

    if (!normalizedDomain) {
      return NextResponse.json({ error: 'Domain is required.' }, { status: 400 });
    }

    await db.$transaction(async (tx) => {
      if (validated.isPrimary) {
        await tx.tenantDomain.updateMany({
          where: { communityId: params.id },
          data: { isPrimary: false },
        });
      }

      await tx.tenantDomain.create({
        data: {
          communityId: params.id,
          domain: normalizedDomain,
          isPrimary: validated.isPrimary,
          status: validated.status,
        },
      });

      if (validated.isPrimary) {
        await tx.community.update({
          where: { id: params.id },
          data: { domain: normalizedDomain },
        });
      }
    });

    const site = await getSite(params.id);

    return NextResponse.json({ site: serializeSite(site!) }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'That domain is already assigned to another site.' }, { status: 409 });
    }

    console.error('Error creating site domain:', error);
    return NextResponse.json({ error: 'Failed to create domain' }, { status: 500 });
  }
}
