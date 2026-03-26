import type { Metadata } from 'next';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ABOUT_JOURNAL_ENTRIES } from '@/lib/about';

export const metadata: Metadata = {
  title: 'Journal | Highlander Today',
  description:
    'The Highlander Today Journal records product direction, mission, and changes in thinking over time.',
};

export default async function AboutJournalPage() {
  const session = await getServerSession(authOptions);
  const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN';
  const publishedEntries = ABOUT_JOURNAL_ENTRIES.filter(
    (entry) => entry.status === 'published' && (isSuperAdmin || entry.href !== '/about/roadmap')
  );
  const plannedEntries = ABOUT_JOURNAL_ENTRIES.filter((entry) => entry.status === 'planned');

  return (
    <div className="space-y-8">
      <section className="card card-accent rounded-[32px] p-8 md:p-10">
        <p className="card-label">Journal</p>
        <h1 className="card-title card-title-hero mt-3 border-b border-white/12 pb-4 font-black leading-[0.96] md:text-6xl">
          A public record of what Highlander Today is learning, building, and changing.
        </h1>
        <p className="card-body mt-6 text-base">
          The Journal is the institutional counterpart to day-to-day platform activity. It is where
          Highlander Today can explain decisions, publish essays about local technology and
          accountability, and show how the product evolves over time.
        </p>
      </section>

      <section className="card card-dark rounded-[28px] p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="section-display-title text-3xl font-black">Current entries</h2>
            <p className="card-body mt-1">
              The first Journal release is intentionally small and grounded in the initial About
              pages.
            </p>
          </div>
        </div>
        <div className="mt-6 grid gap-4">
          {publishedEntries.map((entry) => (
            <article key={entry.slug} className="card card-subtle rounded-[24px] p-5">
              <p className="card-label">Published</p>
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <h3 className="card-title card-title-md mt-0">{entry.title}</h3>
                <span className="text-sm font-medium text-cyan-100/80">{entry.publishedOn}</span>
              </div>
              <p className="card-body mt-3">{entry.summary}</p>
              <Link
                href={entry.href}
                className="mt-4 inline-flex text-sm font-semibold text-cyan-200 hover:underline"
              >
                Read entry
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="card card-dark rounded-[28px] p-6">
        <h2 className="section-display-title text-3xl font-black">Planned next</h2>
        <div className="mt-4 space-y-4">
          {plannedEntries.map((entry) => (
            <article key={entry.slug} className="card card-subtle rounded-[22px] p-5">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <h3 className="card-title card-title-sm mt-0">{entry.title}</h3>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-950">
                  Planned
                </span>
              </div>
              <p className="card-body mt-3">{entry.summary}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
