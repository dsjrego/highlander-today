/* eslint-disable @next/next/no-img-element */

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import InternalPageHeader from "@/components/shared/InternalPageHeader";

interface Store {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  status: "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "SUSPENDED";
  canManage: boolean;
  listings?: Listing[];
  _count: {
    listings: number;
  };
}

interface Listing {
  id: string;
  title: string;
  status: "PENDING" | "ACTIVE" | "SOLD" | "DRAFT" | "ARCHIVED" | "EXPIRED" | "REMOVED";
  priceCents: number;
  createdAt: string;
  updatedAt: string;
  category: string;
  listingType: "PRODUCT" | "FOOD" | "SERVICE";
  photos: Array<{
    id: string;
    imageUrl: string;
  }>;
}

const STATUS_STYLES: Record<Store["status"], string> = {
  PENDING_APPROVAL: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  SUSPENDED: "bg-orange-100 text-orange-800",
};

const LISTING_STATUS_STYLES: Record<Listing["status"], string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  PENDING: "bg-yellow-100 text-yellow-800",
  ACTIVE: "bg-green-100 text-green-800",
  SOLD: "bg-slate-200 text-slate-800",
  ARCHIVED: "bg-gray-200 text-gray-700",
  EXPIRED: "bg-orange-100 text-orange-800",
  REMOVED: "bg-red-100 text-red-800",
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

