import { headers } from 'next/headers';
import HomepageAnalyticsClient from '@/components/analytics/HomepageAnalyticsClient';
import HomepageBoxCardClient from '@/components/homepage/HomepageBoxCardClient';
import RecentlyRemembered from '@/components/memoriam/RecentlyRemembered';
import InternalPageHeader from '@/components/shared/InternalPageHeader';
import { getHomepageBoxesData, resolveHomepageCommunityId } from '@/lib/homepage';

function EmptyHomepageState({ message }: { message: string }) {
  return (
    <div className="homepage-empty p-8 text-center">
      <p className="empty-state-copy mb-0">{message}</p>
    </div>
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
        {visibleBoxes.map((box, index) =>
          box.boxType === 'MEMORIAM' ? (
            <RecentlyRemembered key={box.boxType} />
          ) : (
            <HomepageBoxCardClient
              key={box.boxType}
              box={box}
              emphasize={index === 0}
            />
          )
        )}
      </div>
    </div>
  );
}
