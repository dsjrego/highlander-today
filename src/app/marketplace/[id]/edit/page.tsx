"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import FormCard from "@/components/shared/FormCard";
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
      <div className="rounded-[28px] border border-white/10 bg-white/70 p-8 text-center text-slate-500 shadow-[0_18px_42px_rgba(15,23,42,0.08)]">
        Loading listing...
      </div>
    );
  }

  if (error && !listing) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(145deg,rgba(143,29,44,0.96),rgba(10,32,51,0.94))] px-6 py-8 text-white shadow-[0_35px_80px_rgba(7,17,26,0.22)] md:px-10 md:py-10">
      <div
        className="flex items-start justify-between gap-4"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-100/74">
            Market
          </p>
          <h1 className="mt-4 text-4xl font-black leading-[0.95] tracking-[-0.05em] md:text-6xl">Edit listing</h1>
          <p className="mt-4 text-base leading-8 text-white/78 md:text-lg">
            Update listing details for {listing?.store.name}.
          </p>
        </div>
        <Link
          href="/marketplace/stores"
          className="inline-flex items-center justify-center rounded-full bg-white px-5 py-2.5 font-semibold text-slate-950"
        >
          Back to My Stores
        </Link>
      </div>
      </section>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          {error}
        </div>
      ) : null}

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
            <div className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-700">
              {listing?.store.name}
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Listing Type
            </label>
            <select
              name="listingType"
              value={formData.listingType}
              onChange={handleInputChange}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
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
            className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
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
              className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
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
              className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
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
            className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
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
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/marketplace/stores")}
            className="flex-1 rounded-xl border border-slate-300 py-3 font-bold text-slate-800 transition hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
        </form>
      </FormCard>
    </div>
  );
}
