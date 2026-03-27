import Image from 'next/image';
import Link from 'next/link';
import { headers } from 'next/headers';
import type { ReactNode } from 'react';
import InternalPageHeader from '@/components/shared/InternalPageHeader';
import { getHomepageSectionsData, resolveHomepageCommunityId, type HomepageSectionData } from '@/lib/homepage';

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <h2 className="section-display-title text-3xl font-black">{children}</h2>
      <div className="hidden h-px flex-1 bg-gradient-to-r from-[#8f1d2c]/60 to-transparent sm:block" />
    </div>
  );
}

function EmptySection({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(145deg,rgba(15,24,36,0.96),rgba(8,18,29,0.96))] p-8 text-center shadow-[0_20px_45px_rgba(7,17,26,0.18)]">
      <p className="empty-state-copy mb-0">{children}</p>
    </div>
  );
}

function renderFeaturedMedia(item: HomepageSectionData['displayItems'][number]) {
  if (item.imageUrl) {
    return (
      <div className="relative min-h-[240px] overflow-hidden bg-slate-900 md:min-h-[320px]">
        <Image
          src={item.imageUrl}
          alt={item.title}
          fill
          className="object-cover transition duration-300 group-hover:scale-[1.02]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,15,24,0.02),rgba(6,15,24,0.26))]" />
      </div>
    );
  }

  const metadataParts = item.metadata?.split(' • ').filter(Boolean) ?? [];
  const category = metadataParts[0] ?? 'Local Life';
  const published = metadataParts.at(-1) ?? 'Fresh from the community';

  return (
    <div className="relative flex min-h-[240px] overflow-hidden bg-[linear-gradient(145deg,rgba(22,49,72,0.98),rgba(129,32,49,0.9))] p-6 md:min-h-[320px] md:p-8">
      <div className="absolute inset-0 opacity-80 [background-image:radial-gradient(circle_at_20%_18%,rgba(125,223,253,0.24),transparent_26%),radial-gradient(circle_at_78%_24%,rgba(212,90,116,0.28),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.08)_0%,transparent_38%,rgba(255,255,255,0.04)_100%)]" />
      <div className="absolute inset-y-0 right-0 w-1/2 opacity-60 [background-image:linear-gradient(135deg,transparent_0%,rgba(255,255,255,0.06)_50%,transparent_100%)]" />
      <div className="relative flex w-full flex-col justify-between rounded-[24px] border border-white/12 bg-black/12 p-5 backdrop-blur-[2px]">
        <div>
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.3em] text-cyan-100/78">
            No hero image
          </p>
          <h4 className="max-w-sm text-2xl font-black leading-tight tracking-[-0.03em] text-white">
            Story-first layout
          </h4>
          <p className="mt-3 max-w-sm text-sm leading-7 text-white/72">
            The article still gets a strong featured presence, even before photography is added.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className="rounded-full border border-white/16 bg-white/10 px-3 py-1 text-xs font-semibold text-white/88">
            {category}
          </span>
          <span className="rounded-full border border-cyan-200/20 bg-cyan-200/10 px-3 py-1 text-xs font-semibold text-cyan-100/88">
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
    <section key={section.id} className="mb-14">
      {section.displayItems.length === 0 ? (
        <EmptySection>Featured stories will appear here once editors publish them.</EmptySection>
      ) : (
        <div className={`grid grid-cols-1 gap-6 ${isSingleCard ? '' : 'md:grid-cols-2'}`}>
          {section.displayItems.map((item) => (
            <Link
              key={`${item.contentType}-${item.contentId}`}
              href={item.url}
              className={`group overflow-hidden rounded-[28px] border border-white/12 bg-[linear-gradient(160deg,rgba(17,34,52,0.97),rgba(8,20,33,0.97))] shadow-[0_25px_60px_rgba(7,17,26,0.18)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_30px_70px_rgba(7,17,26,0.24)] ${isSingleCard ? 'max-w-5xl' : ''}`}
            >
              <div className={`grid grid-cols-1 ${isSingleCard ? 'lg:grid-cols-[1.2fr_0.8fr]' : ''}`}>
                <div className="p-6 md:p-7">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200/72">
                    Featured
                  </p>
                  <h3 className="mb-3 text-xl font-bold leading-tight text-white transition-colors group-hover:text-cyan-200 md:text-[1.75rem] md:leading-[1.15]">
                    {item.title}
                  </h3>
                  {item.description && (
                    <p className="mb-5 max-w-2xl text-sm leading-7 text-white/72 md:text-[15px]">
                      {item.description}
                    </p>
                  )}
                  {item.metadata && <p className="text-xs text-white/48">{item.metadata}</p>}
                </div>
                <div className={isSingleCard ? 'border-t border-white/10 lg:border-l lg:border-t-0' : 'border-t border-white/10'}>
                  {renderFeaturedMedia(item)}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function renderLatestNewsSection(section: HomepageSectionData) {
  return (
    <section key={section.id} className="mb-14">
      {section.displayItems.length === 0 ? (
        <EmptySection>Latest published articles will appear here.</EmptySection>
      ) : (
        <div className="space-y-3">
          {section.displayItems.map((item) => (
            <Link
              key={`${item.contentType}-${item.contentId}`}
              href={item.url}
            className="group flex items-start gap-4 rounded-[24px] border border-white/10 bg-white/70 p-5 shadow-[0_15px_35px_rgba(15,23,42,0.06)] backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:bg-white/90 hover:shadow-[0_20px_45px_rgba(15,23,42,0.1)]"
            >
              <div className="flex-1">
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#8f1d2c]">
                  Latest
                </p>
                <h3 className="mb-1 text-lg font-bold text-slate-950 transition-colors group-hover:text-[#8f1d2c]">
                  {item.title}
                </h3>
                {item.description && <p className="mb-2 text-sm leading-7 text-slate-600">{item.description}</p>}
                {item.metadata && <p className="text-xs text-slate-400">{item.metadata}</p>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function renderEventsSection(section: HomepageSectionData) {
  return (
    <section key={section.id} className="mb-14">
      <SectionHeading>{section.title}</SectionHeading>
      {section.displayItems.length === 0 ? (
        <EmptySection>Upcoming community events will appear here once they are published.</EmptySection>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {section.displayItems.map((item) => (
            <Link
              key={`${item.contentType}-${item.contentId}`}
              href={item.url}
            className="group rounded-[24px] border border-white/10 bg-[linear-gradient(160deg,rgba(57,20,34,0.95),rgba(20,13,24,0.95))] p-6 shadow-[0_20px_45px_rgba(7,17,26,0.18)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_26px_55px_rgba(7,17,26,0.24)]"
            >
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-pink-200/70">
                Upcoming
              </p>
              <h3 className="mb-2 text-lg font-bold text-white transition-colors group-hover:text-pink-100">
                {item.title}
              </h3>
              {item.metadata && <p className="text-sm text-white/68">{item.metadata}</p>}
            </Link>
          ))}
        </div>
      )}
      <div className="mt-4">
        <Link href="/events" className="text-sm font-semibold text-[#8f1d2c] hover:underline">
          View all events →
        </Link>
      </div>
    </section>
  );
}

function renderMarketplaceSection(section: HomepageSectionData) {
  return (
    <section key={section.id} className="mb-14">
      <SectionHeading>{section.title}</SectionHeading>
      {section.displayItems.length === 0 ? (
        <EmptySection>Recent market listings will appear here as approved local stores publish them.</EmptySection>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {section.displayItems.map((item) => (
            <article
              key={`${item.contentType}-${item.contentId}`}
              className="overflow-hidden rounded-[24px] border border-white/10 bg-white/80 shadow-[0_15px_35px_rgba(15,23,42,0.06)] backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_20px_45px_rgba(15,23,42,0.1)]"
            >
              <Link href={item.url} className="group block">
                {item.imageUrl && (
                  <div className="relative h-36 w-full bg-slate-100">
                    <Image
                      src={item.imageUrl}
                      alt={item.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="p-5">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#0f2941]/70">
                    Market
                  </p>
                  <h3 className="mb-1 text-lg font-bold text-slate-950 transition-colors group-hover:text-[#8f1d2c]">
                    {item.title}
                  </h3>
                  {item.metadata && <p className="mb-2 text-xs text-slate-400">{item.metadata}</p>}
                  {item.description && <p className="line-clamp-2 text-sm leading-6 text-slate-600">{item.description}</p>}
                </div>
              </Link>
              {item.secondaryUrl && item.secondaryLabel ? (
                <div className="px-4 pb-4">
                  <Link
                    href={item.secondaryUrl}
                    className="text-sm font-semibold text-[#8f1d2c] hover:underline"
                  >
                    {item.secondaryLabel} →
                  </Link>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
      <div className="mt-4">
        <Link href="/marketplace" className="text-sm font-semibold text-[#8f1d2c] hover:underline">
          View market and stores →
        </Link>
      </div>
    </section>
  );
}

function renderSection(section: HomepageSectionData) {
  switch (section.sectionType) {
    case 'FEATURED_ARTICLES':
      return renderFeaturedSection(section);
    case 'LATEST_NEWS':
      return renderLatestNewsSection(section);
    case 'UPCOMING_EVENTS':
      return renderEventsSection(section);
    case 'RECENT_MARKETPLACE':
      return renderMarketplaceSection(section);
  }
}

export default async function Home() {
  const requestHeaders = headers();
  const communityId = await resolveHomepageCommunityId({
    preferredCommunityId: requestHeaders.get('x-community-id') || undefined,
    preferredDomain: requestHeaders.get('x-community-domain') || undefined,
    host: requestHeaders.get('host') || undefined,
  });
  const sections = communityId ? await getHomepageSectionsData(communityId) : [];
  const visibleSections = sections
    .filter((section) => section.isVisible)
    .sort((a, b) => a.sortOrder - b.sortOrder);

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
      <div>{visibleSections.map((section) => renderSection(section))}</div>
    </div>
  );
}
