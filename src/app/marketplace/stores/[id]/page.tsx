/* eslint-disable @next/next/no-img-element */

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

interface StoreDetail {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  websiteUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  status: "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "SUSPENDED";
  createdAt: string;
  owner: {
    id: string;
    firstName: string;
    lastName: string;
    profilePhotoUrl: string | null;
    trustLevel: string;
  };
  _count: {
    listings: number;
  };
  canManage: boolean;
}

interface StoreListing {
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
}

interface StoreListingsResponse {
  listings: StoreListing[];
}

interface PageProps {
  params: {
    id: string;
  };
}

const LISTING_TYPE_LABELS = {
  PRODUCT: "Products",
  FOOD: "Food",
  SERVICE: "Services",
} as const;

const STATUS_STYLES: Record<StoreListing["status"], string> = {
  ACTIVE: "bg-green-100 text-green-800",
  PENDING: "bg-yellow-100 text-yellow-800",
  SOLD: "bg-slate-200 text-slate-800",
};

const STORE_STATUS_STYLES: Record<StoreDetail["status"], string> = {
  PENDING_APPROVAL: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  SUSPENDED: "bg-slate-200 text-slate-800",
};

function formatStoreStatus(status: StoreDetail["status"]) {
  switch (status) {
    case "PENDING_APPROVAL":
      return "Pending approval";
    case "APPROVED":
      return "Approved";
    case "REJECTED":
      return "Rejected";
    case "SUSPENDED":
      return "Suspended";
  }
}

