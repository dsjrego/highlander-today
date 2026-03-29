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
              borderRadius: 44,
              background: 'linear-gradient(180deg, rgba(84,195,230,0.98), rgba(165,30,48,0.96))',
              boxShadow: '0 28px 70px rgba(0, 0, 0, 0.34)',
              transform: 'rotate(8deg)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 224,
                height: 264,
                borderRadius: 36,
                border: '2px solid rgba(255,255,255,0.22)',
                background: 'rgba(7,17,26,0.22)',
                color: '#f8fbff',
                fontSize: 108,
                fontWeight: 900,
                letterSpacing: '-0.08em',
              }}
            >
              HT
            </div>
          </div>
        </div>
      </div>
    ),
    size
  );
}
