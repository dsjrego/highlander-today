import type { Metadata } from 'next';
import Link from 'next/link';
import { ABOUT_ROADMAP_STAGES } from '@/lib/about';

export const metadata: Metadata = {
  title: 'About Roadmap | Highlander Today',
  description:
    'See what Highlander Today has already built, what is active now, and what is likely next.',
};

const SHIPPED_AREAS = [
  'Local Life publishing and moderation',
  'Events and Experiences entry points',
  'Store-based marketplace discovery and seller workflows',
  'Help Wanted posting, moderation, and trusted responder messaging',
  'Community roadmap voting and bounded domain-specific weighting',
  'Private messaging, trust progression, and audit logging',
];

const CURRENT_FOCUS = [
  'Give Highlander Today a stable public institutional voice through About',
  'Explain the mission and technology-as-infrastructure philosophy in plain language',
  'Create a Journal surface for future public product notes and essays',
];

const LATER_EXPLORATION = [
  'Richer About publishing and archival structure',
  'Article video embeds inside the active editorial flow',
  'Delivery and jobs infrastructure only after current loops are stable',
];

export default function AboutRoadmapPage() {
  return (
    <div className="space-y-8">
      <section className="rounded-[28px] border border-gray-200 bg-white p-8 shadow-sm md:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#A51E30]">
          Roadmap
        </p>
        <h1 className="mt-3 border-b-2 border-[#A51E30] pb-4 text-4xl font-bold text-gray-900">
          Build complete local interaction loops first, then expand carefully.
        </h1>
        <p className="mt-6 text-base leading-8 text-gray-700">
          The platform sequencing is intentional. Highlander Today is prioritizing durable local
          loops before broader commerce or logistics systems. That means proving content,
          discovery, messaging, opportunity, and trust before moving into more operationally heavy
          product categories.
        </p>
      </section>

      <section className="space-y-4">
        {ABOUT_ROADMAP_STAGES.map((stage) => (
          <article
            key={stage.title}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <h2 className="text-2xl font-bold text-gray-900">{stage.title}</h2>
              <span className="inline-flex w-fit rounded-full bg-[#A51E30] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                {stage.status}
              </span>
            </div>
            <p className="mt-3 text-sm leading-7 text-gray-700">{stage.body}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Shipped foundation</h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-gray-700">
            {SHIPPED_AREAS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-[#46A8CC]/30 bg-[#46A8CC]/10 p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Current focus</h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-gray-700">
            {CURRENT_FOCUS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900">Later, not now</h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-gray-700">
            {LATER_EXPLORATION.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="rounded-2xl border border-[#d7a9af] bg-[#fff8f8] p-8 shadow-sm">
        <h2 className="text-2xl font-bold text-gray-900">Community priorities still matter</h2>
        <p className="mt-4 text-sm leading-7 text-gray-700">
          This institutional roadmap is separate from the live community-prioritization board. The
          public roadmap tool remains the place where trusted users can rank approved ideas and help
          surface what matters most locally.
        </p>
        <Link
          href="/roadmap"
          className="mt-6 inline-flex rounded-full bg-[#A51E30] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
        >
          View Community Roadmap
        </Link>
      </section>
    </div>
  );
}
