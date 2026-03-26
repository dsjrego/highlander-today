"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import FormCard from "@/components/shared/FormCard";
import ImageUpload from "@/components/shared/ImageUpload";
import InternalPageHeader from "@/components/shared/InternalPageHeader";

export default function CreateStorePage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    websiteUrl: "",
    contactEmail: "",
    contactPhone: "",
    logoUrl: "",
    bannerUrl: "",
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  function handleInputChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
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
    setSuccessMessage("");

    if (!formData.name.trim()) {
      setError("Store name is required.");
      return;
    }

    if (!formData.description.trim() || formData.description.trim().length < 10) {
      setError("Store description must be at least 10 characters.");
      return;
    }

    setIsSaving(true);

    try {
      const res = await fetch("/api/stores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) {
        const validationMessage = Array.isArray(data.details)
          ? data.details
              .map((detail: { message?: string }) => detail.message)
              .filter(Boolean)
              .join(", ")
          : "";
        throw new Error(validationMessage || data.error || "Failed to create store");
      }

      setSuccessMessage("Store submitted for approval. An editor or admin will review it before it becomes available for listings.");
      setTimeout(() => router.push("/marketplace/create"), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create store");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <InternalPageHeader
        title="Create a Store"
        actions={
          <Link
            href="/marketplace/stores"
            className="rounded-full border border-white/14 bg-white/8 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/12"
          >
            My Stores
          </Link>
        }
      />
      <p className="max-w-3xl text-sm leading-7 text-slate-500">
        Create a local storefront profile that can be reviewed and approved for marketplace listings.
      </p>

      {error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      ) : null}

      {successMessage ? (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg mb-6">
          {successMessage}
        </div>
      ) : null}

      <FormCard>
        <form
          onSubmit={handleSubmit}
          className="space-y-6"
        >
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Store Name
          </label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleInputChange}
            placeholder="Cambria Hearth Bakery"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Description
          </label>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            rows={5}
            placeholder="Describe what the store offers, who it serves, and what makes it locally relevant."
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Website
            </label>
            <input
              type="url"
              name="websiteUrl"
              value={formData.websiteUrl}
              onChange={handleInputChange}
              placeholder="https://example.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Contact Email
            </label>
            <input
              type="email"
              name="contactEmail"
              value={formData.contactEmail}
              onChange={handleInputChange}
              placeholder="hello@example.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Contact Phone
          </label>
          <input
            type="text"
            name="contactPhone"
            value={formData.contactPhone}
            onChange={handleInputChange}
            placeholder="(555) 123-4567"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ImageUpload
            context="marketplace"
            maxFiles={1}
            value={formData.logoUrl ? [formData.logoUrl] : []}
            onUpload={(image) =>
              setFormData((prev) => ({ ...prev, logoUrl: image.url }))
            }
            onRemove={() =>
              setFormData((prev) => ({ ...prev, logoUrl: "" }))
            }
            label="Store Logo"
            helperText="Square or circular logo recommended."
          />

          <ImageUpload
            context="marketplace"
            maxFiles={1}
            value={formData.bannerUrl ? [formData.bannerUrl] : []}
            onUpload={(image) =>
              setFormData((prev) => ({ ...prev, bannerUrl: image.url }))
            }
            onRemove={() =>
              setFormData((prev) => ({ ...prev, bannerUrl: "" }))
            }
            label="Store Banner"
            helperText="Optional banner image for future storefront presentation."
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <button
            type="submit"
            disabled={isSaving}
            className="flex-1 bg-[#46A8CC] text-white font-bold py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {isSaving ? "Submitting..." : "Submit Store for Approval"}
          </button>
          <Link
            href="/marketplace"
            className="flex-1 inline-flex items-center justify-center bg-gray-300 text-gray-800 font-bold py-2.5 rounded-lg hover:bg-gray-400 transition"
          >
            Cancel
          </Link>
        </div>
        </form>
      </FormCard>

      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl text-sm text-gray-700">
        <p className="font-semibold mb-2">Approval notes</p>
        <ul className="space-y-1 list-disc list-inside text-xs">
          <li>Stores stay private until they are approved by staff.</li>
          <li>Approved stores can publish marketplace listings.</li>
          <li>Use real business or seller information so moderators can verify the store.</li>
        </ul>
      </div>
    </div>
  );
}
