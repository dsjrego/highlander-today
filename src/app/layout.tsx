import type { Metadata } from "next";
import Link from "next/link";
import Providers from "@/components/Providers";
import BannerActions from "@/components/layout/BannerActions";
import NavigationBar from "@/components/layout/NavigationBar";
import { ABOUT_NAV_ITEMS } from "@/lib/about";
import { SUPPORT_NAV_ITEMS } from "@/lib/support";
import "./globals.css";

export const metadata: Metadata = {
  title: "Highlander Today",
  description:
    "A community platform for news, events, market, and help wanted services.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-[#07111a] text-gray-900">
        <Providers>
          <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(70,168,204,0.2),transparent_20%),radial-gradient(circle_at_85%_12%,rgba(143,29,44,0.28),transparent_24%),linear-gradient(180deg,#07111a_0%,#081520_32%,#09111a_100%)]">
          {/* Masthead */}
          <header className="relative z-40 overflow-visible border-b border-white/10 bg-[linear-gradient(135deg,#091a28_0%,#0f2941_34%,#8f1d2c_100%)] text-white">
            <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_18%_12%,rgba(255,255,255,0.16),transparent_26%),radial-gradient(circle_at_86%_18%,rgba(70,168,204,0.35),transparent_25%),radial-gradient(circle_at_72%_90%,rgba(255,255,255,0.08),transparent_20%)]" />
            <div className="relative w-full p-3">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="max-w-4xl">
                  <div className="mb-3 flex items-start gap-0">
                    <div className="relative h-12 w-[4rem] shrink-0 sm:h-14 lg:h-[4.2rem]">
                      <svg
                        viewBox="5 5 72 72"
                        aria-hidden="true"
                        className="h-full drop-shadow-[0_10px_24px_rgba(0,0,0,0.28)]"
                      >
                        <defs>
                          <linearGradient id="htShield" x1="10%" y1="10%" x2="90%" y2="90%">
                            <stop offset="0%" stopColor="#54c3e6" />
                            <stop offset="100%" stopColor="#a51e30" />
                          </linearGradient>
                        </defs>
                        <path
                          d="M36 4 65 12v20c0 16.2-12 28.4-29 35.8C19 60.4 7 48.2 7 32V12L36 4Z"
                          fill="url(#htShield)"
                        />
                        <path
                          d="M36 8.5 61 15v17c0 13.6-10 24.2-25 30.8C21 56.2 11 45.6 11 32V15l25-6.5Z"
                          fill="rgba(7,17,26,0.22)"
                          stroke="rgba(255,255,255,0.22)"
                          strokeWidth="1.5"
                        />
                        <path
                          d="M17 23h5.2v8.8h7.6V23H35v24h-5.2V37h-7.6v10H17V23Z"
                          fill="#f8fbff"
                        />
                        <path
                          d="M36.8 23H54v5.2h-5V47h-6.2V28.2h-5V23Z"
                          fill="#f8fbff"
                        />
                        <path
                          d="M35.8 20.5H55v3.4H35.8Z"
                          fill="#07111a"
                          opacity="0.15"
                        />
                      </svg>
                    </div>
                    <h1 className="text-[2.625rem] font-black leading-[0.92] tracking-[-0.05em] text-white sm:text-[3.375rem] lg:text-[3.95rem]">
                      Highlander Today
                    </h1>
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-[0.32em] text-cyan-100/80">
                    Community platform
                  </p>
                </div>
                <div className="md:pt-1">
                  <BannerActions />
                </div>
              </div>
              <div className="mt-1.5">
                <NavigationBar />
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="relative z-0 container mx-auto px-4 pb-10 pt-0">{children}</main>

          {/* Footer */}
          <footer className="mt-12 border-t border-white/10 bg-[linear-gradient(135deg,#091a28_0%,#0f2941_34%,#8f1d2c_100%)] text-white">
            <div className="container mx-auto px-4 py-10">
              <div className="mb-8 grid gap-8 text-center md:grid-cols-3">
                <div className="flex flex-col items-center">
                  <h3 className="mb-3 text-xl font-bold text-white">Support</h3>
                  <ul className="space-y-2 text-sm text-cyan-200">
                    {SUPPORT_NAV_ITEMS.map((item) => (
                      <li key={item.href}>
                        <Link href={item.href} className="hover:text-white">
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-col items-center">
                  <h3 className="mb-3 text-xl font-bold text-white">Quick Links</h3>
                  <ul className="space-y-2 text-sm text-cyan-200">
                    <li><Link href="/local-life" className="hover:text-white">Local Life</Link></li>
                    <li><Link href="/experiences" className="hover:text-white">Experiences</Link></li>
                    <li><Link href="/marketplace" className="hover:text-white">Market</Link></li>
                    <li><Link href="/help-wanted" className="hover:text-white">Help Wanted</Link></li>
                    <li><Link href="/about" className="hover:text-white">About</Link></li>
                  </ul>
                </div>
                <div className="flex flex-col items-center">
                  <h3 className="mb-3 text-xl font-bold text-white">Highlander Today</h3>
                  <ul className="space-y-2 text-sm text-cyan-200">
                    {ABOUT_NAV_ITEMS.map((item) => (
                      <li key={item.href}>
                        <Link href={item.href} className="hover:text-white">
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="space-y-2 border-t border-white/10 pt-5 text-center text-sm text-white/62">
                <p>&copy; 2024 Highlander Today. All rights reserved.</p>
                <p className="mx-auto max-w-3xl text-xs leading-relaxed text-white/52">
                  Highlander Today is an independent community platform and is not affiliated with
                  the Cambria Heights School District.
                </p>
              </div>
            </div>
          </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