export default function MyStoresPage() {
  const [stores, setStores] = useState<Store[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusUpdates, setStatusUpdates] = useState<Record<string, boolean>>({});
  const [deletingListings, setDeletingListings] = useState<Record<string, boolean>>({});

  useEffect(() => {
    async function fetchStores() {
      setIsLoading(true);
      setError("");

      try {
        const res = await fetch("/api/stores?mine=1&includeListings=1");
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to fetch stores");
        }

        setStores((data.stores || []).filter((store: Store) => store.canManage));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch stores");
      } finally {
        setIsLoading(false);
      }
    }

    fetchStores();
  }, []);

  async function updateListingStatus(
    storeId: string,
    listingId: string,
    nextStatus: "PENDING" | "ACTIVE" | "SOLD"
  ) {
    setError("");
    setStatusUpdates((prev) => ({ ...prev, [listingId]: true }));

    try {
      const res = await fetch(`/api/marketplace/${listingId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update listing status");
      }

      setStores((prev) =>
        prev.map((store) =>
          store.id !== storeId
            ? store
            : {
                ...store,
                listings: (store.listings || []).map((listing) =>
                  listing.id === listingId
                    ? {
                        ...listing,
                        status: data.status,
                        updatedAt: data.updatedAt || new Date().toISOString(),
                      }
                    : listing
                ),
              }
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update listing status");
    } finally {
      setStatusUpdates((prev) => ({ ...prev, [listingId]: false }));
    }
  }

  async function deleteListing(storeId: string, listingId: string, title: string) {
    const confirmed = window.confirm(
      `Delete "${title}"? This removes the listing permanently.`
    );

    if (!confirmed) {
      return;
    }

    setError("");
    setDeletingListings((prev) => ({ ...prev, [listingId]: true }));

    try {
      const res = await fetch(`/api/marketplace/${listingId}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete listing");
      }

      setStores((prev) =>
        prev.map((store) =>
          store.id !== storeId
            ? store
            : {
                ...store,
                _count: {
                  ...store._count,
                  listings: Math.max(0, store._count.listings - 1),
                },
                listings: (store.listings || []).filter(
                  (listing) => listing.id !== listingId
                ),
              }
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete listing");
    } finally {
      setDeletingListings((prev) => ({ ...prev, [listingId]: false }));
    }
  }

  function renderListingActions(storeId: string, listing: Listing) {
    const isUpdating = Boolean(statusUpdates[listing.id]);
    const isDeleting = Boolean(deletingListings[listing.id]);

    const statusActions =
      listing.status === "ACTIVE" ? (
        <>
          <button
            type="button"
            onClick={() => updateListingStatus(storeId, listing.id, "PENDING")}
            disabled={isUpdating || isDeleting}
            className="px-3 py-2 rounded-lg bg-yellow-100 text-yellow-800 font-semibold disabled:opacity-60"
          >
            Mark Pending
          </button>
          <button
            type="button"
            onClick={() => updateListingStatus(storeId, listing.id, "SOLD")}
            disabled={isUpdating || isDeleting}
            className="px-3 py-2 rounded-lg bg-slate-200 text-slate-800 font-semibold disabled:opacity-60"
          >
            Mark Sold
          </button>
        </>
      ) : listing.status === "PENDING" ? (
        <>
          <button
            type="button"
            onClick={() => updateListingStatus(storeId, listing.id, "ACTIVE")}
            disabled={isUpdating || isDeleting}
            className="px-3 py-2 rounded-lg bg-green-100 text-green-800 font-semibold disabled:opacity-60"
          >
            Mark Active
          </button>
          <button
            type="button"
            onClick={() => updateListingStatus(storeId, listing.id, "SOLD")}
            disabled={isUpdating || isDeleting}
            className="px-3 py-2 rounded-lg bg-slate-200 text-slate-800 font-semibold disabled:opacity-60"
          >
            Mark Sold
          </button>
        </>
      ) : listing.status === "SOLD" ? (
        <button
          type="button"
          onClick={() => updateListingStatus(storeId, listing.id, "ACTIVE")}
          disabled={isUpdating || isDeleting}
          className="px-3 py-2 rounded-lg bg-green-100 text-green-800 font-semibold disabled:opacity-60"
        >
          Mark Active
        </button>
      ) : (
        <span className="text-xs text-gray-500">
          Status changes are available once the listing is active in the seller workflow.
        </span>
      );

    return (
      <>
        {statusActions}
        <Link
          href={`/marketplace/${listing.id}/edit`}
          className={`px-3 py-2 rounded-lg bg-gray-100 text-gray-800 font-semibold ${
            isDeleting ? "pointer-events-none opacity-60" : "hover:bg-gray-200"
          }`}
        >
          Edit
        </Link>
        <button
          type="button"
          onClick={() => deleteListing(storeId, listing.id, listing.title)}
          disabled={isDeleting || isUpdating}
          className="px-3 py-2 rounded-lg bg-red-50 text-red-700 font-semibold disabled:opacity-60"
        >
          {isDeleting ? "Deleting..." : "Delete"}
        </button>
      </>
    );
  }

  return (
    <div className="space-y-8">
      <InternalPageHeader
        title="My Stores"
        actions={
          <Link
            href="/marketplace/stores/create"
            className="inline-flex items-center rounded-full bg-white px-2 py-2 text-sm font-semibold text-slate-950 transition hover:opacity-90"
          >
            <svg
              aria-hidden="true"
              viewBox="0 0 16 16"
              className="h-3.5 w-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M8 3.25v9.5M3.25 8h9.5" />
            </svg>
            Create Store
          </Link>
        }
      />
      <p className="max-w-3xl text-sm leading-7 text-slate-500">
        Manage your marketplace stores, track approval status, and resubmit rejected stores.
      </p>

      {isLoading ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-500">
          Loading your stores...
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      ) : stores.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-xl font-bold mb-3">No stores yet</h2>
          <p className="text-gray-600 mb-6 max-w-2xl">
            Create a store first. Once it is approved, you can publish marketplace listings from it.
          </p>
          <Link
            href="/marketplace/stores/create"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-full text-white font-semibold"
            style={{ backgroundColor: "#A51E30" }}
          >
            Create Your First Store
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {stores.map((store) => (
            <article
              key={store.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
            >
              <div className="p-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-14 h-14 rounded-full bg-[#46A8CC] text-white font-bold flex items-center justify-center overflow-hidden shrink-0">
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
                    <div className="min-w-0">
                      <h2 className="text-lg font-bold truncate">{store.name}</h2>
                      <p className="text-xs text-gray-500">/{store.slug}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[store.status]}`}>
                    {store.status.replace(/_/g, " ")}
                  </span>
                </div>

                <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                  {store.description || "No description provided yet."}
                </p>

                <div className="flex items-center justify-between text-sm text-gray-500 mb-5">
                  <span>{store._count.listings} listings</span>
                  <span>
                    {store.status === "REJECTED"
                      ? "Edit and resubmit"
                      : store.status === "PENDING_APPROVAL"
                        ? "Awaiting review"
                        : store.status === "APPROVED"
                          ? "Ready for listings"
                          : "Contact admin"}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  {store.status === "APPROVED" ? (
                    <Link
                      href={`/marketplace/stores/${store.id}`}
                      className="flex-1 inline-flex items-center justify-center px-4 py-2.5 rounded-lg border border-gray-300 bg-white text-gray-800 font-semibold hover:bg-gray-50"
                    >
                      View Storefront
                    </Link>
                  ) : null}
                  <Link
                    href={`/marketplace/stores/${store.id}/edit`}
                    className="flex-1 inline-flex items-center justify-center px-4 py-2.5 rounded-lg bg-gray-100 text-gray-800 font-semibold hover:bg-gray-200"
                  >
                    {store.status === "REJECTED" ? "Edit & Resubmit" : "Edit Store"}
                  </Link>
                  {store.status === "APPROVED" ? (
                    <Link
                      href={`/marketplace/create?storeId=${store.id}`}
                      className="flex-1 inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-white font-semibold"
                      style={{ backgroundColor: "#46A8CC" }}
                    >
                      Create Listing
                    </Link>
                  ) : null}
                </div>

                {store.status === "APPROVED" ? (
                  <div className="mt-6 border-t border-gray-100 pt-5">
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <h3 className="text-base font-bold text-gray-900">Manage Listings</h3>
                      <span className="text-xs text-gray-500">
                        Update status as inquiries progress.
                      </span>
                    </div>

                    {(store.listings || []).length === 0 ? (
                      <div className="rounded-lg border border-dashed border-gray-200 px-4 py-5 text-sm text-gray-500">
                        No listings yet for this store.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {(store.listings || []).map((listing) => (
                          <div
                            key={listing.id}
                            className="rounded-xl border border-gray-200 p-4"
                          >
                            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                              <div className="flex items-start gap-4 min-w-0">
                                <div className="w-16 h-16 rounded-lg bg-gray-100 overflow-hidden shrink-0">
                                  {listing.photos[0]?.imageUrl ? (
                                    <img
                                      src={listing.photos[0].imageUrl}
                                      alt={listing.title}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-xs text-gray-400">
                                      No image
                                    </div>
                                  )}
                                </div>
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-2 mb-2">
                                    <Link
                                      href={`/marketplace/${listing.id}`}
                                      className="font-semibold text-gray-900 hover:underline"
                                    >
                                      {listing.title}
                                    </Link>
                                    <span
                                      className={`px-2.5 py-1 rounded-full text-xs font-semibold ${LISTING_STATUS_STYLES[listing.status]}`}
                                    >
                                      {listing.status}
                                    </span>
                                  </div>
                                  <p className="text-sm font-semibold text-[#A51E30]">
                                    {formatPrice(listing.priceCents)}
                                  </p>
                                  <p className="text-xs text-gray-500 mt-1">
                                    {listing.category} • {listing.listingType} • Updated{" "}
                                    {formatDate(listing.updatedAt)}
                                  </p>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-2">
                                {renderListingActions(store.id, listing)}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
