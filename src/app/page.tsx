import Image from 'next/image';
import { headers } from 'next/headers';
import HomepageAnalyticsClient from '@/components/analytics/HomepageAnalyticsClient';
import TrackedLink from '@/components/analytics/TrackedLink';
import InternalPageHeader from '@/components/shared/InternalPageHeader';
import UserAvatar from '@/components/shared/UserAvatar';
import { getHomepageBoxesData, resolveHomepageCommunityId, type HomepageBoxData } from '@/lib/homepage';
import RecentlyRemembered from '@/components/memoriam/RecentlyRemembered';

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
    case 'MEMORIAM':
      return '/memoriam';
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
  if (box.boxType === 'MEMORIAM') {
    return <RecentlyRemembered />;
  }

  if (!box.heroItem) {
    return (
      <section className="homepage-feature-card p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="homepage-feature-label text-xs font-semibold uppercase tracking-[0.28em]">
              {box.title}
            </p>
          </div>
        </div>
      </section>
    );
  }

  const hero = box.heroItem;
  const linkLabel = box.boxType === 'ARTICLES' ? 'More headlines' : `More from ${box.title}`;

  return (
    <section
      className={`homepage-feature-card ${
        emphasize ? 'xl:col-span-2' : ''
      }`}
    >
      <div className="homepage-box-header flex items-center justify-between gap-3 px-5 py-4 md:px-6">
        <div>
          <p className="homepage-feature-label text-xs font-semibold uppercase tracking-[0.28em]">
            {box.title}
          </p>
        </div>
        <TrackedLink
          href={getBoxBrowseUrl(box)}
          className="homepage-box-browse-link text-sm font-semibold transition"
          pageType="homepage"
          eventName="cta_clicked"
          metadata={{ boxType: box.boxType, cta: 'view-all' }}
        >
          View all
        </TrackedLink>
      </div>

      <div className={`grid grid-cols-1 ${emphasize ? 'lg:grid-cols-[1.1fr_0.9fr]' : ''}`}>
        <TrackedLink
          href={hero.url}
          className="group block no-underline transition hover:no-underline lg:border-b-0"
          pageType="homepage"
          eventName="homepage_slot_clicked"
          contentType={hero.contentType}
          contentId={hero.contentId}
          metadata={{ boxType: box.boxType, placement: 'hero' }}
        >
          {hero.imageUrl ? (
            <div
              className={`homepage-feature-media-cover relative w-full overflow-hidden ${
                emphasize ? 'h-72 md:h-[24rem]' : 'h-56'
              }`}
            >
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
              <p className="homepage-feature-meta text-[11px] font-semibold uppercase tracking-[0.18em]">
                {hero.metadata}
              </p>
            ) : null}
            <h2 className={`homepage-feature-title mt-2 font-bold leading-tight ${emphasize ? 'text-3xl' : 'text-2xl'}`}>
              {hero.title}
            </h2>
            {hero.description ? (
              <p className="homepage-feature-description mt-3 text-sm leading-7 md:text-[15px]">
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
                  initialsClassName="homepage-feature-avatar text-sm"
                />
                <p className="homepage-feature-author text-sm font-semibold">
                  {hero.author.firstName} {hero.author.lastName}
                </p>
              </div>
            ) : null}
          </div>
        </TrackedLink>

        <div className={`${emphasize ? 'homepage-feature-divider lg:border-l' : ''} p-5 md:p-6`}>
          {box.linkItems.length > 0 ? (
            <>
              <p className="homepage-latest-label text-xs font-semibold uppercase tracking-[0.22em]">
                {linkLabel}
              </p>
              <ul className="homepage-latest-list mt-4 space-y-3">
                {box.linkItems.map((item) => (
                  <li key={`${item.contentType}-${item.contentId}`} className="homepage-latest-item pb-3 last:pb-0">
                    <TrackedLink
                      href={item.url}
                      className="flex items-start gap-3 no-underline transition hover:no-underline"
                      pageType="homepage"
                      eventName="homepage_slot_clicked"
                      contentType={item.contentType}
                      contentId={item.contentId}
                      metadata={{
                        boxType: box.boxType,
                        placement: 'supporting-link',
                      }}
                    >
                      <div className="homepage-support-thumb relative h-12 w-12 shrink-0 overflow-hidden rounded-xl">
                        {item.imageUrl ? (
                          <Image
                            src={item.imageUrl}
                            alt={item.title}
                            fill
                            className="object-cover"
                          />
                        ) : (
                          <div className="homepage-support-thumb-placeholder flex h-full w-full items-center justify-center text-[10px] font-semibold uppercase tracking-[0.18em]">
                            {item.contentType === 'ARTICLE' ? 'News' : 'Item'}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="homepage-latest-link text-sm font-semibold leading-6 transition">
                          {item.title}
                        </p>
                        {item.metadata ? (
                          <p className="homepage-support-meta mt-0.5 text-xs font-medium">
                            • {item.metadata.split(' • ').at(-1)}
                          </p>
                        ) : null}
                      </div>
                    </TrackedLink>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
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
        <InternalPageHeader title="Today in Cambria Heights" />
        <section className="homepage-feature-card p-6 md:p-8">
          <h2 className="empty-state-title mb-3">
            Make local feel alive, useful, and worth checking every day.
          </h2>
          <p className="page-intro-copy mb-0 max-w-3xl text-base leading-8 md:text-lg">
            News, events, food, and local commerce can now flow as ordered homepage boxes rather than fixed lanes.
          </p>
        </section>
        <EmptyHomepageState message="Homepage sections have not been configured yet." />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <HomepageAnalyticsClient
        boxSummaries={visibleBoxes.map((box) => ({
          boxType: box.boxType,
          heroContentType: box.heroItem?.contentType ?? null,
          heroContentId: box.heroItem?.contentId ?? null,
          linkItems: box.linkItems.map((item) => ({
            contentType: item.contentType,
            contentId: item.contentId,
          })),
        }))}
      />
      <InternalPageHeader title="Today in Cambria Heights" />
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
