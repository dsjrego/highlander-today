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
  const headerIcon = profile.profilePhotoUrl ? (
    <div
      className="h-16 w-16 rounded-full border-2 border-white/25 bg-cover bg-center bg-no-repeat shadow-[0_10px_24px_rgba(7,17,26,0.24)]"
      style={{ backgroundImage: `url("${profile.profilePhotoUrl}")` }}
      aria-hidden="true"
    />
  ) : (
    <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-white/20 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18),rgba(155,231,255,0.08))] text-cyan-50/90 shadow-[0_10px_24px_rgba(7,17,26,0.24)]">
      <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6.75a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0ZM4.5 19.125a7.5 7.5 0 0115 0" />
      </svg>
    </div>
  );

  return (
    <div className="space-y-8">
      <InternalPageHeader
        icon={headerIcon}
        title="Edit Profile"
        description="Keep your identity, bio, and photo current so the community knows who they are interacting with."
        titleClassName="text-white"
      />

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

      <section className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,245,249,0.94))] p-5 shadow-[0_24px_55px_rgba(15,23,42,0.16)] backdrop-blur md:p-7">
        <form
          onSubmit={handleSubmit}
          className="space-y-4"
        >
          {/* Identity Lock Warning */}
          {profile.isIdentityLocked && profile.trustLevel === "TRUSTED" && (
            <div className="flex min-h-[44px] items-center rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-1.5">
              <p className="m-0 text-sm leading-5 text-yellow-800">
                <strong>Identity Locked:</strong> Name and date of birth cannot be changed after verification.
              </p>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
            <div>
              <ImageUpload
                label="Profile Photo"
                labelClassName="form-label text-slate-500"
                context="profile"
                maxFiles={1}
                circular
                value={formData.profilePhotoUrl ? [formData.profilePhotoUrl] : []}
                onUpload={(img) => setFormData((prev) => ({ ...prev, profilePhotoUrl: img.url }))}
                onRemove={() => setFormData((prev) => ({ ...prev, profilePhotoUrl: "" }))}
              />
            </div>

            <div className="space-y-4">
              {/* First Name */}
              <div>
                <label className="form-label text-slate-500">
                  First Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    disabled={profile.isIdentityLocked}
                    className={`form-input border-slate-500 bg-white text-slate-950 disabled:border-slate-500 disabled:bg-slate-100 disabled:text-slate-600 ${profile.isIdentityLocked ? "pr-9" : ""}`.trim()}
                  />
                  {profile.isIdentityLocked ? (
                    <span className="group absolute inset-y-0 right-3 flex items-center">
                      <span className="text-slate-400" aria-hidden="true">
                        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75">
                          <circle cx="10" cy="10" r="7" />
                          <path d="M5.5 14.5 14.5 5.5" strokeLinecap="round" />
                        </svg>
                      </span>
                      <span className="pointer-events-none absolute right-0 top-full z-10 mt-2 w-max max-w-[220px] rounded-lg bg-slate-950 px-2.5 py-1.5 text-[11px] font-medium leading-4 text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                        This field is locked due to identity verification.
                      </span>
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Last Name */}
              <div>
                <label className="form-label text-slate-500">
                  Last Name
                </label>
                <div className="relative">
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    disabled={profile.isIdentityLocked}
                    className={`form-input border-slate-500 bg-white text-slate-950 disabled:border-slate-500 disabled:bg-slate-100 disabled:text-slate-600 ${profile.isIdentityLocked ? "pr-9" : ""}`.trim()}
                  />
                  {profile.isIdentityLocked ? (
                    <span className="group absolute inset-y-0 right-3 flex items-center">
                      <span className="text-slate-400" aria-hidden="true">
                        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75">
                          <circle cx="10" cy="10" r="7" />
                          <path d="M5.5 14.5 14.5 5.5" strokeLinecap="round" />
                        </svg>
                      </span>
                      <span className="pointer-events-none absolute right-0 top-full z-10 mt-2 w-max max-w-[220px] rounded-lg bg-slate-950 px-2.5 py-1.5 text-[11px] font-medium leading-4 text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                        This field is locked due to identity verification.
                      </span>
                    </span>
                  ) : null}
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="form-label text-slate-500">
                  Email
                </label>
                <input
                  type="email"
                  value={profile.email}
                  disabled
                  className="form-input border-slate-500 bg-white text-slate-950 disabled:border-slate-500 disabled:bg-slate-100 disabled:text-slate-600"
                />
                <p className="mt-1 text-xs text-slate-500">Email cannot be changed</p>
              </div>

              {/* Date of Birth */}
              <div>
                <label className="form-label text-slate-500">
                  Date of Birth
                </label>
                <div className="relative">
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={formData.dateOfBirth}
                    onChange={handleInputChange}
                    disabled={profile.isIdentityLocked}
                    max={new Date().toISOString().split("T")[0]}
                    className={`form-input border-slate-500 bg-white text-slate-950 disabled:border-slate-500 disabled:bg-slate-100 disabled:text-slate-600 ${profile.isIdentityLocked ? "pr-9" : ""}`.trim()}
                  />
                  {profile.isIdentityLocked ? (
                    <span className="group absolute inset-y-0 right-3 flex items-center">
                      <span className="text-slate-400" aria-hidden="true">
                        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75">
                          <circle cx="10" cy="10" r="7" />
                          <path d="M5.5 14.5 14.5 5.5" strokeLinecap="round" />
                        </svg>
                      </span>
                      <span className="pointer-events-none absolute right-0 top-full z-10 mt-2 w-max max-w-[220px] rounded-lg bg-slate-950 px-2.5 py-1.5 text-[11px] font-medium leading-4 text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                        This field is locked due to identity verification.
                      </span>
                    </span>
                  ) : null}
                </div>
                {!profile.isIdentityLocked ? (
                  <p className="mt-1 text-xs text-slate-500">
                    Required before your account can be vouched for. Once verified, this cannot be changed.
                  </p>
                ) : null}
              </div>

              {/* Bio */}
              <div>
                <label className="form-label text-slate-500">
                  Bio
                </label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleInputChange}
                  className="form-textarea border-slate-500 bg-white text-slate-950 disabled:border-slate-500 disabled:bg-slate-100 disabled:text-slate-600"
                  rows={4}
                  placeholder="Tell the community about yourself"
                />
              </div>

              {/* Submit Button */}
              <div className="flex flex-wrap justify-start gap-3 pt-1">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="btn btn-primary min-w-[160px]"
                >
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="btn btn-secondary min-w-[140px] border border-red-600"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </form>
      </section>

    </div>
  );
}
