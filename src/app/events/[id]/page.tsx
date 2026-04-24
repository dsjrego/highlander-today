/* eslint-disable @next/next/no-img-element */

'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import TrackedLink from '@/components/analytics/TrackedLink';
import { trackAnalyticsEvent } from '@/lib/analytics/client';
import { formatLocationPrimary, formatLocationSecondary } from '@/lib/location-format';

interface EventDetail {
  id: string;
  title: string;
  description: string | null;
  status: string;
  startDatetime: string;
  endDatetime: string | null;
  seriesPosition: number | null;
  seriesCount: number | null;
  venueLabel: string | null;
  series: {
    id: string;
    title: string;
    summary: string | null;
    cadenceLabel: string;
    occurrenceCount: number;
    events: Array<{
      id: string;
      title: string;
      startDatetime: string;
      endDatetime: string | null;
      seriesPosition: number | null;
      seriesCount: number | null;
    }>;
  } | null;
  location: {
    id: string;
    name: string | null;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    state: string;
    postalCode: string | null;
  };
  costText: string | null;
  contactInfo: string | null;
  photoUrl: string | null;
  organization: {
    id: string;
    name: string;
    slug: string;
    status: string;
  };
  submittedBy: {
    id: string;
    firstName: string;
    lastName: string;
    profilePhotoUrl: string | null;
    bio: string | null;
    trustLevel: string;
  };
}

