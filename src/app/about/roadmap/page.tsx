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
      <section className="rounded-[32px] border border-white/10 bg-[linear-gradient(145deg,rgba(143,29,44,0.96),rgba(10,32,51,0.94))] p-8 text-white shadow-[0_35px_80px_rgba(7,17,26,0.22)] md:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-100/78">
          Roadmap
        </p>
        <h1 className="mt-3 border-b border-white/12 pb-4 text-4xl font-black leading-[0.96] tracking-[-0.05em] text-white md:text-6xl">
          Build complete local interaction loops first, then expand carefully.
        </h1>
        <p className="mt-6 text-base leading-8 text-white/76">
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
            className="rounded-[26px] border border-white/10 bg-[linear-gradient(160deg,rgba(17,34,52,0.97),rgba(8,20,33,0.97))] p-6 text-white shadow-[0_24px_55px_rgba(7,17,26,0.18)]"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <h2 className="text-2xl font-bold text-white">{stage.title}</h2>
              <span className="inline-flex w-fit rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-950">
                {stage.status}
              </span>
            </div>
            <p className="mt-3 text-sm leading-7 text-white/72">{stage.body}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[26px] border border-white/10 bg-white/78 p-6 shadow-[0_18px_42px_rgba(15,23,42,0.08)] backdrop-blur">
          <h2 className="text-lg font-bold text-slate-950">Shipped foundation</h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
            {SHIPPED_AREAS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-[26px] border border-white/10 bg-[linear-gradient(160deg,rgba(17,34,52,0.97),rgba(8,20,33,0.97))] p-6 text-white shadow-[0_24px_55px_rgba(7,17,26,0.18)]">
          <h2 className="text-lg font-bold text-white">Current focus</h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-white/72">
            {CURRENT_FOCUS.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-[26px] border border-white/10 bg-[linear-gradient(160deg,rgba(57,20,34,0.95),rgba(20,13,24,0.95))] p-6 text-white shadow-[0_24px_55px_rgba(7,17,26,0.18)]">
          <h2 className="text-lg font-bold text-white">Later, not now</h2>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-white/72">
            {LATER_EXPLORATION.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="rounded-[28px] border border-white/10 bg-slate-950 p-8 text-white shadow-[0_24px_55px_rgba(7,17,26,0.18)]">
        <h2 className="section-display-title text-3xl font-black">Community priorities still matter</h2>
        <p className="mt-4 text-sm leading-7 text-white/72">
          This institutional roadmap is separate from the live community-prioritization board. The
          public roadmap tool remains the place where trusted users can rank approved ideas and help
          surface what matters most locally.
        </p>
        <Link
          href="/roadmap"
          className="mt-6 inline-flex rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-950 transition hover:opacity-90"
        >
          View Community Roadmap
        </Link>
      </section>
    </div>
  );
}
