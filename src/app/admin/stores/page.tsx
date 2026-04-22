/* eslint-disable @next/next/no-img-element */

"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

interface StoreRecord {
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
  updatedAt: string;
  approvedAt: string | null;
  owner: {
    id: string;
    firstName: string;
    lastName: string;
    trustLevel: string;
  };
  approvedBy: {
    id: string;
    firstName: string;
    lastName: string;
  } | null;
  _count: {
    listings: number;
  };
}

interface StoreCounts {
  all: number;
  pending: number;
  approved: number;
  rejected: number;
  suspended: number;
}

const STATUS_STYLES: Record<StoreRecord["status"], string> = {
  PENDING_APPROVAL: "bg-yellow-100 text-yellow-800",
  APPROVED: "bg-green-100 text-green-800",
  REJECTED: "bg-red-100 text-red-800",
  SUSPENDED: "bg-orange-100 text-orange-800",
};

function TrustBadge({ trustLevel }: { trustLevel: string }) {
  switch (trustLevel) {
    case "TRUSTED":
      return <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Trusted</span>;
    case "REGISTERED":
      return <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">Unverified</span>;
    default:
      return <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{trustLevel}</span>;
  }
}

function formatDate(value: string | null) {
  if (!value) {
    return "Not yet";
  }

  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function AdminStoresPage() {
  const [stores, setStores] = useState<StoreRecord[]>([]);
  const [counts, setCounts] = useState<StoreCounts>({
    all: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    suspended: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeFilter, setActiveFilter] = useState<"ALL" | StoreRecord["status"]>("ALL");
  const [expandedStoreId, setExpandedStoreId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [statusTarget, setStatusTarget] = useState<{
    id: string;
    nextStatus: "APPROVED" | "REJECTED" | "SUSPENDED";
    label: string;
  } | null>(null);
  const [statusReason, setStatusReason] = useState("");

  useEffect(() => {
    async function fetchStores() {
      setIsLoading(true);
      setError("");

      try {
        const params = new URLSearchParams();
        if (activeFilter !== "ALL") {
          params.set("status", activeFilter);
        }
        if (searchQuery.trim()) {
          params.set("q", searchQuery.trim());
        }

        const queryString = params.toString();
        const res = await fetch(`/api/admin/stores${queryString ? `?${queryString}` : ""}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to fetch stores");
        }

        setStores(data.stores || []);
        setCounts(data.counts || {
          all: 0,
          pending: 0,
          approved: 0,
          rejected: 0,
          suspended: 0,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch stores");
      } finally {
        setIsLoading(false);
      }
    }

    fetchStores();
  }, [activeFilter, searchQuery, refreshKey]);

  const filterButtons = useMemo(
    () => [
      { value: "ALL" as const, label: "All", count: counts.all },
      { value: "PENDING_APPROVAL" as const, label: "Pending", count: counts.pending },
      { value: "APPROVED" as const, label: "Approved", count: counts.approved },
      { value: "REJECTED" as const, label: "Rejected", count: counts.rejected },
      { value: "SUSPENDED" as const, label: "Suspended", count: counts.suspended },
    ],
    [counts]
  );

  async function updateStoreStatus(
    storeId: string,
    nextStatus: "APPROVED" | "REJECTED" | "SUSPENDED"
  ) {
    setActionLoading(storeId);

    try {
      const res = await fetch(`/api/admin/stores/${storeId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: nextStatus,
          reason: statusReason.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to update store");
      }

      setStatusTarget(null);
      setStatusReason("");
      setRefreshKey((prev) => prev + 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update store");
    } finally {
      setActionLoading(null);
    }
  }

  function renderActions(store: StoreRecord) {
    const isProcessing = actionLoading === store.id;

    if (store.status === "PENDING_APPROVAL") {
      return (
        <>
          <button
            type="button"
            onClick={() =>
              setStatusTarget({ id: store.id, nextStatus: "APPROVED", label: "Approve Store" })
            }
            disabled={isProcessing}
            className="px-4 py-2 rounded-lg bg-green-600 text-white font-semibold disabled:opacity-60"
          >
            Approve
          </button>
          <button
            type="button"
            onClick={() =>
              setStatusTarget({ id: store.id, nextStatus: "REJECTED", label: "Reject Store" })
            }
            disabled={isProcessing}
            className="px-4 py-2 rounded-lg bg-red-600 text-white font-semibold disabled:opacity-60"
          >
            Reject
          </button>
        </>
      );
    }

    if (store.status === "APPROVED") {
      return (
        <button
          type="button"
          onClick={() =>
            setStatusTarget({ id: store.id, nextStatus: "SUSPENDED", label: "Suspend Store" })
          }
          disabled={isProcessing}
          className="px-4 py-2 rounded-lg bg-orange-100 text-orange-800 font-semibold disabled:opacity-60"
        >
          Suspend
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={() =>
          setStatusTarget({ id: store.id, nextStatus: "APPROVED", label: "Approve Store" })
        }
        disabled={isProcessing}
        className="px-4 py-2 rounded-lg bg-green-100 text-green-800 font-semibold disabled:opacity-60"
      >
        Mark Approved
      </button>
    );
  }

  return (
    <div className="space-y-8">
      <div
        className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 pb-3 border-b-2"
        style={{ borderColor: "var(--brand-accent)" }}
      >
        <div>
          <h1 className="text-2xl font-bold">Store Management</h1>
          <p className="text-sm text-gray-500 mt-1">
            Review storefront submissions, manage approval state, and intervene on live stores.
          </p>
        </div>
        <div className="text-sm text-gray-500">
          {counts.pending} pending approval
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {filterButtons.map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => setActiveFilter(filter.value)}
            className={`rounded-xl border px-4 py-4 text-left transition ${
              activeFilter === filter.value
                ? "border-[var(--brand-accent)] bg-[var(--status-error-bg)]"
                : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            <p className="text-sm text-gray-500">{filter.label}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{filter.count}</p>
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 md:p-5">
        <div className="flex flex-col md:flex-row gap-3">
          <input
            type="text"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                setSearchQuery(searchInput);
              }
            }}
            placeholder="Search by store, slug, owner, or contact"
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
          />
          <button
            type="button"
            onClick={() => setSearchQuery(searchInput)}
            className="px-4 py-2 rounded-lg text-white font-semibold"
            style={{ backgroundColor: "var(--brand-accent)" }}
          >
            Search
          </button>
          {(searchQuery || searchInput) ? (
            <button
              type="button"
              onClick={() => {
                setSearchInput("");
                setSearchQuery("");
              }}
              className="px-4 py-2 rounded-lg bg-gray-100 text-gray-800 font-semibold"
            >
              Clear
            </button>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-10 text-center text-gray-500">
          Loading stores...
        </div>
      ) : stores.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-10 text-center">
          <h2 className="text-xl font-bold text-gray-900 mb-2">No stores found</h2>
          <p className="text-gray-500">
            There are no stores matching the current filter.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {stores.map((store) => {
            const isExpanded = expandedStoreId === store.id;

            return (
              <article
                key={store.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
              >
                <div className="p-5">
                  <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5">
                    <div className="flex items-start gap-4 min-w-0">
                      <div className="w-16 h-16 rounded-2xl bg-[var(--brand-primary)] text-white font-bold flex items-center justify-center overflow-hidden shrink-0">
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
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[store.status]}`}>
                            {store.status.replace(/_/g, " ")}
                          </span>
                          <span className="text-xs text-gray-400">
                            Updated {formatDate(store.updatedAt)}
                          </span>
                        </div>
                        <h2 className="text-xl font-bold text-gray-900">{store.name}</h2>
                        <p className="text-sm text-gray-500 mt-1">/{store.slug}</p>
                        {store.description ? (
                          <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                            {store.description}
                          </p>
                        ) : null}
                        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mt-3">
                          <span className="font-medium">
                            {store.owner.firstName} {store.owner.lastName}
                          </span>
                          <TrustBadge trustLevel={store.owner.trustLevel} />
                          <span>{store._count.listings} listings</span>
                          <span>Submitted {formatDate(store.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 xl:justify-end">
                      <button
                        type="button"
                        onClick={() => setExpandedStoreId(isExpanded ? null : store.id)}
                        className="px-4 py-2 rounded-lg bg-gray-100 text-gray-800 font-semibold"
                      >
                        {isExpanded ? "Collapse" : "Review"}
                      </button>
                      {store.status === "APPROVED" ? (
                        <Link
                          href={`/marketplace/stores/${store.id}`}
                          className="px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-800 font-semibold"
                        >
                          View Storefront
                        </Link>
                      ) : null}
                      {renderActions(store)}
                    </div>
                  </div>
                </div>

                {isExpanded ? (
                  <div className="border-t border-gray-100 bg-gray-50 p-5 space-y-5">
                    <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
                      <div className="space-y-3 text-sm text-gray-700">
                        <p>
                          <span className="font-semibold text-gray-900">Description:</span>{" "}
                          {store.description || "No description provided"}
                        </p>
                        <p>
                          <span className="font-semibold text-gray-900">Website:</span>{" "}
                          {store.websiteUrl || "None"}
                        </p>
                        <p>
                          <span className="font-semibold text-gray-900">Email:</span>{" "}
                          {store.contactEmail || "None"}
                        </p>
                        <p>
                          <span className="font-semibold text-gray-900">Phone:</span>{" "}
                          {store.contactPhone || "None"}
                        </p>
                        <p>
                          <span className="font-semibold text-gray-900">Approved:</span>{" "}
                          {formatDate(store.approvedAt)}
                          {store.approvedBy
                            ? ` by ${store.approvedBy.firstName} ${store.approvedBy.lastName}`
                            : ""}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                          {store.logoUrl ? (
                            <img
                              src={store.logoUrl}
                              alt={`${store.name} logo`}
                              className="w-full h-28 object-cover"
                            />
                          ) : (
                            <div className="h-28 flex items-center justify-center text-xs text-gray-400">
                              No logo
                            </div>
                          )}
                        </div>
                        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                          {store.bannerUrl ? (
                            <img
                              src={store.bannerUrl}
                              alt={`${store.name} banner`}
                              className="w-full h-28 object-cover"
                            />
                          ) : (
                            <div className="h-28 flex items-center justify-center text-xs text-gray-400">
                              No banner
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}

      {statusTarget ? (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold mb-3">{statusTarget.label}</h3>
            <p className="text-sm text-gray-600 mb-4">
              {statusTarget.nextStatus === "APPROVED"
                ? "This store will be approved for public storefront visibility and listing publication."
                : statusTarget.nextStatus === "REJECTED"
                  ? "This store will be marked rejected. The seller can edit and resubmit it later."
                  : "This store will be suspended from public visibility until staff re-approves it."}
            </p>
            <textarea
              value={statusReason}
              onChange={(event) => setStatusReason(event.target.value)}
              rows={4}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm mb-4"
              placeholder="Optional internal note or feedback"
            />
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setStatusTarget(null);
                  setStatusReason("");
                }}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => updateStoreStatus(statusTarget.id, statusTarget.nextStatus)}
                disabled={actionLoading === statusTarget.id}
                className="px-4 py-2 rounded-lg bg-[var(--brand-accent)] text-white text-sm font-semibold disabled:opacity-60"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
