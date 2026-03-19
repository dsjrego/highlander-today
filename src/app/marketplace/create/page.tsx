"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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

export default function CreateListingPage() {
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
    <div>
      <div
        className="flex items-start justify-between gap-4 mb-8 pb-3 border-b-2"
        style={{ borderColor: "#A51E30" }}
      >
        <div>
          <h1 className="text-2xl font-bold">Create a Listing</h1>
          <p className="text-sm text-gray-500 mt-1">
            Publish a product, food item, or service from one of your approved stores.
          </p>
        </div>
      </div>

      {error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      ) : null}

      {isLoadingStores ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-500">
          Loading your stores...
        </div>
      ) : stores.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-xl font-bold mb-3">No approved stores available</h2>
          <p className="text-gray-600 mb-4 max-w-2xl">
            Listings now belong to approved stores. You do not have an approved store you can manage yet, so listing creation is not available from this page.
          </p>
          <p className="text-sm text-gray-500">
            Create a store first, then wait for approval before publishing listings from it.
          </p>
          <div className="mt-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/marketplace/stores"
                className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-gray-100 text-gray-800 font-semibold"
              >
                View My Stores
              </Link>
              <Link
                href="/marketplace/stores/create"
                className="inline-flex items-center justify-center px-5 py-2.5 rounded-full text-white font-semibold"
                style={{ backgroundColor: "#A51E30" }}
              >
                Create a Store
              </Link>
              <Link
                href="/marketplace"
                className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-gray-200 text-gray-800 font-semibold"
              >
                Back to Market
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <>
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8 space-y-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Store
                </label>
                <select
                  name="storeId"
                  value={formData.storeId}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
                >
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name} ({store._count.listings} listings)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Listing Type
                </label>
                <select
                  name="listingType"
                  value={formData.listingType}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
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
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Listing Title
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="What are you offering?"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Category
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
                >
                  {CATEGORY_OPTIONS.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
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
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={6}
                placeholder="Describe the item or service clearly, including quality, quantity, delivery expectations, or booking details."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
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
                className="flex-1 bg-[#46A8CC] text-white font-bold py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {isSaving ? "Creating..." : "Create Listing"}
              </button>
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 bg-gray-300 text-gray-800 font-bold py-2.5 rounded-lg hover:bg-gray-400 transition"
              >
                Cancel
              </button>
            </div>
          </form>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-gray-700">
            <p className="font-semibold mb-2">Listing guidelines</p>
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
