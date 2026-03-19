"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import ImageUpload from "@/components/shared/ImageUpload";

interface StoreDetail {
  id: string;
  name: string;
  description: string | null;
  websiteUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  status: "PENDING_APPROVAL" | "APPROVED" | "REJECTED" | "SUSPENDED";
  canManage: boolean;
}

export default function EditStorePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [store, setStore] = useState<StoreDetail | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    websiteUrl: "",
    contactEmail: "",
    contactPhone: "",
    logoUrl: "",
    bannerUrl: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    async function fetchStore() {
      setIsLoading(true);
      setError("");

      try {
        const res = await fetch(`/api/stores/${params.id}`);
        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || "Failed to load store");
        }

        if (!data.canManage) {
          throw new Error("You do not have permission to manage this store");
        }

        setStore(data);
        setFormData({
          name: data.name || "",
          description: data.description || "",
          websiteUrl: data.websiteUrl || "",
          contactEmail: data.contactEmail || "",
          contactPhone: data.contactPhone || "",
          logoUrl: data.logoUrl || "",
          bannerUrl: data.bannerUrl || "",
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load store");
      } finally {
        setIsLoading(false);
      }
    }

    fetchStore();
  }, [params.id]);

  function handleInputChange(
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function saveStore(resubmitForApproval: boolean) {
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
      const res = await fetch(`/api/stores/${params.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          resubmitForApproval,
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
        throw new Error(validationMessage || data.error || "Failed to update store");
      }

      setStore(data);
      setSuccessMessage(
        resubmitForApproval
          ? "Store resubmitted for approval."
          : "Store updated successfully."
      );

      if (resubmitForApproval) {
        setTimeout(() => router.push("/marketplace/stores"), 1200);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update store");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    await saveStore(false);
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-500">
        Loading store...
      </div>
    );
  }

  if (error && !store) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        {error}
      </div>
    );
  }

  return (
    <div>
      <div
        className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8 pb-3 border-b-2"
        style={{ borderColor: "#A51E30" }}
      >
        <div>
          <h1 className="text-2xl font-bold">Edit Store</h1>
          <p className="text-sm text-gray-500 mt-1">
            Update store details{store?.status === "REJECTED" ? " and resubmit for approval." : "."}
          </p>
        </div>
        <Link
          href="/marketplace/stores"
          className="inline-flex items-center justify-center px-5 py-2.5 rounded-full bg-gray-200 text-gray-800 font-semibold"
        >
          Back to My Stores
        </Link>
      </div>

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

      {store ? (
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8 space-y-6"
        >
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">Current status:</span>
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
              {store.status.replace(/_/g, " ")}
            </span>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Store Name
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
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
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-4">
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 bg-[#46A8CC] text-white font-bold py-2.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
            {store.status === "REJECTED" ? (
              <button
                type="button"
                onClick={() => saveStore(true)}
                disabled={isSaving}
                className="flex-1 text-white font-bold py-2.5 rounded-lg disabled:opacity-50 transition"
                style={{ backgroundColor: "#A51E30" }}
              >
                {isSaving ? "Working..." : "Resubmit for Approval"}
              </button>
            ) : null}
          </div>
        </form>
      ) : null}
    </div>
  );
}
