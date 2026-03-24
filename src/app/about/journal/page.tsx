import type { Metadata } from 'next';
import Link from 'next/link';
import { ABOUT_JOURNAL_ENTRIES } from '@/lib/about';

export const metadata: Metadata = {
  title: 'Journal | Highlander Today',
  description:
    'The Highlander Today Journal records product direction, mission, and changes in thinking over time.',
};

export default function AboutJournalPage() {
  const publishedEntries = ABOUT_JOURNAL_ENTRIES.filter((entry) => entry.status === 'published');
  const plannedEntries = ABOUT_JOURNAL_ENTRIES.filter((entry) => entry.status === 'planned');

  return (
    <div className="space-y-8">
      <section className="rounded-[28px] border border-[#0d5770]/20 bg-[linear-gradient(160deg,#effbff_0%,#ffffff_55%,#fff6f7_100%)] p-8 shadow-sm md:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-[#0d5770]">
          Journal
        </p>
        <h1 className="mt-3 border-b-2 border-[#A51E30] pb-4 text-4xl font-bold text-gray-900">
          A public record of what Highlander Today is learning, building, and changing.
        </h1>
        <p className="mt-6 text-base leading-8 text-gray-700">
          The Journal is the institutional counterpart to day-to-day platform activity. It is where
          Highlander Today can explain decisions, publish essays about local technology and
          accountability, and show how the product evolves over time.
        </p>
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Current entries</h2>
            <p className="mt-1 text-sm text-gray-600">
              The first Journal release is intentionally small and grounded in the initial About
              pages.
            </p>
          </div>
        </div>
        <div className="mt-6 grid gap-4">
          {publishedEntries.map((entry) => (
            <article
              key={entry.slug}
              className="rounded-2xl border border-gray-200 bg-gray-50 p-5"
            >
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <h3 className="text-xl font-bold text-gray-900">{entry.title}</h3>
                <span className="text-sm font-medium text-gray-500">{entry.publishedOn}</span>
              </div>
              <p className="mt-3 text-sm leading-7 text-gray-700">{entry.summary}</p>
              <Link
                href={entry.href}
                className="mt-4 inline-flex text-sm font-semibold text-[#A51E30] hover:underline"
              >
                Read entry
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-[#d7a9af] bg-white p-6 shadow-sm">
        <h2 className="text-2xl font-bold text-gray-900">Planned next</h2>
        <div className="mt-4 space-y-4">
          {plannedEntries.map((entry) => (
            <article key={entry.slug} className="rounded-xl bg-[#fff8f8] p-5">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <h3 className="text-lg font-bold text-gray-900">{entry.title}</h3>
                <span className="rounded-full bg-[#A51E30] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                  Planned
                </span>
              </div>
              <p className="mt-3 text-sm leading-7 text-gray-700">{entry.summary}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
