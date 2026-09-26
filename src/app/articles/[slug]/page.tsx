import { redirect } from 'next/navigation';
import { db } from '@/lib/db';

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

export default async function ArticleSlugRedirectPage(props: PageProps) {
  const params = await props.params;
  const article = await db.article.findFirst({
    where: { slug: params.slug },
    select: { id: true },
  });

  if (article) {
    redirect(`/local-life/${article.id}`);
  }

  redirect('/local-life');
}
