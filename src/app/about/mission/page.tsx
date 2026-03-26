import type { Metadata } from 'next';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ABOUT_PILLARS } from '@/lib/about';

export const metadata: Metadata = {
  title: 'Mission | Highlander Today',
  description:
    'Why we\u2019re building Highlander Today and what we believe every community deserves.',
};

export default async function AboutMissionPage() {
  const session = await getServerSession(authOptions);
  const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN';

  return (
    <div className="space-y-8">
      <section className="card card-accent rounded-[32px] p-8 md:p-10">
        <p className="card-label">Mission</p>
        <h1 className="card-title card-title-hero mt-3 border-b border-white/12 pb-4">
          Every town deserves technology that actually works for the people who live there.
        </h1>
        <div className="mt-6 space-y-5">
          <p className="card-body mt-0">
            Highlander Today started with a simple question: why do the digital tools that shape
            daily life in a community, how we find out what&rsquo;s happening, where we shop,
            who we trust, how we help each other; why do those tools always seem to be built
            for someone else&rsquo;s benefit?
          </p>
          <p className="card-body mt-0">
            We think the technology people use to communicate, coordinate, and do business locally
            should work more like a utility than a slot machine. It should be dependable. It should
            be accountable to the people who use it. And it should actually make your town feel
            more like a town, not less.
          </p>
          <p className="card-body mt-0">
            That&rsquo;s what we&rsquo;re building, starting right here in Cambria Heights,
            in the highlands of Cambria County, Pennsylvania. Not because we think small. Because
            we believe the only honest way to build something like this is to get it right in one
            place first, with real people, before trying to bring it anywhere else.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {ABOUT_PILLARS.map((pillar) => (
          <article key={pillar.title} className="card card-dark">
            <p className="card-label">Pillar</p>
            <h2 className="card-title card-title-md">{pillar.title}</h2>
            <p className="card-body">{pillar.body}</p>
          </article>
        ))}
      </section>

      <section className="card card-dark rounded-[30px] p-8">
        <h2 className="section-display-title text-3xl font-black">So what does that look like?</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div className="card card-subtle rounded-[24px] p-5">
            <p className="card-label">Residents</p>
            <h3 className="card-title card-title-sm">For residents</h3>
            <p className="card-body">
              A place to find out what&rsquo;s actually happening in your community, connect with
              people you can trust, and build a reputation that means something over time ,;
              not just another feed full of noise.
            </p>
          </div>
          <div className="card card-deep rounded-[24px] p-5">
            <p className="card-label">Organizations</p>
            <h3 className="card-title card-title-sm">For businesses and organizations</h3>
            <p className="card-body">
              A way to stay visible to the people who live near you ,; not through ads, but
              through real participation in the community you&rsquo;re already part of.
            </p>
          </div>
        </div>
        <div className="card card-subtle mt-6 rounded-[24px] p-5">
          <p className="card-label">Expansion</p>
          <h3 className="card-title card-title-sm">For everywhere else</h3>
          <p className="card-body">
            Once we&rsquo;ve built something that genuinely works here, we want to bring it to
            other communities too. Each town gets its own space, its own identity ,; but
            connected, so that what&rsquo;s local never has to mean what&rsquo;s isolated.
          </p>
        </div>
        {isSuperAdmin ? (
          <Link
            href="/about/roadmap"
            className="mt-6 inline-flex rounded-full bg-[#8f1d2c] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-90"
          >
            See where we&rsquo;re headed
          </Link>
        ) : null}
      </section>
    </div>
  );
}
