import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import Providers from "@/components/Providers";
import BannerActions from "@/components/layout/BannerActions";
import NavigationBar from "@/components/layout/NavigationBar";
import { authOptions } from "@/lib/auth";
import { getAboutNavItems } from "@/lib/about";
import { SUPPORT_NAV_ITEMS } from "@/lib/support";
import "./globals.css";

function getMetadataBase() {
  try {
    return new URL(process.env.NEXTAUTH_URL ?? "http://localhost:3000");
  } catch {
    return new URL("http://localhost:3000");
  }
}

export const metadata: Metadata = {
  metadataBase: getMetadataBase(),
  title: "Highlander Today",
  description:
    "A community platform for news, events, market, and help wanted services.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN';
  const aboutNavItems = getAboutNavItems(isSuperAdmin);

  return (
    <html lang="en">
      <body className="bg-[#07111a] text-gray-900">
        <Providers>
          <div className="min-h-screen bg-[radial-gradient(circle_at_top,rgba(70,168,204,0.2),transparent_20%),radial-gradient(circle_at_85%_12%,rgba(143,29,44,0.28),transparent_24%),linear-gradient(180deg,#07111a_0%,#081520_32%,#09111a_100%)]">
          {/* Masthead */}
          <header className="relative z-40 overflow-visible border-b border-white/10 bg-[linear-gradient(135deg,#091a28_0%,#0f2941_34%,#8f1d2c_100%)] text-white">
            <div className="absolute inset-0 opacity-30 [background-image:radial-gradient(circle_at_18%_12%,rgba(255,255,255,0.16),transparent_26%),radial-gradient(circle_at_86%_18%,rgba(70,168,204,0.35),transparent_25%),radial-gradient(circle_at_72%_90%,rgba(255,255,255,0.08),transparent_20%)]" />
            <div className="relative w-full px-3 py-2 md:p-3">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 md:hidden">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <div className="relative h-9 w-[2.15rem] shrink-0">
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
                    <h1 className="min-w-0 truncate text-[0.98rem] font-black leading-[0.92] tracking-[-0.05em] text-white">
                      Highlander Today
                    </h1>
                  </div>
                </div>
                <BannerActions />
              </div>
              <div className="hidden md:flex md:flex-row md:items-start md:justify-between md:gap-4">
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
                </div>
                <div className="md:pt-1">
                  <BannerActions />
                </div>
              </div>
              <div className="mt-0 md:mt-1.5">
                <NavigationBar />
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="relative z-0 w-full px-[2px] pb-10 pt-[2px] md:px-4 md:pt-0">{children}</main>

          {/* Footer */}
          <footer className="mt-12 border-t border-white/10 bg-[linear-gradient(135deg,#091a28_0%,#0f2941_34%,#8f1d2c_100%)] text-white">
            <div className="container mx-auto px-4 py-10">
              <div className="mb-8 grid gap-8 text-center md:grid-cols-2">
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
                  <h3 className="mb-3 text-xl font-bold text-white">Highlander Today</h3>
                  <ul className="space-y-2 text-sm text-cyan-200">
                    {aboutNavItems.map((item) => (
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
