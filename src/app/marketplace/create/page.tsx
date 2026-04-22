"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import FormCard from "@/components/shared/FormCard";
import ImageUpload from "@/components/shared/ImageUpload";

interface StoreOption {
  id: string;
  name: string;
  status: string;
  canManage: boolean;
  _count: {
    listings: number;
  };
}

const CATEGORY_OPTIONS = [
  "Groceries & Artisan Food",
  "Home & Garden",
  "Furniture",
  "Electronics",
  "Clothing",
  "Books",
  "Services",
  "Other",
];

const LISTING_TYPE_OPTIONS = [
  { value: "PRODUCT", label: "Product" },
  { value: "FOOD", label: "Food" },
  { value: "SERVICE", label: "Service" },
] as const;

function CreateListingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [stores, setStores] = useState<StoreOption[]>([]);
  const [isLoadingStores, setIsLoadingStores] = useState(true);
  const [formData, setFormData] = useState({
    storeId: "",
    title: "",
    description: "",
    price: "",
    category: CATEGORY_OPTIONS[0],
    listingType: "PRODUCT",
    images: [] as string[],
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchStores() {
      setIsLoadingStores(true);
      setError("");

      try {
        const res = await fetch("/api/stores?mine=1&status=APPROVED");
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to load stores");
        }

        const manageableStores = (data.stores || []).filter(
          (store: StoreOption) => store.canManage
        );
        const requestedStoreId = searchParams.get("storeId");
        const matchedRequestedStore = manageableStores.find(
          (store: StoreOption) => store.id === requestedStoreId
        );

        setStores(manageableStores);
        setFormData((prev) => ({
          ...prev,
          storeId:
            prev.storeId ||
            matchedRequestedStore?.id ||
            manageableStores[0]?.id ||
            "",
        }));
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load stores");
      } finally {
        setIsLoadingStores(false);
      }
    }

    fetchStores();
  }, [searchParams]);

  function handleInputChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!formData.storeId) {
      setError("Select an approved store before creating a listing.");
      return;
    }
    if (!formData.title.trim()) {
      setError("Title is required.");
      return;
    }
    if (!formData.description.trim()) {
      setError("Description is required.");
      return;
    }
    if (!formData.price || Number(formData.price) < 0) {
      setError("A valid price is required.");
      return;
    }

    setIsSaving(true);

    try {
      const res = await fetch("/api/marketplace", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          storeId: formData.storeId,
          title: formData.title,
          description: formData.description,
          priceCents: Math.round(Number(formData.price) * 100),
          category: formData.category,
          listingType: formData.listingType,
          contactMethod: "message",
          images: formData.images,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        const validationMessage = Array.isArray(data.details)
          ? data.details
              .map((detail: { message?: string }) => detail.message)
              .filter(Boolean)
              .join(", ")
          : "";
        throw new Error(validationMessage || data.error || "Failed to create listing");
      }

      router.push(`/marketplace/${data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create listing");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(145deg,rgba(143,29,44,0.96),rgba(10,32,51,0.94))] px-6 py-8 text-white shadow-[0_35px_80px_rgba(7,17,26,0.22)] md:px-10 md:py-10">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-100/74">
            Market
          </p>
          <h1 className="mt-4 text-4xl font-black leading-[0.95] tracking-[-0.05em] md:text-6xl">Create a listing</h1>
          <p className="mt-4 text-base leading-8 text-white/78 md:text-lg">
            Publish a product, food item, or service from one of your approved stores.
          </p>
        </div>
      </section>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          {error}
        </div>
      ) : null}

      {isLoadingStores ? (
        <div className="rounded-[28px] border border-white/10 bg-white/70 p-8 text-center text-slate-500 shadow-[0_18px_42px_rgba(15,23,42,0.08)]">
          Loading your stores...
        </div>
      ) : stores.length === 0 ? (
        <div className="rounded-[28px] border border-white/10 bg-white/82 p-8 shadow-[0_18px_42px_rgba(15,23,42,0.08)] backdrop-blur">
          <h2 className="text-xl font-bold mb-3">No approved stores available</h2>
          <p className="mb-4 max-w-2xl text-slate-600">
            Listings now belong to approved stores. You do not have an approved store you can manage yet, so listing creation is not available from this page.
          </p>
          <p className="text-sm text-slate-500">
            Create a store first, then wait for approval before publishing listings from it.
          </p>
          <div className="mt-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/marketplace/stores"
                className="inline-flex items-center justify-center rounded-full bg-slate-100 px-5 py-2.5 font-semibold text-slate-800"
              >
                View My Stores
              </Link>
              <Link
                href="/marketplace/stores/create"
                className="inline-flex items-center justify-center rounded-full bg-slate-950 px-5 py-2.5 font-semibold text-white"
              >
                Create a Store
              </Link>
              <Link
                href="/marketplace"
                className="inline-flex items-center justify-center rounded-full bg-slate-200 px-5 py-2.5 font-semibold text-slate-800"
              >
                Back to Market
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <>
          <FormCard>
            <form
              onSubmit={handleSubmit}
              className="space-y-6"
            >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Store
                </label>
                <select
                  name="storeId"
                  value={formData.storeId}
                  onChange={handleInputChange}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                >
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name} ({store._count.listings} listings)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Listing Type
                </label>
                <select
                  name="listingType"
                  value={formData.listingType}
                  onChange={handleInputChange}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                >
                  {LISTING_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Listing Title
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="What are you offering?"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-6">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Category
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                >
                  {CATEGORY_OPTIONS.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">
                  Price
                </label>
                <input
                  type="number"
                  name="price"
                  min="0"
                  step="0.01"
                  value={formData.price}
                  onChange={handleInputChange}
                  placeholder="0.00"
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={6}
                placeholder="Describe the item or service clearly, including quality, quantity, delivery expectations, or booking details."
                className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
              />
            </div>

            <ImageUpload
              context="marketplace"
              maxFiles={5}
              value={formData.images}
              onUpload={(image) =>
                setFormData((prev) => ({
                  ...prev,
                  images: [...prev.images, image.url],
                }))
              }
              onRemove={(url) =>
                setFormData((prev) => ({
                  ...prev,
                  images: prev.images.filter((imageUrl) => imageUrl !== url),
                }))
              }
              label="Photos"
              helperText="Add up to 5 photos. Clear photos make local buyers much more likely to reach out."
            />

            <div className="flex flex-col sm:flex-row gap-4">
              <button
                type="submit"
                disabled={isSaving}
                className="flex-1 rounded-xl bg-slate-950 py-3 font-bold text-white transition hover:opacity-90 disabled:opacity-50"
              >
                {isSaving ? "Creating..." : "Create Listing"}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 rounded-xl border border-slate-300 py-3 font-bold text-slate-800 transition hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
            </form>
          </FormCard>

          <div className="rounded-[26px] border border-white/10 bg-[linear-gradient(160deg,rgba(17,34,52,0.97),rgba(8,20,33,0.97))] p-4 text-sm text-white shadow-[0_24px_55px_rgba(7,17,26,0.18)]">
            <p className="mb-2 font-semibold text-cyan-100/74">Listing guidelines</p>
            <ul className="space-y-1 list-disc list-inside text-xs">
              <li>Listings publish from approved stores only.</li>
              <li>Trusted buyers will use private messaging to contact sellers.</li>
              <li>Use specific titles and realistic pricing.</li>
              <li>Food and service listings should explain pickup, delivery, or scheduling expectations.</li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

export default function CreateListingPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-[28px] border border-white/10 bg-white/70 p-8 text-center text-slate-500 shadow-[0_18px_42px_rgba(15,23,42,0.08)]">
          Loading listing form...
        </div>
      }
    >
      <CreateListingPageContent />
    </Suspense>
  );
}
