import Link from 'next/link';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getCurrentCommunity } from '@/lib/community';
import { db } from '@/lib/db';
import type { EventSeriesCadence } from '@/lib/event-series';
import { formatLocationPrimary, formatLocationSecondary } from '@/lib/location-format';
import { checkPermission } from '@/lib/permissions';
import AdminEventEditor from './AdminEventEditor';

interface AdminEventDetailPageProps {
  params: {
    id: string;
  };
}

function formatLongDateTime(value: Date | null) {
  if (!value) {
    return 'Not set';
  }

  return value.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'PUBLISHED':
      return 'Approved';
    case 'UNPUBLISHED':
      return 'Archived';
    default:
      return 'Pending Review';
  }
}

function getStatusClasses(status: string) {
  switch (status) {
    case 'PUBLISHED':
      return 'bg-green-100 text-green-800';
    case 'UNPUBLISHED':
      return 'bg-slate-200 text-slate-700';
    default:
      return 'bg-yellow-100 text-yellow-800';
  }
}

export default async function AdminEventDetailPage({
  params,
}: AdminEventDetailPageProps) {
  const session = await getServerSession(authOptions);
  const userRole = session?.user?.role || '';

  if (!checkPermission(userRole, 'events:approve')) {
    redirect('/');
  }

  const currentCommunity = await getCurrentCommunity({ headers: headers() });

  const event = await db.event.findUnique({
    where: { id: params.id },
    include: {
      community: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
      submittedBy: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          profilePhotoUrl: true,
          trustLevel: true,
        },
      },
      location: {
        select: {
          id: true,
          name: true,
          addressLine1: true,
          addressLine2: true,
          city: true,
          state: true,
          postalCode: true,
        },
      },
      series: {
        select: {
          id: true,
          title: true,
          summary: true,
          cadenceLabel: true,
          occurrenceCount: true,
          events: {
            orderBy: { startDatetime: 'asc' },
            select: {
              id: true,
              startDatetime: true,
              seriesPosition: true,
              seriesCount: true,
            },
          },
        },
      },
    },
  });

  if (!event) {
    notFound();
  }

  if (currentCommunity && event.communityId !== currentCommunity.id) {
    notFound();
  }

  const locations = await db.location.findMany({
    where: { communityId: event.communityId },
    orderBy: [{ name: 'asc' }, { addressLine1: 'asc' }],
    select: {
      id: true,
      name: true,
      addressLine1: true,
      addressLine2: true,
      city: true,
      state: true,
      postalCode: true,
    },
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <Link
            href="/admin/events"
            className="text-sm font-medium text-[var(--brand-primary)] transition hover:text-[var(--brand-accent)]"
          >
            Back to events
          </Link>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold text-slate-900">{event.title}</h1>
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClasses(event.status)}`}>
              {getStatusLabel(event.status)}
            </span>
          </div>
          <p className="mt-2 text-sm text-slate-500">
            {event.community.name}
            {event.location ? ` • ${formatLocationPrimary(event.location, event.venueLabel)}` : ''}
          </p>
        </div>

        {event.status === 'PUBLISHED' ? (
          <Link
            href={`/events/${event.id}`}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-400 hover:bg-slate-50"
          >
            View Public Page
          </Link>
        ) : null}
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Submitted By</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">
            {event.submittedBy.firstName} {event.submittedBy.lastName}
          </p>
          <p className="mt-1 text-xs text-slate-500">{event.submittedBy.trustLevel}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Start</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">{formatLongDateTime(event.startDatetime)}</p>
          <p className="mt-1 text-xs text-slate-500">
            {event.endDatetime ? `Ends ${formatLongDateTime(event.endDatetime)}` : 'No end time set'}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Created</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">{formatLongDateTime(event.createdAt)}</p>
          <p className="mt-1 text-xs text-slate-500">Updated {formatLongDateTime(event.updatedAt)}</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Contact</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">{event.contactInfo || 'Not provided'}</p>
          <p className="mt-1 text-xs text-slate-500">{event.costText || 'No cost details'}</p>
        </div>
      </section>

      <AdminEventEditor
        event={{
          id: event.id,
          title: event.title,
          description: event.description,
          startDatetime: event.startDatetime.toISOString(),
          endDatetime: event.endDatetime ? event.endDatetime.toISOString() : null,
          venueLabel: event.venueLabel,
          photoUrl: event.photoUrl,
          costText: event.costText,
          contactInfo: event.contactInfo,
          status: event.status,
          seriesId: event.seriesId,
          seriesPosition: event.seriesPosition,
          seriesCount: event.seriesCount,
          recurrenceCadence: (event.series?.cadenceLabel as EventSeriesCadence | null) ?? null,
          locationId: event.locationId,
        }}
        locations={locations}
      />

      <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Event Summary</p>
        </div>
        <div className="space-y-6 px-6 py-5">
          {event.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={event.photoUrl}
              alt={event.title}
              className="h-auto max-h-[360px] w-full rounded-xl object-cover"
            />
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Location</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                {formatLocationPrimary(event.location, event.venueLabel)}
              </p>
              <p className="mt-1 text-xs text-slate-500">{formatLocationSecondary(event.location)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Recurrence</p>
              <p className="mt-2 text-sm leading-6 text-slate-700">
                {event.isRecurring ? event.recurrenceRule || 'Recurring event' : 'One-time event'}
              </p>
              {event.seriesPosition && event.seriesCount ? (
                <p className="mt-1 text-xs text-slate-500">
                  Session {event.seriesPosition} of {event.seriesCount}
                </p>
              ) : null}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Description</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">
              {event.description || 'No description provided.'}
            </p>
          </div>

          {event.series?.events.length ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">Series Sessions</p>
              <div className="mt-3 space-y-2">
                {event.series.events.map((entry) => (
                  <Link
                    key={entry.id}
                    href={`/admin/events/${entry.id}`}
                    className={`block rounded-xl border px-4 py-3 text-sm ${
                      entry.id === event.id
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <div className="font-semibold">
                      Session {entry.seriesPosition} of {entry.seriesCount}
                    </div>
                    <div className={entry.id === event.id ? 'text-white/70' : 'text-slate-500'}>
                      {formatLongDateTime(entry.startDatetime)}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
