/* eslint-disable @next/next/no-img-element */

import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import { Building2, Globe, Mail, Phone } from 'lucide-react';
import InternalPageHeader from '@/components/shared/InternalPageHeader';
import { getCurrentCommunity } from '@/lib/community';
import {
  buildOrganizationMetadataDescription,
  formatOrganizationTypeLabel,
  getPublicOrganizationProfile,
} from '@/lib/organizations';
import { formatLocationPrimary, formatLocationSecondary } from '@/lib/location-format';
import { sanitizeArticleHtml, stripHtmlToText } from '@/lib/sanitize';

interface PageProps {
  params: {
    slug: string;
  };
}

function formatEventDateRange(startDatetime: Date, endDatetime: Date | null) {
  const start = new Date(startDatetime);
  const end = endDatetime ? new Date(endDatetime) : null;

  const startLabel = start.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });

  if (!end) {
    return startLabel;
  }

  const sameDay = start.toDateString() === end.toDateString();
  const endLabel = end.toLocaleString('en-US', {
    ...(sameDay
      ? {
          hour: 'numeric',
          minute: '2-digit',
        }
      : {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        }),
  });

  return `${startLabel} - ${endLabel}`;
}

function formatMembershipLabel(role: string, title: string | null) {
  if (title?.trim()) {
    return title.trim();
  }

  return formatOrganizationTypeLabel(role);
}

function formatOrganizationLocationPrimary(location: {
  label: string | null;
  addressLine1: string | null;
}) {
  return location.label || location.addressLine1 || 'Location';
}

function formatOrganizationLocationSecondary(location: {
  addressLine1: string | null;
  city: string | null;
  state: string | null;
  postalCode?: string | null;
}) {
  const cityState = [location.city, location.state].filter(Boolean).join(', ');

  return [location.addressLine1, cityState, location.postalCode].filter(Boolean).join(' • ');
}

