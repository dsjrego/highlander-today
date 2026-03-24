"use client";

import { FormEvent, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import ImageUpload from "@/components/shared/ImageUpload";

interface ProfileData {
  firstName: string;
  lastName: string;
  email: string;
  bio: string;
  profilePhotoUrl?: string | null;
  dateOfBirth?: string | null;
  trustLevel: string;
  isIdentityLocked: boolean;
}

export default function EditProfilePage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    bio: "",
    dateOfBirth: "",
    profilePhotoUrl: "",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/profile/edit");
      return;
    }

    async function fetchProfile() {
      try {
        const res = await fetch("/api/profile");
        if (!res.ok) {
          setError("Failed to load profile");
          setIsLoading(false);
          return;
        }
        const data = await res.json();
        setProfile({
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          bio: data.bio || "",
          profilePhotoUrl: data.profilePhotoUrl,
          dateOfBirth: data.dateOfBirth,
          trustLevel: data.trustLevel,
          isIdentityLocked: data.isIdentityLocked,
        });
        setFormData({
          firstName: data.firstName,
          lastName: data.lastName,
          bio: data.bio || "",
          dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth).toISOString().split("T")[0] : "",
          profilePhotoUrl: data.profilePhotoUrl || "",
        });
      } catch {
        setError("An error occurred loading your profile.");
      } finally {
        setIsLoading(false);
      }
    }

    fetchProfile();
  }, [status, router]);

  function handleInputChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");
    setIsSaving(true);

    try {
      const payload = profile?.isIdentityLocked
        ? {
            bio: formData.bio,
            profilePhotoUrl: formData.profilePhotoUrl || null,
          }
        : {
            firstName: formData.firstName,
            lastName: formData.lastName,
            bio: formData.bio,
            dateOfBirth: formData.dateOfBirth,
            profilePhotoUrl: formData.profilePhotoUrl || null,
          };

      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.message || data.error || "Failed to update profile");
      } else {
        setSuccess("Profile updated successfully");
        setTimeout(() => {
          if (session?.user) {
            router.push(`/profile/${(session.user as any).id}`);
          } else {
            router.push("/");
          }
        }, 2000);
      }
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <p className="text-center text-gray-500">Loading profile...</p>;
  }

  if (!profile) {
    return <p className="text-center text-gray-500">Profile not found.</p>;
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-8 border-b-2 border-[#A51E30] pb-2">
        Edit Profile
      </h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
          {error}
        </div>
      )}

      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-6">
          {success}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-xl shadow-sm space-y-6"
      >
        {/* Identity Lock Warning */}
        {profile.isIdentityLocked && profile.trustLevel === "TRUSTED" && (
          <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
            <p className="text-sm text-yellow-800 mb-2">
              <strong>Identity Locked:</strong> Your account is verified and
              identity-locked for security.
            </p>
            <p className="text-xs text-yellow-700">
              Name and date of birth cannot be changed after verification.
            </p>
          </div>
        )}

        {/* First Name */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            First Name
          </label>
          <input
            type="text"
            name="firstName"
            value={formData.firstName}
            onChange={handleInputChange}
            disabled={profile.isIdentityLocked}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#46A8CC] disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          {profile.isIdentityLocked && (
            <p className="text-xs text-gray-500 mt-1">
              This field is locked due to identity verification
            </p>
          )}
        </div>

        {/* Last Name */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Last Name
          </label>
          <input
            type="text"
            name="lastName"
            value={formData.lastName}
            onChange={handleInputChange}
            disabled={profile.isIdentityLocked}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#46A8CC] disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          {profile.isIdentityLocked && (
            <p className="text-xs text-gray-500 mt-1">
              This field is locked due to identity verification
            </p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Email
          </label>
          <input
            type="email"
            value={profile.email}
            disabled
            className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed text-gray-600"
          />
          <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
        </div>

        {/* Date of Birth */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Date of Birth
          </label>
          <input
            type="date"
            name="dateOfBirth"
            value={formData.dateOfBirth}
            onChange={handleInputChange}
            disabled={profile.isIdentityLocked}
            max={new Date().toISOString().split("T")[0]}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#46A8CC] disabled:bg-gray-100 disabled:cursor-not-allowed"
          />
          {profile.isIdentityLocked ? (
            <p className="text-xs text-gray-500 mt-1">
              This field is locked due to identity verification
            </p>
          ) : (
            <p className="text-xs text-gray-500 mt-1">
              Required before your account can be vouched for. Once verified, this cannot be changed.
            </p>
          )}
        </div>

        {/* Bio */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">
            Bio
          </label>
          <textarea
            name="bio"
            value={formData.bio}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
            rows={4}
            placeholder="Tell the community about yourself"
          />
        </div>

        {/* Photo Upload */}
        <ImageUpload
          label="Profile Photo"
          context="profile"
          maxFiles={1}
          circular
          value={formData.profilePhotoUrl ? [formData.profilePhotoUrl] : []}
          onUpload={(img) => setFormData((prev) => ({ ...prev, profilePhotoUrl: img.url }))}
          onRemove={() => setFormData((prev) => ({ ...prev, profilePhotoUrl: "" }))}
        />

        {/* Submit Button */}
        <div className="flex gap-4">
          <button
            type="submit"
            disabled={isSaving}
            className="flex-1 text-white font-bold py-2 rounded-full hover:shadow-md disabled:opacity-50 transition-shadow duration-200"
            style={{ backgroundColor: "#A51E30" }}
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 bg-gray-300 text-gray-800 font-bold py-2 rounded-full hover:shadow-md transition-shadow duration-200"
          >
            Cancel
          </button>
        </div>
      </form>

      {/* Account Settings */}
      <div className="mt-8 bg-white p-6 rounded-xl shadow-sm">
        <h2 className="text-2xl font-bold mb-4">Account Settings</h2>
        <div className="space-y-4">
          <button className="w-full text-left px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
            Change Password
          </button>
          <button className="w-full text-left px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
            Email Preferences
          </button>
          <button className="w-full text-left px-4 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition text-red-600">
            Deactivate Account
          </button>
        </div>
      </div>
    </div>
  );
}
