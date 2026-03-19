"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ImageUpload from "@/components/shared/ImageUpload";

interface ListingDetail {
  id: string;
  title: string;
  description: string | null;
  priceCents: number;
  category: string;
  listingType: "PRODUCT" | "FOOD" | "SERVICE";
  status: string;
  photos: Array<{
    id: string;
    imageUrl: string;
  }>;
  store: {
    id: string;
    name: string;
    status: string;
  };
}

interface PageProps {
  params: {
    id: string;
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

export default function EditListingPage({ params }: PageProps) {
  const router = useRouter();
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    category: CATEGORY_OPTIONS[0],
    listingType: "PRODUCT",
    images: [] as string[],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchListing() {
      setIsLoading(true);
      setError("");

      try {
        const res = await fetch(`/api/marketplace/${params.id}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to load listing");
        }

        setListing(data);
        setFormData({
          title: data.title || "",
          description: data.description || "",
          price: (data.priceCents / 100).toFixed(2),
          category: data.category || CATEGORY_OPTIONS[0],
          listingType: data.listingType || "PRODUCT",
          images: (data.photos || []).map(
            (photo: { imageUrl: string }) => photo.imageUrl
          ),
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load listing");
      } finally {
        setIsLoading(false);
      }
    }

    fetchListing();
  }, [params.id]);

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
      const res = await fetch(`/api/marketplace/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description,
          priceCents: Math.round(Number(formData.price) * 100),
          category: formData.category,
          listingType: formData.listingType,
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
        throw new Error(validationMessage || data.error || "Failed to update listing");
      }

      router.push("/marketplace/stores");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update listing");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-500">
        Loading listing...
      </div>
    );
  }

  if (error && !listing) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        {error}
      </div>
    );
  }

  return (
    <div>
      <div
        className="flex items-start justify-between gap-4 mb-8 pb-3 border-b-2"
        style={{ borderColor: "#A51E30" }}
      >
        <div>
          <h1 className="text-2xl font-bold">Edit Listing</h1>
          <p className="text-sm text-gray-500 mt-1">
            Update listing details for {listing?.store.name}.
          </p>
        </div>
        <Link
          href="/marketplace/stores"
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-gray-100 text-gray-800 font-semibold"
        >
          Back to My Stores
        </Link>
      </div>

      {error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      ) : null}

      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8 space-y-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Store
            </label>
            <div className="w-full px-4 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-700">
              {listing?.store.name}
            </div>
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
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/marketplace/stores")}
            className="flex-1 bg-gray-300 text-gray-800 font-bold py-2.5 rounded-lg hover:bg-gray-400 transition"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
