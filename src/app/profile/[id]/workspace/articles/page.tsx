import Link from 'next/link';
import { db } from '@/lib/db';

export default async function ProfileWorkspaceArticlesPage({
  params,
}: {
  params: { id: string };
}) {
  const articles = await db.article.findMany({
    where: {
      authorUserId: params.id,
      status: {
        in: ['DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'UNPUBLISHED'],
      },
    },
    orderBy: [{ createdAt: 'desc' }],
    take: 25,
    select: {
      id: true,
      title: true,
      status: true,
      createdAt: true,
    },
  });

  return (
    <section className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(241,245,249,0.94))] p-6 shadow-[0_24px_55px_rgba(15,23,42,0.16)] backdrop-blur md:p-8">
      <div className="mb-6 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">Articles</p>
        <h2 className="text-2xl font-black tracking-[-0.03em] text-slate-950">Your writing queue</h2>
      </div>

      <div className="space-y-3">
        {articles.length > 0 ? (
          articles.map((article) => {
            const href =
              article.status === 'PUBLISHED' ? `/local-life/${article.id}` : `/local-life/submit?edit=${article.id}`;

            return (
              <Link
                key={article.id}
                href={href}
                className="block rounded-2xl border border-slate-200 bg-white/75 p-5 transition hover:border-slate-300 hover:bg-white"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-slate-950">{article.title}</h3>
                    <p className="mt-1 text-sm text-slate-600">
                      {article.status} • {new Date(article.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-slate-700">
                    {article.status === 'PUBLISHED' ? 'View Article' : 'Open Editor'}
                  </span>
                </div>
              </Link>
            );
          })
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/60 p-6 text-sm text-slate-600">
            You do not have any articles yet.
          </div>
        )}
      </div>
    </section>
  );
}
