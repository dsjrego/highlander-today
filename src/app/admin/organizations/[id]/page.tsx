import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { checkPermission } from '@/lib/permissions';

interface PageProps {
  params: {
    id: string;
  };
}

function formatTypeLabel(value: string) {
  return value
    .split('_')
    .map((segment) => segment.charAt(0) + segment.slice(1).toLowerCase())
    .join(' ');
}

function formatDate(value: Date | null) {
  if (!value) {
    return 'Not set';
  }

  return new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
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
      approvedAt: true,
      createdAt: true,
      updatedAt: true,
      isPublicMemberRoster: true,
      createdBy: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
      _count: {
        select: {
          memberships: true,
          locations: true,
          departments: true,
          contacts: true,
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
          <div className="admin-card-header-label">Organization Detail</div>
          <div className="admin-card-header-actions">
            <Link href="/admin/organizations" className="page-header-action">
              Back to Organizations
            </Link>
          </div>
        </div>
        <div className="admin-card-body space-y-6">
          <div className="space-y-2">
            <h1 className="text-2xl font-black tracking-[-0.03em] text-slate-950">{organization.name}</h1>
            <p className="text-sm text-slate-600">
              {formatTypeLabel(organization.directoryGroup)} / {formatTypeLabel(organization.organizationType)}
            </p>
          </div>

          <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Status</p>
              <p className="mt-2 text-sm font-semibold text-slate-950">{formatTypeLabel(organization.status)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Created By</p>
              <p className="mt-2 text-sm font-semibold text-slate-950">
                {organization.createdBy.firstName} {organization.createdBy.lastName}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Approved</p>
              <p className="mt-2 text-sm font-semibold text-slate-950">{formatDate(organization.approvedAt)}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Roster Visibility</p>
              <p className="mt-2 text-sm font-semibold text-slate-950">
                {organization.isPublicMemberRoster ? 'Public' : 'Private'}
              </p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Contact</p>
              <div className="mt-2 space-y-1 text-sm text-slate-700">
                <p>{organization.contactEmail || 'No email set'}</p>
                <p>{organization.contactPhone || 'No phone set'}</p>
                <p>{organization.websiteUrl || 'No website set'}</p>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Structure</p>
              <div className="mt-2 space-y-1 text-sm text-slate-700">
                <p>{organization._count.memberships} memberships</p>
                <p>{organization._count.locations} locations</p>
                <p>{organization._count.departments} departments</p>
                <p>{organization._count.contacts} contacts</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Description</p>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              {organization.description || 'No description set yet.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
