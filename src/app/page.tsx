import Image from 'next/image';
import Link from 'next/link';
import { headers } from 'next/headers';
import InternalPageHeader from '@/components/shared/InternalPageHeader';
import UserAvatar from '@/components/shared/UserAvatar';
import { getHomepageBoxesData, resolveHomepageCommunityId, type HomepageBoxData } from '@/lib/homepage';

function getBoxBrowseUrl(box: HomepageBoxData) {
  switch (box.boxType) {
    case 'ARTICLES':
      return '/local-life';
    case 'RECIPES':
      return '/recipes';
    case 'EVENTS':
      return '/events';
    case 'MARKETPLACE':
      return '/marketplace';
  }
}

function EmptyHomepageState({ message }: { message: string }) {
  return (
    <div className="homepage-empty p-8 text-center">
      <p className="empty-state-copy mb-0">{message}</p>
    </div>
  );
}

function HomepageBoxCard({
  box,
  emphasize = false,
}: {
  box: HomepageBoxData;
  emphasize?: boolean;
}) {
  if (!box.heroItem) {
    return (
      <section className="rounded-[28px] border border-white/10 bg-white/82 p-6 shadow-[0_18px_42px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--brand-primary)]">
              {box.title}
            </p>
            <h2 className="mt-2 text-xl font-bold text-slate-950">Coming soon</h2>
          </div>
        </div>
        <EmptyHomepageState message={`${box.title} content will appear here once editors publish or pin it.`} />
      </section>
    );
  }

  const hero = box.heroItem;

  return (
    <section
      className={`overflow-hidden rounded-[28px] border border-white/10 bg-white/82 shadow-[0_18px_42px_rgba(15,23,42,0.08)] backdrop-blur ${
        emphasize ? 'xl:col-span-2' : ''
      }`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-slate-200/70 px-5 py-4 md:px-6">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--brand-primary)]">
            {box.title}
          </p>
          <p className="mt-1 text-sm text-slate-500">{box.description}</p>
        </div>
        <Link
          href={getBoxBrowseUrl(box)}
          className="text-sm font-semibold text-[color:var(--brand-accent)] transition hover:opacity-80"
        >
          View all
        </Link>
      </div>

      <div className={`grid grid-cols-1 ${emphasize ? 'lg:grid-cols-[1.1fr_0.9fr]' : ''}`}>
        <Link
          href={hero.url}
          className="group block border-b border-slate-200/70 no-underline transition hover:no-underline lg:border-b-0"
        >
          {hero.imageUrl ? (
            <div className={`relative w-full overflow-hidden ${emphasize ? 'h-72 md:h-[24rem]' : 'h-56'}`}>
              <Image
                src={hero.imageUrl}
                alt={hero.title}
                fill
                className="object-cover transition duration-300 group-hover:scale-[1.02]"
              />
            </div>
          ) : null}
          <div className="p-5 md:p-6">
            {hero.metadata ? (
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                {hero.metadata}
              </p>
            ) : null}
            <h2 className={`mt-2 font-bold leading-tight text-slate-950 ${emphasize ? 'text-3xl' : 'text-2xl'}`}>
              {hero.title}
            </h2>
            {hero.description ? (
              <p className="mt-3 text-sm leading-7 text-slate-600 md:text-[15px]">
                {hero.description}
              </p>
            ) : null}
            {hero.author ? (
              <div className="mt-4 flex items-center gap-3">
                <UserAvatar
                  firstName={hero.author.firstName}
                  lastName={hero.author.lastName}
                  profilePhotoUrl={hero.author.profilePhotoUrl}
                  trustLevel={hero.author.trustLevel}
                  className="h-10 w-10"
                  initialsClassName="bg-slate-200 text-sm text-slate-700"
                />
                <p className="text-sm font-semibold text-slate-700">
                  {hero.author.firstName} {hero.author.lastName}
                </p>
              </div>
            ) : null}
          </div>
        </Link>

        <div className={`${emphasize ? 'lg:border-l' : ''} border-slate-200/70 p-5 md:p-6`}>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
            More from {box.title}
          </p>
          {box.linkItems.length === 0 ? (
            <p className="mt-4 text-sm leading-6 text-slate-500">
              This box is currently running just the featured item.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {box.linkItems.map((item) => (
                <li key={`${item.contentType}-${item.contentId}`} className="border-b border-slate-200/80 pb-3 last:border-b-0 last:pb-0">
                  <Link
                    href={item.url}
                    className="text-sm font-semibold leading-6 text-slate-900 no-underline transition hover:text-[color:var(--brand-accent)] hover:no-underline"
                  >
                    {item.title}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

export default async function Home() {
  const requestHeaders = headers();
  const communityId = await resolveHomepageCommunityId({
    preferredCommunityId: requestHeaders.get('x-community-id') || undefined,
    preferredDomain: requestHeaders.get('x-community-domain') || undefined,
    host: requestHeaders.get('host') || undefined,
  });
  const boxes = communityId ? await getHomepageBoxesData(communityId) : [];
  const visibleBoxes = boxes
    .filter((box) => box.isVisible)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  if (visibleBoxes.length === 0) {
    return (
      <div className="space-y-8">
        <InternalPageHeader title="Today in Cambria Heights" titleClassName="text-white" />
        <section className="rounded-[28px] border border-white/10 bg-white/82 p-6 shadow-[0_18px_42px_rgba(15,23,42,0.08)] backdrop-blur md:p-8">
          <h2 className="empty-state-title mb-3">
            Make local feel alive, useful, and worth checking every day.
          </h2>
          <p className="mb-0 max-w-3xl text-base leading-8 text-slate-600 md:text-lg">
            News, events, food, and local commerce can now flow as ordered homepage boxes rather than fixed lanes.
          </p>
        </section>
        <EmptyHomepageState message="Homepage sections have not been configured yet." />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <InternalPageHeader title="Today in Cambria Heights" titleClassName="text-white" />
      <div className="grid gap-6 xl:grid-cols-3 xl:items-start">
        {visibleBoxes.map((box, index) => (
          <HomepageBoxCard
            key={box.boxType}
            box={box}
            emphasize={index === 0}
          />
        ))}
      </div>
    </div>
  );
}
