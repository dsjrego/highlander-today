import Link from 'next/link';
import { AdminChip } from '@/components/admin/AdminChip';
import { db } from '@/lib/db';
import { canManageOrganizationMembership } from '@/lib/organization-membership';
import { formatOrganizationTypeLabel } from '@/lib/organizations';

function getRoleTone(role: string) {
  if (role === 'OWNER' || role === 'MANAGER') {
    return 'ok' as const;
  }

  return 'neu' as const;
}

export default async function ProfileWorkspaceOrganizationsPage({
  params,
}: {
  params: { id: string };
}) {
  const memberships = await db.organizationMembership.findMany({
    where: {
      userId: params.id,
      status: 'ACTIVE',
    },
    orderBy: [{ role: 'asc' }, { organization: { name: 'asc' } }],
    select: {
      id: true,
      role: true,
      status: true,
      title: true,
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
          organizationType: true,
        },
      },
    },
  });

  return (
    <section className="admin-card">
      <div className="admin-card-header">
        <div className="admin-card-header-label">Organizations</div>
        <div className="admin-card-header-actions">
          {memberships.length.toLocaleString()} membership{memberships.length === 1 ? '' : 's'}
        </div>
      </div>
      <div className="admin-card-body">
        <div className="space-y-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">Workspace organization access</p>
          <h2 className="text-lg font-semibold text-slate-950">Your organization memberships</h2>
          <p className="text-sm text-slate-600">
            Review the organizations attached to your profile and open the workspace manager for records you can maintain.
          </p>
        </div>

        <div className="admin-list">
          <div className="admin-list-table-wrap">
            <table className="admin-list-table">
              <thead className="admin-list-head">
                <tr>
                  <th className="admin-list-header-cell">Organization</th>
                  <th className="admin-list-header-cell">Role</th>
                  <th className="admin-list-header-cell">Status</th>
                  <th className="admin-list-header-cell">Actions</th>
                </tr>
              </thead>
              <tbody>
        {memberships.length > 0 ? (
          memberships.map((membership) => {
            const canManage = canManageOrganizationMembership({
              role: membership.role,
              status: membership.status,
            });

            return (
              <tr key={membership.id} className="admin-list-row">
                <td className="admin-list-cell">
                  <div className="space-y-1">
                    <div className="font-semibold text-slate-950">{membership.organization.name}</div>
                    <div className="text-sm text-slate-500">
                      {formatOrganizationTypeLabel(membership.organization.organizationType)}
                      {membership.title ? ` · ${membership.title}` : ''}
                    </div>
                  </div>
                </td>
                <td className="admin-list-cell">
                  <AdminChip tone={getRoleTone(membership.role)}>{formatOrganizationTypeLabel(membership.role)}</AdminChip>
                </td>
                <td className="admin-list-cell">
                  <AdminChip tone={membership.organization.status === 'APPROVED' ? 'ok' : membership.organization.status === 'PENDING_APPROVAL' ? 'pend' : 'bad'}>
                    {formatOrganizationTypeLabel(membership.organization.status)}
                  </AdminChip>
                </td>
                <td className="admin-list-cell">
                  <div className="flex flex-wrap justify-end gap-2">
                    {canManage ? (
                      <Link
                        href={`/profile/${params.id}/workspace/organizations/${membership.organization.id}`}
                        className="btn btn-primary"
                      >
                        Manage
                      </Link>
                    ) : null}
                    <Link
                      href={`/organizations/${membership.organization.slug}`}
                      className="btn btn-secondary"
                    >
                      View Public Page
                    </Link>
                  </div>
                </td>
              </tr>
            );
          })
        ) : (
                <tr className="admin-list-row">
                  <td className="admin-list-empty" colSpan={4}>
                    You are not attached to any active organization memberships yet.
                  </td>
                </tr>
        )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
