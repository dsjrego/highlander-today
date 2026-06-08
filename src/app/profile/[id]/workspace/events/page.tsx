import Link from 'next/link';
import { db } from '@/lib/db';

export default async function ProfileWorkspaceEventsPage({
  params,
}: {
  params: { id: string };
}) {
  const events = await db.event.findMany({
    where: {
      submittedByUserId: params.id,
    },
    orderBy: [{ startDatetime: 'desc' }, { createdAt: 'desc' }],
    take: 25,
    select: {
      id: true,
      title: true,
      status: true,
      startDatetime: true,
    },
  });

  return (
    <section className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,245,249,0.94))] p-6 shadow-[0_24px_55px_rgba(15,23,42,0.16)] backdrop-blur md:p-8">
      <div className="mb-6 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Events</p>
        <h2 className="text-2xl font-black tracking-[-0.03em] text-slate-950">Your event activity</h2>
      </div>

      <div className="space-y-3">
        {events.length > 0 ? (
          events.map((event) => (
            <Link
              key={event.id}
              href={`/events/${event.id}`}
              className="block rounded-2xl border border-slate-200 bg-white/75 p-5 transition hover:border-slate-300 hover:bg-white"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-slate-950">{event.title}</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    {event.status} • {new Date(event.startDatetime).toLocaleDateString()}
                  </p>
                </div>
                <span className="text-sm font-semibold text-slate-700">Open Event</span>
              </div>
            </Link>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-6 text-sm text-slate-600">
            You have not submitted any events yet.
          </div>
        )}
      </div>
    </section>
  );
}
