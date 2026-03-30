"use client";

import { ReactNode, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { VouchConfirmModal } from "@/components/trust/VouchConfirmModal";
import { hasTrustedAccess } from "@/lib/trust-access";

interface VouchProfileButtonProps {
  userId: string;
  firstName: string;
  lastName: string;
  trustLevel: string;
  hasDateOfBirth: boolean;
  className: string;
  children?: ReactNode;
  onSuccess?: () => void;
}

interface VouchResponse {
  code?: string;
  error?: string;
  message?: string;
}

function VouchDialog({
  title,
  body,
  onClose,
}: {
  title: string;
  body: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="vouch-dialog-title"
      aria-describedby="vouch-dialog-body"
    >
      <div className="w-full max-w-md rounded-[28px] border border-white/10 bg-[linear-gradient(165deg,rgba(17,34,52,0.98),rgba(10,24,38,0.98))] p-6 text-white shadow-[0_28px_80px_rgba(2,8,23,0.55)]">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200/72">
          Community Trust
        </p>
        <h2 id="vouch-dialog-title" className="mb-3 text-2xl font-semibold tracking-tight text-white">
          {title}
        </h2>
        <p id="vouch-dialog-body" className="text-sm leading-7 text-cyan-50/78">
          {body}
        </p>
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-cyan-300/35 bg-white/[0.06] px-4 py-2 text-sm font-medium text-cyan-100 transition hover:border-cyan-300/60 hover:bg-white/[0.1] hover:text-white"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function VouchProfileButton({
  userId,
  firstName,
  lastName,
  trustLevel,
  hasDateOfBirth,
  className,
  children,
  onSuccess,
}: VouchProfileButtonProps) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeDialog, setActiveDialog] = useState<"confirm" | "missingDob" | "success" | "error" | null>(null);
  const [dialogMessage, setDialogMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentUser = session?.user as { id?: string; trust_level?: string; role?: string } | undefined;
  const isOwnProfile = currentUser?.id === userId;
  const canAttemptVouch =
    status === "authenticated" &&
    hasTrustedAccess({ trustLevel: currentUser?.trust_level, role: currentUser?.role }) &&
    !isOwnProfile &&
    trustLevel === "REGISTERED";

  if (!canAttemptVouch) {
    return null;
  }

  const userName = `${firstName} ${lastName}`.trim();

  async function submitVouch() {
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/users/${userId}/vouch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data: VouchResponse = await res.json();

      if (!res.ok) {
        if (data.code === "DATE_OF_BIRTH_REQUIRED") {
          setDialogMessage(
            data.message ||
              `${userName} needs to enter their date of birth before you can vouch for them. They have been sent a system message.`
          );
          setActiveDialog("missingDob");
          return;
        }

        setDialogMessage(data.error || "Failed to vouch for this member.");
        setActiveDialog("error");
        return;
      }

      setDialogMessage(data.message || `You have successfully vouched for ${userName}.`);
      setActiveDialog("success");
    } catch {
      setDialogMessage("An error occurred. Please try again.");
      setActiveDialog("error");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleClick() {
    if (!hasDateOfBirth) {
      await submitVouch();
      return;
    }

    setActiveDialog("confirm");
  }

  function handleClose() {
    const shouldRefresh = activeDialog === "success";
    setActiveDialog(null);
    setDialogMessage("");

    if (shouldRefresh) {
      onSuccess?.();
      router.refresh();
    }
  }

  return (
    <>
      <button type="button" onClick={handleClick} className={className}>
        {children || "Vouch"}
      </button>

      {activeDialog === "confirm" ? (
        <VouchConfirmModal
          userName={userName}
          isLoading={isSubmitting}
          onCancel={handleClose}
          onConfirm={async () => {
            await submitVouch();
          }}
        />
      ) : null}

      {activeDialog === "missingDob" ? (
        <VouchDialog
          title="Date of birth needed"
          body={dialogMessage}
          onClose={handleClose}
        />
      ) : null}

      {activeDialog === "success" ? (
        <VouchDialog
          title="Vouch recorded"
          body={dialogMessage}
          onClose={handleClose}
        />
      ) : null}

      {activeDialog === "error" ? (
        <VouchDialog
          title="Unable to vouch"
          body={dialogMessage}
          onClose={handleClose}
        />
      ) : null}
    </>
  );
}
