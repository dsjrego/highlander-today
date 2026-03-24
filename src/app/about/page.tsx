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
      <section className="overflow-hidden rounded-[28px] border border-[#c97a84] bg-[linear-gradient(135deg,#7a1222_0%,#A51E30_42%,#46A8CC_100%)] text-white shadow-sm">
        <div className="grid gap-8 px-6 py-10 md:grid-cols-[1.3fr_0.9fr] md:px-10 md:py-14">
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.28em] text-red-100">
              About Highlander Today
            </p>
            <h1 className="max-w-3xl text-4xl font-bold leading-tight md:text-5xl">
              A local platform built to function like civic infrastructure, not disposable feed software.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-red-50 md:text-lg">
              Highlander Today exists to strengthen how a community shares information, discovers
              opportunities, coordinates activity, and builds trust over time.
            </p>
          </div>

          <div className="rounded-[24px] border border-white/20 bg-white/10 p-6 backdrop-blur-sm">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-red-100">
              This section covers
            </p>
            <ul className="mt-4 space-y-4 text-sm leading-6 text-red-50">
              {ABOUT_NAV_ITEMS.map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="font-semibold text-white hover:text-red-100">
                    {item.label}
                  </Link>
                  <p className="mt-1 text-red-100">{item.description}</p>
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
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
          >
            <h2 className="border-b-2 border-[#A51E30] pb-3 text-xl font-bold text-gray-900">
              {pillar.title}
            </h2>
            <p className="mt-4 text-sm leading-7 text-gray-700">{pillar.body}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#A51E30]">
            Mission
          </p>
          <h2 className="mt-3 text-2xl font-bold text-gray-900">
            Build a durable local home for news, events, opportunity, and accountability.
          </h2>
          <p className="mt-4 text-sm leading-7 text-gray-700">
            The long-term aim is not simply to publish articles or host listings. It is to create a
            dependable local system people can return to when they need to know what is happening,
            who can help, what is available, and how to participate.
          </p>
          <Link
            href="/about/mission"
            className="mt-6 inline-flex rounded-full bg-[#A51E30] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Read the Mission
          </Link>
        </div>

        <div className="rounded-2xl border border-[#46A8CC]/30 bg-[#46A8CC]/10 p-6 shadow-sm">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[#0d5770]">
            Product Direction
          </p>
          <div className="mt-4 space-y-4">
            {ABOUT_ROADMAP_STAGES.map((stage) => (
              <div key={stage.title} className="rounded-xl bg-white/80 p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-base font-bold text-gray-900">{stage.title}</h3>
                  <span className="rounded-full bg-[#A51E30] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                    {stage.status}
                  </span>
                </div>
                <p className="mt-2 text-sm leading-6 text-gray-700">{stage.body}</p>
              </div>
            ))}
          </div>
          <Link
            href="/about/roadmap"
            className="mt-6 inline-flex rounded-full border border-[#0d5770] px-5 py-2.5 text-sm font-semibold text-[#0d5770] transition hover:bg-white"
          >
            See the Roadmap
          </Link>
        </div>
      </section>
    </div>
  );
}
