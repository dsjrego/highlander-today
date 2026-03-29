"use client";

import { useState } from "react";

type DirectoryOptInCardProps = {
  initialValue: boolean;
};

export default function DirectoryOptInCard({ initialValue }: DirectoryOptInCardProps) {
  const [isDirectoryListed, setIsDirectoryListed] = useState(initialValue);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleToggle(nextValue: boolean) {
    setIsDirectoryListed(nextValue);
    setIsSaving(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDirectoryListed: nextValue }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setIsDirectoryListed(!nextValue);
        setError(data.message || data.error || "Failed to update directory preference.");
        return;
      }

      setSuccess(
        nextValue
          ? "Your profile is now opted in to the directory."
          : "Your profile has been removed from the directory."
      );
    } catch {
      setIsDirectoryListed(!nextValue);
      setError("Failed to update directory preference.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-slate-950">Directory Listing</h3>
          <p className="text-sm leading-6 text-slate-600">
            Opt in if you want your profile included in the public directory. Communication still
            stays inside Highlander Today messaging.
          </p>
          <p className="text-xs text-slate-500">
            Default: off. No public phone number or street address is exposed.
          </p>
        </div>

        <label className="flex items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
          <input
            type="checkbox"
            checked={isDirectoryListed}
            disabled={isSaving}
            onChange={(event) => handleToggle(event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-[#46A8CC] focus:ring-[#46A8CC]"
          />
          Include me
        </label>
      </div>

      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
      {success ? <p className="mt-3 text-sm text-emerald-700">{success}</p> : null}
    </section>
  );
}
