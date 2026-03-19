import { redirect } from 'next/navigation';
import { db } from '@/lib/db';

interface PageProps {
  params: {
    slug: string;
  };
}

export default async function ArticleSlugRedirectPage({ params }: PageProps) {
  const article = await db.article.findFirst({
    where: { slug: params.slug },
    select: { id: true },
  });

  if (article) {
    redirect(`/local-life/${article.id}`);
  }

  redirect('/local-life');
}
