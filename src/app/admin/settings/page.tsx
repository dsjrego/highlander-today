"use client";

import { useEffect, useState } from "react";

interface SiteSettings {
  siteName: string;
  siteDescription: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  maintenanceMode: boolean;
  requireEmailVerification: boolean;
  allowUserRegistration: boolean;
  maxUploadSize: number;
}

const defaultSettings: SiteSettings = {
  siteName: "Highlander Today",
  siteDescription: "Community platform",
  logoUrl: null,
  bannerUrl: null,
  primaryColor: "#46A8CC",
  secondaryColor: "#A51E30",
  maintenanceMode: false,
  requireEmailVerification: true,
  allowUserRegistration: true,
  maxUploadSize: 5 * 1024 * 1024,
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<SiteSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [saveError, setSaveError] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  useEffect(() => {
    let isCancelled = false;

    async function loadSettings() {
      setIsLoading(true);
      setLoadError("");

      try {
        const response = await fetch("/api/settings", {
          method: "GET",
          credentials: "same-origin",
          cache: "no-store",
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to load settings");
        }

        if (!isCancelled) {
          setSettings(data);
        }
      } catch (error) {
        if (!isCancelled) {
          setLoadError(error instanceof Error ? error.message : "Failed to load settings");
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    loadSettings();

    return () => {
      isCancelled = true;
    };
  }, []);

  function handleSettingChange<Key extends keyof SiteSettings>(key: Key, value: SiteSettings[Key]) {
    setSettings((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleSaveSettings() {
    setSaveStatus("saving");
    setSaveError("");

    try {
      const response = await fetch("/api/settings", {
        method: "PATCH",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to save settings");
      }

      setSettings(data);
      setSaveStatus("saved");
      window.setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (error) {
      setSaveStatus("idle");
      setSaveError(error instanceof Error ? error.message : "Failed to save settings");
    }
  }

  return (
    <div>
      <h1 className="mb-8 text-4xl font-bold text-[#46A8CC]">Site Settings</h1>

      {loadError ? (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          {loadError}
        </div>
      ) : null}

      {saveError ? (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
          {saveError}
        </div>
      ) : null}

      {saveStatus === "saved" ? (
        <div className="mb-6 rounded-lg border border-green-400 bg-green-100 px-4 py-3 text-green-700">
          Settings saved successfully!
        </div>
      ) : null}

      <div className={`space-y-6 ${isLoading ? "opacity-60" : ""}`}>
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-2xl font-bold">Branding</h2>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-bold text-gray-700">
                Site Name
              </label>
              <input
                type="text"
                value={settings.siteName}
                onChange={(event) => handleSettingChange("siteName", event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
                disabled={isLoading || saveStatus === "saving"}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-gray-700">
                Maximum Upload Size (bytes)
              </label>
              <input
                type="number"
                value={settings.maxUploadSize}
                onChange={(event) => handleSettingChange("maxUploadSize", Number(event.target.value) || 0)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
                disabled={isLoading || saveStatus === "saving"}
              />
            </div>

            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-bold text-gray-700">
                Site Description
              </label>
              <textarea
                value={settings.siteDescription}
                onChange={(event) => handleSettingChange("siteDescription", event.target.value)}
                rows={3}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
                disabled={isLoading || saveStatus === "saving"}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-gray-700">
                Primary Color
              </label>
              <input
                type="text"
                value={settings.primaryColor}
                onChange={(event) => handleSettingChange("primaryColor", event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
                disabled={isLoading || saveStatus === "saving"}
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-bold text-gray-700">
                Secondary Color
              </label>
              <input
                type="text"
                value={settings.secondaryColor}
                onChange={(event) => handleSettingChange("secondaryColor", event.target.value)}
                className="w-full rounded-lg border border-gray-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
                disabled={isLoading || saveStatus === "saving"}
              />
            </div>
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="mb-4 text-2xl font-bold">Site Status</h2>

          <div className="space-y-4">
            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 p-4 hover:bg-gray-50">
              <input
                type="checkbox"
                checked={settings.maintenanceMode}
                onChange={(event) => handleSettingChange("maintenanceMode", event.target.checked)}
                className="h-5 w-5 rounded border-gray-300 text-[#46A8CC]"
                disabled={isLoading || saveStatus === "saving"}
              />
              <div>
                <p className="font-semibold">Maintenance Mode</p>
                <p className="text-xs text-gray-600">
                  Place site in maintenance mode so only admins can access it.
                </p>
              </div>
            </label>

            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 p-4 hover:bg-gray-50">
              <input
                type="checkbox"
                checked={settings.allowUserRegistration}
                onChange={(event) => handleSettingChange("allowUserRegistration", event.target.checked)}
                className="h-5 w-5 rounded border-gray-300 text-[#46A8CC]"
                disabled={isLoading || saveStatus === "saving"}
              />
              <div>
                <p className="font-semibold">Allow New Registrations</p>
                <p className="text-xs text-gray-600">
                  Allow new users to create accounts.
                </p>
              </div>
            </label>

            <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-gray-200 p-4 hover:bg-gray-50">
              <input
                type="checkbox"
                checked={settings.requireEmailVerification}
                onChange={(event) => handleSettingChange("requireEmailVerification", event.target.checked)}
                className="h-5 w-5 rounded border-gray-300 text-[#46A8CC]"
                disabled={isLoading || saveStatus === "saving"}
              />
              <div>
                <p className="font-semibold">Require Email Verification</p>
                <p className="text-xs text-gray-600">
                  Users must verify email before posting.
                </p>
              </div>
            </label>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            type="button"
            onClick={handleSaveSettings}
            disabled={isLoading || saveStatus === "saving"}
            className="rounded-lg bg-[#46A8CC] px-6 py-2 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {saveStatus === "saving" ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
