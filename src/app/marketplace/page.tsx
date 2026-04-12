/* eslint-disable @next/next/no-img-element */

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import InternalPageHeader from "@/components/shared/InternalPageHeader";

interface MarketplaceListing {
  id: string;
  title: string;
  description: string | null;
  priceCents: number;
  category: string;
  listingType: "PRODUCT" | "FOOD" | "SERVICE";
  status: "ACTIVE" | "PENDING" | "SOLD";
  createdAt: string;
  photos: Array<{
    id: string;
    imageUrl: string;
  }>;
  store: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    owner: {
      id: string;
      firstName: string;
      lastName: string;
    };
  };
}

interface MarketplaceStore {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  websiteUrl: string | null;
  owner: {
    id: string;
    firstName: string;
    lastName: string;
  };
  _count: {
    listings: number;
  };
}

interface StoreDiscoverySummary {
  publicListings: number;
  activeListings: number;
  pendingListings: number;
  soldListings: number;
  topCategories: string[];
  latestListingAt: string | null;
}

const LISTING_TYPE_LABELS = {
  PRODUCT: "Products",
  FOOD: "Food",
  SERVICE: "Services",
} as const;

const LISTING_STATUS_STYLES: Record<MarketplaceListing["status"], string> = {
  ACTIVE: "bg-green-100 text-green-800",
  PENDING: "bg-yellow-100 text-yellow-800",
  SOLD: "bg-slate-200 text-slate-800",
};

const STATUS_PRIORITY: Record<MarketplaceListing["status"], number> = {
  ACTIVE: 0,
  PENDING: 1,
  SOLD: 2,
};