export default function EventDetailPage() {
  const params = useParams();
  const eventId = params.id as string;

  const [event, setEvent] = useState<EventDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function fetchEvent() {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/events/${eventId}`);
        if (res.ok) {
          const data = await res.json();
          setEvent(data);
        } else if (res.status === 404) {
          setNotFound(true);
        }
      } catch (err) {
        console.error('Failed to fetch event:', err);
      } finally {
        setIsLoading(false);
      }
    }

    if (eventId) fetchEvent();
  }, [eventId]);

  useEffect(() => {
    if (!event || event.status !== 'PUBLISHED') {
      return;
    }

    trackAnalyticsEvent({
      eventName: 'page_view',
      contentType: 'EVENT',
      contentId: event.id,
      pageType: 'event-detail',
    });
    trackAnalyticsEvent({
      eventName: 'content_open',
      contentType: 'EVENT',
      contentId: event.id,
      pageType: 'event-detail',
      metadata: {
        organizationId: event.organization.id,
        seriesId: event.series?.id ?? null,
      },
    });
  }, [event]);

  if (isLoading) {
    return <div className="rounded-[28px] border border-white/10 bg-white/70 px-6 py-20 text-center text-slate-500 shadow-[0_18px_42px_rgba(15,23,42,0.08)]">Loading event...</div>;
  }

  if (notFound || !event) {
    return (
      <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(160deg,rgba(17,34,52,0.97),rgba(8,20,33,0.97))] py-20 text-center text-white shadow-[0_24px_55px_rgba(7,17,26,0.18)]">
        <p className="mb-4 text-xs font-semibold uppercase tracking-[0.32em] text-cyan-100/66">Events</p>
        <h1 className="mb-2 text-2xl font-bold text-white">Event Not Found</h1>
        <p className="mb-6 text-white/70">This event may have been removed or is not yet published.</p>
        <Link
          href="/events"
          className="inline-block rounded-full bg-white px-6 py-3 font-semibold text-slate-950 transition hover:opacity-90"
        >
          Back to Events
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {event.status !== 'PUBLISHED' && (
        <div className={`rounded-2xl p-3 text-sm font-medium ${
          event.status === 'PENDING_REVIEW'
            ? 'bg-yellow-50 text-yellow-700 border border-yellow-200'
            : 'bg-gray-100 text-gray-700'
        }`}>
          {event.status === 'PENDING_REVIEW'
            ? 'This event is pending editor review.'
            : 'This event is unpublished and visible only to you or moderators.'}
        </div>
      )}

      <div className="flex items-center gap-2 text-sm text-slate-400">
        <Link href="/events" className="transition-colors hover:text-[var(--brand-accent)]">
          Events
        </Link>
        <span>/</span>
        <span>{event.title}</span>
      </div>

      <section className="overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(145deg,rgba(143,29,44,0.96),rgba(10,32,51,0.94))] px-6 py-8 text-white shadow-[0_35px_80px_rgba(7,17,26,0.22)] md:px-10 md:py-10">
        <div className="max-w-4xl">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-100/72">Event Details</p>
          <h1 className="mt-4 text-4xl font-black leading-[0.95] tracking-[-0.05em] md:text-6xl">{event.title}</h1>
          <p className="mt-5 max-w-3xl text-base leading-8 text-white/78 md:text-lg">
            {new Date(event.startDatetime).toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </p>
          <div className="mt-6 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-white/12 text-sm font-semibold text-white/78">
              {event.organization.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              {event.organization.status === 'APPROVED' ? (
                <TrackedLink
                  href={`/organizations/${event.organization.slug}`}
                  className="text-sm font-semibold text-white transition-colors hover:text-cyan-200"
                  pageType="event-detail"
                  eventName="cta_clicked"
                  contentType="EVENT"
                  contentId={event.id}
                  metadata={{ cta: 'organization-profile', organizationId: event.organization.id }}
                >
                  {event.organization.name}
                </TrackedLink>
              ) : (
                <p className="text-sm font-semibold text-white">{event.organization.name}</p>
              )}
              <p className="text-xs text-white/60">Organizer</p>
            </div>
          </div>
        </div>
      </section>

      {event.photoUrl && (
        <div className="overflow-hidden rounded-[28px] border border-white/10 shadow-[0_24px_55px_rgba(7,17,26,0.14)]">
          <img src={event.photoUrl} alt={event.title} className="w-full h-auto" />
        </div>
      )}

      <div className="grid gap-4 rounded-[28px] border border-white/10 bg-white/82 p-6 shadow-[0_18px_42px_rgba(15,23,42,0.08)] backdrop-blur">
        {event.seriesCount ? (
          <div>
            <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-500">Series</h2>
            <p className="text-slate-800">
              Session {event.seriesPosition} of {event.seriesCount}
              {event.series?.summary ? ` • ${event.series.summary}` : ""}
            </p>
          </div>
        ) : null}
        <div>
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-500">When</h2>
          <p className="text-slate-800">
            {new Date(event.startDatetime).toLocaleString()}
            {event.endDatetime && ` to ${new Date(event.endDatetime).toLocaleString()}`}
          </p>
        </div>
        <div>
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-500">Where</h2>
          <p className="text-slate-800">{formatLocationPrimary(event.location, event.venueLabel)}</p>
          <p className="text-sm text-slate-500">{formatLocationSecondary(event.location)}</p>
        </div>
        {event.costText && (
          <div>
            <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-500">Cost</h2>
            <p className="text-slate-800">{event.costText}</p>
          </div>
        )}
        {event.contactInfo && (
          <div>
            <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-slate-500">Contact</h2>
            <p className="text-slate-800">{event.contactInfo}</p>
          </div>
        )}
      </div>

      {event.description && (
        <div className="prose prose-lg max-w-none rounded-[28px] border border-white/10 bg-white/82 p-6 shadow-[0_18px_42px_rgba(15,23,42,0.08)] backdrop-blur prose-p:text-slate-700">
          <p>{event.description}</p>
        </div>
      )}

      {event.series?.events.length ? (
        <div className="rounded-[28px] border border-white/10 bg-white/82 p-6 shadow-[0_18px_42px_rgba(15,23,42,0.08)] backdrop-blur">
          <h3 className="mb-4 text-lg font-bold text-slate-950">Series Sessions</h3>
          <div className="space-y-3">
            {event.series.events.map((entry) => (
              <TrackedLink
                key={entry.id}
                href={`/events/${entry.id}`}
                className={`block rounded-2xl border px-4 py-3 text-sm transition ${
                  entry.id === event.id
                    ? "border-slate-950 bg-slate-950 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                }`}
                pageType="event-detail"
                eventName="cta_clicked"
                contentType="EVENT"
                contentId={event.id}
                metadata={{ cta: 'series-session', targetEventId: entry.id }}
              >
                <div className="font-semibold">
                  Session {entry.seriesPosition} of {entry.seriesCount}
                </div>
                <div className={entry.id === event.id ? "text-white/80" : "text-slate-500"}>
                  {new Date(entry.startDatetime).toLocaleString()}
                </div>
              </TrackedLink>
            ))}
          </div>
        </div>
      ) : null}

      {event.submittedBy.bio && (
        <div className="rounded-[26px] border border-white/10 bg-[linear-gradient(160deg,rgba(17,34,52,0.97),rgba(8,20,33,0.97))] p-5 text-white shadow-[0_24px_55px_rgba(7,17,26,0.18)]">
          <h3 className="mb-2 text-sm font-semibold text-cyan-100/70">Submitted By</h3>
          <p className="text-sm text-white/70">{event.submittedBy.bio}</p>
        </div>
      )}
    </div>
  );
}
