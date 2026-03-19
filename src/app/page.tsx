import Image from 'next/image';
import Link from 'next/link';
import { headers } from 'next/headers';
import type { ReactNode } from 'react';
import { getHomepageSectionsData, resolveHomepageCommunityId, type HomepageSectionData } from '@/lib/homepage';

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-2xl font-bold mb-6 pb-3 border-b-2" style={{ borderColor: '#A51E30' }}>
      {children}
    </h2>
  );
}

function EmptySection({ children }: { children: ReactNode }) {
  return (
    <div className="bg-white rounded-xl p-8 text-center text-gray-500 shadow-sm">{children}</div>
  );
}

function renderFeaturedSection(section: HomepageSectionData) {
  return (
    <section key={section.id} className="mb-12">
      <SectionHeading>{section.title}</SectionHeading>
      {section.displayItems.length === 0 ? (
        <EmptySection>Featured stories will appear here once editors publish them.</EmptySection>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {section.displayItems.map((item) => (
            <Link
              key={`${item.contentType}-${item.contentId}`}
              href={item.url}
              className="group bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200"
            >
              {item.imageUrl && (
                <div className="relative h-48 w-full bg-gray-100">
                  <Image
                    src={item.imageUrl}
                    alt={item.title}
                    fill
                    className="object-cover"
                  />
                </div>
              )}
              <div className="p-5">
                <h3 className="font-bold text-lg mb-2 group-hover:text-[#46A8CC] transition-colors">
                  {item.title}
                </h3>
                {item.description && <p className="text-gray-500 text-sm mb-3">{item.description}</p>}
                {item.metadata && <p className="text-xs text-gray-400">{item.metadata}</p>}
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
    <section key={section.id} className="mb-12">
      <SectionHeading>{section.title}</SectionHeading>
      {section.displayItems.length === 0 ? (
        <EmptySection>Latest published articles will appear here.</EmptySection>
      ) : (
        <div className="space-y-3">
          {section.displayItems.map((item) => (
            <Link
              key={`${item.contentType}-${item.contentId}`}
              href={item.url}
              className="group flex items-start gap-4 bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200 border-l-4"
              style={{ borderColor: '#A51E30' }}
            >
              <div className="flex-1">
                <h3 className="font-bold text-base mb-1 group-hover:text-[#46A8CC] transition-colors">
                  {item.title}
                </h3>
                {item.description && <p className="text-gray-500 text-sm mb-2">{item.description}</p>}
                {item.metadata && <p className="text-xs text-gray-400">{item.metadata}</p>}
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
    <section key={section.id} className="mb-12">
      <SectionHeading>{section.title}</SectionHeading>
      {section.displayItems.length === 0 ? (
        <EmptySection>Upcoming community events will appear here once they are published.</EmptySection>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {section.displayItems.map((item) => (
            <Link
              key={`${item.contentType}-${item.contentId}`}
              href={item.url}
              className="group bg-white rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow duration-200"
            >
              <h3 className="font-bold text-base mb-2 group-hover:text-[#46A8CC] transition-colors">
                {item.title}
              </h3>
              {item.metadata && <p className="text-sm text-gray-500">{item.metadata}</p>}
            </Link>
          ))}
        </div>
      )}
      <div className="mt-4">
        <Link href="/events" className="text-sm font-medium hover:underline" style={{ color: '#A51E30' }}>
          View all events →
        </Link>
      </div>
    </section>
  );
}

function renderMarketplaceSection(section: HomepageSectionData) {
  return (
    <section key={section.id} className="mb-12">
      <SectionHeading>{section.title}</SectionHeading>
      {section.displayItems.length === 0 ? (
        <EmptySection>Recent market listings will appear here as approved local stores publish them.</EmptySection>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {section.displayItems.map((item) => (
            <article
              key={`${item.contentType}-${item.contentId}`}
              className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200"
            >
              <Link href={item.url} className="group block">
                {item.imageUrl && (
                  <div className="relative h-32 w-full bg-gray-100">
                    <Image
                      src={item.imageUrl}
                      alt={item.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                )}
                <div className="p-4">
                  <h3 className="font-bold text-base mb-1 group-hover:text-[#46A8CC] transition-colors">
                    {item.title}
                  </h3>
                  {item.metadata && <p className="text-xs text-gray-400 mb-2">{item.metadata}</p>}
                  {item.description && <p className="text-sm text-gray-500 line-clamp-2">{item.description}</p>}
                </div>
              </Link>
              {item.secondaryUrl && item.secondaryLabel ? (
                <div className="px-4 pb-4">
                  <Link
                    href={item.secondaryUrl}
                    className="text-sm font-medium hover:underline"
                    style={{ color: '#A51E30' }}
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
        <Link href="/marketplace" className="text-sm font-medium hover:underline" style={{ color: '#A51E30' }}>
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
      <EmptySection>
        Homepage sections have not been configured yet.
      </EmptySection>
    );
  }

  return <>{visibleSections.map((section) => renderSection(section))}</>;
}
