import Image from 'next/image';
import Link from 'next/link';
import { cookies, headers } from 'next/headers';
import type { ReactNode } from 'react';
import InternalPageHeader from '@/components/shared/InternalPageHeader';
import UserAvatar from '@/components/shared/UserAvatar';
import { getHomepageSectionsData, resolveHomepageCommunityId, type HomepageSectionData } from '@/lib/homepage';

function EmptySection({ children }: { children: ReactNode }) {
  return (
    <div className="homepage-empty p-8 text-center">
      <p className="empty-state-copy mb-0">{children}</p>
    </div>
  );
}

function renderFeaturedMedia(item: HomepageSectionData['displayItems'][number]) {
  const metadataParts = item.metadata?.split(' • ').filter(Boolean) ?? [];
  const category = metadataParts[0] ?? 'Local Life';
  const published = metadataParts.at(-1) ?? 'Fresh from the community';

  if (item.imageUrl) {
    const useContainMode = item.imageDisplayMode === 'contain';

    return (
        <div
          className={`relative flex h-full min-h-[240px] overflow-hidden md:min-h-[320px] ${
          useContainMode
            ? 'homepage-feature-media-contain items-center justify-center'
            : 'homepage-feature-media-cover'
        }`}
      >
        <Image
          src={item.imageUrl}
          alt={item.title}
          fill
          className={`transition duration-300 ${
            useContainMode
              ? 'object-contain object-center p-2 md:p-3'
              : 'object-cover'
          } group-hover:scale-[1.02]`}
        />
        <div
          className={`absolute inset-0 ${
            useContainMode
              ? 'homepage-feature-media-overlay-contain'
              : 'homepage-feature-media-overlay-cover'
          }`}
        />
        <div className="relative flex w-full flex-col justify-end p-6 md:p-8">
          <div className="flex flex-wrap gap-2">
            <span className="homepage-feature-pill rounded-full border px-3 py-1 text-xs font-semibold backdrop-blur-sm">
              {category}
            </span>
            <span className="homepage-feature-pill homepage-feature-pill-accent rounded-full border px-3 py-1 text-xs font-semibold backdrop-blur-sm">
              {published}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="homepage-feature-fallback relative flex h-full min-h-[240px] overflow-hidden p-6 md:min-h-[320px] md:p-8">
      <div className="homepage-feature-fallback-overlay absolute inset-0 opacity-80" />
      <div className="homepage-feature-fallback-sheen absolute inset-y-0 right-0 w-1/2 opacity-60" />
      <div className="homepage-feature-fallback-inner relative flex w-full flex-col justify-end rounded-[24px] border p-5 backdrop-blur-[2px]">
        <div className="flex flex-wrap gap-2">
          <span className="homepage-feature-pill rounded-full border px-3 py-1 text-xs font-semibold">
            {category}
          </span>
          <span className="homepage-feature-pill homepage-feature-pill-accent rounded-full border px-3 py-1 text-xs font-semibold">
            {published}
          </span>
        </div>
      </div>
    </div>
  );
}

function renderFeaturedSection(section: HomepageSectionData) {
  const isSingleCard = section.displayItems.length === 1;

  return (
    <section key={section.id}>
      {section.displayItems.length === 0 ? (
        <EmptySection>Featured stories will appear here once editors publish them.</EmptySection>
      ) : (
        <div className={`grid grid-cols-1 gap-6 ${isSingleCard ? '' : 'md:grid-cols-2'}`}>
          {section.displayItems.map((item) => {
            return (
            <Link
              key={`${item.contentType}-${item.contentId}`}
              href={item.url}
              className="homepage-feature-card group block no-underline transition duration-200 hover:-translate-y-0.5 hover:no-underline"
            >
              <div className={`grid grid-cols-1 ${isSingleCard ? 'lg:grid-cols-[1.2fr_0.8fr]' : ''}`}>
                <div className="p-6 md:p-7">
                  <p className="homepage-feature-label mb-3 text-xs font-semibold uppercase tracking-[0.28em]">
                    Featured
                  </p>
                  <h3 className="mb-3 text-xl font-bold leading-tight md:text-[1.75rem] md:leading-[1.15]">
                    <span className="homepage-feature-title transition-colors">
                      {item.title}
                    </span>
                  </h3>
                  {item.description && (
                    <p className="homepage-feature-description mb-5 max-w-2xl text-sm leading-7 md:text-[15px]">
                      {item.description}
                    </p>
                  )}
                  {item.author ? (
                    <div className="flex items-center gap-3">
                      <UserAvatar
                        firstName={item.author.firstName}
                        lastName={item.author.lastName}
                        profilePhotoUrl={item.author.profilePhotoUrl}
                        trustLevel={item.author.trustLevel}
                        className="h-10 w-10"
                        initialsClassName="bg-white/12 text-sm text-white/78"
                      />
                      <div className="flex min-h-[2.5rem] items-center">
                        <p className="homepage-feature-author text-sm font-semibold leading-none">
                          {item.author.firstName} {item.author.lastName}
                        </p>
                      </div>
                    </div>
                  ) : null}
                </div>
                <div className={`homepage-feature-divider ${isSingleCard ? 'h-full border-t lg:border-l lg:border-t-0' : 'h-full border-t'}`}>
                  {renderFeaturedMedia(item)}
                </div>
              </div>
            </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}

function renderLatestNewsSection(section: HomepageSectionData) {
  return (
    <section key={section.id}>
      {section.displayItems.length === 0 ? (
        <EmptySection>Latest published articles will appear here.</EmptySection>
      ) : (
        <div className="homepage-latest-card px-6 py-4">
          <p className="homepage-latest-label mb-1 text-xs font-semibold uppercase tracking-[0.28em]">
            Other News
          </p>
          <ul className="homepage-latest-list list-disc space-y-0 pl-5">
            {section.displayItems.slice(0, 5).map((item) => (
              <li key={`${item.contentType}-${item.contentId}`}>
                <Link
                  href={item.url}
                  className="homepage-latest-link text-sm font-normal capitalize no-underline transition-colors hover:no-underline"
                >
                  {item.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function renderComingSoonPanel(title: string, description: string) {
  return (
    <section className="homepage-coming-soon-panel flex aspect-square w-full flex-col rounded-[28px]">
      <div className="homepage-coming-soon-header m-3 mb-0 rounded-[16px] border">
        <div className="homepage-coming-soon-label px-4 py-3 text-sm font-semibold uppercase tracking-[0.28em]">
          Coming Soon
        </div>
      </div>
      <div className="homepage-coming-soon-body flex flex-1 flex-col gap-2 bg-transparent p-5">
        <h2 className="homepage-coming-soon-title text-lg font-bold leading-tight">{title}</h2>
        <p className="homepage-coming-soon-description max-w-[11rem] text-xs leading-5">{description}</p>
      </div>
    </section>
  );
}

export default async function Home() {
  const requestHeaders = headers();
  const cookieStore = cookies();
  const communityId = await resolveHomepageCommunityId({
    preferredCommunityId: requestHeaders.get('x-community-id') || undefined,
    preferredDomain: requestHeaders.get('x-community-domain') || undefined,
    host: requestHeaders.get('host') || undefined,
  });
  const sections = communityId
    ? await getHomepageSectionsData(communityId, {
        previewTenantSlug:
          process.env.NODE_ENV === 'development'
            ? cookieStore.get('theme-tenant-preview')?.value ?? null
            : null,
        mode: cookieStore.get('theme-mode')?.value ?? null,
      })
    : [];
  const visibleSections = sections
    .filter((section) => section.isVisible)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const featuredSection = visibleSections.find((section) => section.sectionType === 'FEATURED_ARTICLES');
  const latestNewsSection = visibleSections.find((section) => section.sectionType === 'LATEST_NEWS');

  if (visibleSections.length === 0) {
    return (
      <div className="space-y-8">
        <InternalPageHeader title="Today in Cambria Heights" titleClassName="text-white" />
        <section className="rounded-[28px] border border-white/10 bg-white/82 p-6 shadow-[0_18px_42px_rgba(15,23,42,0.08)] backdrop-blur md:p-8">
          <h2 className="empty-state-title mb-3">
            Make local feel alive, useful, and worth checking every day.
          </h2>
          <p className="mb-0 max-w-3xl text-base leading-8 text-slate-600 md:text-lg">
            News, events, trust, opportunity, and real community coordination are meant to live
            together. This homepage will grow into that daily front door.
          </p>
        </section>
        <EmptySection>Homepage sections have not been configured yet.</EmptySection>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <InternalPageHeader title="Today in Cambria Heights" titleClassName="text-white" />
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)] xl:items-start">
        <div className="space-y-6">
          {featuredSection ? renderFeaturedSection(featuredSection) : null}
          {latestNewsSection ? renderLatestNewsSection(latestNewsSection) : null}
        </div>
        <div className="space-y-6">
          {renderComingSoonPanel(
            'Events',
            'See Community Events'
          )}
          {renderComingSoonPanel(
            'Marketplace',
            'Buy and Sell with feature rich controls'
          )}
        </div>
      </div>
    </div>
  );
}
