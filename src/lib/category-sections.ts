import 'server-only';

import { getCategories } from '@/lib/categories';

export interface SectionCategoryPill {
  id: string;
  name: string;
  slug: string;
  contentModel?: string | null;
  href?: string;
}

export interface ArticleSectionData {
  section: {
    id: string;
    name: string;
    slug: string;
  };
  categoryPills: SectionCategoryPill[];
}

export async function getArticleSectionData(
  sectionSlug: string,
  buildHref: (childSlug: string, parentSlug: string) => string
): Promise<ArticleSectionData | null> {
  const [topLevelCategories, childCategories] = await Promise.all([
    getCategories({ topOnly: true }),
    getCategories({ parentSlug: sectionSlug }),
  ]);

  const section = topLevelCategories.find((category) => category.slug === sectionSlug);
  if (!section) {
    return null;
  }

  return {
    section: {
      id: section.id,
      name: section.name,
      slug: section.slug,
    },
    categoryPills: childCategories.map((category) => ({
      id: category.id,
      name: category.name,
      slug: category.slug,
      contentModel: category.contentModel,
      href: buildHref(category.slug, section.slug),
    })),
  };
}
