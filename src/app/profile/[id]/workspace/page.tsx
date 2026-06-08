import Link from 'next/link';
import { db } from '@/lib/db';

function cardClassName() {
  return `overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,245,249,0.94))] shadow-[0_24px_55px_rgba(15,23,42,0.16)] backdrop-blur`;
}

export default async function ProfileWorkspacePage({
  params,
}: {
  params: { id: string };
}) {
  const user = await db.user.findUnique({
    where: { id: params.id },
    select: {
      firstName: true,
      organizationMemberships: {
        where: {
          status: 'ACTIVE',
        },
        select: {
          id: true,
        },
      },
      _count: {
        select: {
          articles: true,
          eventsSubmitted: true,
        },
      },
    },
  });

  if (!user) {
    return null;
  }

  const cards = [
    {
      title: 'Organizations',
      value: user.organizationMemberships.length.toString(),
      description: 'Organizations you can manage or represent.',
      href: `/profile/${params.id}/workspace/organizations`,
      cta: 'Open Organizations',
    },
    {
      title: 'Events',
      value: user._count.eventsSubmitted.toString(),
      description: 'Events you have already submitted through Highlander Today.',
      href: `/profile/${params.id}/workspace/events`,
      cta: 'Open Events',
    },
    {
      title: 'Articles',
      value: user._count.articles.toString(),
      description: 'Published and in-progress local-life writing tied to your account.',
      href: `/profile/${params.id}/workspace/articles`,
      cta: 'Open Articles',
    },
    {
      title: 'Account',
      value: '1',
      description: 'Update your profile, identity details, and current location.',
      href: `/profile/${params.id}/workspace/account`,
      cta: 'Open Account Settings',
    },
  ];

  return (
    <div className="space-y-6">
      <section className="rounded-[30px] border border-white/10 bg-[linear-gradient(135deg,rgba(15,23,42,0.96),rgba(30,41,59,0.96))] p-6 text-white shadow-[0_24px_55px_rgba(15,23,42,0.22)] md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-200/78">Workspace</p>
        <h2 className="mt-3 text-3xl font-black tracking-[-0.03em]">{user.firstName}, here is your private control panel.</h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-200">
          Use this area to manage your account and the parts of Highlander Today attached to you. Staff admin remains separate.
        </p>
      </section>

      <div className="grid gap-5 md:grid-cols-2">
        {cards.map((card) => (
          <section key={card.title} className={cardClassName()}>
            <div className="space-y-4 p-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{card.title}</p>
                  <p className="mt-2 text-4xl font-black tracking-[-0.04em] text-slate-950">{card.value}</p>
                </div>
              </div>
              <p className="text-sm leading-7 text-slate-600">{card.description}</p>
              <Link href={card.href} className="inline-flex rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-100">
                {card.cta}
              </Link>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
