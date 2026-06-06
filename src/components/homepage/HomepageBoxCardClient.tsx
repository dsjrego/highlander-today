'use client';

import Image from 'next/image';
import { useId, useMemo, useRef, useState } from 'react';
import TrackedLink from '@/components/analytics/TrackedLink';
import UserAvatar from '@/components/shared/UserAvatar';
import { useDialogAccessibility } from '@/components/shared/useDialogAccessibility';
import { trackAnalyticsEvent } from '@/lib/analytics/client';
import type { HomepageBoxData, HomepageContentItem } from '@/lib/homepage';
import { formatLocationPrimary, formatLocationSecondary } from '@/lib/location-format';

type EventModalDetail = {
  id: string;
  title: string;
  description: string | null;
  status: 'PENDING_REVIEW' | 'PUBLISHED' | 'UNPUBLISHED';
  startDatetime: string;
  endDatetime: string | null;
  venueLabel: string | null;
  photoUrl: string | null;
  costText: string | null;
  contactInfo: string | null;
  location: {
    id: string;
    name: string | null;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    state: string;
    postalCode: string | null;
  };
  organization: {
    id: string;
    name: string;
    slug: string;
    status: string;
  };
};

function getBoxBrowseUrl(box: HomepageBoxData) {
  switch (box.boxType) {
    case 'ARTICLES':
      return '/local-life';
    case 'RECIPES':
      return '/recipes';
    case 'EVENTS':
      return '/events';
    case 'MARKETPLACE':
      return '/marketplace';
    case 'MEMORIAM':
      return '/memoriam';
  }
}

function EventHomepageTrigger({
  item,
  className,
  children,
  onOpen,
  placement,
  boxType,
}: {
  item: HomepageContentItem;
  className: string;
  children: React.ReactNode;
  onOpen: (item: HomepageContentItem) => void;
  placement: 'hero' | 'supporting-link';
  boxType: HomepageBoxData['boxType'];
}) {
  return (
    <button
      type="button"
      className={className}
      onClick={() => {
        trackAnalyticsEvent({
          eventName: 'homepage_slot_clicked',
          pageType: 'homepage',
          contentType: item.contentType,
          contentId: item.contentId,
          metadata: { boxType, placement, presentation: 'event-modal' },
        });
        onOpen(item);
      }}
    >
      {children}
    </button>
  );
}

