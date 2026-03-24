'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import InternalPageHeader from '@/components/shared/InternalPageHeader';

const SUBCATEGORIES = [
  {
    label: 'Events',
    slug: 'events',
    description: 'Community gatherings, public happenings, and reasons to show up locally.',
    href: '/events',
  },
  {
    label: 'Outdoor Recreation',
    slug: 'outdoor-recreation',
    description: 'Trails, parks, fishing spots, overlooks, and places to get outside.',
    href: '/experiences?category=outdoor-recreation',
  },
  {
    label: 'Sports & Activities',
    slug: 'sports-activities',
    description: 'Pickup games, leagues, fitness, and active ways to spend time nearby.',
    href: '/experiences?category=sports-activities',
  },
  {
    label: 'Classes & Workshops',
    slug: 'classes-workshops',
    description: 'Learning opportunities, skills, demonstrations, and hands-on local sessions.',
    href: '/experiences?category=classes-workshops',
  },
  {
    label: 'Tours & Attractions',
    slug: 'tours-attractions',
    description: 'Places worth visiting, showing someone around, or rediscovering yourself.',
    href: '/experiences?category=tours-attractions',
  },
  {
    label: 'Rentals & Getaways',
    slug: 'rentals-getaways',
    description: 'Cabins, stays, short escapes, and destination-oriented local experiences.',
    href: '/experiences?category=rentals-getaways',
  },
  {
    label: 'Entertainment & Nightlife',
    slug: 'entertainment-nightlife',
    description: 'Live music, performances, evening plans, and places with local energy.',
    href: '/experiences?category=entertainment-nightlife',
  },
  {
    label: 'Seasonal Activities',
    slug: 'seasonal',
    description: 'Holiday events, fairs, weather-driven outings, and recurring local moments.',
    href: '/experiences?category=seasonal',
  },
];

function ExperiencesPageContent() {
  const searchParams = useSearchParams();
  const activeCategory = searchParams.get('category');
  const activeSub = SUBCATEGORIES.find((sub) => sub.slug === activeCategory) ?? null;
  const visibleSubcategories = activeSub ? [activeSub] : SUBCATEGORIES;

  return (
    <div className="space-y-8">
      <InternalPageHeader title="Experiences" titleClassName="text-white" />
      <p className="max-w-3xl text-sm leading-7 text-slate-500">
        Explore things to do around Cambria Heights, from public events and outdoor recreation
        to classes, attractions, and seasonal local activity.
      </p>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/experiences"
          className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
            !activeCategory
              ? 'border border-white/10 bg-slate-950 text-white'
              : 'border border-slate-200 bg-white/80 text-slate-600 shadow-[0_10px_25px_rgba(15,23,42,0.05)] hover:bg-white'
          }`}
        >
          All
        </Link>
        {SUBCATEGORIES.map((sub) => (
          <Link
            key={sub.slug}
            href={`/experiences?category=${sub.slug}`}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              activeCategory === sub.slug
                ? 'border border-white/10 bg-slate-950 text-white'
                : 'border border-slate-200 bg-white/80 text-slate-600 shadow-[0_10px_25px_rgba(15,23,42,0.05)] hover:bg-white'
            }`}
          >
            {sub.label}
          </Link>
        ))}
      </div>

      {activeSub ? (
        <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(160deg,rgba(17,34,52,0.97),rgba(8,20,33,0.97))] p-8 text-white shadow-[0_24px_55px_rgba(7,17,26,0.18)]">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-100/66">
            Experiences
          </p>
          <h2 className="mt-4 text-3xl font-black tracking-[-0.04em]">{activeSub.label}</h2>
          <p className="mt-4 max-w-2xl text-sm leading-7 text-white/72">{activeSub.description}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={activeSub.href}
              className="inline-flex rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 transition hover:opacity-90"
            >
              {activeSub.slug === 'events' ? 'Open Events' : `Browse ${activeSub.label}`}
            </Link>
            <Link
              href="/experiences"
              className="inline-flex rounded-full border border-white/14 bg-white/8 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/12"
            >
              Back to All Experiences
            </Link>
          </div>
        </div>
      ) : null}

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {visibleSubcategories.map((sub) => (
          <article
            key={sub.slug}
            className="rounded-[28px] border border-white/10 bg-white/82 p-6 shadow-[0_18px_42px_rgba(15,23,42,0.08)] backdrop-blur"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8f1d2c]">
              Experiences
            </p>
            <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] text-slate-950">
              {sub.label}
            </h2>
            <p className="mt-3 text-sm leading-7 text-slate-600">{sub.description}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href={sub.href}
                className="inline-flex rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                {sub.slug === 'events' ? 'View Events' : 'Open Category'}
              </Link>
              {activeSub ? null : (
                <Link
                  href={`/experiences?category=${sub.slug}`}
                  className="inline-flex rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-900"
                >
                  Focus View
                </Link>
              )}
            </div>
          </article>
        ))}
      </div>

      {!activeSub ? (
        <div className="rounded-[28px] border border-white/10 bg-white/82 p-6 shadow-[0_18px_42px_rgba(15,23,42,0.08)] backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#8f1d2c]">
            Current State
          </p>
          <h2 className="mt-3 text-2xl font-black tracking-[-0.04em] text-slate-950">
            Experiences is being structured as a broader discovery surface.
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
            The live destination today is Events. The broader Experiences categories are being
            positioned for future listings and discovery flows covering recreation, attractions,
            workshops, entertainment, and seasonal activity without falling back to the old
            placeholder treatment.
          </p>
          <div className="mt-6">
            <Link
              href="/events"
              className="inline-flex rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-[0_10px_25px_rgba(15,23,42,0.08)] transition hover:opacity-90"
            >
              Go to Events
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default function ExperiencesPage() {
  return (
    <Suspense
      fallback={<div className="py-12 text-center text-gray-500">Loading experiences...</div>}
    >
      <ExperiencesPageContent />
    </Suspense>
  );
}
