import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ExternalLink, Save, Search } from 'lucide-react';
import WorkspaceOrganizationContactsManager from '@/components/profile/WorkspaceOrganizationContactsManager';
import WorkspaceOrganizationLocationsManager from '@/components/profile/WorkspaceOrganizationLocationsManager';
import WorkspaceOrganizationMembersManager from '@/components/profile/WorkspaceOrganizationMembersManager';
import WorkspaceOrganizationProfileEditor from '@/components/profile/WorkspaceOrganizationProfileEditor';
import { db } from '@/lib/db';
import { canManageOrganizationMembership } from '@/lib/organization-membership';

function getStatusMeta(status: 'PENDING_APPROVAL' | 'APPROVED' | 'REJECTED' | 'SUSPENDED') {
  if (status === 'APPROVED') {
    return { label: 'Published', pill: 'bg-green-100 text-green-700', dot: 'bg-green-500' };
  }
  if (status === 'PENDING_APPROVAL') {
    return { label: 'Pending approval', pill: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' };
  }
  return {
    label: status === 'REJECTED' ? 'Rejected' : 'Suspended',
    pill: 'bg-red-100 text-red-700',
    dot: 'bg-red-500',
  };
}

export default async function ProfileWorkspaceOrganizationDetailPage({
  params,
  searchParams,
}: {
  params: { id: string; organizationId: string };
  searchParams?: { view?: string };
}) {
  const membership = await db.organizationMembership.findFirst({
    where: {
      organizationId: params.organizationId,
      userId: params.id,
    },
    select: {
      role: true,
      status: true,
      organization: {
        select: {
          id: true,
          name: true,
          slug: true,
          description: true,
          logoUrl: true,
          bannerUrl: true,
          websiteUrl: true,
          contactEmail: true,
          contactPhone: true,
          directoryGroup: true,
          organizationType: true,
          isPublicMemberRoster: true,
          status: true,
          updatedAt: true,
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
          community: {
            select: {
              memberships: {
                where: {
                  user: {
                    organizationMemberships: {
                      none: {
                        organizationId: params.organizationId,
                      },
                    },
                  },
                },
                orderBy: [{ user: { lastName: 'asc' } }, { user: { firstName: 'asc' } }],
                select: {
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
            },
          },
        },
      },
    },
  });

  if (!membership || !canManageOrganizationMembership({ role: membership.role, status: membership.status })) {
    notFound();
  }

  const activeView = searchParams?.view ?? 'profile';
  const statusMeta = getStatusMeta(membership.organization.status);
  const views = [
    { key: 'profile', label: 'Profile' },
    { key: 'locations', label: 'Locations', count: membership.organization.locations.length },
    { key: 'members', label: 'Members', count: membership.organization.memberships.length },
    { key: 'contacts', label: 'Contacts', count: membership.organization.contacts.length },
  ];

  return (
    <div className="space-y-6">
      <div className="space-y-5">
        <div className="-mx-8 -mt-7 mb-7 flex items-center justify-between gap-4 border-b border-[var(--hl-admin-border)] bg-white px-8 py-4">
          <div className="text-sm text-slate-500">
            <span>Workspace</span>
            <span className="mx-2 text-slate-400">/</span>
            <span>Organizations</span>
            <span className="mx-2 text-slate-400">/</span>
            <span className="font-semibold text-slate-700">{membership.organization.name}</span>
          </div>
          <label className="relative hidden md:block">
            <span className="sr-only">Search this workspace</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
            <input
              type="search"
              placeholder="Search this workspace"
              className="h-10 w-[260px] rounded-full border border-slate-200 bg-slate-50 pl-11 pr-4 text-sm text-slate-700 outline-none transition focus:border-[var(--brand-primary)] focus:bg-white focus:ring-4 focus:ring-[rgba(18,67,107,0.12)]"
            />
          </label>
        </div>

        <section className="overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_14px_34px_rgba(15,23,42,0.08)]">
          <div className="h-[7px] bg-[linear-gradient(90deg,var(--brand-accent)_0%,#d8b0b7_28%,var(--brand-primary)_100%)]" />
          <div className="flex items-center justify-between gap-5 px-[18px] py-[15px]">
            <div className="flex min-w-0 items-center gap-3">
              {membership.organization.logoUrl ? (
                <Image
                  src={membership.organization.logoUrl}
                  alt={membership.organization.name}
                  width={44}
                  height={44}
                  className="h-11 w-11 shrink-0 self-center rounded-[10px] border border-slate-200 object-cover"
                />
              ) : (
                <div className="flex h-11 w-11 shrink-0 self-center items-center justify-center rounded-[10px] border border-rose-100 bg-[repeating-linear-gradient(135deg,#fff7f7_0,#fff7f7_8px,#f8ecee_8px,#f8ecee_16px)] text-lg font-semibold text-[var(--brand-accent)]">
                  {membership.organization.name.charAt(0)}
                </div>
              )}
              <h1 className="self-center mb-0 text-xl font-semibold tracking-tight text-slate-800">
                {membership.organization.name}
              </h1>
              <span className={`self-center inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold uppercase tracking-wide ${statusMeta.pill}`}>
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${statusMeta.dot}`} aria-hidden="true" />
                {statusMeta.label}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <Link href={`/organizations/${membership.organization.slug}`} className="btn btn-secondary">
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                View Public Page
              </Link>
              {activeView === 'profile' ? (
                <button type="submit" form="organization-profile-form" className="btn btn-primary">
                  <Save className="h-4 w-4" aria-hidden="true" />
                  Save Changes
                </button>
              ) : null}
            </div>
          </div>
        </section>

        <div className="border-b border-slate-200">
          <div className="flex flex-wrap items-center gap-8 text-[1.02rem]">
            {views.map((view) => {
              const isActive = activeView === view.key;
              const href = `/profile/${params.id}/workspace/organizations/${membership.organization.id}?view=${view.key}`;

              return (
                <Link
                  key={view.key}
                  href={href}
                  className={`relative inline-flex items-center gap-2 pb-4 pt-1 font-medium transition ${
                    isActive ? 'text-[var(--brand-primary)]' : 'text-slate-500 hover:text-slate-700'
                  }`}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span>{view.label}</span>
                  {typeof view.count === 'number' ? (
                    <span className="text-sm font-semibold text-slate-400">{view.count}</span>
                  ) : null}
                  {isActive ? (
                    <span className="absolute inset-x-0 bottom-[-1px] h-[3px] rounded-full bg-[var(--brand-accent)]" aria-hidden="true" />
                  ) : null}
                </Link>
              );
            })}
          </div>
        </div>

        {activeView === 'locations' ? (
            <WorkspaceOrganizationLocationsManager
              profileUserId={params.id}
              organizationId={membership.organization.id}
              initialLocations={membership.organization.locations}
            />
          ) : activeView === 'members' ? (
            <WorkspaceOrganizationMembersManager
              profileUserId={params.id}
              organizationId={membership.organization.id}
              actorRole={membership.role}
              initialMemberships={membership.organization.memberships}
              availableCommunityUsers={membership.organization.community.memberships.map((communityMembership) => communityMembership.user)}
            />
          ) : activeView === 'contacts' ? (
            <WorkspaceOrganizationContactsManager
              profileUserId={params.id}
              organizationId={membership.organization.id}
              initialContacts={membership.organization.contacts}
              locations={membership.organization.locations.map((location) => ({
                id: location.id,
                label: location.label,
                addressLine1: location.addressLine1,
              }))}
              memberships={membership.organization.memberships.filter((organizationMembership) => organizationMembership.status === 'ACTIVE')}
            />
          ) : (
            <WorkspaceOrganizationProfileEditor organization={membership.organization} profileUserId={params.id} />
          )}
      </div>
    </div>
  );
}
