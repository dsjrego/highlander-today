import type { Metadata } from 'next';
import Link from 'next/link';
import { ABOUT_NAV_ITEMS, ABOUT_PILLARS, ABOUT_ROADMAP_STAGES } from '@/lib/about';

export const metadata: Metadata = {
  title: 'About | Highlander Today',
  description:
    'Learn the mission, roadmap, and evolving public philosophy behind Highlander Today.',
};

export default function AboutPage() {
  return (
    <div className="space-y-10">
      <section className="overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(145deg,rgba(143,29,44,0.96),rgba(10,32,51,0.94))] text-white shadow-[0_35px_80px_rgba(7,17,26,0.22)]">
        <div className="grid gap-8 px-6 py-10 md:grid-cols-[1.3fr_0.9fr] md:px-10 md:py-14">
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.28em] text-cyan-100/78">
              About Highlander Today
            </p>
            <h1 className="max-w-3xl text-2xl font-black leading-[0.95] tracking-[-0.05em] md:text-2xl">
              A local platform built to function like civic infrastructure, not disposable feed software.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-white/78 md:text-lg">
              Highlander Today exists to strengthen how a community shares information, discovers
              opportunities, coordinates activity, and builds trust over time.
            </p>
          </div>

          <div className="rounded-[28px] border border-white/12 bg-white/10 p-6 backdrop-blur-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-100/78">
              This section covers
            </p>
            <ul className="mt-4 space-y-4 text-sm leading-6 text-white/78">
              {ABOUT_NAV_ITEMS.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="font-semibold text-white hover:text-cyan-200">
                    {item.label}
                  </Link>
                  <p className="mt-1 text-white/66">{item.description}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {ABOUT_PILLARS.map((pillar) => (
          <article
            key={pillar.title}
            className="rounded-[26px] border border-white/10 bg-[linear-gradient(160deg,rgba(17,34,52,0.97),rgba(8,20,33,0.97))] p-6 text-white shadow-[0_24px_55px_rgba(7,17,26,0.18)]"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-100/68">
              Pillar
            </p>
            <h2 className="mt-4 border-b border-white/10 pb-3 text-2xl font-bold text-white">
              {pillar.title}
            </h2>
            <p className="mt-4 text-sm leading-7 text-white/72">{pillar.body}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[28px] border border-white/10 bg-white/78 p-6 shadow-[0_18px_42px_rgba(15,23,42,0.08)] backdrop-blur">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#8f1d2c]">
            Mission
          </p>
          <h2 className="section-display-title mt-3 text-3xl font-black">
            Build a durable local home for news, events, opportunity, and accountability.
          </h2>
          <p className="mt-4 text-sm leading-7 text-slate-600">
            The long-term aim is not simply to publish articles or host listings. It is to create a
            dependable local system people can return to when they need to know what is happening,
            who can help, what is available, and how to participate.
          </p>
          <Link
            href="/about/mission"
            className="mt-6 inline-flex rounded-full bg-[#8f1d2c] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Read the Mission
          </Link>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(160deg,rgba(17,34,52,0.97),rgba(8,20,33,0.97))] p-6 text-white shadow-[0_24px_55px_rgba(7,17,26,0.18)]">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-100/74">
            Product Direction
          </p>
          <div className="mt-4 space-y-4">
            {ABOUT_ROADMAP_STAGES.map((stage) => (
              <div key={stage.title} className="rounded-2xl border border-white/10 bg-white/6 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-base font-bold text-white">{stage.title}</h3>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-950">
                    {stage.status}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-white/70">{stage.body}</p>
              </div>
            ))}
          </div>
          <Link
            href="/about/roadmap"
            className="mt-6 inline-flex rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white hover:text-slate-950"
          >
            See the Roadmap
          </Link>
        </div>
      </section>
    </div>
  );
}
