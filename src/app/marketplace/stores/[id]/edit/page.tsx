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
      <div className="rounded-[28px] border border-white/10 bg-white/70 p-8 text-center text-slate-500 shadow-[0_18px_42px_rgba(15,23,42,0.08)]">
        Loading store...
      </div>
    );
  }

  if (error && !store) {
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
        className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
      >
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-100/74">
            Market
          </p>
          <h1 className="mt-4 text-4xl font-black leading-[0.95] tracking-[-0.05em] md:text-6xl">Edit store</h1>
          <p className="mt-4 text-base leading-8 text-white/78 md:text-lg">
            Update store details{store?.status === "REJECTED" ? " and resubmit for approval." : "."}
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

      {successMessage ? (
        <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-green-700">
          {successMessage}
        </div>
      ) : null}

      {store ? (
        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-[28px] border border-white/10 bg-white/82 p-6 shadow-[0_18px_42px_rgba(15,23,42,0.08)] backdrop-blur md:p-8"
        >
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">Current status:</span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {store.status.replace(/_/g, " ")}
            </span>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Store Name
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={5}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Website
              </label>
              <input
                type="url"
                name="websiteUrl"
                value={formData.websiteUrl}
                onChange={handleInputChange}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-700">
                Contact Email
              </label>
              <input
                type="email"
                name="contactEmail"
                value={formData.contactEmail}
                onChange={handleInputChange}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Contact Phone
            </label>
            <input
              type="text"
              name="contactPhone"
              value={formData.contactPhone}
              onChange={handleInputChange}
              className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
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
              className="flex-1 rounded-xl bg-slate-950 py-3 font-bold text-white transition hover:opacity-90 disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save Changes"}
            </button>
            {store.status === "REJECTED" ? (
              <button
                type="button"
                onClick={() => saveStore(true)}
                disabled={isSaving}
                className="flex-1 rounded-xl bg-[#8f1d2c] py-3 font-bold text-white transition disabled:opacity-50"
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
