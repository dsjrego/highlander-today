import { notFound } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getNewsSectionData } from '@/lib/news-sections';
import NewsSectionPage from '@/components/sections/NewsSectionPage';

export default async function NewsPage({ params, searchParams }: {
  params: Promise<{ section: string }>;
  searchParams: Promise<{ category?: string; page?: string }>;
}) {
  const [{ section }, query, session] = await Promise.all([params, searchParams, getServerSession(authOptions)]);
  const data = await getNewsSectionData({
    sectionSlug: section,
    categorySlug: query.category,
    page: query.page,
    viewer: session?.user,
  });
  if (!data) notFound();
  return <NewsSectionPage data={data} />;
}
