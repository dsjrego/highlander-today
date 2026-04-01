import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { Building2 } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { checkPermission } from '@/lib/permissions';
import OrganizationDetailEditor from './OrganizationDetailEditor';

interface PageProps {
  params: {
    id: string;
  };
}

export default async function AdminOrganizationDetailPage({ params }: PageProps) {
  const session = await getServerSession(authOptions);
  const userRole = session?.user?.role || '';

  if (!checkPermission(userRole, 'articles:approve')) {
    redirect('/');
  }

  const organization = await db.organization.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      websiteUrl: true,
      contactEmail: true,
      contactPhone: true,
      directoryGroup: true,
      organizationType: true,
      status: true,
      logoUrl: true,
      bannerUrl: true,
      isPublicMemberRoster: true,
      locations: {
        orderBy: [{ isPrimary: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
        select: {
          id: true,
          label: true,
          addressLine1: true,
          addressLine2: true,
          city: true,
          state: true,
          postalCode: true,
          municipality: true,
          contactEmail: true,
          contactPhone: true,
          websiteUrl: true,
          hoursSummary: true,
          isPrimary: true,
          isPublic: true,
          sortOrder: true,
        },
      },
      departments: {
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          contactEmail: true,
          contactPhone: true,
          websiteUrl: true,
          hoursSummary: true,
          isPublic: true,
          sortOrder: true,
          locationId: true,
        },
      },
      contacts: {
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        select: {
          id: true,
          label: true,
          name: true,
          title: true,
          email: true,
          phone: true,
          websiteUrl: true,
          isPublic: true,
          sortOrder: true,
          departmentId: true,
          locationId: true,
          userId: true,
        },
      },
      memberships: {
        orderBy: [{ status: 'asc' }, { joinedAt: 'asc' }],
        select: {
          id: true,
          role: true,
          status: true,
          title: true,
          isPublic: true,
          isPrimaryContact: true,
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      },
      events: {
        orderBy: [{ startDatetime: 'asc' }, { createdAt: 'desc' }],
        select: {
          id: true,
          title: true,
          status: true,
          startDatetime: true,
          endDatetime: true,
          venueLabel: true,
          location: {
            select: {
              id: true,
              name: true,
              addressLine1: true,
              city: true,
              state: true,
            },
          },
        },
      },
    },
  });

  if (!organization) {
    notFound();
  }

  return (
    <div className="space-y-4">
      <div className="admin-card">
        <div className="admin-card-header">
          <div className="flex items-center gap-3">
            <div className="admin-card-header-icon" aria-hidden="true">
              <Building2 className="h-4 w-4" />
            </div>
            <div className="admin-card-header-label">Organization &gt; {organization.name}</div>
          </div>
          <div className="admin-card-header-actions">
            <Link href="/admin/organizations" className="page-header-action">
              Back to Organizations
            </Link>
          </div>
        </div>
        <div className="admin-card-body space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-black tracking-[-0.03em] text-slate-950">{organization.name}</h1>
            <p className="text-sm text-slate-600">Manage public profile details, locations, departments, contacts, and roster visibility.</p>
          </div>
          <OrganizationDetailEditor organization={organization} />
        </div>
      </div>
    </div>
  );
}
