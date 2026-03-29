import { ImageResponse } from 'next/og';
import { db } from '@/lib/db';

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

interface PageProps {
  params: {
    id: string;
  };
}

async function getPublishedArticle(id: string) {
  return db.article.findUnique({
    where: { id, status: 'PUBLISHED' },
    select: {
      title: true,
      excerpt: true,
      category: {
        select: {
          name: true,
        },
      },
      author: {
        select: {
          firstName: true,
          lastName: true,
        },
      },
    },
  });
}

function trimText(text: string | null | undefined, maxLength: number) {
  if (!text?.trim()) {
    return null;
  }

  const trimmed = text.trim();
  return trimmed.length > maxLength ? `${trimmed.slice(0, maxLength - 3).trimEnd()}...` : trimmed;
}

export default async function ArticleOpenGraphImage({ params }: PageProps) {
  const article = await getPublishedArticle(params.id);

  const title = trimText(article?.title ?? 'Highlander Today', 110) ?? 'Highlander Today';
  const category = trimText(article?.category?.name ?? 'Local Life', 32) ?? 'Local Life';
  const subtitle =
    trimText(article?.excerpt, 150) ??
    'Local news, events, market, and community life rooted in Cambria Heights.';
  const author = article
    ? `${article.author.firstName} ${article.author.lastName}`
    : 'Highlander Today';

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          overflow: 'hidden',
          background: 'linear-gradient(135deg, #091a28 0%, #0f2941 34%, #8f1d2c 100%)',
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
            padding: '54px 64px',
          }}
        >
          <div
            style={{
              display: 'flex',
              width: '100%',
              borderRadius: 40,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'linear-gradient(160deg, rgba(7,17,26,0.24), rgba(7,17,26,0.1))',
              boxShadow: '0 28px 80px rgba(0, 0, 0, 0.25)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                width: '73%',
                padding: '44px 48px 38px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 22,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 16,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      padding: '10px 18px',
                      borderRadius: 9999,
                      background: 'rgba(89, 194, 227, 0.16)',
                      fontSize: 18,
                      fontWeight: 700,
                      letterSpacing: '0.24em',
                      textTransform: 'uppercase',
                      color: 'rgba(186, 230, 253, 0.92)',
                    }}
                  >
                    {category}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      fontSize: 18,
                      fontWeight: 700,
                      letterSpacing: '0.28em',
                      textTransform: 'uppercase',
                      color: 'rgba(255,255,255,0.5)',
                    }}
                  >
                    Highlander Today
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    fontSize: 36,
                    lineHeight: 1.02,
                    fontWeight: 900,
                    letterSpacing: '-0.05em',
                    maxWidth: 700,
                  }}
                >
                  {title}
                </div>

                <div
                  style={{
                    display: 'flex',
                    fontSize: 30,
                    lineHeight: 1.25,
                    color: 'rgba(255,255,255,0.76)',
                    maxWidth: 720,
                  }}
                >
                  {subtitle}
                </div>
              </div>

              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
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
                      fontSize: 17,
                      fontWeight: 700,
                      letterSpacing: '0.26em',
                      textTransform: 'uppercase',
                      color: 'rgba(255,255,255,0.46)',
                    }}
                  >
                    By
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      fontSize: 26,
                      fontWeight: 700,
                      color: 'rgba(255,255,255,0.9)',
                    }}
                  >
                    {author}
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    fontSize: 20,
                    fontWeight: 700,
                    letterSpacing: '0.22em',
                    textTransform: 'uppercase',
                    color: 'rgba(186, 230, 253, 0.78)',
                  }}
                >
                  Community platform
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                width: '27%',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
                background:
                  'linear-gradient(180deg, rgba(84,195,230,0.14), rgba(165,30,48,0.16))',
                borderLeft: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 220,
                  height: 260,
                  transform: 'rotate(8deg)',
                }}
              >
                <svg
                  viewBox="5 5 72 72"
                  width="220"
                  height="260"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <defs>
                    <linearGradient id="htShieldArticleOg" x1="10%" y1="10%" x2="90%" y2="90%">
                      <stop offset="0%" stopColor="#54c3e6" />
                      <stop offset="100%" stopColor="#a51e30" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M36 4 65 12v20c0 16.2-12 28.4-29 35.8C19 60.4 7 48.2 7 32V12L36 4Z"
                    fill="url(#htShieldArticleOg)"
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
            </div>
          </div>
        </div>
      </div>
    ),
    size
  );
}
