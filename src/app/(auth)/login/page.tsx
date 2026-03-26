"use client";

import { signIn } from "next-auth/react";
import { FormEvent, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import AuthShell, { AuthAsideLink } from "@/components/auth/AuthShell";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [signInLoading, setSignInLoading] = useState(false);
  const [signInError, setSignInError] = useState("");
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState("");
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [showRegisterConfirmPassword, setShowRegisterConfirmPassword] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    dateOfBirth: "",
  });
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  async function handleSignInSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSignInLoading(true);
    setSignInError("");

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
        callbackUrl,
      });

      if (result?.error) {
        setSignInError("Invalid email or password");
      } else if (result?.ok) {
        router.push(result.url || callbackUrl);
      }
    } catch (err) {
      setSignInError("An error occurred. Please try again.");
    } finally {
      setSignInLoading(false);
    }
  }

  function handleRegisterChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setRegisterForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleRegisterSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setRegisterError("");

    if (registerForm.password !== registerForm.confirmPassword) {
      setRegisterError("Passwords do not match");
      return;
    }

    setRegisterLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: registerForm.firstName,
          lastName: registerForm.lastName,
          email: registerForm.email,
          password: registerForm.password,
          dateOfBirth: registerForm.dateOfBirth,
        }),
      });

      const data: { message?: string } = await res.json();

      if (!res.ok) {
        setRegisterError(data.message || "Registration failed");
        return;
      }

      const result = await signIn("credentials", {
        email: registerForm.email,
        password: registerForm.password,
        redirect: false,
        callbackUrl,
      });

      if (result?.ok) {
        router.push(result.url || callbackUrl);
      } else {
        router.push("/login");
      }
    } catch (err) {
      setRegisterError("An error occurred. Please try again.");
    } finally {
      setRegisterLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    await signIn("google", { callbackUrl });
  }

  function PasswordVisibilityButton({
    isVisible,
    onClick,
    label,
  }: {
    isVisible: boolean;
    onClick: () => void;
    label: string;
  }) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="absolute inset-y-0 right-0 flex items-center px-4 text-slate-400 transition hover:text-slate-700"
        aria-label={label}
      >
        {isVisible ? (
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
              d="M3 3l18 18M10.6 10.7a2 2 0 102.8 2.8M9.9 5.1A10.9 10.9 0 0112 5c5.2 0 8.9 4.1 10 6.9a11.8 11.8 0 01-4 5.1M6.6 6.7C4.5 8 3.2 10.1 2 12c1.1 2.8 4.8 7 10 7 1.8 0 3.3-.4 4.7-1.1"
            />
          </svg>
        ) : (
          <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
              d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7Z"
            />
            <circle cx="12" cy="12" r="3" strokeWidth="1.8" />
          </svg>
        )}
      </button>
    );
  }

  return (
    <AuthShell
      showHeader={false}
      showIntroCard={false}
      showAsideCard={false}
      centeredForm={true}
      wrapChildrenCard={false}
      eyebrow="Access"
      title="Sign In"
      description="Use your Highlander Today account to return to conversations, manage your activity, and keep local participation tied to real people."
      asideTitle="Create a local account"
      asideBody="Registration opens the door to messaging, submissions, and the trust path that unlocks more community participation."
      asideFooter={<AuthAsideLink href="/register">Create account</AuthAsideLink>}
    >
      <div className="mx-auto grid w-full max-w-6xl items-start gap-4 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:gap-6">
        <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,245,249,0.94))] p-5 shadow-[0_24px_55px_rgba(15,23,42,0.16)] backdrop-blur md:p-7">
          <div className="mb-6 flex min-h-[60px] items-center rounded-[24px] border border-[#8f1d2c]/15 bg-[linear-gradient(145deg,rgba(143,29,44,0.1),rgba(70,168,204,0.08))] px-4 py-2 text-left">
            <p className="mb-0 text-xs font-semibold uppercase tracking-[0.28em] text-[#8f1d2c]">
              Social Sign In/Up
            </p>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="flex w-full items-center justify-center gap-3 rounded-full border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5">
              <path
                fill="#EA4335"
                d="M12 10.2v3.9h5.4c-.2 1.3-1.5 3.9-5.4 3.9-3.2 0-5.9-2.7-5.9-6s2.7-6 5.9-6c1.8 0 3 .8 3.7 1.5l2.5-2.4C16.6 3.6 14.5 2.7 12 2.7 6.9 2.7 2.8 6.8 2.8 12S6.9 21.3 12 21.3c6.9 0 9.1-4.8 9.1-7.3 0-.5-.1-.9-.1-1.3H12Z"
              />
              <path
                fill="#34A853"
                d="M2.8 7.3l3.2 2.3c.9-2.6 3.3-4.4 6-4.4 1.8 0 3 .8 3.7 1.5l2.5-2.4C16.6 3.6 14.5 2.7 12 2.7c-3.5 0-6.6 2-8.1 4.6Z"
              />
              <path
                fill="#FBBC05"
                d="M12 21.3c2.4 0 4.5-.8 6-2.3l-2.8-2.3c-.8.6-1.9 1.2-3.3 1.2-3.8 0-5.1-2.5-5.4-3.8l-3.2 2.4c1.5 2.7 4.6 4.8 8.1 4.8Z"
              />
              <path
                fill="#4285F4"
                d="M21.1 13.9c.1-.4.1-.8.1-1.3s0-.9-.1-1.3H12v3.9h5.4c-.3 1.2-1.1 2.2-2.2 2.9l2.8 2.3c1.6-1.5 3.1-4.2 3.1-7.5Z"
              />
            </svg>
            Google
          </button>
        </div>

        <div className="flex items-start justify-center py-4 md:pt-20">
          <span className="rounded-full border border-white/12 bg-slate-950/72 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.32em] text-cyan-100/80 shadow-[0_10px_24px_rgba(7,17,26,0.2)] backdrop-blur">
            Or
          </span>
        </div>

        <div className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,245,249,0.94))] p-5 shadow-[0_24px_55px_rgba(15,23,42,0.16)] backdrop-blur md:p-7">
          <div className="mb-6 flex min-h-[60px] items-center rounded-[24px] border border-[#8f1d2c]/15 bg-[linear-gradient(145deg,rgba(143,29,44,0.1),rgba(70,168,204,0.08))] px-4 py-2 text-left">
            <p className="mb-0 text-xs font-semibold uppercase tracking-[0.28em] text-[#8f1d2c]">
              Email Sign In/Up
            </p>
          </div>

          <div className="mb-6 inline-flex rounded-full border border-slate-200 bg-white p-1 shadow-[0_8px_24px_rgba(15,23,42,0.08)]">
            <button
              type="button"
              onClick={() => setActiveTab("sign-in")}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeTab === "sign-in"
                  ? "bg-slate-950 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("sign-up")}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                activeTab === "sign-up"
                  ? "bg-slate-950 text-white"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Sign Up
            </button>
          </div>

          {activeTab === "sign-in" ? (
            <>
              {signInError && (
                <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {signInError}
                </div>
              )}

              <form onSubmit={handleSignInSubmit} className="space-y-4">
                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] transition focus:border-[#46A8CC] focus:outline-none focus:ring-2 focus:ring-[#46A8CC]/30"
                    placeholder="you@example.com"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showSignInPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-12 text-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] transition focus:border-[#46A8CC] focus:outline-none focus:ring-2 focus:ring-[#46A8CC]/30"
                      placeholder="••••••••"
                    />
                    <PasswordVisibilityButton
                      isVisible={showSignInPassword}
                      onClick={() => setShowSignInPassword((current) => !current)}
                      label={showSignInPassword ? "Hide password" : "Show password"}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={signInLoading}
                  className="w-full rounded-full bg-[#8f1d2c] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#7d1927] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {signInLoading ? "Signing In..." : "Sign In"}
                </button>
              </form>
            </>
          ) : (
            <>
              {registerError && (
                <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {registerError}
                </div>
              )}

              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                      First Name
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      value={registerForm.firstName}
                      onChange={handleRegisterChange}
                      required
                      className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 transition focus:border-[#46A8CC] focus:outline-none focus:ring-2 focus:ring-[#46A8CC]/30"
                      placeholder="John/Jane"
                    />
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                      Last Name
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      value={registerForm.lastName}
                      onChange={handleRegisterChange}
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
                    value={registerForm.email}
                    onChange={handleRegisterChange}
                    required
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 transition focus:border-[#46A8CC] focus:outline-none focus:ring-2 focus:ring-[#46A8CC]/30"
                    placeholder="you@example.com"
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                      Password
                    </label>
                    <div className="relative">
                      <input
                        type={showRegisterPassword ? "text" : "password"}
                        name="password"
                        value={registerForm.password}
                        onChange={handleRegisterChange}
                        required
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-12 text-slate-950 transition focus:border-[#46A8CC] focus:outline-none focus:ring-2 focus:ring-[#46A8CC]/30"
                        placeholder="••••••••"
                      />
                      <PasswordVisibilityButton
                        isVisible={showRegisterPassword}
                        onClick={() => setShowRegisterPassword((current) => !current)}
                        label={showRegisterPassword ? "Hide sign up password" : "Show sign up password"}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                      Confirm Password
                    </label>
                    <div className="relative">
                      <input
                        type={showRegisterConfirmPassword ? "text" : "password"}
                        name="confirmPassword"
                        value={registerForm.confirmPassword}
                        onChange={handleRegisterChange}
                        required
                        className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 pr-12 text-slate-950 transition focus:border-[#46A8CC] focus:outline-none focus:ring-2 focus:ring-[#46A8CC]/30"
                        placeholder="••••••••"
                      />
                      <PasswordVisibilityButton
                        isVisible={showRegisterConfirmPassword}
                        onClick={() => setShowRegisterConfirmPassword((current) => !current)}
                        label={showRegisterConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    name="dateOfBirth"
                    value={registerForm.dateOfBirth}
                    onChange={handleRegisterChange}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-950 transition focus:border-[#46A8CC] focus:outline-none focus:ring-2 focus:ring-[#46A8CC]/30"
                  />
                  <p className="mt-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
                    Date of birth is not displayed publicly. It is optional here, but leaving it blank may restrict access to some features and it is required before a user can become trusted.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={registerLoading}
                  className="w-full rounded-full bg-[#8f1d2c] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#7d1927] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {registerLoading ? "Creating Account..." : "Sign Up"}
                </button>
              </form>
            </>
          )}

        </div>
      </div>
    </AuthShell>
  );
}