function formatPrice(priceCents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(priceCents / 100);
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function StorefrontPage({ params }: PageProps) {
  const [store, setStore] = useState<StoreDetail | null>(null);
  const [listings, setListings] = useState<StoreListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadStorefront() {
      setIsLoading(true);
      setError("");

      try {
        const [storeRes, listingsRes] = await Promise.all([
          fetch(`/api/stores/${params.id}`),
          fetch(`/api/marketplace?storeId=${params.id}&limit=100`),
        ]);

        const storeData = await storeRes.json();
        const listingsData: StoreListingsResponse = await listingsRes.json();

        if (!storeRes.ok) {
          throw new Error(storeData.error || "Failed to fetch storefront");
        }

        if (!listingsRes.ok) {
          throw new Error("Failed to fetch store listings");
        }

        setStore(storeData);
        setListings(listingsData.listings || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch storefront");
      } finally {
        setIsLoading(false);
      }
    }

    loadStorefront();
  }, [params.id]);

  const ownerName = useMemo(() => {
    if (!store) {
      return "";
    }

    return `${store.owner.firstName} ${store.owner.lastName}`.trim();
  }, [store]);

  const listingCounts = useMemo(
    () =>
      listings.reduce(
        (counts, listing) => {
          counts.total += 1;
          counts[listing.status] += 1;
          return counts;
        },
        { total: 0, ACTIVE: 0, PENDING: 0, SOLD: 0 }
      ),
    [listings]
  );

  const listingTypeCounts = useMemo(
    () =>
      listings.reduce(
        (counts, listing) => {
          counts[listing.listingType] += 1;
          return counts;
        },
        { PRODUCT: 0, FOOD: 0, SERVICE: 0 }
      ),
    [listings]
  );

  const topCategories = useMemo(() => {
    const counts = new Map<string, number>();

    for (const listing of listings) {
      counts.set(listing.category, (counts.get(listing.category) ?? 0) + 1);
    }

    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 5)
      .map(([category]) => category);
  }, [listings]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center text-gray-500">
        Loading storefront...
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(160deg,rgba(17,34,52,0.97),rgba(8,20,33,0.97))] px-6 py-8 text-white shadow-[0_24px_55px_rgba(7,17,26,0.18)]">
        {error || "Store not found"}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-4">
        <Link
          href="/marketplace"
          className="text-sm font-medium hover:underline"
          style={{ color: "var(--brand-accent)" }}
        >
          Back to Market
        </Link>
        {store.canManage ? (
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/marketplace/stores/${store.id}/edit`}
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-gray-100 text-gray-800 font-semibold hover:bg-gray-200"
            >
              Edit Store
            </Link>
            <Link
              href={`/marketplace/create?storeId=${store.id}`}
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-white font-semibold"
              style={{ backgroundColor: "var(--brand-accent)" }}
            >
              Create Listing
            </Link>
          </div>
        ) : null}
      </div>

      <section className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="h-44 md:h-56 bg-[var(--card-bg-accent)]">
          {store.bannerUrl ? (
            <img
              src={store.bannerUrl}
              alt={store.name}
              className="w-full h-full object-cover"
            />
          ) : null}
        </div>

        <div className="px-6 pb-6">
          <div className="-mt-12 md:-mt-14 flex flex-col md:flex-row md:items-end md:justify-between gap-5">
            <div className="flex items-end gap-4 min-w-0">
              <div className="w-24 h-24 md:w-28 md:h-28 rounded-2xl border-4 border-white bg-white text-[var(--brand-primary)] shadow-sm flex items-center justify-center text-3xl font-bold overflow-hidden shrink-0">
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
              <div className="min-w-0 pb-1">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-500">
                  Local Storefront
                </p>
                <h1 className="text-3xl font-bold text-gray-900 break-words">
                  {store.name}
                </h1>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-gray-500">
                  <span>Operated by {ownerName || "Community seller"}</span>
                  <span aria-hidden="true">•</span>
                  <span>Joined {formatDate(store.createdAt)}</span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${STORE_STATUS_STYLES[store.status]}`}
                  >
                    {formatStoreStatus(store.status)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 text-sm">
              <div className="rounded-xl bg-gray-100 px-4 py-3">
                <p className="text-gray-500">Public listings</p>
                <p className="text-xl font-bold text-gray-900">{listingCounts.total}</p>
              </div>
              <div className="rounded-xl bg-green-50 px-4 py-3">
                <p className="text-green-700">Active</p>
                <p className="text-xl font-bold text-green-900">{listingCounts.ACTIVE}</p>
              </div>
              <div className="rounded-xl bg-yellow-50 px-4 py-3">
                <p className="text-yellow-700">Pending</p>
                <p className="text-xl font-bold text-yellow-900">{listingCounts.PENDING}</p>
              </div>
              <div className="rounded-xl bg-slate-100 px-4 py-3">
                <p className="text-slate-600">Sold</p>
                <p className="text-xl font-bold text-slate-900">{listingCounts.SOLD}</p>
              </div>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 xl:grid-cols-[1.25fr_0.75fr] gap-6">
            <div className="space-y-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900 mb-2">About this store</h2>
                <p className="text-gray-700 whitespace-pre-wrap">
                  {store.description || "This seller has not added a public description yet."}
                </p>
              </div>

              <div className="flex flex-wrap gap-3 text-sm">
                {store.websiteUrl ? (
                  <a
                    href={store.websiteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-4 py-2 font-semibold hover:underline"
                    style={{ color: "var(--brand-accent)" }}
                  >
                    Visit website
                  </a>
                ) : null}
                <Link
                  href="/marketplace"
                  className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-4 py-2 font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Browse other stores
                </Link>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-[var(--card-bg-deep)] p-5">
                <h3 className="text-base font-bold text-gray-900 mb-3">What this store offers</h3>
                <div className="flex flex-wrap gap-2 mb-4">
                  {Object.entries(LISTING_TYPE_LABELS).map(([key, label]) => (
                    <span
                      key={key}
                      className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-gray-700 border border-gray-200"
                    >
                      {listingTypeCounts[key as keyof typeof listingTypeCounts]} {label.toLowerCase()}
                    </span>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {topCategories.length > 0 ? (
                    topCategories.map((category) => (
                      <span
                        key={category}
                        className="rounded-full px-3 py-1 text-xs font-semibold text-white"
                        style={{ backgroundColor: "var(--brand-accent)" }}
                      >
                        {category}
                      </span>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">
                      Categories will appear here after the first public listing is published.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
              <h2 className="text-lg font-bold text-gray-900 mb-3">Store contact</h2>
              {store.contactEmail || store.contactPhone ? (
                <div className="space-y-2 text-sm text-gray-700">
                  {store.contactEmail ? <p>Email: {store.contactEmail}</p> : null}
                  {store.contactPhone ? <p>Phone: {store.contactPhone}</p> : null}
                </div>
              ) : (
                <p className="text-sm text-gray-600">
                  Contact details are visible to trusted members or store managers.
                </p>
              )}
              <div className="mt-4 rounded-xl bg-white px-4 py-3 text-sm text-gray-600 border border-gray-200">
                Trusted members can message the seller from any active listing. Pending and sold items stay visible so buyers can understand the store&apos;s current activity.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Store listings</h2>
            <p className="text-sm text-gray-500 mt-1">
              Active listings are available now. Pending and sold items remain visible for buyer context.
            </p>
          </div>
          <p className="text-sm text-gray-500">{store._count.listings} total listings in this store</p>
        </div>

        {listings.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-10 text-center">
            <h3 className="text-xl font-bold text-gray-900 mb-2">No public listings yet</h3>
            <p className="text-gray-500 max-w-xl mx-auto">
              This store does not have any active, pending, or sold listings visible right now.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {listings.map((listing) => {
              const primaryPhoto = listing.photos[0]?.imageUrl;

              return (
                <Link
                  key={listing.id}
                  href={`/marketplace/${listing.id}`}
                  className={`group bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden border border-gray-200 ${
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
                    <div className="flex flex-wrap items-start gap-2 mb-3">
                      <span
                        className="text-xs text-white px-3 py-1 rounded-full font-medium"
                        style={{ backgroundColor: "var(--brand-accent)" }}
                      >
                        {listing.category}
                      </span>
                      <span className="text-xs bg-[var(--article-card-badge-bg)] text-[var(--brand-primary)] px-3 py-1 rounded-full font-medium">
                        {LISTING_TYPE_LABELS[listing.listingType]}
                      </span>
                      <span
                        className={`text-xs px-3 py-1 rounded-full font-medium ${STATUS_STYLES[listing.status]}`}
                      >
                        {listing.status}
                      </span>
                    </div>

                    <h3 className="font-bold text-lg mb-2 group-hover:text-[var(--brand-primary)] transition-colors">
                      {listing.title}
                    </h3>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                      {listing.description || "No description provided yet."}
                    </p>

                    <div className="flex items-end justify-between gap-3">
                      <div>
                        <p className="text-2xl font-bold text-[var(--brand-accent)]">
                          {formatPrice(listing.priceCents)}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          Listed {formatDate(listing.createdAt)}
                        </p>
                      </div>
                      <div
                        className="text-right text-xs font-semibold"
                        style={{ color: "var(--brand-accent)" }}
                      >
                        View listing
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
