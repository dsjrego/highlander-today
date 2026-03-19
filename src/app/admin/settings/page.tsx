"use client";

import { useState } from "react";

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    commentApproval: "auto",
    maxUploadSize: 50,
    maintenanceMode: false,
    registrationOpen: true,
    requireEmailVerification: true,
  });

  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle"
  );

  const handleSettingChange = (
    key: string,
    value: string | number | boolean
  ) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleSaveSettings = async () => {
    setSaveStatus("saving");
    try {
      // TODO: Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus("idle"), 2000);
    } catch (err) {
      setSaveStatus("idle");
    }
  };

  return (
    <div>
      <h1 className="text-4xl font-bold mb-8 text-[#46A8CC]">Site Settings</h1>

      {saveStatus === "saved" && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-6">
          Settings saved successfully!
        </div>
      )}

      <div className="space-y-6">
        {/* Comment Approval */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h2 className="text-2xl font-bold mb-4">Content Moderation</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Comment Approval Default
              </label>
              <select
                value={settings.commentApproval}
                onChange={(e) =>
                  handleSettingChange("commentApproval", e.target.value)
                }
                className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
              >
                <option value="auto">Auto-approve comments</option>
                <option value="moderated">Require approval for comments</option>
                <option value="spam">Aggressive spam filter</option>
              </select>
              <p className="text-xs text-gray-500 mt-2">
                Controls whether new comments are automatically published or
                require moderator approval.
              </p>
            </div>
          </div>
        </div>

        {/* Upload Settings */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h2 className="text-2xl font-bold mb-4">Upload Settings</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Maximum Upload Size (MB)
              </label>
              <input
                type="number"
                value={settings.maxUploadSize}
                onChange={(e) =>
                  handleSettingChange("maxUploadSize", parseInt(e.target.value))
                }
                className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
              />
              <p className="text-xs text-gray-500 mt-2">
                Maximum size for file uploads (photos, etc.)
              </p>
            </div>
          </div>
        </div>

        {/* Site Status */}
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <h2 className="text-2xl font-bold mb-4">Site Status</h2>

          <div className="space-y-4">
            <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.maintenanceMode}
                onChange={(e) =>
                  handleSettingChange("maintenanceMode", e.target.checked)
                }
                className="w-5 h-5 rounded border-gray-300 text-[#46A8CC]"
              />
              <div>
                <p className="font-semibold">Maintenance Mode</p>
                <p className="text-xs text-gray-600">
                  Place site in maintenance mode (only admins can access)
                </p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.registrationOpen}
                onChange={(e) =>
                  handleSettingChange("registrationOpen", e.target.checked)
                }
                className="w-5 h-5 rounded border-gray-300 text-[#46A8CC]"
              />
              <div>
                <p className="font-semibold">Allow New Registrations</p>
                <p className="text-xs text-gray-600">
                  Allow new users to create accounts
                </p>
              </div>
            </label>

            <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.requireEmailVerification}
                onChange={(e) =>
                  handleSettingChange(
                    "requireEmailVerification",
                    e.target.checked
                  )
                }
                className="w-5 h-5 rounded border-gray-300 text-[#46A8CC]"
              />
              <div>
                <p className="font-semibold">Require Email Verification</p>
                <p className="text-xs text-gray-600">
                  Users must verify email before posting
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex gap-4">
          <button
            onClick={handleSaveSettings}
            disabled={saveStatus === "saving"}
            className="px-6 py-2 bg-[#46A8CC] text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition font-semibold"
          >
            {saveStatus === "saving" ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
