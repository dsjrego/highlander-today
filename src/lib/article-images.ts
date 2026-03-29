export const DEFAULT_ARTICLE_IMAGE_PATH = '/opengraph-image';

export function getArticleUiImageUrl(featuredImageUrl?: string | null) {
  if (featuredImageUrl?.trim()) {
    return featuredImageUrl.trim();
  }

  return DEFAULT_ARTICLE_IMAGE_PATH;
}

export function getArticleSocialImageUrl(articleId?: string | null, featuredImageUrl?: string | null) {
  if (featuredImageUrl?.trim()) {
    return featuredImageUrl.trim();
  }

  if (articleId?.trim()) {
    return `/local-life/${articleId.trim()}/opengraph-image`;
  }

  return DEFAULT_ARTICLE_IMAGE_PATH;
}
