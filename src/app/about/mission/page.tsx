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
    <div className="space-y-8">
      <section className="rounded-[32px] border border-white/10 bg-[linear-gradient(145deg,rgba(143,29,44,0.96),rgba(10,32,51,0.94))] p-8 text-white shadow-[0_35px_80px_rgba(7,17,26,0.22)] md:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-100/78">
          Mission
        </p>
        <h1 className="empty-state-title mt-3 border-b border-white/12 pb-4">
          Every town deserves technology that actually works for the people who live there.
        </h1>
        <div className="mt-6 space-y-5 text-base leading-8 text-white/76">
          <p>
            Highlander Today started with a simple question: why do the digital tools that shape
            daily life in a community, how we find out what&rsquo;s happening, where we shop,
            who we trust, how we help each other; why do those tools always seem to be built
            for someone else&rsquo;s benefit?
          </p>
          <p>
            We think the technology people use to communicate, coordinate, and do business locally
            should work more like a utility than a slot machine. It should be dependable. It should
            be accountable to the people who use it. And it should actually make your town feel
            more like a town, not less.
          </p>
          <p>
            That&rsquo;s what we&rsquo;re building, starting right here in Cambria Heights,
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
            className="rounded-[26px] border border-white/10 bg-[linear-gradient(160deg,rgba(17,34,52,0.97),rgba(8,20,33,0.97))] p-6 text-white shadow-[0_24px_55px_rgba(7,17,26,0.18)]"
          >
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-100/68">
              Pillar
            </p>
            <h2 className="mt-3 text-xl font-bold text-white">{pillar.title}</h2>
            <p className="mt-3 text-sm leading-7 text-white/72">{pillar.body}</p>
          </article>
        ))}
      </section>

      <section className="rounded-[30px] border border-white/10 bg-white/78 p-8 shadow-[0_18px_42px_rgba(15,23,42,0.08)] backdrop-blur">
        <h2 className="section-display-title text-3xl font-black">So what does that look like?</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(160deg,rgba(17,34,52,0.97),rgba(8,20,33,0.97))] p-5 text-white">
            <h3 className="text-base font-bold text-white">For residents</h3>
            <p className="mt-2 text-sm leading-7 text-white/72">
              A place to find out what&rsquo;s actually happening in your community, connect with
              people you can trust, and build a reputation that means something over time ,;
              not just another feed full of noise.
            </p>
          </div>
          <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(160deg,rgba(57,20,34,0.95),rgba(20,13,24,0.95))] p-5 text-white">
            <h3 className="text-base font-bold text-white">For businesses and organizations</h3>
            <p className="mt-2 text-sm leading-7 text-white/72">
              A way to stay visible to the people who live near you ,; not through ads, but
              through real participation in the community you&rsquo;re already part of.
            </p>
          </div>
        </div>
        <div className="mt-6 rounded-[24px] bg-slate-950 p-5 text-white">
          <h3 className="text-base font-bold text-white">For everywhere else</h3>
          <p className="mt-2 text-sm leading-7 text-white/72">
            Once we&rsquo;ve built something that genuinely works here, we want to bring it to
            other communities too. Each town gets its own space, its own identity ,; but
            connected, so that what&rsquo;s local never has to mean what&rsquo;s isolated.
          </p>
        </div>
        <Link
          href="/about/roadmap"
          className="mt-6 inline-flex rounded-full bg-[#8f1d2c] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
        >
          See where we&rsquo;re headed
        </Link>
      </section>
    </div>
  );
}
