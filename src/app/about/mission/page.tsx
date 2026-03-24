import type { Metadata } from 'next';
import Link from 'next/link';
import { ABOUT_PILLARS } from '@/lib/about';

export const metadata: Metadata = {
  title: 'Mission | Highlander Today',
  description:
    'Read the mission and institutional philosophy behind Highlander Today.',
};

export default function AboutMissionPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <section className="rounded-[28px] border border-[#d7a9af] bg-white p-8 shadow-sm md:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#A51E30]">
          Mission
        </p>
        <h1 className="mt-3 border-b-2 border-[#A51E30] pb-4 text-4xl font-bold text-gray-900">
          Highlander Today exists to make local life easier to navigate and harder to exploit.
        </h1>
        <div className="mt-6 space-y-5 text-base leading-8 text-gray-700">
          <p>
            The platform is built around a simple idea: local communication and coordination tools
            increasingly shape whether a community can act like a community. News, events,
            classifieds, recommendations, opportunities, and everyday requests for help are no
            longer secondary. They are part of the operating system of place.
          </p>
          <p>
            Highlander Today is meant to be a dependable local system for that operating layer. It
            should help residents answer practical questions, help businesses and organizations stay
            visible, and help trusted people interact without the usual anonymity, spam, and
            fragmented attention that dominate generic platforms.
          </p>
          <p>
            That requires a different posture from the product itself: visible moderation,
            accountable identity, trust progression, transparent priorities, and a bias toward
            long-term community usefulness over short-term engagement tricks.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {ABOUT_PILLARS.map((pillar) => (
          <article
            key={pillar.title}
            className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
          >
            <h2 className="text-lg font-bold text-gray-900">{pillar.title}</h2>
            <p className="mt-3 text-sm leading-7 text-gray-700">{pillar.body}</p>
          </article>
        ))}
      </section>

      <section className="rounded-2xl border border-[#46A8CC]/30 bg-[#46A8CC]/10 p-8 shadow-sm">
        <h2 className="text-2xl font-bold text-gray-900">What that means in practice</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl bg-white p-5">
            <h3 className="text-base font-bold text-gray-900">For residents</h3>
            <p className="mt-2 text-sm leading-7 text-gray-700">
              A place to find trustworthy local information, respond to opportunities, message
              people through platform accountability, and build recognition over time.
            </p>
          </div>
          <div className="rounded-xl bg-white p-5">
            <h3 className="text-base font-bold text-gray-900">For organizations and businesses</h3>
            <p className="mt-2 text-sm leading-7 text-gray-700">
              A local surface for discovery and participation that is rooted in real community
              relationships instead of broad, low-intent advertising reach.
            </p>
          </div>
        </div>
        <Link
          href="/about/roadmap"
          className="mt-6 inline-flex rounded-full bg-[#A51E30] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
        >
          Continue to Roadmap
        </Link>
      </section>
    </div>
  );
}