function InfoCard({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[26px] border border-white/10 bg-white/82 p-6 shadow-[0_18px_42px_rgba(15,23,42,0.08)] backdrop-blur">
      <h2 className="text-xl font-bold text-slate-950">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const requestHeaders = headers();
  const currentCommunity = await getCurrentCommunity({ headers: requestHeaders });

  if (!currentCommunity) {
    return {
      title: 'Organization',
      description: 'Organization profile on Highlander Today.',
    };
  }

  const organization = await getPublicOrganizationProfile({
    communityId: currentCommunity.id,
    slug: params.slug,
  });

  if (!organization) {
    return {
      title: 'Organization',
      description: 'Organization profile on Highlander Today.',
    };
  }

  return {
    title: `${organization.name} | Highlander Today`,
    description: buildOrganizationMetadataDescription(organization.description, organization.name),
    alternates: {
      canonical: `/organizations/${organization.slug}`,
    },
  };
}

export default async function OrganizationProfilePage({ params }: PageProps) {
  const requestHeaders = headers();
  const currentCommunity = await getCurrentCommunity({ headers: requestHeaders });

  if (!currentCommunity) {
    notFound();
  }

  const organization = await getPublicOrganizationProfile({
    communityId: currentCommunity.id,
    slug: params.slug,
  });

  if (!organization) {
    notFound();
  }

  const roster = organization.isPublicMemberRoster ? organization.memberships : [];
  const typeLabel = formatOrganizationTypeLabel(organization.organizationType);
  const groupLabel = formatOrganizationTypeLabel(organization.directoryGroup);
  const descriptionHtml = organization.description ? sanitizeArticleHtml(organization.description) : '';
  const descriptionText = descriptionHtml ? stripHtmlToText(descriptionHtml) : '';

  return (
    <div className="space-y-6">
      <InternalPageHeader
        icon={<Building2 className="h-5 w-5" />}
        label={groupLabel}
        title={organization.name}
        description={descriptionText || `${typeLabel} in ${organization.community.name}.`}
      />

      {organization.bannerUrl ? (
        <section className="overflow-hidden rounded-[28px] border border-white/10 bg-white/70 shadow-[0_18px_42px_rgba(15,23,42,0.08)]">
          {/* Banner image keeps the page visually anchored until richer org-site shells arrive. */}
          <img src={organization.bannerUrl} alt={organization.name} className="h-48 w-full object-cover md:h-64" />
        </section>
      ) : null}

      <section className="rounded-[28px] border border-white/10 bg-[linear-gradient(155deg,rgba(15,23,42,0.97),rgba(19,43,68,0.96))] p-6 text-white shadow-[0_24px_55px_rgba(7,17,26,0.18)]">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="flex items-start gap-4">
            {organization.logoUrl ? (
              <img
                src={organization.logoUrl}
                alt={organization.name}
                className="h-20 w-20 rounded-2xl border border-white/12 bg-white/10 object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-white/12 bg-white/10">
                <Building2 className="h-8 w-8 text-white/80" />
              </div>
            )}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-white/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-100/88">
                  {groupLabel}
                </span>
                <span className="rounded-full bg-white/8 px-3 py-1 text-xs font-semibold text-white/80">{typeLabel}</span>
              </div>
              <h1 className="text-3xl font-black tracking-[-0.03em] text-white">{organization.name}</h1>
              {descriptionHtml ? (
                <div
                  className="prose prose-sm max-w-3xl text-white prose-headings:text-white prose-p:text-white/74 prose-strong:text-white prose-li:text-white/74 prose-a:text-cyan-200"
                  dangerouslySetInnerHTML={{ __html: descriptionHtml }}
                />
              ) : (
                <p className="max-w-3xl text-sm leading-7 text-white/74">
                  {`${organization.name} is listed on Highlander Today.`}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-2 text-sm text-white/82">
            {organization.websiteUrl ? (
              <a
                href={organization.websiteUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-4 py-2 font-semibold text-white transition hover:bg-white/14"
              >
                <Globe className="h-4 w-4" />
                Website
              </a>
            ) : null}
            {organization.contactEmail ? (
              <a
                href={`mailto:${organization.contactEmail}`}
                className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-4 py-2 font-semibold text-white transition hover:bg-white/14"
              >
                <Mail className="h-4 w-4" />
                Email
              </a>
            ) : null}
            {organization.contactPhone ? (
              <a
                href={`tel:${organization.contactPhone}`}
                className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-4 py-2 font-semibold text-white transition hover:bg-white/14"
              >
                <Phone className="h-4 w-4" />
                Call
              </a>
            ) : null}
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)]">
        <div className="space-y-6">
          <InfoCard title="About">
            {descriptionHtml ? (
              <div
                className="prose prose-sm max-w-none prose-headings:text-slate-950 prose-p:text-slate-700 prose-li:text-slate-700 prose-a:text-[#8f1d2c]"
                dangerouslySetInnerHTML={{ __html: descriptionHtml }}
              />
            ) : (
              <p className="text-sm leading-7 text-slate-700">No public description has been added yet.</p>
            )}
          </InfoCard>

          {organization.departments.length > 0 ? (
            <InfoCard title="Departments">
              <div className="space-y-4">
                {organization.departments.map((department) => (
                  <div key={department.id} className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-slate-950">{department.name}</h3>
                        {department.description ? (
                          <p className="mt-1 text-sm leading-6 text-slate-600">{department.description}</p>
                        ) : null}
                      </div>
                      {department.location ? (
                        <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                          {formatOrganizationLocationPrimary(department.location)}
                        </p>
                      ) : null}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-600">
                      {department.contactEmail ? <span>{department.contactEmail}</span> : null}
                      {department.contactPhone ? <span>{department.contactPhone}</span> : null}
                      {department.websiteUrl ? (
                        <a href={department.websiteUrl} target="_blank" rel="noreferrer" className="font-semibold text-[#0f5771] hover:underline">
                          Department site
                        </a>
                      ) : null}
                      {department.hoursSummary ? <span>{department.hoursSummary}</span> : null}
                    </div>
                  </div>
                ))}
              </div>
            </InfoCard>
          ) : null}

          {organization.contacts.length > 0 ? (
            <InfoCard title="Contacts">
              <div className="space-y-4">
                {organization.contacts.map((contact) => (
                  <div key={contact.id} className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-slate-950">
                          {contact.name?.trim() || contact.label?.trim() || 'Public contact'}
                        </h3>
                        {contact.title ? <p className="mt-1 text-sm text-slate-600">{contact.title}</p> : null}
                      </div>
                      {contact.department ? (
                        <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-500">
                          {contact.department.name}
                        </p>
                      ) : null}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-600">
                      {contact.email ? <a href={`mailto:${contact.email}`} className="hover:underline">{contact.email}</a> : null}
                      {contact.phone ? <a href={`tel:${contact.phone}`} className="hover:underline">{contact.phone}</a> : null}
                      {contact.websiteUrl ? (
                        <a href={contact.websiteUrl} target="_blank" rel="noreferrer" className="font-semibold text-[#0f5771] hover:underline">
                          Visit
                        </a>
                      ) : null}
                      {contact.location ? <span>{formatOrganizationLocationPrimary(contact.location)}</span> : null}
                    </div>
                  </div>
                ))}
              </div>
            </InfoCard>
          ) : null}

          {organization.events.length > 0 ? (
            <InfoCard title="Upcoming Events">
              <div className="space-y-4">
                {organization.events.map((event) => (
                  <div key={event.id} className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Link href={`/events/${event.id}`} className="text-base font-semibold text-slate-950 hover:underline">
                          {event.title}
                        </Link>
                        {event.description ? (
                          <p className="mt-1 text-sm leading-6 text-slate-600">{event.description}</p>
                        ) : null}
                      </div>
                      <span className="rounded-full bg-[#8f1d2c] px-3 py-1 text-xs font-semibold text-white">
                        {new Date(event.startDatetime).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                      </span>
                    </div>
                    <div className="mt-3 space-y-1 text-sm text-slate-600">
                      <p>{formatEventDateRange(event.startDatetime, event.endDatetime)}</p>
                      <p>{formatLocationPrimary(event.location, event.venueLabel)}</p>
                      <p>{formatLocationSecondary(event.location)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </InfoCard>
          ) : null}
        </div>

        <div className="space-y-6">
          <InfoCard title="Contact">
            <div className="space-y-3 text-sm text-slate-700">
              {organization.websiteUrl ? (
                <a href={organization.websiteUrl} target="_blank" rel="noreferrer" className="flex items-start gap-3 hover:text-slate-950">
                  <Globe className="mt-0.5 h-4 w-4 text-[#0f5771]" />
                  <span className="break-all">{organization.websiteUrl}</span>
                </a>
              ) : null}
              {organization.contactEmail ? (
                <a href={`mailto:${organization.contactEmail}`} className="flex items-start gap-3 hover:text-slate-950">
                  <Mail className="mt-0.5 h-4 w-4 text-[#0f5771]" />
                  <span className="break-all">{organization.contactEmail}</span>
                </a>
              ) : null}
              {organization.contactPhone ? (
                <a href={`tel:${organization.contactPhone}`} className="flex items-start gap-3 hover:text-slate-950">
                  <Phone className="mt-0.5 h-4 w-4 text-[#0f5771]" />
                  <span>{organization.contactPhone}</span>
                </a>
              ) : null}
              {!organization.websiteUrl && !organization.contactEmail && !organization.contactPhone ? (
                <p>No public contact details have been added yet.</p>
              ) : null}
            </div>
          </InfoCard>

          {organization.locations.length > 0 ? (
            <InfoCard title="Locations">
              <div className="space-y-4">
                {organization.locations.map((location) => (
                  <div key={location.id} className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <h3 className="text-base font-semibold text-slate-950">
                          {formatOrganizationLocationPrimary(location)}
                        </h3>
                        <p className="text-sm leading-6 text-slate-600">{formatOrganizationLocationSecondary(location)}</p>
                      </div>
                      {location.isPrimary ? (
                        <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-semibold text-white">Primary</span>
                      ) : null}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-600">
                      {location.municipality ? <span>{location.municipality}</span> : null}
                      {location.hoursSummary ? <span>{location.hoursSummary}</span> : null}
                      {location.contactEmail ? <a href={`mailto:${location.contactEmail}`} className="hover:underline">{location.contactEmail}</a> : null}
                      {location.contactPhone ? <a href={`tel:${location.contactPhone}`} className="hover:underline">{location.contactPhone}</a> : null}
                      {location.websiteUrl ? (
                        <a href={location.websiteUrl} target="_blank" rel="noreferrer" className="font-semibold text-[#0f5771] hover:underline">
                          Visit site
                        </a>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </InfoCard>
          ) : null}

          {roster.length > 0 ? (
            <InfoCard title="People">
              <div className="space-y-4">
                {roster.map((membership) => (
                  <div key={membership.id} className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Link href={`/profile/${membership.user.id}`} className="text-base font-semibold text-slate-950 hover:underline">
                          {membership.user.firstName} {membership.user.lastName}
                        </Link>
                        <p className="mt-1 text-sm text-slate-600">
                          {formatMembershipLabel(membership.role, membership.title)}
                        </p>
                      </div>
                      {membership.isPrimaryContact ? (
                        <span className="rounded-full bg-[#0f5771] px-3 py-1 text-xs font-semibold text-white">Primary contact</span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </InfoCard>
          ) : null}
        </div>
      </div>
    </div>
  );
}
