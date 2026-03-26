import type { Metadata } from 'next';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ABOUT_PILLARS, ABOUT_ROADMAP_STAGES, getAboutNavItems } from '@/lib/about';

export const metadata: Metadata = {
  title: 'About | Highlander Today',
  description:
    'Learn the mission, roadmap, and evolving public philosophy behind Highlander Today.',
};

export default async function AboutPage() {
  const session = await getServerSession(authOptions);
  const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN';
  const aboutNavItems = getAboutNavItems(isSuperAdmin);

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
              {aboutNavItems.map((item) => (
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
          <article key={pillar.title} className="card card-dark">
            <p className="card-label">Pillar</p>
            <h2 className="card-title card-title-lg border-b border-white/10 pb-3">{pillar.title}</h2>
            <p className="card-body">{pillar.body}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="card card-accent rounded-[28px] p-6">
          <p className="card-label">Mission</p>
          <h2 className="card-title card-title-hero font-black">
            Build a durable local home for news, events, opportunity, and accountability.
          </h2>
          <p className="card-body">
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

        <div className="card card-dark rounded-[28px] p-6">
          <p className="card-label">Product Direction</p>
          <div className="mt-4 space-y-4">
            {ABOUT_ROADMAP_STAGES.map((stage) => (
              <div key={stage.title} className="card card-subtle rounded-2xl p-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="card-title card-title-sm mt-0">{stage.title}</h3>
                  <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-950">
                    {stage.status}
                  </span>
                </div>
                <p className="card-body mt-2">{stage.body}</p>
              </div>
            ))}
          </div>
          {isSuperAdmin ? (
            <Link
              href="/about/roadmap"
              className="mt-6 inline-flex rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white hover:text-slate-950"
            >
              See the Roadmap
            </Link>
          ) : null}
        </div>
      </section>
    </div>
  );
}
