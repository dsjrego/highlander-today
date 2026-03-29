import { ImageResponse } from 'next/og';

export const alt = 'Highlander Today';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          overflow: 'hidden',
          background:
            'linear-gradient(135deg, #091a28 0%, #0f2941 34%, #8f1d2c 100%)',
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
            background: 'radial-gradient(circle, rgba(84,195,230,0.22), rgba(84,195,230,0))',
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
            background: 'radial-gradient(circle, rgba(165,30,48,0.28), rgba(165,30,48,0))',
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
                color: 'rgba(186, 230, 253, 0.88)',
              }}
            >
              Community platform
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
                Highlander Today
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
                Local news, events, market, and community life rooted in Cambria Heights.
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
            <svg
              viewBox="0 0 512 512"
              width="260"
              height="300"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="htOgIconBg" x1="96" y1="64" x2="424" y2="456" gradientUnits="userSpaceOnUse">
                  <stop offset="0" stopColor="#54C3E6" />
                  <stop offset="1" stopColor="#A51E30" />
                </linearGradient>
                <linearGradient id="htOgIconInner" x1="128" y1="96" x2="384" y2="416" gradientUnits="userSpaceOnUse">
                  <stop offset="0" stopColor="#6FAFCC" stopOpacity="0.9" />
                  <stop offset="1" stopColor="#A51E30" stopOpacity="0.7" />
                </linearGradient>
              </defs>
              <rect x="86" y="70" width="340" height="372" rx="60" fill="url(#htOgIconBg)" />
              <rect
                x="110"
                y="94"
                width="292"
                height="324"
                rx="44"
                fill="url(#htOgIconInner)"
                stroke="rgba(255,255,255,0.22)"
                strokeWidth="4"
              />
              <path
                d="M184 177.5L214.2 181.7L204.9 248.6L263.6 256.8L272.9 189.9L303.1 194.1L278 373.7L247.8 369.5L257.8 297.7L199.1 289.5L189.1 361.3L158.9 357.1L184 177.5Z"
                fill="#F8FBFF"
              />
              <path
                d="M317.6 196.1L417.1 210L412.8 240.9L382.4 236.7L361.1 389L324.9 383.9L346.2 231.6L314.8 227.2L317.6 196.1Z"
                fill="#F8FBFF"
              />
            </svg>
          </div>
        </div>
      </div>
    ),
    size
  );
}
