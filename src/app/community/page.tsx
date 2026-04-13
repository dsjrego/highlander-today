import { notFound } from 'next/navigation';
import ArticleCategorySectionPage from '@/components/sections/ArticleCategorySectionPage';
import { getArticleSectionData } from '@/lib/category-sections';
import { getCategoryHref } from '@/lib/category-config';

export default async function CommunityPage() {
  const sectionData = await getArticleSectionData('community', getCategoryHref);

  if (!sectionData) {
    notFound();
  }

  return (
    <ArticleCategorySectionPage
      sectionSlug={sectionData.section.slug}
      sectionName={sectionData.section.name}
      intro="Our community history and culture lives here"
      categoryPills={sectionData.categoryPills}
    />
  );
}
