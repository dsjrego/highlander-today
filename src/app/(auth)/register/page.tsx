"use client";

import { signIn } from "next-auth/react";
import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import AuthShell, { AuthAsideLink } from "@/components/auth/AuthShell";

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.message || "Registration failed");
      } else {
        // Sign in after successful registration
        const result = await signIn("credentials", {
          email: formData.email,
          password: formData.password,
          redirect: false,
        });

        if (result?.ok) {
          router.push("/");
        } else {
          router.push("/login");
        }
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    await signIn("google", { callbackUrl: "/" });
  }

  return (
    <AuthShell
      eyebrow="Join"
      title="Create Account"
      description="Start with a real-name local account, then build trust and participation from there."
      asideTitle="Already registered?"
      asideBody="If you already have an account, sign in to continue to messages, submissions, and the rest of the public site."
      asideFooter={<AuthAsideLink href="/login">Back to sign in</AuthAsideLink>}
    >
      <div className="mb-6 rounded-[24px] border border-[#46A8CC]/20 bg-[linear-gradient(145deg,rgba(70,168,204,0.12),rgba(143,29,44,0.08))] p-5">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.28em] text-[#0f2941]">
          New Account
        </p>
        <h2 className="mb-0 text-2xl font-black tracking-[-0.03em] text-slate-950">Register for Highlander Today</h2>
      </div>

      {error && (
        <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              First Name
            </label>
            <input
              type="text"
              name="firstName"
              value={formData.firstName}
              onChange={handleChange}
              required
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 transition focus:border-[#46A8CC] focus:outline-none focus:ring-2 focus:ring-[#46A8CC]/30"
              placeholder="John"
            />
          </div>
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              Last Name
            </label>
            <input
              type="text"
              name="lastName"
              value={formData.lastName}
              onChange={handleChange}
              required
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 transition focus:border-[#46A8CC] focus:outline-none focus:ring-2 focus:ring-[#46A8CC]/30"
              placeholder="Doe"
            />
          </div>
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Email
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 transition focus:border-[#46A8CC] focus:outline-none focus:ring-2 focus:ring-[#46A8CC]/30"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Password
          </label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            required
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 transition focus:border-[#46A8CC] focus:outline-none focus:ring-2 focus:ring-[#46A8CC]/30"
            placeholder="••••••••"
          />
        </div>

        <div>
          <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
            Confirm Password
          </label>
          <input
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 transition focus:border-[#46A8CC] focus:outline-none focus:ring-2 focus:ring-[#46A8CC]/30"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full rounded-full bg-[#8f1d2c] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#7d1927] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? "Creating Account..." : "Register"}
        </button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-slate-200" />
        <span className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">Or continue with</span>
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      <button
        type="button"
        onClick={handleGoogleSignIn}
        className="w-full rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
      >
        Sign up with Google
      </button>

      <p className="mt-6 text-center text-sm text-slate-600">
        Already have an account?{" "}
        <Link href="/login" className="font-semibold text-[#8f1d2c] transition hover:text-[#46A8CC]">
          Sign in here
        </Link>
      </p>
    </AuthShell>
  );
}
