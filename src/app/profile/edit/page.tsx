"use client";

import { FormEvent, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import ImageUpload from "@/components/shared/ImageUpload";
import InternalPageHeader from "@/components/shared/InternalPageHeader";

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
    return <div className="rounded-[28px] border border-white/10 bg-white/70 p-8 text-center text-slate-500 shadow-[0_18px_42px_rgba(15,23,42,0.08)]">Loading profile...</div>;
  }

  if (!profile) {
    return <div className="rounded-[28px] border border-white/10 bg-white/70 p-8 text-center text-slate-500 shadow-[0_18px_42px_rgba(15,23,42,0.08)]">Profile not found.</div>;
  }

  const showDobPrompt =
    !profile.dateOfBirth && Boolean((session?.user as any)?.oauthNeedsProfileRedirect);

  return (
    <div className="space-y-8">
      <InternalPageHeader title="Profile" titleClassName="text-white" />
      <p className="max-w-3xl text-sm leading-7 text-slate-500">
        Keep your identity, bio, and photo current so the community knows who they are interacting with.
      </p>

      {error && (
        <div className="rounded-xl border border-red-400 bg-red-100 px-4 py-3 text-red-700">
          {error}
        </div>
      )}

      {showDobPrompt && (
        <div className="rounded-xl border border-red-400 bg-red-100 px-4 py-3 text-red-700">
          Date of birth is not displayed publicly. It is optional here, but leaving it blank may
          restrict access to some features and it is required before a user can become trusted.
        </div>
      )}

      {success && (
        <div className="rounded-xl border border-green-400 bg-green-100 px-4 py-3 text-green-700">
          {success}
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-[28px] border border-white/10 bg-white/82 p-6 shadow-[0_18px_42px_rgba(15,23,42,0.08)] backdrop-blur"
      >
        {/* Identity Lock Warning */}
        {profile.isIdentityLocked && profile.trustLevel === "TRUSTED" && (
          <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-4">
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
          <label className="mb-2 block text-sm font-bold text-slate-700">
            First Name
          </label>
          <input
            type="text"
            name="firstName"
            value={formData.firstName}
            onChange={handleInputChange}
            disabled={profile.isIdentityLocked}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#46A8CC] disabled:cursor-not-allowed disabled:bg-slate-100"
          />
          {profile.isIdentityLocked && (
            <p className="mt-1 text-xs text-slate-500">
              This field is locked due to identity verification
            </p>
          )}
        </div>

        {/* Last Name */}
        <div>
          <label className="mb-2 block text-sm font-bold text-slate-700">
            Last Name
          </label>
          <input
            type="text"
            name="lastName"
            value={formData.lastName}
            onChange={handleInputChange}
            disabled={profile.isIdentityLocked}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#46A8CC] disabled:cursor-not-allowed disabled:bg-slate-100"
          />
          {profile.isIdentityLocked && (
            <p className="mt-1 text-xs text-slate-500">
              This field is locked due to identity verification
            </p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="mb-2 block text-sm font-bold text-slate-700">
            Email
          </label>
          <input
            type="email"
            value={profile.email}
            disabled
            className="w-full cursor-not-allowed rounded-xl border border-slate-300 bg-slate-100 px-4 py-3 text-slate-600"
          />
          <p className="mt-1 text-xs text-slate-500">Email cannot be changed</p>
        </div>

        {/* Date of Birth */}
        <div>
          <label className="mb-2 block text-sm font-bold text-slate-700">
            Date of Birth
          </label>
          <input
            type="date"
            name="dateOfBirth"
            value={formData.dateOfBirth}
            onChange={handleInputChange}
            disabled={profile.isIdentityLocked}
            max={new Date().toISOString().split("T")[0]}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#46A8CC] disabled:cursor-not-allowed disabled:bg-slate-100"
          />
          {profile.isIdentityLocked ? (
            <p className="mt-1 text-xs text-slate-500">
              This field is locked due to identity verification
            </p>
          ) : (
            <p className="mt-1 text-xs text-slate-500">
              Required before your account can be vouched for. Once verified, this cannot be changed.
            </p>
          )}
        </div>

        {/* Bio */}
        <div>
          <label className="mb-2 block text-sm font-bold text-slate-700">
            Bio
          </label>
          <textarea
            name="bio"
            value={formData.bio}
            onChange={handleInputChange}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#46A8CC]"
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
            className="flex-1 rounded-full bg-slate-950 py-3 font-bold text-white transition-shadow duration-200 hover:shadow-md disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 rounded-full border border-slate-300 py-3 font-bold text-slate-800 transition-shadow duration-200 hover:bg-slate-50 hover:shadow-md"
          >
            Cancel
          </button>
        </div>
      </form>

      {/* Account Settings */}
      <div className="rounded-[28px] border border-white/10 bg-white/82 p-6 shadow-[0_18px_42px_rgba(15,23,42,0.08)] backdrop-blur">
        <h2 className="mb-4 text-2xl font-black tracking-[-0.03em] text-slate-950">Account Settings</h2>
        <div className="space-y-4">
          <button className="w-full rounded-xl border border-slate-200 px-4 py-3 text-left transition hover:bg-slate-50">
            Change Password
          </button>
          <button className="w-full rounded-xl border border-slate-200 px-4 py-3 text-left transition hover:bg-slate-50">
            Email Preferences
          </button>
          <button className="w-full rounded-xl border border-slate-200 px-4 py-3 text-left text-red-600 transition hover:bg-slate-50">
            Deactivate Account
          </button>
        </div>
      </div>
    </div>
  );
}
