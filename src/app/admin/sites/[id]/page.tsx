import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { Globe } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { listTenantThemeManifests } from '@/lib/theme/registry';
import SiteDetailEditor from './SiteDetailEditor';

interface PageProps {
  params: {
    id: string;
  };
}

export default async function AdminSiteDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);

  if (session?.user?.role !== 'SUPER_ADMIN') {
    redirect('/');
  }

  const site = await db.community.findUnique({
    where: { id: params.id },
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

  if (!site) {
    notFound();
  }

  const normalizedSite = {
    id: site.id,
    name: site.name,
    slug: site.slug,
    domain: site.domain,
    description: site.description,
    createdAt: site.createdAt,
    domains: site.domains,
    provisioning: {
      launchStatus: site.siteSettings.find((setting) => setting.key === 'launch_status')?.value || 'PRELAUNCH',
      themeManifestSlug: site.siteSettings.find((setting) => setting.key === 'theme_manifest_slug')?.value || '',
      provisioningNotes: site.siteSettings.find((setting) => setting.key === 'provisioning_notes')?.value || '',
    },
    coverageAreas: site.tenantCoverageAreas,
  };
  const availableThemeManifestSlugs = listTenantThemeManifests().map((manifest) => manifest.tenantSlug);

  return (
    <div className="space-y-4">
      <div className="admin-card">
        <div className="admin-card-header">
          <div className="flex items-center gap-0">
            <div className="admin-card-header-icon" aria-hidden="true">
              <Globe className="h-4 w-4" />
            </div>
            <div className="admin-card-header-label">Sites</div>
          </div>
        </div>
        <div className="admin-card-body">
          <SiteDetailEditor site={normalizedSite} availableThemeManifestSlugs={availableThemeManifestSlugs} />
        </div>
        <div className="admin-card-footer">
          <div className="admin-card-footer-label"></div>
          <div className="admin-card-footer-actions"></div>
        </div>
      </div>
    </div>
  );
}