function formatPrice(priceCents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(priceCents / 100);
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatRelativeDate(value: string | null) {
  if (!value) {
    return "No public listings yet";
  }

  const date = new Date(value);
  const diffMs = Date.now() - date.getTime();
  const diffDays = Math.max(Math.floor(diffMs / (1000 * 60 * 60 * 24)), 0);

  if (diffDays === 0) {
    return "Listed today";
  }

  if (diffDays === 1) {
    return "Listed yesterday";
  }

  if (diffDays < 7) {
    return `Listed ${diffDays} days ago`;
  }

  return `Listed ${formatDate(value)}`;
}

export default function MarketplacePage() {
  const { status: sessionStatus } = useSession();
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [stores, setStores] = useState<MarketplaceStore[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedType, setSelectedType] = useState<"ALL" | keyof typeof LISTING_TYPE_LABELS>("ALL");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  useEffect(() => {
    async function fetchMarketplace() {
      setIsLoading(true);
      setError("");

      try {
        const [listingsRes, storesRes] = await Promise.all([
          fetch("/api/marketplace?limit=100"),
          fetch("/api/stores"),
        ]);
        const listingsData = await listingsRes.json();
        const storesData = await storesRes.json();

        if (!listingsRes.ok) {
          throw new Error(listingsData.error || "Failed to fetch marketplace listings");
        }

        if (!storesRes.ok) {
          throw new Error(storesData.error || "Failed to fetch stores");
        }

        setListings(listingsData.listings || []);
        setStores(storesData.stores || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch marketplace listings");
      } finally {
        setIsLoading(false);
      }
    }

    fetchMarketplace();
  }, []);

  const categories = useMemo(() => {
    const uniqueCategories = Array.from(
      new Set(listings.map((listing) => listing.category).filter(Boolean))
    ).sort((a, b) => a.localeCompare(b));

    return ["All", ...uniqueCategories];
  }, [listings]);

  const filteredListings = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return listings
      .filter((listing) => {
        const categoryMatch =
          selectedCategory === "All" || listing.category === selectedCategory;
        const typeMatch =
          selectedType === "ALL" || listing.listingType === selectedType;
        const minPriceMatch =
          !minPrice || listing.priceCents >= Math.round(parseFloat(minPrice) * 100);
        const maxPriceMatch =
          !maxPrice || listing.priceCents <= Math.round(parseFloat(maxPrice) * 100);
        const searchMatch =
          !normalizedSearch ||
          [
            listing.title,
            listing.description,
            listing.category,
            listing.store.name,
            listing.store.owner.firstName,
            listing.store.owner.lastName,
          ]
            .filter(Boolean)
            .some((value) => value?.toLowerCase().includes(normalizedSearch));

        return categoryMatch && typeMatch && minPriceMatch && maxPriceMatch && searchMatch;
      })
      .sort((a, b) => {
        const statusDelta = STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status];

        if (statusDelta !== 0) {
          return statusDelta;
        }

        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [listings, searchTerm, selectedCategory, selectedType, minPrice, maxPrice]);

  const featuredStores = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return [...stores]
      .filter((store) => {
        if (!normalizedSearch) {
          return true;
        }

        return [
          store.name,
          store.slug,
          store.description,
          store.owner.firstName,
          store.owner.lastName,
        ]
          .filter(Boolean)
          .some((value) => value?.toLowerCase().includes(normalizedSearch));
      })
      .sort((a, b) => {
        const listingDelta = b._count.listings - a._count.listings;
        if (listingDelta !== 0) {
          return listingDelta;
        }

        return a.name.localeCompare(b.name);
      })
      .slice(0, 6);
  }, [stores, searchTerm]);

  const storeSummaries = useMemo(() => {
    const summaries = new Map<string, StoreDiscoverySummary>();

    for (const listing of listings) {
      const existing = summaries.get(listing.store.id) ?? {
        publicListings: 0,
        activeListings: 0,
        pendingListings: 0,
        soldListings: 0,
        topCategories: [],
        latestListingAt: null,
      };

      existing.publicListings += 1;
      existing.activeListings += listing.status === "ACTIVE" ? 1 : 0;
      existing.pendingListings += listing.status === "PENDING" ? 1 : 0;
      existing.soldListings += listing.status === "SOLD" ? 1 : 0;

      if (!existing.topCategories.includes(listing.category)) {
        existing.topCategories = [...existing.topCategories, listing.category].slice(0, 3);
      }

      if (!existing.latestListingAt || new Date(listing.createdAt) > new Date(existing.latestListingAt)) {
        existing.latestListingAt = listing.createdAt;
      }

      summaries.set(listing.store.id, existing);
    }

    return summaries;
  }, [listings]);

  const marketplaceSummary = useMemo(
    () => ({
      listings: listings.length,
      stores: stores.length,
      categories: Math.max(categories.length - 1, 0),
    }),
    [listings.length, stores.length, categories.length]
  );

  return (
    <div className="space-y-8">
      <InternalPageHeader
        title="Market"
        titleClassName="text-white"
        actions={
          sessionStatus === "authenticated" ? (
            <>
              <Link
                href="/marketplace/stores"
                aria-label="My stores"
                title="My stores"
                className="page-header-action border-white/14 bg-white/8 text-white hover:bg-white/12"
              >
                <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path strokeLinecap="round" d="M6 5.5h8" />
                  <path strokeLinecap="round" d="M6 10h8" />
                  <path strokeLinecap="round" d="M6 14.5h8" />
                  <circle cx="3.5" cy="5.5" r="0.75" fill="currentColor" stroke="none" />
                  <circle cx="3.5" cy="10" r="0.75" fill="currentColor" stroke="none" />
                  <circle cx="3.5" cy="14.5" r="0.75" fill="currentColor" stroke="none" />
                </svg>
                <span className="page-header-action-label">My Stores</span>
              </Link>
              <Link
                href="/marketplace/stores/create"
                aria-label="Create store"
                title="Create store"
                className="page-header-action border-white/14 bg-white/8 text-white hover:bg-white/12"
              >
                <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M8 3.25v9.5M3.25 8h9.5" />
                </svg>
                <span className="page-header-action-label">Create Store</span>
              </Link>
              <Link
                href="/marketplace/create"
                aria-label="Create listing"
                title="Create listing"
                className="page-header-action border-white bg-white text-slate-950 hover:opacity-90"
              >
                <svg aria-hidden="true" viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M8 3.25v9.5M3.25 8h9.5" />
                </svg>
                <span className="page-header-action-label">Create Listing</span>
              </Link>
            </>
          ) : null
        }
      />
      <p className="page-intro-copy max-w-3xl text-sm leading-7">
        Local store listings for products, artisan food, and community services.
      </p>

      <div className="rounded-[28px] border border-white/10 bg-white/82 p-6 shadow-[0_18px_42px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.18em] text-[#8f1d2c]">
              Local Discovery
            </p>
            <h2 className="section-display-title mb-3 text-3xl font-black">
              Browse what local stores are offering right now
            </h2>
            <p className="max-w-2xl text-slate-600">
              Discover approved local storefronts, compare active listings, and use trusted messaging when you are ready to reach out.
            </p>
            <div className="mt-5">
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Search listings and stores
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search by item, service, store, or seller"
                className="w-full max-w-2xl rounded-2xl border border-slate-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="marketplace-summary-tile p-4">
              <p className="marketplace-summary-label text-sm">Public listings</p>
              <p className="marketplace-summary-value mt-2 text-3xl font-bold">{marketplaceSummary.listings}</p>
            </div>
            <div className="marketplace-summary-tile marketplace-summary-tile-accent p-4">
              <p className="marketplace-summary-label text-sm">Approved stores</p>
              <p className="marketplace-summary-value mt-2 text-3xl font-bold">{marketplaceSummary.stores}</p>
            </div>
            <div className="marketplace-summary-tile marketplace-summary-tile-deep p-4">
              <p className="marketplace-summary-label text-sm">Categories</p>
              <p className="marketplace-summary-value mt-2 text-3xl font-bold">{marketplaceSummary.categories}</p>
            </div>
          </div>
        </div>
      </div>

      {featuredStores.length > 0 ? (
        <section className="mb-8">
          <div className="flex items-center justify-between gap-4 mb-4">
            <div>
              <h2 className="section-display-title text-3xl font-black">Browse Stores</h2>
              <p className="mt-1 text-sm text-slate-500">
                Start with the storefront if you want to see a seller&apos;s full local presence.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {featuredStores.map((store) => (
              <Link
                key={store.id}
                href={`/marketplace/stores/${store.id}`}
                className="group overflow-hidden rounded-[26px] border border-white/10 bg-white/82 shadow-[0_18px_42px_rgba(15,23,42,0.08)] backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_24px_55px_rgba(15,23,42,0.12)]"
              >
                <div className="h-28 bg-gradient-to-r from-[#46A8CC] via-[#7bc4dd] to-[#dceff6]">
                  {store.bannerUrl ? (
                    <img
                      src={store.bannerUrl}
                      alt={store.name}
                      className="w-full h-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="p-5">
                  <div className="-mt-10 flex items-end gap-4 mb-4">
                    <div className="w-20 h-20 rounded-2xl border-4 border-white bg-white text-[#46A8CC] shadow-sm flex items-center justify-center text-2xl font-bold overflow-hidden shrink-0">
                      {store.logoUrl ? (
                        <img
                          src={store.logoUrl}
                          alt={store.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        store.name.charAt(0)
                      )}
                    </div>
                    <div className="min-w-0 pb-2">
                      <h3 className="text-lg font-bold text-slate-950 transition-colors group-hover:text-[#8f1d2c]">
                        {store.name}
                      </h3>
                      <p className="text-sm text-gray-500">/{store.slug}</p>
                    </div>
                  </div>

                  {(() => {
                    const summary = storeSummaries.get(store.id);

                    return (
                      <div className="flex flex-wrap gap-2 mb-4">
                        <span className="rounded-full bg-[#f3f8fb] px-3 py-1 text-xs font-semibold text-[#1e6e88]">
                          {summary?.activeListings ?? 0} active
                        </span>
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                          {summary?.publicListings ?? 0} public
                        </span>
                        {summary?.topCategories[0] ? (
                          <span className="rounded-full bg-[#fff1f3] px-3 py-1 text-xs font-semibold text-[#A51E30]">
                            {summary.topCategories[0]}
                          </span>
                        ) : null}
                      </div>
                    );
                  })()}

                  <p className="text-sm text-gray-600 line-clamp-3 min-h-[3.75rem]">
                    {store.description || "This seller has not added a public description yet."}
                  </p>

                  <div className="flex items-center justify-between gap-3 mt-4 text-xs text-gray-500">
                    <span>
                      {store.owner.firstName} {store.owner.lastName}
                    </span>
                    <span>{formatRelativeDate(storeSummaries.get(store.id)?.latestListingAt ?? null)}</span>
                  </div>

                  <div className="flex items-center justify-between gap-3 mt-3 pt-3 border-t border-gray-100 text-sm">
                    <span className="font-semibold text-[#A51E30]">
                      Browse storefront
                    </span>
                    {store.websiteUrl ? (
                      <span className="text-gray-500">Website linked</span>
                    ) : (
                      <span className="text-gray-500">Message via listings</span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      <div className="rounded-[28px] border border-white/10 bg-white/82 p-5 shadow-[0_18px_42px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr_1fr] gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Category
            </label>
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() => setSelectedCategory(category)}
                  className={`rounded-full px-3 py-2 text-sm font-semibold transition ${
                    selectedCategory === category
                      ? "bg-slate-950 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Listing Type
            </label>
            <select
              value={selectedType}
              onChange={(event) =>
                setSelectedType(event.target.value as "ALL" | keyof typeof LISTING_TYPE_LABELS)
              }
              className="w-full rounded-xl border border-slate-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
            >
              <option value="ALL">All Types</option>
              {Object.entries(LISTING_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Price Range
            </label>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                min="0"
                step="0.01"
                value={minPrice}
                onChange={(event) => setMinPrice(event.target.value)}
                placeholder="Min"
                className="w-full rounded-xl border border-slate-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
              />
              <input
                type="number"
                min="0"
                step="0.01"
                value={maxPrice}
                onChange={(event) => setMaxPrice(event.target.value)}
                placeholder="Max"
                className="w-full rounded-xl border border-slate-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
              />
            </div>
          </div>
        </div>
        <p className="mt-4 text-sm text-gray-500">
          Buyer contact still happens through listing pages. Trusted members can message sellers directly from an active listing.
        </p>
      </div>

      {isLoading ? (
        <div className="rounded-[28px] border border-white/10 bg-white/70 p-12 text-center text-slate-500 shadow-[0_18px_42px_rgba(15,23,42,0.08)]">
          Loading marketplace listings...
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3">
          {error}
        </div>
      ) : filteredListings.length === 0 ? (
        <div className="marketplace-empty-state p-12 text-center">
          <h2 className="empty-state-title mb-2">No listings found</h2>
          <p className="empty-state-copy mx-auto max-w-xl">
            There are no public listings that match your current filters yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredListings.map((listing) => {
            const primaryPhoto = listing.photos[0]?.imageUrl;

            return (
              <Link
                key={listing.id}
                href={`/marketplace/${listing.id}`}
                className={`group overflow-hidden rounded-[26px] border border-white/10 bg-white/82 shadow-[0_18px_42px_rgba(15,23,42,0.08)] backdrop-blur transition duration-200 hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_24px_55px_rgba(15,23,42,0.12)] ${
                  listing.status === "SOLD" ? "opacity-80" : ""
                }`}
              >
                <div className="aspect-[4/3] bg-gray-100 overflow-hidden">
                  {primaryPhoto ? (
                    <img
                      src={primaryPhoto}
                      alt={listing.title}
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-200"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-sm text-gray-400">
                      No photo yet
                    </div>
                  )}
                </div>

                <div className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full bg-[#8f1d2c] px-3 py-1 text-xs font-medium text-white">
                        {listing.category}
                      </span>
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-[#46A8CC]">
                        {LISTING_TYPE_LABELS[listing.listingType]}
                      </span>
                      <span
                        className={`text-xs px-3 py-1 rounded-full font-medium ${LISTING_STATUS_STYLES[listing.status]}`}
                      >
                        {listing.status}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 whitespace-nowrap">
                      {formatDate(listing.createdAt)}
                    </span>
                  </div>

                  <h2 className="mb-2 text-lg font-bold text-slate-950 transition-colors group-hover:text-[#8f1d2c]">
                    {listing.title}
                  </h2>
                  <p className="mb-4 line-clamp-3 text-sm leading-7 text-slate-600">
                    {listing.description || "No description provided yet."}
                  </p>

                  {listing.status === "PENDING" ? (
                    <p className="text-sm text-yellow-800 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 mb-4">
                      Pending sale. The seller may already be working with a buyer.
                    </p>
                  ) : null}

                  {listing.status === "SOLD" ? (
                    <p className="text-sm text-slate-700 bg-slate-100 border border-slate-200 rounded-lg px-3 py-2 mb-4">
                      Marked sold and kept visible for transparency.
                    </p>
                  ) : null}

                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="text-2xl font-bold text-[#A51E30]">
                        {formatPrice(listing.priceCents)}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Sold by {listing.store.name}
                      </p>
                    </div>
                    <div className="text-right text-xs text-gray-500">
                      <div>
                        {listing.store.owner.firstName} {listing.store.owner.lastName}
                      </div>
                      <div className="mt-1 font-semibold" style={{ color: "#A51E30" }}>
                        {listing.status === "ACTIVE" ? "View details" : "View status"}
                      </div>
                      <div className="mt-1">Storefront linked on detail page</div>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
