"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import SendMessageButton from "@/app/profile/[id]/SendMessageButton";

interface ListingDetail {
  id: string;
  title: string;
  description: string | null;
  priceCents: number;
  category: string;
  listingType: "PRODUCT" | "FOOD" | "SERVICE";
  status: "ACTIVE" | "PENDING" | "SOLD" | "DRAFT" | "ARCHIVED" | "EXPIRED" | "REMOVED";
  contactMethod: string;
  createdAt: string;
  expiresAt: string | null;
  photos: Array<{
    id: string;
    imageUrl: string;
  }>;
  store: {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    logoUrl: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
    owner: {
      id: string;
      firstName: string;
      lastName: string;
      profilePhotoUrl: string | null;
      trustLevel: string;
    };
  };
}

interface MarketplaceResponse {
  listings: ListingSummary[];
}

interface ListingSummary {
  id: string;
  title: string;
  priceCents: number;
  status: "ACTIVE" | "PENDING" | "SOLD";
  createdAt: string;
  photos: Array<{
    id: string;
    imageUrl: string;
  }>;
}

interface PageProps {
  params: {
    id: string;
  };
}

const LISTING_TYPE_LABELS = {
  PRODUCT: "Product",
  FOOD: "Food",
  SERVICE: "Service",
} as const;

