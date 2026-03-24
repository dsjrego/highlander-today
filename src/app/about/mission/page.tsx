import type { Metadata } from 'next';
import Link from 'next/link';
import { ABOUT_PILLARS } from '@/lib/about';

export const metadata: Metadata = {
  title: 'Mission | Highlander Today',
  description:
    'Why we\u2019re building Highlander Today and what we believe every community deserves.',
};

export default function AboutMissionPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <section className="rounded-[28px] border border-[#d7a9af] bg-white p-8 shadow-sm md:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#A51E30]">
          Mission
        </p>
        <h1 className="mt-3 border-b-2 border-[#A51E30] pb-4 text-4xl font-bold text-gray-900">
          Every town deserves technology that actually works for the people who live there.
        </h1>
        <div className="mt-6 space-y-5 text-base leading-8 text-gray-700">
          <p>
            Highlander Today started with a simple question: why do the digital tools that shape
            daily life in a community &mdash; how we find out what&rsquo;s happening, where we shop,
            who we trust, how we help each other &mdash; why do those tools always seem to be built
            for someone else&rsquo;s benefit?
          </p>
          <p>
            We think the technology people use to communicate, coordinate, and do business locally
            should work more like a utility than a slot machine. It should be dependable. It should
            be accountable to the people who use it. And it should actually make your town feel
            more like a town, not less.
          </p>
          <p>
            That&rsquo;s what we&rsquo;re building &mdash; starting right here in Cambria Heights,
            in the highlands of Cambria County, Pennsylvania. Not because we think small. Because
            we believe the only honest way to build something like this is to get it right in one
            place first, with real people, before trying to bring it anywhere else.
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
        <h2 className="text-2xl font-bold text-gray-900">So what does that look like?</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl bg-white p-5">
            <h3 className="text-base font-bold text-gray-900">For residents</h3>
            <p className="mt-2 text-sm leading-7 text-gray-700">
              A place to find out what&rsquo;s actually happening in your community, connect with
              people you can trust, and build a reputation that means something over time &mdash;
              not just another feed full of noise.
            </p>
          </div>
          <div className="rounded-xl bg-white p-5">
            <h3 className="text-base font-bold text-gray-900">For businesses and organizations</h3>
            <p className="mt-2 text-sm leading-7 text-gray-700">
              A way to stay visible to the people who live near you &mdash; not through ads, but
              through real participation in the community you&rsquo;re already part of.
            </p>
          </div>
        </div>
        <div className="mt-6 rounded-xl bg-white p-5">
          <h3 className="text-base font-bold text-gray-900">For everywhere else</h3>
          <p className="mt-2 text-sm leading-7 text-gray-700">
            Once we&rsquo;ve built something that genuinely works here, we want to bring it to
            other communities too. Each town gets its own space, its own identity &mdash; but
            connected, so that what&rsquo;s local never has to mean what&rsquo;s isolated.
          </p>
        </div>
        <Link
          href="/about/roadmap"
          className="mt-6 inline-flex rounded-full bg-[#A51E30] px-5 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
        >
          See where we&rsquo;re headed
        </Link>
      </section>
    </div>
  );
}
