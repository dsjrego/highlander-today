"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function CompleteTrustPage() {
  const router = useRouter();
  const [dob, setDob] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/complete-trust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dateOfBirth: dob }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.message || "Failed to complete trust verification");
      } else {
        router.push("/");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-3xl font-bold mb-4 text-center text-[var(--brand-primary)]">
          Identity Verification
        </h1>

        <div className="bg-[var(--article-card-badge-bg)] border-l-4 border-[var(--brand-primary)] p-4 mb-6 rounded">
          <p className="text-sm text-gray-700 mb-2">
            <strong>Identity Lock:</strong> Once you provide your date of birth,
            your account identity will be verified and locked for security
            purposes.
          </p>
          <p className="text-xs text-gray-600">
            This information is used to verify your identity and prevent fraud.
            Your date of birth will be encrypted and securely stored.
          </p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date of Birth
            </label>
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--brand-primary)]"
            />
            <p className="text-xs text-gray-500 mt-2">
              Format: YYYY-MM-DD (e.g., 1990-01-15)
            </p>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-[var(--brand-primary)] text-white font-bold py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition"
          >
            {isLoading ? "Verifying..." : "Complete Verification"}
          </button>
        </form>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg text-xs text-gray-600">
          <p className="mb-2">
            <strong>What happens next:</strong>
          </p>
          <ul className="space-y-1 list-disc list-inside">
            <li>Your identity will be verified and locked</li>
            <li>You&apos;ll gain access to trusted user features</li>
            <li>Your name and DOB cannot be changed after verification</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
