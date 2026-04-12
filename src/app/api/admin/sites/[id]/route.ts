import { Prisma } from '@prisma/client';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { hasTenantThemeManifest } from '@/lib/theme/registry';

const UpdateSiteSchema = z.object({
  name: z.string().trim().min(3).max(120),
  slug: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must use lowercase letters, numbers, and hyphens only.'),
  description: z.string().trim().max(500).optional().or(z.literal('')),
  launchStatus: z.enum(['PRELAUNCH', 'LIVE', 'PAUSED']).optional(),
  themeManifestSlug: z.string().trim().max(120).optional().or(z.literal('')),
  provisioningNotes: z.string().trim().max(4000).optional().or(z.literal('')),
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
    status: string;
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

async function getSerializedSite(id: string) {
  const site = await db.community.findUniqueOrThrow({
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

  return serializeSite(site);
}

export async function PATCH(
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

    const existing = await db.community.findUnique({
      where: { id: params.id },
      select: { id: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Site not found' }, { status: 404 });
    }

    const body = await request.json();
    const validated = UpdateSiteSchema.parse(body);
    const normalizedManifestSlug = validated.themeManifestSlug?.trim() || '';

    if (normalizedManifestSlug && !hasTenantThemeManifest(normalizedManifestSlug)) {
      return NextResponse.json(
        { error: `Theme manifest "${normalizedManifestSlug}" does not exist in code.` },
        { status: 400 }
      );
    }

    await db.$transaction(async (tx) => {
      await tx.community.update({
        where: { id: params.id },
        data: {
          name: validated.name,
          slug: validated.slug,
          description: validated.description || null,
        },
      });

      const settingEntries = [
        ['launch_status', validated.launchStatus],
        ['theme_manifest_slug', normalizedManifestSlug],
        ['provisioning_notes', validated.provisioningNotes],
      ] as const;

      for (const [key, value] of settingEntries) {
        if (value === undefined) {
          continue;
        }

        await tx.siteSetting.upsert({
          where: {
            communityId_key: {
              communityId: params.id,
              key,
            },
          },
          update: {
            value: value || '',
          },
          create: {
            communityId: params.id,
            key,
            value: value || '',
          },
        });
      }
    });

    return NextResponse.json({ site: await getSerializedSite(params.id) });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'A site with that slug already exists.' }, { status: 409 });
    }

    console.error('Error updating site:', error);
    return NextResponse.json({ error: 'Failed to update site' }, { status: 500 });
  }
}