const STATUS_STYLES: Record<ListingDetail["status"], string> = {
  ACTIVE: "bg-green-100 text-green-800",
  PENDING: "bg-yellow-100 text-yellow-800",
  SOLD: "bg-slate-200 text-slate-800",
  DRAFT: "bg-gray-100 text-gray-700",
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
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default function ListingDetailPage({ params }: PageProps) {
  const { data: session, status: sessionStatus } = useSession();
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [relatedListings, setRelatedListings] = useState<ListingSummary[]>([]);
  const [selectedPhoto, setSelectedPhoto] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadListing() {
      setIsLoading(true);
      setError("");

      try {
        const res = await fetch(`/api/marketplace/${params.id}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to fetch listing");
        }

        setListing(data);
        setSelectedPhoto(data.photos?.[0]?.imageUrl || "");

        if (data.store?.id) {
          const relatedRes = await fetch(`/api/marketplace?storeId=${data.store.id}&limit=12`);
          const relatedData: MarketplaceResponse = await relatedRes.json();

          if (relatedRes.ok) {
            setRelatedListings(
              (relatedData.listings || []).filter((item) => item.id !== data.id).slice(0, 3)
            );
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch listing");
      } finally {
        setIsLoading(false);
      }
    }

    loadListing();
  }, [params.id]);

  const sellerName = useMemo(() => {
    if (!listing) return "";
    return `${listing.store.owner.firstName} ${listing.store.owner.lastName}`.trim();
  }, [listing]);

  const canMessageSeller =
    sessionStatus === "authenticated" &&
    (session?.user as { trust_level?: string; id?: string } | undefined)?.trust_level === "TRUSTED" &&
    (session?.user as { id?: string } | undefined)?.id !== listing?.store.owner.id &&
    listing?.status !== "SOLD";

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-12 text-center text-gray-500">
        Loading listing...
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3">
        {error || "Listing not found"}
      </div>
    );
  }

  const gallery = listing.photos.length > 0 ? listing.photos : [];
  const activePhoto = selectedPhoto || gallery[0]?.imageUrl || "";
  const statusMessage =
    listing.status === "PENDING"
      ? {
          className: "bg-yellow-50 border border-yellow-200 text-yellow-900",
          title: "Pending sale",
          body: "The seller has marked this listing as pending. It remains visible so buyers can see its current status.",
        }
      : listing.status === "SOLD"
        ? {
            className: "bg-slate-100 border border-slate-200 text-slate-900",
            title: "Sold",
            body: "This listing has been marked sold. It remains visible for transparency, but buyer messaging is closed.",
          }
        : null;

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/marketplace"
          className="text-sm font-medium hover:underline"
          style={{ color: "#A51E30" }}
        >
          Back to Market
        </Link>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-8 mb-10">
        <section>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="aspect-[4/3] bg-gray-100">
              {activePhoto ? (
                <img
                  src={activePhoto}
                  alt={listing.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-sm text-gray-400">
                  No photo yet
                </div>
              )}
            </div>

            {gallery.length > 1 ? (
              <div className="grid grid-cols-4 gap-3 p-4 border-t border-gray-100">
                {gallery.map((photo) => (
                  <button
                    key={photo.id}
                    type="button"
                    onClick={() => setSelectedPhoto(photo.imageUrl)}
                    className={`aspect-square rounded-lg overflow-hidden border-2 ${
                      activePhoto === photo.imageUrl
                        ? "border-[#A51E30]"
                        : "border-transparent"
                    }`}
                  >
                    <img
                      src={photo.imageUrl}
                      alt={listing.title}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </section>

        <section className="space-y-6">
          {statusMessage ? (
            <div className={`rounded-xl px-4 py-3 ${statusMessage.className}`}>
              <p className="font-semibold">{statusMessage.title}</p>
              <p className="text-sm mt-1">{statusMessage.body}</p>
            </div>
          ) : null}

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex flex-wrap gap-2 mb-3">
              <span
                className="text-xs text-white px-3 py-1 rounded-full font-medium"
                style={{ backgroundColor: "#A51E30" }}
              >
                {listing.category}
              </span>
              <span className="text-xs bg-blue-50 text-[#46A8CC] px-3 py-1 rounded-full font-medium">
                {LISTING_TYPE_LABELS[listing.listingType]}
              </span>
              <span
                className={`text-xs px-3 py-1 rounded-full font-medium ${STATUS_STYLES[listing.status]}`}
              >
                {listing.status}
              </span>
            </div>

            <h1 className="text-3xl font-bold mb-2">{listing.title}</h1>
            <p className="text-sm text-gray-500 mb-4">
              Listed {formatDate(listing.createdAt)}
            </p>
            <p className="text-4xl font-bold text-[#A51E30] mb-5">
              {formatPrice(listing.priceCents)}
            </p>

            <div className="border-t pt-5">
              <h2 className="text-lg font-bold mb-2">Description</h2>
              <p className="text-gray-700 whitespace-pre-wrap">
                {listing.description || "No description provided yet."}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-bold mb-4">Store Information</h2>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-full bg-[#46A8CC] text-white flex items-center justify-center font-bold text-lg overflow-hidden">
                {listing.store.logoUrl ? (
                  <img
                    src={listing.store.logoUrl}
                    alt={listing.store.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  listing.store.name.charAt(0)
                )}
              </div>
              <div>
                <Link
                  href={`/marketplace/stores/${listing.store.id}`}
                  className="font-semibold text-gray-900 hover:underline"
                >
                  {listing.store.name}
                </Link>
                <p className="text-sm text-gray-500">Owned by {sellerName}</p>
              </div>
            </div>

            {listing.store.description ? (
              <p className="text-sm text-gray-700 mb-4">{listing.store.description}</p>
            ) : null}

            <Link
              href={`/marketplace/stores/${listing.store.id}`}
              className="inline-flex items-center text-sm font-semibold hover:underline mb-4"
              style={{ color: "#A51E30" }}
            >
              View storefront
            </Link>

            {(listing.store.contactEmail || listing.store.contactPhone) ? (
              <div className="border-t pt-4 text-sm text-gray-700 space-y-1">
                <p className="font-semibold text-gray-900">Store Contact</p>
                {listing.store.contactEmail ? <p>Email: {listing.store.contactEmail}</p> : null}
                {listing.store.contactPhone ? <p>Phone: {listing.store.contactPhone}</p> : null}
              </div>
            ) : (
              <div className="border-t pt-4 text-sm text-gray-600">
                Contact details are visible to trusted members or store managers.
              </div>
            )}
          </div>

          {canMessageSeller ? (
            <SendMessageButton profileUserId={listing.store.owner.id} />
          ) : listing.status === "SOLD" ? (
            <div className="bg-slate-100 border border-slate-200 text-slate-800 rounded-xl px-4 py-3 text-sm">
              This listing is marked sold, so new buyer messages are disabled.
            </div>
          ) : sessionStatus === "authenticated" ? (
            <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-xl px-4 py-3 text-sm">
              Trusted membership is required before you can message sellers.
            </div>
          ) : (
            <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-xl px-4 py-3 text-sm">
              Sign in with a trusted account to message the seller.
            </div>
          )}
        </section>
      </div>

      {relatedListings.length > 0 ? (
        <section className="border-t pt-8">
          <div className="flex items-center justify-between gap-4 mb-6">
            <h2 className="text-2xl font-bold">More from {listing.store.name}</h2>
            <Link
              href={`/marketplace/stores/${listing.store.id}`}
              className="text-sm font-medium hover:underline"
              style={{ color: "#A51E30" }}
            >
              View storefront
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {relatedListings.map((related) => (
              <Link
                key={related.id}
                href={`/marketplace/${related.id}`}
                className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition"
              >
                <div className="aspect-[4/3] bg-gray-100">
                  {related.photos[0]?.imageUrl ? (
                    <img
                      src={related.photos[0].imageUrl}
                      alt={related.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-sm text-gray-400">
                      No photo yet
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <div className="mb-2">
                    <span
                      className={`text-xs px-2.5 py-1 rounded-full font-medium ${STATUS_STYLES[related.status]}`}
                    >
                      {related.status}
                    </span>
                  </div>
                  <h3 className="font-bold text-lg mb-2">{related.title}</h3>
                  <p className="text-2xl font-bold text-[#A51E30] mb-1">
                    {formatPrice(related.priceCents)}
                  </p>
                  <p className="text-xs text-gray-500">{formatDate(related.createdAt)}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
