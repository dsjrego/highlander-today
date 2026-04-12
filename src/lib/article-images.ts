export const DEFAULT_ARTICLE_IMAGE_PATH = '/opengraph-image';

export interface ArticleImageThemeContext {
  previewTenantSlug?: string | null;
  mode?: string | null;
}

function getCookieValue(name: string) {
  if (typeof document === 'undefined') {
    return null;
  }

  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function appendThemeContext(path: string, themeContext?: ArticleImageThemeContext) {
  const resolvedContext = {
    previewTenantSlug:
      themeContext?.previewTenantSlug !== undefined
        ? themeContext.previewTenantSlug
        : getCookieValue('theme-tenant-preview'),
    mode:
      themeContext?.mode !== undefined
        ? themeContext.mode
        : getCookieValue('theme-mode'),
  };

  const params = new URLSearchParams();

  if (resolvedContext.previewTenantSlug?.trim()) {
    params.set('tenantPreview', resolvedContext.previewTenantSlug.trim());
  }

  if (resolvedContext.mode?.trim()) {
    params.set('themeMode', resolvedContext.mode.trim());
  }

  const query = params.toString();
  if (!query) {
    return path;
  }

  return `${path}${path.includes('?') ? '&' : '?'}${query}`;
}

export function getArticleUiImageUrl(
  featuredImageUrl?: string | null,
  themeContext?: ArticleImageThemeContext
) {
  if (featuredImageUrl?.trim()) {
    return featuredImageUrl.trim();
  }

  return appendThemeContext(DEFAULT_ARTICLE_IMAGE_PATH, themeContext);
}

export function getArticleSocialImageUrl(
  articleId?: string | null,
  featuredImageUrl?: string | null,
  themeContext?: ArticleImageThemeContext
) {
  if (featuredImageUrl?.trim()) {
    return featuredImageUrl.trim();
  }

  if (articleId?.trim()) {
    return appendThemeContext(`/local-life/${articleId.trim()}/opengraph-image`, themeContext);
  }

  return appendThemeContext(DEFAULT_ARTICLE_IMAGE_PATH, themeContext);
}
