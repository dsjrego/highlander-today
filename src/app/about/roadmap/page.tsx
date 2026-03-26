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
  'An internal roadmap workflow with moderation, weighting controls, and audit history',
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
      <section className="card card-accent rounded-[32px] p-8 md:p-10">
        <p className="card-label">Roadmap</p>
        <h1 className="card-title card-title-lg mt-3 border-b border-white/12 pb-4 font-black leading-[0.96] md:text-6xl">
          Build complete local interaction loops first, then expand carefully.
        </h1>
        <p className="card-body mt-6 text-base">
          The platform sequencing is intentional. Highlander Today is prioritizing durable local
          loops before broader commerce or logistics systems. That means proving content,
          discovery, messaging, opportunity, and trust before moving into more operationally heavy
          product categories.
        </p>
      </section>

      <section className="space-y-4">
        {ABOUT_ROADMAP_STAGES.map((stage) => (
          <article key={stage.title} className="card card-dark">
            <p className="card-label">Stage</p>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <h2 className="card-title card-title-lg mt-0">{stage.title}</h2>
              <span className="inline-flex w-fit rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-950">
                {stage.status}
              </span>
            </div>
            <p className="card-body mt-3">{stage.body}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="card card-dark">
          <p className="card-label">Shipped</p>
          <h2 className="card-title card-title-sm">Shipped foundation</h2>
          <ul className="card-body mt-4 space-y-3">
            {SHIPPED_AREAS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="card card-accent">
          <p className="card-label">Current</p>
          <h2 className="card-title card-title-sm">Current focus</h2>
          <ul className="card-body mt-4 space-y-3">
            {CURRENT_FOCUS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="card card-deep">
          <p className="card-label">Later</p>
          <h2 className="card-title card-title-sm">Later, not now</h2>
          <ul className="card-body mt-4 space-y-3">
            {LATER_EXPLORATION.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="card card-dark rounded-[28px] p-8">
        <h2 className="section-display-title text-3xl font-black">Internal planning still matters</h2>
        <p className="card-body mt-4">
          This institutional roadmap is separate from the rest of the public product surface. The
          live roadmap tools are now limited to Super Admin use while the broader platform focus
          stays on local publishing, events, marketplace, Help Wanted, and messaging loops.
        </p>
        <Link
          href="/roadmap"
          className="mt-6 inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:opacity-90"
        >
          View Internal Roadmap
        </Link>
      </section>
    </div>
  );
}
