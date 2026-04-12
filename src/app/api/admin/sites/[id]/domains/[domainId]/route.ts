import { TenantDomainStatus } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

const UpdateSiteDomainSchema = z.object({
  status: z.nativeEnum(TenantDomainStatus).optional(),
  isPrimary: z.boolean().optional(),
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string; domainId: string } }
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

    const existing = await db.tenantDomain.findFirst({
      where: {
        id: params.domainId,
        communityId: params.id,
      },
      select: {
        id: true,
        domain: true,
        isPrimary: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Domain record not found' }, { status: 404 });
    }

    const body = await request.json();
    const validated = UpdateSiteDomainSchema.parse(body);

    await db.$transaction(async (tx) => {
      if (validated.isPrimary) {
        await tx.tenantDomain.updateMany({
          where: { communityId: params.id },
          data: { isPrimary: false },
        });
      }

      await tx.tenantDomain.update({
        where: { id: params.domainId },
        data: {
          ...(validated.status ? { status: validated.status } : {}),
          ...(validated.isPrimary !== undefined ? { isPrimary: validated.isPrimary } : {}),
        },
      });

      if (validated.isPrimary) {
        await tx.community.update({
          where: { id: params.id },
          data: { domain: existing.domain },
        });
      } else if (existing.isPrimary && validated.isPrimary === false) {
        const nextPrimary = await tx.tenantDomain.findFirst({
          where: {
            communityId: params.id,
            isPrimary: true,
          },
          orderBy: { updatedAt: 'desc' },
        });

        await tx.community.update({
          where: { id: params.id },
          data: { domain: nextPrimary?.domain ?? null },
        });
      }
    });

    const site = await getSite(params.id);
    return NextResponse.json({ site: serializeSite(site!) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }

    console.error('Error updating site domain:', error);
    return NextResponse.json({ error: 'Failed to update domain' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; domainId: string } }
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

    const existing = await db.tenantDomain.findFirst({
      where: {
        id: params.domainId,
        communityId: params.id,
      },
      select: {
        id: true,
        domain: true,
        isPrimary: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Domain record not found' }, { status: 404 });
    }

    await db.$transaction(async (tx) => {
      await tx.tenantDomain.delete({
        where: { id: params.domainId },
      });

      if (existing.isPrimary) {
        const nextPrimary = await tx.tenantDomain.findFirst({
          where: {
            communityId: params.id,
            isPrimary: true,
          },
          orderBy: { updatedAt: 'desc' },
        });

        await tx.community.update({
          where: { id: params.id },
          data: { domain: nextPrimary?.domain ?? null },
        });
      }
    });

    const site = await getSite(params.id);
    return NextResponse.json({ site: serializeSite(site!) });
  } catch (error) {
    console.error('Error deleting site domain:', error);
    return NextResponse.json({ error: 'Failed to delete domain' }, { status: 500 });
  }
}
