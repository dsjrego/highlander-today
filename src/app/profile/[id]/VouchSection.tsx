"use client";

import { useState } from "react";

interface VouchSectionProps {
  userId: string;
  firstName: string;
  lastName: string;
  hasDateOfBirth: boolean;
}

export default function VouchSection({
  userId,
  firstName,
  lastName,
  hasDateOfBirth,
}: VouchSectionProps) {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleVouch = async () => {
    if (!hasDateOfBirth) {
      setStatus("error");
      setMessage(
        `${firstName} has not entered their date of birth yet. A member must fill out their date of birth before they can be vouched for.`
      );
      return;
    }

    const confirmed = window.confirm(
      `Are you sure you want to vouch for ${firstName} ${lastName}? This action is permanent and ties to your account.`
    );
    if (!confirmed) return;

    setStatus("loading");
    setMessage("");

    try {
      const res = await fetch(`/api/users/${userId}/vouch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setMessage(data.error || "Failed to vouch for this member");
        return;
      }

      setStatus("success");
      setMessage(data.message || `You have successfully vouched for ${firstName} ${lastName}`);
    } catch {
      setStatus("error");
      setMessage("An error occurred. Please try again.");
    }
  };

  if (status === "success") {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
        <p className="text-green-800 font-semibold">{message}</p>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
      <h3 className="font-bold text-lg mb-2 text-[#46A8CC]">
        Help Verify This Member
      </h3>
      <p className="text-gray-700 mb-4">
        If you know this person and vouch for their identity, you can help them
        become a trusted member. Your vouch is permanent and ties to your
        account.
      </p>

      {status === "error" && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <p className="text-red-700 text-sm">{message}</p>
        </div>
      )}

      <button
        onClick={handleVouch}
        disabled={status === "loading"}
        className="text-white px-6 py-2 rounded-full font-semibold shadow-sm hover:shadow-md transition-shadow duration-200 disabled:opacity-50"
        style={{ backgroundColor: "#A51E30" }}
      >
        {status === "loading" ? "Vouching..." : "Vouch for This Member"}
      </button>
    </div>
  );
}
