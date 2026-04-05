"use client";

import { FormEvent, useEffect, useState } from "react";
import { Save } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { CrudActionButton } from "@/components/shared/CrudAction";
import FormCard, { FormCardActions } from "@/components/shared/FormCard";
import ImageUpload from "@/components/shared/ImageUpload";
import StatusMessage from "@/components/shared/StatusMessage";
import DirectoryOptInCard from "./DirectoryOptInCard";

type ProfileData = {
  firstName: string;
  lastName: string;
  email: string;
  bio: string;
  profilePhotoUrl?: string | null;
  dateOfBirth?: string | null;
  trustLevel: string;
  isIdentityLocked: boolean;
};

type AccountSettingsPanelProps = {
  initialDirectoryListed: boolean;
};

function IdentityLockedField({
  id,
  label,
  value,
  helperText,
}: {
  id: string;
  label: string;
  value: string;
  helperText?: string;
}) {
  const popoverId = `${id}-identity-locked-popover`;

  return (
    <div>
      <label className="form-label text-slate-500">{label}</label>
      <button
        type="button"
        popoverTarget={popoverId}
        className="group flex w-full items-center justify-between rounded-xl border border-slate-500 bg-slate-100 px-3 py-2.5 text-left text-slate-600 transition hover:border-slate-600"
        aria-haspopup="dialog"
      >
        <span className="truncate pr-3">{value || "Not provided"}</span>
        <span className="shrink-0 text-slate-400" aria-hidden="true">
          <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75">
            <circle cx="10" cy="10" r="7" />
            <path d="M5.5 14.5 14.5 5.5" strokeLinecap="round" />
          </svg>
        </span>
      </button>

      <div
        id={popoverId}
        popover="auto"
        className="backdrop:fixed backdrop:inset-0 backdrop:bg-slate-950/70 backdrop:backdrop-blur-sm fixed inset-0 m-auto h-fit w-full max-w-md rounded-[28px] border border-white/10 bg-[linear-gradient(165deg,rgba(17,34,52,0.98),rgba(10,24,38,0.98))] p-6 text-white shadow-[0_28px_80px_rgba(2,8,23,0.55)]"
      >
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200/72">
          Identity Locked
        </p>
        <h3 className="mb-3 text-2xl font-semibold tracking-tight text-white">{label} is locked</h3>
        <p className="text-sm leading-7 text-cyan-50/78">
          Name and date of birth cannot be changed after verification.
        </p>
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            popoverTarget={popoverId}
            popoverTargetAction="hide"
            className="rounded-full border border-cyan-300/35 bg-white/[0.06] px-4 py-2 text-sm font-medium text-cyan-100 transition hover:border-cyan-300/60 hover:bg-white/[0.1] hover:text-white"
          >
            Close
          </button>
        </div>
      </div>

      {helperText ? (
        <p className="mt-1 text-[11px] italic text-red-600">{helperText}</p>
      ) : null}
    </div>
  );
}

