import { ImageResponse } from 'next/og';
import { cookies, headers } from 'next/headers';
import { getCurrentCommunity } from '@/lib/community';
import { resolveTenantTheme } from '@/lib/theme/resolve-theme';

export const alt = 'Community platform';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

function OpenGraphMark({
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
  return (
    <svg viewBox="0 0 512 512" width="260" height="300" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id={`og-mark-${shape}`} x1="96" y1="64" x2="424" y2="456" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={startColor} />
          <stop offset="1" stopColor={endColor} />
        </linearGradient>
      </defs>
      {shape === 'hex' ? (
        <>
          <path d="M170 78h172l86 148-86 148H170L84 226l86-148Z" fill={`url(#og-mark-${shape})`} />
          <path
            d="M188 108h136l67 118-67 118H188l-67-118 67-118Z"
            fill="rgba(15,23,42,0.16)"
            stroke="rgba(255,255,255,0.22)"
            strokeWidth="4"
          />
        </>
      ) : (
        <>
          <path
            d="M256 42 420 86v112c0 94-67 172-164 218C159 370 92 292 92 198V86l164-44Z"
            fill={`url(#og-mark-${shape})`}
          />
          <path
            d="M256 68 390 104v94c0 78-55 144-134 185-79-41-134-107-134-185v-94l134-36Z"
            fill="rgba(15,23,42,0.18)"
            stroke="rgba(255,255,255,0.22)"
            strokeWidth="4"
          />
        </>
      )}
      <text
        x="256"
        y="278"
        textAnchor="middle"
        fill="#F8FBFF"
        fontSize="142"
        fontWeight="800"
        letterSpacing="-10"
        fontFamily="Inter, sans-serif"
      >
        {letters}
      </text>
    </svg>
  );
}

export default async function OpenGraphImage() {
  const requestHeaders = headers();
  const cookieStore = cookies();
  const currentCommunity = await getCurrentCommunity({ headers: requestHeaders });
  const previewTenantSlug =
    process.env.NODE_ENV === 'development'
      ? cookieStore.get('theme-tenant-preview')?.value ?? null
      : null;
  const resolvedTheme = resolveTenantTheme({
    tenantSlug: currentCommunity?.slug,
    manifestSlug: currentCommunity?.themeManifestSlug,
    previewTenantSlug,
    siteName: currentCommunity?.name,
    mode: cookieStore.get('theme-mode')?.value ?? null,
  });

  const siteName = resolvedTheme.identity.siteName;
  const mastheadEyebrow = resolvedTheme.identity.mastheadEyebrow ?? 'Community platform';
  const markLetters =
    resolvedTheme.identity.markLetters ??
    siteName
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  const markShape = resolvedTheme.identity.markShape ?? 'shield';
  const tagline =
    siteName === 'Highlander Today'
      ? 'Local news, events, market, and community life rooted in Cambria Heights.'
      : 'Local news, events, directories, and civic participation tailored to this tenant community.';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          overflow: 'hidden',
          background: resolvedTheme.tokens.mastheadBg,
          color: 'white',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(circle at 18% 12%, rgba(255,255,255,0.16), transparent 26%), radial-gradient(circle at 86% 18%, rgba(70,168,204,0.35), transparent 25%), radial-gradient(circle at 72% 90%, rgba(255,255,255,0.08), transparent 20%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: -120,
            right: -80,
            width: 460,
            height: 460,
            borderRadius: '9999px',
            background: `radial-gradient(circle, ${resolvedTheme.tokens.mastheadIconStart}33, transparent)`,
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: -180,
            left: -100,
            width: 520,
            height: 520,
            borderRadius: '9999px',
            background: `radial-gradient(circle, ${resolvedTheme.tokens.mastheadIconEnd}45, transparent)`,
          }}
        />

        <div
          style={{
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            width: '100%',
            height: '100%',
            padding: '64px 74px',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              maxWidth: 700,
            }}
          >
            <div
              style={{
                display: 'flex',
                marginBottom: 24,
                fontSize: 22,
                fontWeight: 700,
                letterSpacing: '0.32em',
                textTransform: 'uppercase',
                color: resolvedTheme.tokens.mastheadEyebrow,
              }}
            >
              {mastheadEyebrow}
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  fontSize: 88,
                  lineHeight: 0.92,
                  fontWeight: 900,
                  letterSpacing: '-0.06em',
                }}
              >
                {siteName}
              </div>
              <div
                style={{
                  display: 'flex',
                  fontSize: 34,
                  lineHeight: 1.25,
                  color: 'rgba(255,255,255,0.74)',
                  maxWidth: 620,
                }}
              >
                {tagline}
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 260,
              height: 300,
              boxShadow: '0 28px 70px rgba(0, 0, 0, 0.34)',
              transform: 'rotate(8deg)',
            }}
          >
            <OpenGraphMark
              letters={markLetters}
              shape={markShape}
              startColor={resolvedTheme.tokens.mastheadIconStart}
              endColor={resolvedTheme.tokens.mastheadIconEnd}
            />
          </div>
        </div>
      </div>
    ),
    size
  );
}