function EventDetailModal({
  event,
  isLoading,
  error,
  onClose,
}: {
  event: EventModalDetail | null;
  isLoading: boolean;
  error: string;
  onClose: () => void;
}) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  useDialogAccessibility({
    isOpen: true,
    onClose,
    containerRef: dialogRef,
    initialFocusRef: closeButtonRef,
  });

  const scheduleText = useMemo(() => {
    if (!event) {
      return '';
    }

    const start = new Date(event.startDatetime);
    const end = event.endDatetime ? new Date(event.endDatetime) : null;
    const startLabel = start.toLocaleString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

    if (!end) {
      return startLabel;
    }

    const sameDay = start.toDateString() === end.toDateString();
    const endLabel = sameDay
      ? end.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
        })
      : end.toLocaleString('en-US', {
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        });

    return `${startLabel} to ${endLabel}`;
  }, [event]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/72 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_32px_80px_rgba(15,23,42,0.28)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 md:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">Event</p>
            <h2 id={titleId} className="mt-2 text-2xl font-black tracking-[-0.03em] text-slate-950">
              {event?.title || 'Loading event...'}
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <div className="max-h-[calc(90vh-5.5rem)] overflow-y-auto">
          {isLoading ? (
            <div className="px-5 py-10 text-sm text-slate-500 md:px-6">Loading event details...</div>
          ) : error ? (
            <div className="px-5 py-10 text-sm text-rose-600 md:px-6">{error}</div>
          ) : event ? (
            <div className="space-y-6 px-5 py-5 md:px-6 md:py-6">
              {event.photoUrl ? (
                <div className="relative h-64 overflow-hidden rounded-[24px] bg-slate-100 md:h-80">
                  <Image src={event.photoUrl} alt={event.title} fill className="object-cover" />
                </div>
              ) : null}

              <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(260px,0.8fr)]">
                <div className="space-y-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">When</p>
                    <p className="mt-2 text-base font-semibold text-slate-900">{scheduleText}</p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Where</p>
                    <p className="mt-2 text-base font-semibold text-slate-900">
                      {formatLocationPrimary(event.location, event.venueLabel)}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">{formatLocationSecondary(event.location)}</p>
                  </div>

                  {event.description ? (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Details</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-slate-700">{event.description}</p>
                    </div>
                  ) : null}
                </div>

                <div className="space-y-4 rounded-[24px] border border-slate-200 bg-slate-50 p-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Hosted By</p>
                    <p className="mt-2 text-base font-semibold text-slate-900">{event.organization.name}</p>
                  </div>

                  {event.costText ? (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Cost</p>
                      <p className="mt-2 text-sm font-semibold text-slate-900">{event.costText}</p>
                    </div>
                  ) : null}

                  {event.contactInfo ? (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Contact</p>
                      <p className="mt-2 text-sm text-slate-700">{event.contactInfo}</p>
                    </div>
                  ) : null}

                  <TrackedLink
                    href={`/events/${event.id}`}
                    className="inline-flex items-center rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-100"
                    pageType="homepage"
                    eventName="cta_clicked"
                    contentType="EVENT"
                    contentId={event.id}
                    metadata={{ cta: 'event-detail-page', presentation: 'event-modal' }}
                  >
                    Open Full Event Page
                  </TrackedLink>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function HomepageBoxCardClient({
  box,
  emphasize = false,
}: {
  box: HomepageBoxData;
  emphasize?: boolean;
}) {
  const [activeEventItem, setActiveEventItem] = useState<HomepageContentItem | null>(null);
  const [activeEvent, setActiveEvent] = useState<EventModalDetail | null>(null);
  const [isLoadingEvent, setIsLoadingEvent] = useState(false);
  const [eventError, setEventError] = useState('');

  if (!box.heroItem) {
    return (
      <section className="homepage-feature-card p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="homepage-feature-label text-xs font-semibold uppercase tracking-[0.28em]">
              {box.title}
            </p>
          </div>
        </div>
      </section>
    );
  }

  const hero = box.heroItem;
  const linkLabel = box.boxType === 'ARTICLES' ? 'More headlines' : `More from ${box.title}`;

  async function openEventModal(item: HomepageContentItem) {
    setActiveEventItem(item);
    setActiveEvent(null);
    setEventError('');
    setIsLoadingEvent(true);

    try {
      const response = await fetch(`/api/events/${item.contentId}`, {
        credentials: 'same-origin',
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error((data as { error?: string }).error || 'Failed to load event details');
      }

      setActiveEvent(data as EventModalDetail);
    } catch (error) {
      setEventError(error instanceof Error ? error.message : 'Failed to load event details');
    } finally {
      setIsLoadingEvent(false);
    }
  }

  function closeEventModal() {
    setActiveEventItem(null);
    setActiveEvent(null);
    setEventError('');
    setIsLoadingEvent(false);
  }

  const heroContent = (
    <>
      {hero.imageUrl ? (
        <div
          className={`homepage-feature-media-cover relative w-full overflow-hidden ${
            emphasize ? 'h-72 md:h-[24rem]' : 'h-56'
          }`}
        >
          <Image
            src={hero.imageUrl}
            alt={hero.title}
            fill
            className="object-cover transition duration-300 group-hover:scale-[1.02]"
          />
        </div>
      ) : null}
      <div className="p-5 md:p-6">
        {hero.metadata ? (
          <p className="homepage-feature-meta text-[11px] font-semibold uppercase tracking-[0.18em]">
            {hero.metadata}
          </p>
        ) : null}
        <h2 className={`homepage-feature-title mt-2 font-bold leading-tight ${emphasize ? 'text-3xl' : 'text-2xl'}`}>
          {hero.title}
        </h2>
        {hero.description ? (
          <p className="homepage-feature-description mt-3 text-sm leading-7 md:text-[15px]">
            {hero.description}
          </p>
        ) : null}
        {hero.author ? (
          <div className="mt-4 flex items-center gap-3">
            <UserAvatar
              firstName={hero.author.firstName}
              lastName={hero.author.lastName}
              profilePhotoUrl={hero.author.profilePhotoUrl}
              trustLevel={hero.author.trustLevel}
              className="h-10 w-10"
              initialsClassName="homepage-feature-avatar text-sm"
            />
            <p className="homepage-feature-author text-sm font-semibold">
              {hero.author.firstName} {hero.author.lastName}
            </p>
          </div>
        ) : null}
      </div>
    </>
  );

  return (
    <>
      <section
        className={`homepage-feature-card ${
          emphasize ? 'xl:col-span-2' : ''
        }`}
      >
        <div className="homepage-box-header flex items-center justify-between gap-3 px-5 py-4 md:px-6">
          <div>
            <p className="homepage-feature-label text-xs font-semibold uppercase tracking-[0.28em]">
              {box.title}
            </p>
          </div>
          <TrackedLink
            href={getBoxBrowseUrl(box)}
            className="homepage-box-browse-link text-sm font-semibold transition"
            pageType="homepage"
            eventName="cta_clicked"
            metadata={{ boxType: box.boxType, cta: 'view-all' }}
          >
            View all
          </TrackedLink>
        </div>

        <div className={`grid grid-cols-1 ${emphasize ? 'lg:grid-cols-[1.1fr_0.9fr]' : ''}`}>
          {hero.contentType === 'EVENT' ? (
            <EventHomepageTrigger
              item={hero}
              className="group block text-left no-underline transition hover:no-underline lg:border-b-0"
              onOpen={openEventModal}
              placement="hero"
              boxType={box.boxType}
            >
              {heroContent}
            </EventHomepageTrigger>
          ) : (
            <TrackedLink
              href={hero.url}
              className="group block no-underline transition hover:no-underline lg:border-b-0"
              pageType="homepage"
              eventName="homepage_slot_clicked"
              contentType={hero.contentType}
              contentId={hero.contentId}
              metadata={{ boxType: box.boxType, placement: 'hero' }}
            >
              {heroContent}
            </TrackedLink>
          )}

          <div className={`${emphasize ? 'homepage-feature-divider lg:border-l' : ''} p-5 md:p-6`}>
            {box.linkItems.length > 0 ? (
              <>
                <p className="homepage-latest-label text-xs font-semibold uppercase tracking-[0.22em]">
                  {linkLabel}
                </p>
                <ul className="homepage-latest-list mt-4 space-y-3">
                  {box.linkItems.map((item) => (
                    <li key={`${item.contentType}-${item.contentId}`} className="homepage-latest-item pb-3 last:pb-0">
                      {item.contentType === 'EVENT' ? (
                        <EventHomepageTrigger
                          item={item}
                          className="flex w-full items-start gap-3 text-left no-underline transition hover:no-underline"
                          onOpen={openEventModal}
                          placement="supporting-link"
                          boxType={box.boxType}
                        >
                          <div className="homepage-support-thumb relative h-12 w-12 shrink-0 overflow-hidden rounded-xl">
                            {item.imageUrl ? (
                              <Image
                                src={item.imageUrl}
                                alt={item.title}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="homepage-support-thumb-placeholder flex h-full w-full items-center justify-center text-[10px] font-semibold uppercase tracking-[0.18em]">
                                Item
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="homepage-latest-link text-sm font-semibold leading-6 transition">
                              {item.title}
                            </p>
                            {item.metadata ? (
                              <p className="homepage-support-meta mt-0.5 text-xs font-medium">
                                • {item.metadata.split(' • ').at(-1)}
                              </p>
                            ) : null}
                          </div>
                        </EventHomepageTrigger>
                      ) : (
                        <TrackedLink
                          href={item.url}
                          className="flex items-start gap-3 no-underline transition hover:no-underline"
                          pageType="homepage"
                          eventName="homepage_slot_clicked"
                          contentType={item.contentType}
                          contentId={item.contentId}
                          metadata={{
                            boxType: box.boxType,
                            placement: 'supporting-link',
                          }}
                        >
                          <div className="homepage-support-thumb relative h-12 w-12 shrink-0 overflow-hidden rounded-xl">
                            {item.imageUrl ? (
                              <Image
                                src={item.imageUrl}
                                alt={item.title}
                                fill
                                className="object-cover"
                              />
                            ) : (
                              <div className="homepage-support-thumb-placeholder flex h-full w-full items-center justify-center text-[10px] font-semibold uppercase tracking-[0.18em]">
                                {item.contentType === 'ARTICLE' ? 'News' : 'Item'}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="homepage-latest-link text-sm font-semibold leading-6 transition">
                              {item.title}
                            </p>
                            {item.metadata ? (
                              <p className="homepage-support-meta mt-0.5 text-xs font-medium">
                                • {item.metadata.split(' • ').at(-1)}
                              </p>
                            ) : null}
                          </div>
                        </TrackedLink>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>
        </div>
      </section>

      {activeEventItem ? (
        <EventDetailModal
          event={activeEvent}
          isLoading={isLoadingEvent}
          error={eventError}
          onClose={closeEventModal}
        />
      ) : null}
    </>
  );
}