export default function AccountSettingsPanel({
  initialDirectoryListed,
}: AccountSettingsPanelProps) {
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
    if (status === "loading") {
      return;
    }

    async function fetchProfile() {
      try {
        const res = await fetch("/api/profile");
        if (!res.ok) {
          setError("Failed to load profile.");
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
  }, [status]);

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
        const data = await res.json().catch(() => ({}));
        setError(data.message || data.error || "Failed to update profile.");
        return;
      }

      setProfile((prev) =>
        prev
          ? {
              ...prev,
              firstName: profile?.isIdentityLocked ? prev.firstName : formData.firstName,
              lastName: profile?.isIdentityLocked ? prev.lastName : formData.lastName,
              bio: formData.bio,
              dateOfBirth: profile?.isIdentityLocked ? prev.dateOfBirth : formData.dateOfBirth,
              profilePhotoUrl: formData.profilePhotoUrl || null,
            }
          : prev
      );
      setSuccess("Profile updated successfully.");
      router.refresh();
    } catch {
      setError("An error occurred. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  const showDobPrompt =
    !profile?.dateOfBirth && Boolean((session?.user as any)?.oauthNeedsProfileRedirect);

  return (
    <section className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-slate-950">Account Settings</h2>
        <p className="text-sm text-slate-600">
          Update your profile details here and manage the rest of your account settings in one
          place.
        </p>
      </div>

      {error ? (
        <StatusMessage variant="error" title="Profile update failed">
          <p>{error}</p>
        </StatusMessage>
      ) : null}

      {showDobPrompt ? (
        <StatusMessage variant="warning" title="Add your date of birth">
          <p>
            Date of birth is not displayed publicly. It is optional here, but leaving it blank may
            restrict access to some features and it is required before a user can become trusted.
          </p>
        </StatusMessage>
      ) : null}

      {success ? (
        <StatusMessage variant="success" title="Profile updated">
          <p>{success}</p>
        </StatusMessage>
      ) : null}

      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          Loading profile settings...
        </div>
      ) : profile ? (
        <FormCard>
          <form onSubmit={handleSubmit} className="space-y-4">
            <DirectoryOptInCard initialValue={initialDirectoryListed} />

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
                {profile.isIdentityLocked ? (
                  <IdentityLockedField id="first-name" label="First Name" value={formData.firstName} />
                ) : (
                  <div>
                    <label className="form-label text-slate-500">First Name</label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      className="form-input border-slate-500 bg-white text-slate-950"
                    />
                  </div>
                )}

                {profile.isIdentityLocked ? (
                  <IdentityLockedField id="last-name" label="Last Name" value={formData.lastName} />
                ) : (
                  <div>
                    <label className="form-label text-slate-500">Last Name</label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      className="form-input border-slate-500 bg-white text-slate-950"
                    />
                  </div>
                )}

                <div>
                  <label className="form-label text-slate-500">Email</label>
                  <input
                    type="email"
                    value={profile.email}
                    disabled
                    className="form-input border-slate-500 bg-white text-slate-950 disabled:border-slate-500 disabled:bg-slate-100 disabled:text-slate-600"
                  />
                  <p className="mt-1 text-[11px] italic text-red-600">
                    Not visible to the public. Email cannot be changed.
                  </p>
                </div>

                {profile.isIdentityLocked ? (
                  <IdentityLockedField
                    id="date-of-birth"
                    label="Date of Birth"
                    value={formData.dateOfBirth}
                    helperText="Not visible to the public."
                  />
                ) : (
                  <div>
                    <label className="form-label text-slate-500">Date of Birth</label>
                    <input
                      type="date"
                      name="dateOfBirth"
                      value={formData.dateOfBirth}
                      onChange={handleInputChange}
                      max={new Date().toISOString().split("T")[0]}
                      className="form-input border-slate-500 bg-white text-slate-950"
                    />
                    <p className="mt-1 text-xs text-slate-500">
                      Not visible to the public. Required before your account can be vouched for.
                      Once verified, this cannot be changed.
                    </p>
                  </div>
                )}

                <div>
                  <label className="form-label text-slate-500">Bio</label>
                  <textarea
                    name="bio"
                    value={formData.bio}
                    onChange={handleInputChange}
                    className="form-textarea border-slate-500 bg-white text-slate-950 disabled:border-slate-500 disabled:bg-slate-100 disabled:text-slate-600"
                    rows={4}
                    placeholder="Tell the community about yourself"
                  />
                </div>

                <FormCardActions>
                  <CrudActionButton
                    type="submit"
                    variant="primary"
                    icon={Save}
                    label={isSaving ? "Saving profile changes" : "Save Changes"}
                    disabled={isSaving}
                  >
                    {isSaving ? "Saving..." : "Save Changes"}
                  </CrudActionButton>
                </FormCardActions>
              </div>
            </div>
          </form>
        </FormCard>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          Profile settings are unavailable right now.
        </div>
      )}
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
    </section>
  );
}
