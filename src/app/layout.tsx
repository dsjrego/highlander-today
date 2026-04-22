import type { Metadata } from "next";
import { useId } from "react";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { cookies, headers } from "next/headers";
import Providers from "@/components/Providers";
import DevThemeSwitcher from "@/components/dev/DevThemeSwitcher";
import BannerActions from "@/components/layout/BannerActions";
import NavigationBar from "@/components/layout/NavigationBar";
import LocationCompletionGate from "@/components/location/LocationCompletionGate";
import { authOptions } from "@/lib/auth";
import { getAboutNavItems } from "@/lib/about";
import { getCurrentCommunity } from "@/lib/community";
import { SUPPORT_NAV_ITEMS } from "@/lib/support";
import { resolveTenantTheme } from "@/lib/theme/resolve-theme";
import { themeToCssVars } from "@/lib/theme/to-css-vars";
import "./globals.css";
import "./editorial-recipe.css";

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

function MastheadMark({
  letters,
  shape = 'shield',
  startColor,
  endColor,
}: {
  letters: string;
  shape?: 'shield' | 'hex';
  startColor: string;
  endColor: string;
}) {
  const gradientId = useId().replace(/:/g, '');

  return (
    <svg
      viewBox="5 5 72 72"
      aria-hidden="true"
      className="h-full drop-shadow-[0_10px_24px_rgba(0,0,0,0.28)]"
    >
      <defs>
        <linearGradient id={`mastheadMark-${shape}-${gradientId}`} x1="10%" y1="10%" x2="90%" y2="90%">
          <stop offset="0%" stopColor={startColor} />
          <stop offset="100%" stopColor={endColor} />
        </linearGradient>
      </defs>
      {shape === 'hex' ? (
        <>
          <path
            d="M22 8h28l14 24-14 24H22L8 32 22 8Z"
            fill={`url(#mastheadMark-${shape}-${gradientId})`}
          />
          <path
            d="M24.8 13h22.4l11 19-11 19H24.8l-11-19 11-19Z"
            fill="rgba(7,17,26,0.18)"
            stroke="rgba(255,255,255,0.2)"
            strokeWidth="1.5"
          />
        </>
      ) : (
        <>
          <path
            d="M36 4 65 12v20c0 16.2-12 28.4-29 35.8C19 60.4 7 48.2 7 32V12L36 4Z"
            fill={`url(#mastheadMark-${shape}-${gradientId})`}
          />
          <path
            d="M36 8.5 61 15v17c0 13.6-10 24.2-25 30.8C21 56.2 11 45.6 11 32V15l25-6.5Z"
            fill="rgba(7,17,26,0.22)"
            stroke="rgba(255,255,255,0.22)"
            strokeWidth="1.5"
          />
        </>
      )}
      <text
        x="36"
        y="41.5"
        textAnchor="middle"
        fill="#f8fbff"
        fontSize="23"
        fontWeight="800"
        letterSpacing="-1.6"
        style={{ fontFamily: 'var(--font-sans)' }}
      >
        {letters}
      </text>
    </svg>
  );
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const requestHeaders = headers();
  const cookieStore = cookies();
  const currentCommunity = await getCurrentCommunity({ headers: requestHeaders });
  const previewTenantSlug = process.env.NODE_ENV === 'development'
    ? cookieStore.get('theme-tenant-preview')?.value ?? null
    : null;
  const resolvedTheme = resolveTenantTheme({
    tenantSlug: currentCommunity?.slug,
    manifestSlug: currentCommunity?.themeManifestSlug,
    previewTenantSlug,
    siteName: currentCommunity?.name,
    mode: cookieStore.get('theme-mode')?.value ?? null,
  });
  const themeVars = themeToCssVars(resolvedTheme.tokens);
  const isSuperAdmin = session?.user?.role === 'SUPER_ADMIN';
  const aboutNavItems = getAboutNavItems(isSuperAdmin);
  const siteName = resolvedTheme.identity.siteName;
  const footerSectionTitle = resolvedTheme.identity.footerSectionTitle ?? siteName;
  const mastheadMarkLetters =
    resolvedTheme.identity.markLetters ??
    siteName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  const mastheadMarkShape = resolvedTheme.identity.markShape ?? 'shield';
  const mastheadMarkStart = resolvedTheme.tokens.mastheadIconStart;
  const mastheadMarkEnd = resolvedTheme.tokens.mastheadIconEnd;

  return (
    <html
      lang="en"
      data-tenant={resolvedTheme.manifest.tenantSlug}
      data-theme-mode={resolvedTheme.mode}
      data-theme-tenant-preview={previewTenantSlug ?? undefined}
    >
      <body className="app-body">
        <Providers>
          <DevThemeSwitcher />
          <LocationCompletionGate />
          <div className="app-shell min-h-screen" style={themeVars}>
          {/* Masthead */}
          <header className="app-masthead relative z-40 overflow-visible">
            <div className="app-masthead-overlay" />
            <div className="app-masthead-inner relative w-full px-3 py-2 md:p-3">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 md:hidden">
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <div className="relative h-9 w-[2.15rem] shrink-0">
                      <MastheadMark
                        letters={mastheadMarkLetters}
                        shape={mastheadMarkShape}
                        startColor={mastheadMarkStart}
                        endColor={mastheadMarkEnd}
                      />
                    </div>
                    <h1 className="app-masthead-title min-w-0 truncate text-[0.98rem] font-black leading-[0.92] tracking-[-0.05em]">
                      {siteName}
                    </h1>
                  </div>
                </div>
                <BannerActions />
              </div>
              <div className="hidden md:flex md:flex-row md:items-start md:justify-between md:gap-4">
                <div className="max-w-4xl">
                  {resolvedTheme.identity.mastheadEyebrow ? (
                    <p className="app-masthead-eyebrow mb-1 text-[0.72rem] font-bold uppercase tracking-[0.28em]">
                      {resolvedTheme.identity.mastheadEyebrow}
                    </p>
                  ) : null}
                  <div className="mb-3 flex items-start gap-0">
                    <div className="relative h-12 w-[4rem] shrink-0 sm:h-14 lg:h-[4.2rem]">
                      <MastheadMark
                        letters={mastheadMarkLetters}
                        shape={mastheadMarkShape}
                        startColor={mastheadMarkStart}
                        endColor={mastheadMarkEnd}
                      />
                    </div>
                    <h1 className="app-masthead-title text-[2.625rem] font-black leading-[0.92] tracking-[-0.05em] sm:text-[3.375rem] lg:text-[3.95rem]">
                      {siteName}
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
          <footer className="app-footer mt-12">
            <div className="container mx-auto px-4 py-10">
              <div className="mb-8 grid gap-8 text-center md:grid-cols-2">
                <div className="flex flex-col items-center">
                  <h3 className="mb-3 text-xl font-bold">Support</h3>
                  <ul className="app-footer-link-list space-y-2 text-sm">
                    {SUPPORT_NAV_ITEMS.map((item) => (
                      <li key={item.href}>
                        <Link href={item.href} className="app-footer-link">
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="flex flex-col items-center">
                  <h3 className="mb-3 text-xl font-bold">{footerSectionTitle}</h3>
                  <ul className="app-footer-link-list space-y-2 text-sm">
                    {aboutNavItems.map((item) => (
                      <li key={item.href}>
                        <Link href={item.href} className="app-footer-link">
                          {item.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="app-footer-meta space-y-2 border-t pt-5 text-center text-sm">
                <p>&copy; 2024 {siteName}. All rights reserved.</p>
                {resolvedTheme.identity.footerDisclaimer ? (
                  <p className="mx-auto max-w-3xl text-xs leading-relaxed">
                    {resolvedTheme.identity.footerDisclaimer}
                  </p>
                ) : null}
              </div>
            </div>
          </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
