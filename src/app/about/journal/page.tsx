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
      <section className="rounded-[32px] border border-white/10 bg-[linear-gradient(145deg,rgba(143,29,44,0.96),rgba(10,32,51,0.94))] p-8 text-white shadow-[0_35px_80px_rgba(7,17,26,0.22)] md:p-10">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-100/78">
          Journal
        </p>
        <h1 className="mt-3 border-b border-white/12 pb-4 text-4xl font-black leading-[0.96] tracking-[-0.05em] text-white md:text-6xl">
          A public record of what Highlander Today is learning, building, and changing.
        </h1>
        <p className="mt-6 text-base leading-8 text-white/76">
          The Journal is the institutional counterpart to day-to-day platform activity. It is where
          Highlander Today can explain decisions, publish essays about local technology and
          accountability, and show how the product evolves over time.
        </p>
      </section>

      <section className="rounded-[28px] border border-white/10 bg-white/78 p-6 shadow-[0_18px_42px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-3xl font-black tracking-[-0.04em] text-slate-950">Current entries</h2>
            <p className="mt-1 text-sm text-slate-600">
              The first Journal release is intentionally small and grounded in the initial About
              pages.
            </p>
          </div>
        </div>
        <div className="mt-6 grid gap-4">
          {publishedEntries.map((entry) => (
            <article
              key={entry.slug}
              className="rounded-[24px] border border-white/10 bg-[linear-gradient(160deg,rgba(17,34,52,0.97),rgba(8,20,33,0.97))] p-5 text-white shadow-[0_24px_55px_rgba(7,17,26,0.18)]"
            >
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <h3 className="text-xl font-bold text-white">{entry.title}</h3>
                <span className="text-sm font-medium text-cyan-100/68">{entry.publishedOn}</span>
              </div>
              <p className="mt-3 text-sm leading-7 text-white/72">{entry.summary}</p>
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

      <section className="rounded-[28px] border border-white/10 bg-slate-950 p-6 text-white shadow-[0_24px_55px_rgba(7,17,26,0.18)]">
        <h2 className="text-3xl font-black tracking-[-0.04em] text-white">Planned next</h2>
        <div className="mt-4 space-y-4">
          {plannedEntries.map((entry) => (
            <article key={entry.slug} className="rounded-[22px] border border-white/10 bg-white/5 p-5">
              <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <h3 className="text-lg font-bold text-white">{entry.title}</h3>
                <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-950">
                  Planned
                </span>
              </div>
              <p className="mt-3 text-sm leading-7 text-white/72">{entry.summary}</p>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
