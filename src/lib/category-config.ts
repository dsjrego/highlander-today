export const CATEGORY_HREF_OVERRIDES: Record<string, string> = {
  'local-life': '/local-life',
  'experiences': '/experiences',
  'community': '/community',
  'market': '/marketplace',
  'marketplace': '/marketplace',
  'help-wanted': '/help-wanted',
  'about': '/about',
  'local-stores': '/marketplace/stores',
  'events': '/events',
};

export function getCategoryHref(slug: string, parentSlug?: string | null) {
  const directOverride = CATEGORY_HREF_OVERRIDES[slug];
  if (directOverride) {
    return directOverride;
  }

  if (parentSlug) {
    const parentHref = CATEGORY_HREF_OVERRIDES[parentSlug] ?? `/${parentSlug}`;
    return `${parentHref}?category=${slug}`;
  }

  return `/${slug}`;
}
